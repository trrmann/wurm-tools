import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { randomUUID, createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function installationRoot(env = process.env, home = os.homedir()) {
  return path.join(env.XDG_DATA_HOME || path.join(home, '.local/share'), 'wurm-tools', 'helper');
}

function command(executable, args, options = {}) {
  const result = spawnSync(executable, args, { stdio: 'inherit', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${executable} failed (${result.status})`);
}

export function verifyPayload(directory) {
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'installer-manifest.json')));
  if (
    manifest.format !== 1 ||
    manifest.platform !== 'linux' ||
    manifest.arch !== 'x64' ||
    !/^\d+\.\d+\.\d+$/.test(manifest.version) ||
    !manifest.files ||
    Object.keys(manifest.files).length === 0
  ) {
    throw new Error('Unsupported installer manifest');
  }
  const seen = new Set();
  function inspect(relative = '') {
    for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true })) {
      const name = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) inspect(name);
      else if (!entry.isFile()) throw new Error(`Not a regular payload entry: ${name}`);
      else if (name !== 'installer-manifest.json') seen.add(name);
    }
  }
  inspect();
  for (const [relative, expected] of Object.entries(manifest.files)) {
    if (
      !relative ||
      path.isAbsolute(relative) ||
      relative.includes('\\') ||
      relative.split('/').some((part) => !part || part === '..' || part === '.') ||
      !/^[a-f0-9]{64}$/.test(expected)
    )
      throw new Error('Unsafe manifest path');
    if (!seen.delete(relative)) throw new Error(`Missing payload file: ${relative}`);
    const file = path.join(directory, relative);
    if (!fs.lstatSync(file).isFile()) throw new Error(`Not a regular payload file: ${relative}`);
    const actual = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (actual !== expected) throw new Error(`Payload integrity failure: ${relative}`);
  }
  if (seen.size) throw new Error(`Unlisted payload file: ${[...seen][0]}`);
  for (const required of [
    'runtime/bin/node',
    'scripts/wurm-local.js',
    'scripts/helper-installer.js',
  ]) {
    if (!manifest.files[required]) throw new Error(`Missing required payload: ${required}`);
  }
  return manifest;
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

function writeJson(file, value) {
  const temporary = `${file}.${randomUUID()}.new`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2), { mode: 0o600, flag: 'wx' });
  fs.renameSync(temporary, file);
}

function environment(root) {
  const settings = { ...readJson(path.join(root, 'settings.json'), {}) };
  delete settings.startupUnitPath;
  return {
    ...process.env,
    ...settings,
    WURM_HELPER_SEMAPHORE_PATH: path.join(root, 'helper.semaphore'),
    WURM_INSTALLATION_ID: readJson(path.join(root, 'installation.json'), {}).id || '',
  };
}

async function health(env) {
  try {
    const response = await fetch(`http://127.0.0.1:${env.WURM_HELPER_PORT || 5180}/health`, {
      signal: AbortSignal.timeout(1000),
    });
    if (!response.ok) throw new Error(`Port occupied by HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    if (error.cause?.code === 'ECONNREFUSED') return null;
    throw new Error(`Cannot inspect helper port: ${error.message}`, { cause: error });
  }
}

async function waitHealth(env, running) {
  const deadline = Date.now() + 12000;
  do {
    const current = await health(env);
    if (running ? current?.installationId === env.WURM_INSTALLATION_ID : !current) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  } while (Date.now() < deadline);
  throw new Error(
    `Helper did not ${running ? 'become ready' : 'stop'} within 12 seconds; inspect helper.log`
  );
}

function active(root) {
  return path.join(root, 'current');
}
function node(root) {
  return path.join(active(root), 'runtime/bin/node');
}
function helper(root) {
  return fs.realpathSync(path.join(active(root), 'scripts/wurm-local.js'));
}
function unitPath(root) {
  return (
    readJson(path.join(root, 'settings.json'), {}).startupUnitPath ||
    path.resolve(
      process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
      'systemd/user/wurm-helper.service'
    )
  );
}
function startupOwned(root) {
  if (!fs.existsSync(unitPath(root))) return false;
  const id = readJson(path.join(root, 'installation.json'), {}).id;
  if (
    !id ||
    !fs.readFileSync(unitPath(root), 'utf8').split('\n').includes(`# Wurm Tools installer: ${id}`)
  ) {
    throw new Error(
      'An existing helper startup service belongs to another installation. Remove that startup registration explicitly before continuing.'
    );
  }
  return true;
}
async function stop(root, env) {
  const current = await health(env);
  if (current && current.installationId !== env.WURM_INSTALLATION_ID) {
    throw new Error(
      'Another helper or service owns this port. Stop the legacy helper from its original project; this installer will not terminate it.'
    );
  }
  if (startupOwned(root)) command('systemctl', ['--user', 'stop', 'wurm-helper.service']);
  const marker = path.join(root, 'helper.semaphore');
  if (fs.existsSync(marker)) fs.unlinkSync(marker);
  await waitHealth(env, false);
}
async function start(root, env) {
  const current = await health(env);
  if (current) {
    if (current.installationId !== env.WURM_INSTALLATION_ID)
      throw new Error('Another installation owns the helper port');
    return;
  }
  if (startupOwned(root)) {
    command('systemctl', ['--user', 'start', 'wurm-helper.service']);
  } else {
    const log = fs.openSync(path.join(root, 'helper.log'), 'a', 0o600);
    try {
      const token = randomUUID();
      const marker = path.join(root, 'helper.semaphore');
      writeJson(marker, { token, pid: process.pid });
      const child = spawn(node(root), [helper(root), '--worker'], {
        env: { ...env, WURM_HELPER_TOKEN: token },
        detached: true,
        stdio: ['ignore', log, log],
      });
      child.once('exit', (code, signal) => {
        fs.appendFileSync(
          path.join(root, 'helper.log'),
          `Helper process exited: ${code ?? signal}\n`
        );
      });
      await new Promise((resolve, reject) => {
        child.once('spawn', resolve);
        child.once('error', reject);
      });
      child.unref();
    } finally {
      fs.closeSync(log);
    }
  }
  await waitHealth(env, true);
}

function switchCurrent(root, target) {
  const temporary = path.join(root, 'current.new');
  if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  fs.symlinkSync(target, temporary);
  fs.renameSync(temporary, active(root));
}

async function setStartup(root) {
  startupOwned(root);
  const { systemdUnitContent } = await import(
    pathToFileURL(path.join(active(root), 'scripts/helper-startup.js')).href
  );
  fs.mkdirSync(path.dirname(unitPath(root)), { recursive: true });
  const id = readJson(path.join(root, 'installation.json'), {}).id;
  fs.writeFileSync(
    unitPath(root),
    `# Wurm Tools installer: ${id}\n${systemdUnitContent(root, node(root), path.join(root, 'manage.js'))}`,
    {
      mode: 0o600,
    }
  );
  command('systemctl', ['--user', 'daemon-reload']);
  command('systemctl', ['--user', 'enable', 'wurm-helper.service']);
}

export async function install(payload, root, { startup = false } = {}) {
  if (process.platform !== 'linux' || process.arch !== 'x64')
    throw new Error('This installer supports Fedora x64 only');
  const release = fs.readFileSync('/etc/os-release', 'utf8');
  if (!/^ID=fedora$/m.test(release) || !/^VERSION_ID="?44"?$/m.test(release))
    throw new Error('Supported target: Fedora 44 x64');
  if (process.getuid() === 0) throw new Error('Run as your normal user, not root or sudo');
  const manifest = verifyPayload(payload);
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const lock = path.join(root, 'install.lock');
  const fd = fs.openSync(lock, 'wx', 0o600);
  fs.writeFileSync(fd, `${process.pid}\n`);
  let previous;
  try {
    if (fs.existsSync(path.join(root, 'pending.json')))
      throw new Error(
        'Interrupted update detected. Use this installer with install --yes --recover before retrying. Backup paths are in pending.json.'
      );
    const installed = readJson(path.join(root, 'installation.json'), null);
    if (
      installed &&
      installed.version.localeCompare(manifest.version, undefined, { numeric: true }) > 0
    )
      throw new Error('Downgrade refused');
    if (!installed) {
      writeJson(path.join(root, 'installation.json'), {
        id: randomUUID(),
        version: manifest.version,
      });
      const settings = {
        ...(await dataLocations(payload, process.env)),
        startupUnitPath: unitPath(root),
        WURM_HELPER_PORT: process.env.WURM_HELPER_PORT || '5180',
      };
      for (const key of [
        'WURM_HEROES_DB_PATH',
        'HEROES_IDENTITY_PATH',
        'WURM_HELPER_AUTH_FILE',
        'WURM_MAP_BASELINE_PATH',
        'WURM_SERVER_DIR',
        'WURM_CLIENT_DIR',
        'WURM_HELPER_PORT',
        'WURM_ALLOWED_ORIGINS',
      ]) {
        if (process.env[key])
          settings[key] =
            key.endsWith('_PATH') || key.endsWith('_DIR') || key.endsWith('_FILE')
              ? path.resolve(process.env[key])
              : process.env[key];
      }
      writeJson(path.join(root, 'settings.json'), settings);
    }
    const env = environment(root);
    await stop(root, env);
    previous = fs.existsSync(active(root)) ? fs.readlinkSync(active(root)) : null;
    let snapshot;
    try {
      snapshot = await snapshotData(payload, root, env);
    } catch (error) {
      if (previous) {
        try {
          await start(root, env);
        } catch (restartError) {
          throw new Error(
            `Backup failed: ${error.message}. Previous helper restart also failed: ${restartError.message}`,
            { cause: restartError }
          );
        }
      }
      throw error;
    }
    writeJson(path.join(root, 'pending.json'), {
      previous,
      installed,
      snapshot,
      startup: startupOwned(root),
    });
    try {
      const destination = path.join(root, 'releases', `${manifest.version}-${randomUUID()}`);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.cpSync(payload, destination, { recursive: true });
      verifyPayload(destination);
      switchCurrent(root, destination);
      fs.copyFileSync(
        path.join(destination, 'scripts/helper-installer.js'),
        path.join(root, 'manage.js')
      );
      fs.writeFileSync(path.join(root, 'package.json'), '{"type":"module"}\n');
      fs.writeFileSync(
        path.join(root, 'wurm-helper'),
        '#!/bin/sh\nROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"\nexec "$ROOT/current/runtime/bin/node" "$ROOT/manage.js" "$@"\n',
        { mode: 0o700 }
      );
      if (startup || startupOwned(root)) await setStartup(root);
      await start(root, env);
      writeJson(path.join(root, 'installation.json'), {
        ...readJson(path.join(root, 'installation.json')),
        version: manifest.version,
        components: manifest.components,
      });
      fs.unlinkSync(path.join(root, 'pending.json'));
    } catch (error) {
      try {
        await recover(root, env);
      } catch (recoveryError) {
        throw new Error(
          `Install failed: ${error.message}. Recovery also failed: ${recoveryError.message}. Keep pending.json and private backups for recovery.`,
          { cause: recoveryError }
        );
      }
      throw error;
    }
    console.log(
      `Installed ${manifest.version}. Helper health verified. Manage with:\n${path.join(root, 'wurm-helper')}\nData and credentials were not moved or deleted. This is an UNSIGNED test build, not a public release.`
    );
  } finally {
    fs.closeSync(fd);
    fs.unlinkSync(lock);
  }
}

export async function dataLocations(payload, env) {
  const { heroesDatabasePath } = await import(
    pathToFileURL(path.join(payload, 'scripts/heroes-store.js')).href
  );
  const { heroesIdentityPath } = await import(
    pathToFileURL(path.join(payload, 'scripts/heroes-identity.js')).href
  );
  const { authFilePath } = await import(
    pathToFileURL(path.join(payload, 'scripts/wurm-helper-auth.js')).href
  );
  const { baselineFilePath } = await import(
    pathToFileURL(path.join(payload, 'scripts/wurm-map-baseline.js')).href
  );
  return Object.fromEntries(
    Object.entries({
      WURM_HEROES_DB_PATH: heroesDatabasePath(env),
      HEROES_IDENTITY_PATH: heroesIdentityPath(env),
      WURM_HELPER_AUTH_FILE: authFilePath(env),
      WURM_MAP_BASELINE_PATH: baselineFilePath(env),
    }).map(([key, value]) => [key, path.resolve(value)])
  );
}

async function snapshotData(payload, root, env) {
  const directory = path.join(root, 'backups', randomUUID());
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const files = [...new Set(Object.values(await dataLocations(payload, env)))];
  for (const file of files) {
    const relative = path.relative(root, path.resolve(file));
    if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
      throw new Error(`Keep user data outside the replaceable helper program directory: ${file}`);
    }
  }
  return files.map((file, index) => {
    const backup = path.join(directory, `${index}`);
    const existed = fs.existsSync(file);
    if (existed) {
      if (!fs.lstatSync(file).isFile()) throw new Error(`Expected a regular data file: ${file}`);
      fs.copyFileSync(file, backup);
      fs.chmodSync(backup, 0o600);
    }
    return { file, backup, existed };
  });
}

async function recover(root, env) {
  const pending = readJson(path.join(root, 'pending.json'), null);
  if (!pending) throw new Error('No interrupted update to recover');
  await stop(root, env);
  for (const entry of pending.snapshot) {
    if (entry.existed) fs.copyFileSync(entry.backup, entry.file);
    else if (fs.existsSync(entry.file)) fs.unlinkSync(entry.file);
  }
  if (pending.previous) {
    switchCurrent(root, pending.previous);
    fs.copyFileSync(
      path.join(pending.previous, 'scripts/helper-installer.js'),
      path.join(root, 'manage.js')
    );
    writeJson(path.join(root, 'installation.json'), pending.installed);
    if (pending.startup) await setStartup(root);
    else if (startupOwned(root)) {
      command('systemctl', ['--user', 'disable', '--now', 'wurm-helper.service']);
      fs.unlinkSync(unitPath(root));
      command('systemctl', ['--user', 'daemon-reload']);
    }
    await start(root, env);
  } else {
    if (startupOwned(root)) {
      command('systemctl', ['--user', 'disable', '--now', 'wurm-helper.service']);
      fs.unlinkSync(unitPath(root));
      command('systemctl', ['--user', 'daemon-reload']);
    }
    if (fs.existsSync(active(root))) fs.unlinkSync(active(root));
    for (const name of ['manage.js', 'wurm-helper', 'installation.json']) {
      const file = path.join(root, name);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  }
  fs.unlinkSync(path.join(root, 'pending.json'));
  console.log('Recovered the previous program/data state. Backups retained privately.');
}

export async function main(args = process.argv.slice(2)) {
  const root =
    args[0] === 'install' ? installationRoot() : path.dirname(fileURLToPath(import.meta.url));
  if (args[0] === 'install') {
    if (
      args
        .slice(1)
        .some(
          (arg) =>
            ![
              '--yes',
              '--startup',
              '--recover',
              '--developer',
              '--approve-system-changes',
            ].includes(arg)
        )
    )
      throw new Error('Unknown installation option');
    if (args.includes('--approve-system-changes') && !args.includes('--developer'))
      throw new Error('--approve-system-changes requires --developer');
    if (!args.includes('--yes'))
      throw new Error('Unsigned test installer: review the source and rerun with --yes to consent');
    if (args.includes('--recover')) {
      const lock = path.join(root, 'install.lock');
      if (fs.existsSync(lock)) {
        const pid = Number(fs.readFileSync(lock, 'utf8').trim());
        if (!Number.isSafeInteger(pid) || pid <= 0)
          throw new Error(
            'Invalid installation lock: inspect install.lock before removing it manually'
          );
        try {
          process.kill(pid, 0);
          throw new Error(`Installation process ${pid} is still running`);
        } catch (error) {
          if (error.code !== 'ESRCH') throw error;
        }
        fs.unlinkSync(lock);
      }
      const fd = fs.openSync(lock, 'wx', 0o600);
      fs.writeFileSync(fd, `${process.pid}\n`);
      try {
        return await recover(root, environment(root));
      } finally {
        fs.closeSync(fd);
        fs.unlinkSync(lock);
      }
    }
    const payload = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
    if (args.includes('--developer')) {
      verifyPayload(payload);
      if (!fs.existsSync(path.join(payload, 'developer/components.json')))
        throw new Error(
          'This is a user-only installer. Build the complete developer installer first.'
        );
      try {
        command('code', ['--version'], { stdio: 'pipe' });
      } catch (error) {
        throw new Error(
          `Developer setup requires an existing VS Code from its official offline installer; it cannot be downloaded or redistributed by this package. ${error.message}`,
          { cause: error }
        );
      }
    }
    await install(payload, root, {
      startup: args.includes('--startup'),
    });
    if (args.includes('--developer')) {
      const { installDeveloperProfile } = await import(
        pathToFileURL(path.join(payload, 'scripts/helper-developer.js')).href
      );
      try {
        installDeveloperProfile(payload, {
          approveSystemChanges: args.includes('--approve-system-changes'),
        });
      } catch (error) {
        throw new Error(
          `Helper installed and verified, but developer setup failed: ${error.message}. Any approved system-package transaction is separate from helper/data rollback.`,
          { cause: error }
        );
      }
    }
    return;
  }
  if (args.slice(1).some((arg) => args[0] !== 'uninstall' || arg !== '--yes'))
    throw new Error('Unknown helper option');
  if (args[0] !== '--foreground' && fs.existsSync(path.join(root, 'install.lock')))
    throw new Error(
      'Installation in progress or interrupted; inspect install.lock and use installer recovery'
    );
  const env = environment(root);
  switch (args[0]) {
    case 'start':
      return start(root, env);
    case 'stop':
      return stop(root, env);
    case 'status':
      {
        const current = await health(env);
        if (current && current.installationId !== env.WURM_INSTALLATION_ID)
          throw new Error('Another installation owns the helper port');
        console.log({
          running: Boolean(current),
          version: readJson(path.join(root, 'installation.json'), {}).version,
          components: readJson(path.join(root, 'installation.json'), {}).components,
        });
      }
      return;
    case '--foreground':
      {
        const child = spawn(node(root), [helper(root), '--foreground'], { env, stdio: 'inherit' });
        const terminate = () => child.kill('SIGTERM');
        process.on('SIGTERM', terminate);
        process.on('SIGINT', terminate);
        try {
          await new Promise((resolve, reject) => {
            child.once('error', reject);
            child.once('exit', (code, signal) =>
              code === 0 || signal === 'SIGTERM'
                ? resolve()
                : reject(new Error(`Helper exited ${code ?? signal}`))
            );
          });
        } finally {
          process.off('SIGTERM', terminate);
          process.off('SIGINT', terminate);
        }
      }
      return;
    case 'setup-code':
      command(node(root), [helper(root), '--heroes-setup-code'], { env });
      return;
    case 'pair-code':
      command(node(root), [helper(root), '--pairing-code'], { env });
      return;
    case 'startup-on':
      await setStartup(root);
      return start(root, env);
    case 'startup-off':
      if (startupOwned(root)) {
        command('systemctl', ['--user', 'disable', '--now', 'wurm-helper.service']);
        fs.unlinkSync(unitPath(root));
        command('systemctl', ['--user', 'daemon-reload']);
      }
      return;
    case 'uninstall':
      if (!args.includes('--yes'))
        throw new Error('Use uninstall --yes; all data/config/backups will be retained');
      await stop(root, env);
      if (startupOwned(root)) {
        command('systemctl', ['--user', 'disable', '--now', 'wurm-helper.service']);
        fs.unlinkSync(unitPath(root));
        command('systemctl', ['--user', 'daemon-reload']);
      }
      if (!readJson(path.join(root, 'installation.json'), null)?.id)
        throw new Error('Not an owned installation');
      fs.rmSync(path.join(root, 'releases'), { recursive: true, force: true });
      for (const name of ['current', 'wurm-helper', 'manage.js', 'package.json']) {
        const file = path.join(root, name);
        if (fs.existsSync(file) || name === 'current') fs.rmSync(file, { force: true });
      }
      console.log('Program removed. User data, configuration, logs and backups retained.');
      return;
    default:
      throw new Error(
        'Usage: wurm-helper start|stop|status|setup-code|pair-code|startup-on|startup-off|uninstall --yes'
      );
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`[FAIL] ${error.message}`);
    process.exitCode = 1;
  });
}
