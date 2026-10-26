import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import net from 'node:net';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertCurrentInstaller, installerOutputDirectory } from './helper-build-state.js';

const execute = promisify(execFile);
const project = fileURLToPath(new URL('../', import.meta.url));
const pkg = JSON.parse(await fs.readFile(path.join(project, 'package.json')));
const artifact = path.join(
  installerOutputDirectory(project, false, process.env.WURM_INSTALLER_OUTPUT_ROOT),
  `wurm-tools-helper-${pkg.version}-fedora44-x64-unsigned.run`
);
const work = await fs.mkdtemp(path.join(os.tmpdir(), 'wurm helper acceptance \u00e9 # % '));
const root = path.join(work, 'data/wurm-tools/helper');
const bin = path.join(work, 'bin');
const reserve = net.createServer();
await new Promise((resolve) => reserve.listen(0, '127.0.0.1', resolve));
const port = reserve.address().port;
await new Promise((resolve) => reserve.close(resolve));
const env = {
  ...process.env,
  HOME: work,
  XDG_DATA_HOME: path.join(work, 'data'),
  XDG_CONFIG_HOME: path.join(work, 'config'),
  WURM_HEROES_DB_PATH: path.join(work, 'heroes.db'),
  HEROES_IDENTITY_PATH: path.join(work, 'identity.json'),
  WURM_HELPER_AUTH_FILE: path.join(work, 'pairing.json'),
  WURM_MAP_BASELINE_PATH: path.join(work, 'baseline.db'),
  WURM_SERVER_DIR: path.join(work, 'missing-server'),
  WURM_CLIENT_DIR: path.join(work, 'missing-client'),
  WURM_HELPER_PORT: String(port),
  PATH: `${bin}:${process.env.PATH}`,
  TEST_MANAGER_ROOT: root,
  TEST_SERVICE_PID: path.join(work, 'service.pid'),
  TEST_SERVICE_LOG: path.join(work, 'systemctl.log'),
};
const run = (command, args, options = {}) =>
  execute(command, args, { env, cwd: work, timeout: 60000, ...options });
const manager = (...args) => run(path.join(root, 'wurm-helper'), args);
const installer = (...args) => run('bash', [artifact, '--yes', ...args]);
const exists = async (file) => {
  try {
    await fs.access(file);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
};
const health = () => fetch(`http://127.0.0.1:${port}/health`);
const pass = (message) => console.log(`[PASS] ${message}`);
async function rejected(action, expected) {
  try {
    await action();
  } catch (error) {
    assert.match(`${error.stdout}\n${error.stderr}`, expected);
    return;
  }
  throw new Error(`Expected failure matching ${expected}`);
}
async function alterManifest(payload, version, modifiedFile) {
  const file = path.join(payload, 'installer-manifest.json');
  const manifest = JSON.parse(await fs.readFile(file));
  manifest.version = version;
  if (modifiedFile)
    manifest.files[modifiedFile] = createHash('sha256')
      .update(await fs.readFile(path.join(payload, modifiedFile)))
      .digest('hex');
  await fs.writeFile(file, JSON.stringify(manifest));
}

try {
  await assertCurrentInstaller(project, path.dirname(artifact));
  assert.equal(process.platform, 'linux');
  assert.notEqual(process.getuid(), 0, 'Run acceptance as a normal Fedora user');
  assert.ok(
    await exists(artifact),
    'Build the installer with pnpm run helper:installer:build first'
  );
  await fs.mkdir(bin);
  await fs.writeFile(
    path.join(bin, 'systemctl'),
    `#!${process.execPath}
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TEST_SERVICE_LOG, JSON.stringify(args) + '\\n');
const pidFile = process.env.TEST_SERVICE_PID;
if (args.includes('stop') || (args.includes('disable') && args.includes('--now'))) {
  if (fs.existsSync(pidFile)) {
    const pid = Number(fs.readFileSync(pidFile, 'utf8'));
    try { process.kill(pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
    fs.unlinkSync(pidFile);
  }
}
if (args.includes('start')) {
  const root = process.env.TEST_MANAGER_ROOT;
  const child = spawn(path.join(root, 'current/runtime/bin/node'), [path.join(root, 'manage.js'), '--foreground'], { detached: true, stdio: 'ignore', env: process.env });
  child.once('error', (error) => { console.error(error); process.exitCode = 1; });
  child.once('spawn', () => { fs.writeFileSync(pidFile, String(child.pid)); child.unref(); });
}
`,
    { mode: 0o700 }
  );
  await fs.writeFile(path.join(bin, 'package.json'), '{"type":"module"}');
  await installer();
  assert.equal((await health()).status, 200);
  const identity = (await (await health()).json()).installationId;
  assert.ok(identity);
  assert.match((await manager('status')).stdout, /running: true/);
  const semaphore = JSON.parse(await fs.readFile(path.join(root, 'helper.semaphore')));
  assert.equal(
    await fs.realpath(`/proc/${semaphore.pid}/exe`),
    await fs.realpath(path.join(root, 'current/runtime/bin/node'))
  );
  assert.equal(
    (await run(path.join(root, 'current/runtime/bin/node'), ['--version'])).stdout.trim(),
    'v24.22.1'
  );
  pass(
    'Fresh offline install from a path with spaces/non-ASCII/#/%, bundled Node, health and status'
  );
  assert.match((await manager('setup-code')).stdout, /setup code/i);
  assert.match((await manager('pair-code')).stdout, /Pairing code/);
  const dbScript = `import { createHeroesWorld, listHeroesWorlds } from ${JSON.stringify(pathToFileURL(path.join(root, 'current/scripts/heroes-store.js')).href)};
await createHeroesWorld('Installer acceptance');
if ((await listHeroesWorlds())[0].name !== 'Installer acceptance') throw new Error('SQLite write/read failed');`;
  await run(path.join(root, 'current/runtime/bin/node'), ['--input-type=module', '-e', dbScript]);
  await manager('stop');
  const saved = {};
  for (const file of [env.WURM_HEROES_DB_PATH, env.HEROES_IDENTITY_PATH, env.WURM_HELPER_AUTH_FILE])
    saved[file] = await fs.readFile(file);
  await fs.writeFile(env.WURM_MAP_BASELINE_PATH, 'preserved-map-marker');
  saved[env.WURM_MAP_BASELINE_PATH] = await fs.readFile(env.WURM_MAP_BASELINE_PATH);
  await installer();
  for (const [file, bytes] of Object.entries(saved))
    assert.deepEqual(await fs.readFile(file), bytes);
  assert.equal((await (await health()).json()).installationId, identity);
  pass('Repair preserves SQLite, identity, pairing, map data and installation identity');

  const payload = path.join(work, 'payload');
  await fs.mkdir(payload);
  const bytes = await fs.readFile(artifact);
  const marker = Buffer.from('__WURM_PAYLOAD__\n');
  const compressed = path.join(work, 'payload.tar.gz');
  await fs.writeFile(compressed, bytes.subarray(bytes.indexOf(marker) + marker.length));
  await run('tar', ['-xzf', compressed, '-C', payload]);
  const payloadNode = path.join(payload, 'runtime/bin/node');
  const payloadManager = path.join(payload, 'scripts/helper-installer.js');
  const directInstall = (...args) =>
    run(payloadNode, [payloadManager, 'install', '--yes', ...args]);
  const helperFile = path.join(payload, 'scripts/wurm-local.js');
  const originalHelper = await fs.readFile(helperFile);
  await fs.appendFile(helperFile, '\nthrow new Error("tampered payload");\n');
  await rejected(directInstall, /integrity failure/);
  assert.equal((await health()).status, 200);
  pass('Bad payload checksum refuses changes without stopping healthy helper');
  await fs.writeFile(
    helperFile,
    Buffer.concat([
      Buffer.from(
        `import installerFs from 'node:fs';\ninstallerFs.writeFileSync(process.env.WURM_HEROES_DB_PATH, 'broken');\nthrow new Error('intentional acceptance startup failure');\n`
      ),
      originalHelper,
    ])
  );
  await alterManifest(payload, '1.5.3', 'scripts/wurm-local.js');
  await rejected(directInstall, /did not become ready/);
  for (const [file, data] of Object.entries(saved)) assert.deepEqual(await fs.readFile(file), data);
  assert.equal((await health()).status, 200);
  assert.match((await manager('status')).stdout, new RegExp(pkg.version.replaceAll('.', '\\.')));
  pass('Failed update restores consistent data backup and previous working binaries');
  await fs.writeFile(helperFile, originalHelper);
  await alterManifest(payload, '1.5.3', 'scripts/wurm-local.js');
  await directInstall();
  assert.match((await manager('status')).stdout, /1\.5\.3/);
  await rejected(installer, /Downgrade refused/);
  pass('Upgrade succeeds; downgrade is refused');
  await fs.writeFile(path.join(root, 'current/scripts/heroes-store.js'), 'damaged installed code');
  await directInstall();
  assert.equal((await health()).status, 200);
  pass('Installer repairs damaged installed program files');

  await manager('stop');
  const recoveryDirectory = path.join(root, 'backups', 'acceptance-recovery');
  await fs.mkdir(recoveryDirectory);
  const snapshot = [];
  for (const [file, data] of Object.entries(saved)) {
    const backup = path.join(recoveryDirectory, String(snapshot.length));
    await fs.writeFile(backup, data, { mode: 0o600 });
    snapshot.push({ file, backup, existed: true });
  }
  await fs.writeFile(
    path.join(root, 'pending.json'),
    JSON.stringify({
      previous: await fs.readlink(path.join(root, 'current')),
      installed: JSON.parse(await fs.readFile(path.join(root, 'installation.json'))),
      snapshot,
      startup: false,
    })
  );
  await fs.writeFile(env.WURM_HEROES_DB_PATH, 'interrupted migration');
  await rejected(directInstall, /Interrupted update detected/);
  await fs.writeFile(path.join(root, 'install.lock'), String(process.pid));
  await rejected(() => directInstall('--recover'), /still running/);
  await fs.writeFile(path.join(root, 'install.lock'), '2147483647');
  await directInstall('--recover');
  for (const [file, data] of Object.entries(saved)) assert.deepEqual(await fs.readFile(file), data);
  assert.equal((await health()).status, 200);
  pass('Interrupted update recovery restores snapshots; live installer lock is never stolen');

  await manager('stop');
  const foreign = http.createServer((_request, response) => {
    response.setHeader('Content-Type', 'application/json');
    response.end('{"ok":true}');
  });
  await new Promise((resolve) => foreign.listen(port, '127.0.0.1', resolve));
  try {
    await rejected(directInstall, /Another helper or service/);
  } finally {
    await new Promise((resolve) => foreign.close(resolve));
  }
  await manager('start');
  await manager('startup-on');
  const unit = path.join(env.XDG_CONFIG_HOME, 'systemd/user/wurm-helper.service');
  assert.match(await fs.readFile(unit, 'utf8'), /manage\.js/);
  await manager('stop');
  await manager('start');
  assert.equal((await health()).status, 200);
  await manager('stop');
  await manager('startup-off');
  assert.equal(await exists(unit), false);
  pass(
    'Foreign port is not terminated; opt-in startup registration/start/stop/removal use isolated systemctl fixture'
  );
  const changedEnvironment = {
    ...env,
    XDG_CONFIG_HOME: path.join(work, 'another-config'),
    XDG_DATA_HOME: path.join(work, 'another-data'),
  };
  for (const key of [
    'WURM_HEROES_DB_PATH',
    'HEROES_IDENTITY_PATH',
    'WURM_HELPER_AUTH_FILE',
    'WURM_MAP_BASELINE_PATH',
    'WURM_HELPER_PORT',
  ])
    delete changedEnvironment[key];
  await run(path.join(root, 'wurm-helper'), ['start'], { env: changedEnvironment });
  assert.equal((await health()).status, 200);
  for (const [file, data] of Object.entries(saved)) assert.deepEqual(await fs.readFile(file), data);
  assert.equal(await exists(changedEnvironment.XDG_DATA_HOME), false);
  await run(path.join(root, 'wurm-helper'), ['stop'], { env: changedEnvironment });
  pass('Stored absolute data/port settings survive a different shell/XDG environment');

  await manager('start');
  await manager('uninstall', '--yes');
  for (const [file, data] of Object.entries(saved)) assert.deepEqual(await fs.readFile(file), data);
  assert.equal(await exists(path.join(root, 'releases')), false);
  assert.equal(await exists(path.join(root, 'wurm-helper')), false);
  assert.equal(await exists(unit), false);
  pass('Uninstall stops helper, removes program/startup and retains all user data');
  await fs.writeFile(
    helperFile,
    Buffer.concat([
      Buffer.from("throw new Error('intentional fresh installation failure');\n"),
      originalHelper,
    ])
  );
  await alterManifest(payload, '1.5.3', 'scripts/wurm-local.js');
  await rejected(directInstall, /did not become ready/);
  assert.equal(await exists(path.join(root, 'current')), false);
  assert.equal(await exists(path.join(root, 'pending.json')), false);
  for (const [file, data] of Object.entries(saved)) assert.deepEqual(await fs.readFile(file), data);
  await fs.writeFile(helperFile, originalHelper);
  await alterManifest(payload, '1.5.3', 'scripts/wurm-local.js');
  await directInstall();
  assert.equal((await health()).status, 200);
  await manager('uninstall', '--yes');
  await assert.rejects(health, (error) => error.cause?.code === 'ECONNREFUSED');
  pass('Failed install without a previous program restores data and permits a clean reinstall');
  console.log(
    '[PASS] Fedora installer acceptance complete. Unsigned test only; native login/systemd, release signing and Windows acceptance remain separate gates.'
  );
} catch (error) {
  const log = path.join(root, 'helper.log');
  if (await exists(log)) console.error(await fs.readFile(log, 'utf8'));
  throw error;
} finally {
  let cleanupError;
  try {
    if (await exists(path.join(root, 'current/runtime/bin/node'))) await manager('stop');
  } catch (error) {
    cleanupError = error;
  }
  if (await exists(env.TEST_SERVICE_PID)) {
    const pid = Number(await fs.readFile(env.TEST_SERVICE_PID, 'utf8'));
    try {
      process.kill(pid, 'SIGTERM');
    } catch (error) {
      if (error.code !== 'ESRCH') cleanupError ??= error;
    }
  }
  if (cleanupError) {
    console.error(
      `Cleanup failed; isolated test data retained at ${work}: ${cleanupError.message}`
    );
    process.exitCode = 1;
  } else await fs.rm(work, { recursive: true, force: true });
}
