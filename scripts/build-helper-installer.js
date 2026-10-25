import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildDeveloperPayload } from './helper-developer.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const nodeVersion = '24.22.1';
const nodeDigest = '6c172a9ab6718f7b801fb5a7bd486af2ee5e32758086a04b84fcce2aa77095e6';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited ${result.status}`);
}

async function copyTree(source, target, select = () => true) {
  await fs.mkdir(target, { recursive: true });
  for (const entry of await fs.readdir(source, { withFileTypes: true })) {
    if (entry.isDirectory())
      await copyTree(path.join(source, entry.name), path.join(target, entry.name), select);
    else if (entry.isFile() && select(entry.name))
      await fs.copyFile(path.join(source, entry.name), path.join(target, entry.name));
  }
}

async function fileHashes(directory, prefix = '') {
  const result = {};
  for (const entry of (
    await fs.readdir(path.join(directory, prefix), { withFileTypes: true })
  ).sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) Object.assign(result, await fileHashes(directory, relative));
    else if (entry.isFile())
      result[relative] = hash(await fs.readFile(path.join(directory, relative)));
    else throw new Error(`Unsupported payload entry: ${relative}`);
  }
  return result;
}

async function build() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--developer'))
    throw new Error('Usage: build-helper-installer.js [--developer]');
  const developer = args.includes('--developer');
  if (process.platform !== 'linux' || process.arch !== 'x64')
    throw new Error('Build Fedora x64 artifacts on Linux x64');
  const output = path.join(root, 'artifacts', ...(developer ? ['developer'] : []));
  const cache = path.join(root, '.installer-cache');
  await fs.mkdir(output, { recursive: true });
  await fs.mkdir(cache, { recursive: true });
  const archive = path.join(cache, `node-v${nodeVersion}-linux-x64.tar.xz`);
  let bytes;
  try {
    bytes = await fs.readFile(archive);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (!bytes) {
    console.log(`Downloading official Node ${nodeVersion} runtime...`);
    const response = await fetch(
      `https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-linux-x64.tar.xz`,
      { signal: AbortSignal.timeout(120000) }
    );
    if (!response.ok) throw new Error(`Node download: HTTP ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  if (hash(bytes) !== nodeDigest) throw new Error('Node runtime checksum mismatch');
  await fs.writeFile(archive, bytes);
  const work = await fs.mkdtemp(
    path.join(developer ? cache : os.tmpdir(), 'wurm-installer-build-')
  );
  try {
    const payload = path.join(work, 'payload');
    await fs.mkdir(path.join(payload, 'runtime'), { recursive: true });
    run(
      'tar',
      [
        '-xJf',
        archive,
        '--strip-components=1',
        '-C',
        path.join(payload, 'runtime'),
        `node-v${nodeVersion}-linux-x64/bin/node`,
        `node-v${nodeVersion}-linux-x64/LICENSE`,
      ],
      root
    );
    await copyTree(path.join(root, 'scripts'), path.join(payload, 'scripts'), (name) =>
      /^(?:wurm-.*\.(?:js|json)|heroes-(?:identity|access|store|subscriptions|copies|impersonation)\.js|helper-(?:installer|startup|developer)\.js|replace-database-file\.js)$/.test(
        name
      )
    );
    await copyTree(path.join(root, 'src/js/modules'), path.join(payload, 'src/js/modules'));
    await fs.mkdir(path.join(payload, 'src/js/tools/heroes'), { recursive: true });
    await fs.copyFile(
      path.join(root, 'src/js/tools/heroes/preferences.js'),
      path.join(payload, 'src/js/tools/heroes/preferences.js')
    );
    const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json')));
    await fs.copyFile(path.join(root, 'package.json'), path.join(payload, 'package.json'));
    await fs.copyFile(path.join(root, 'pnpm-lock.yaml'), path.join(payload, 'pnpm-lock.yaml'));
    await fs.copyFile(
      path.join(root, 'pnpm-workspace.yaml'),
      path.join(payload, 'pnpm-workspace.yaml')
    );
    run('pnpm', ['install', '--prod', '--frozen-lockfile', '--ignore-scripts'], payload);
    await fs.rm(path.join(payload, 'pnpm-lock.yaml'));
    await fs.rm(path.join(payload, 'pnpm-workspace.yaml'));
    await fs.writeFile(
      path.join(payload, 'package.json'),
      JSON.stringify(
        {
          name: 'wurm-tools-helper',
          version: pkg.version,
          type: 'module',
          private: true,
          dependencies: pkg.dependencies,
        },
        null,
        2
      )
    );
    const runtimePackage = JSON.parse(
      await fs.readFile(path.join(payload, 'node_modules/sql.js/package.json'))
    );
    const components = developer
      ? buildDeveloperPayload({ project: root, payload, nodeArchive: archive, nodeVersion, cache })
      : { helper: pkg.version, node: nodeVersion, 'sql.js': runtimePackage.version };
    const manifest = {
      format: 1,
      version: pkg.version,
      platform: 'linux',
      arch: 'x64',
      fedora: '44',
      nodeVersion,
      nodeArchiveSha256: nodeDigest,
      trust: 'unsigned-test-only',
      publicReleaseAllowed: false,
      profile: developer ? 'developer' : 'user',
      components,
      files: await fileHashes(payload),
    };
    await fs.writeFile(
      path.join(payload, 'installer-manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
    const compressed = path.join(work, 'payload.tar.gz');
    run('tar', ['-czf', compressed, '-C', payload, '.'], root);
    const payloadBytes = await fs.readFile(compressed);
    const header = `#!/usr/bin/env bash
set -euo pipefail
echo "Wurm Tools helper ${pkg.version} - UNSIGNED TEST BUILD. Public release blocked pending signing."
if [[ "\${1:-}" != "--yes" ]]; then
  echo "Review the trusted source first. To consent: bash $0 --yes [--startup] [--recover] [--developer --approve-system-changes]" >&2
  exit 2
fi
if [[ "$(id -u)" = 0 ]]; then echo "Run as your normal user, not sudo." >&2; exit 1; fi
work="$(mktemp -d)"
trap 'rm -rf -- "$work"' EXIT
line="$(awk '/^__WURM_PAYLOAD__$/{print NR + 1; exit}' "$0")"
tail -n +"$line" "$0" > "$work/payload.tar.gz"
echo "${hash(payloadBytes)}  $work/payload.tar.gz" | sha256sum --check --status
tar -xzf "$work/payload.tar.gz" -C "$work"
rm -- "$work/payload.tar.gz"
exec_status=0
"$work/runtime/bin/node" "$work/scripts/helper-installer.js" install "$@" || exec_status=$?
exit "$exec_status"
__WURM_PAYLOAD__
`;
    const filename = `wurm-tools-${developer ? 'developer' : 'helper'}-${pkg.version}-fedora44-x64-unsigned.run`;
    const artifact = path.join(output, filename);
    for (const signature of [`${artifact}.asc`, path.join(output, 'fedora-build.json.asc')]) {
      try {
        await fs.access(signature);
      } catch (error) {
        if (error.code === 'ENOENT') continue;
        throw error;
      }
      throw new Error(
        `Refusing to overwrite a signed build. Preserve the release and choose a new version/output directory: ${signature}`
      );
    }
    const artifactBytes = Buffer.concat([Buffer.from(header), payloadBytes]);
    await fs.writeFile(artifact, artifactBytes, { mode: 0o700 });
    await fs.writeFile(`${artifact}.sha256`, `${hash(artifactBytes)}  ${filename}\n`);
    await fs.writeFile(
      path.join(output, 'fedora-build.json'),
      JSON.stringify(
        { ...manifest, files: undefined, artifact: filename, sha256: hash(artifactBytes) },
        null,
        2
      )
    );
    console.log(
      `Built ${artifact}\nOffline payload includes Node, SQLite/WASM and helper modules${developer ? ', development workspace/pnpm/nvm and offline Fedora RPM closure including PostgreSQL/SQLite utilities' : ''}. UNSIGNED: no publication command is enabled.`
    );
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
}

build().catch((error) => {
  console.error(`[FAIL] ${error.message}`);
  process.exitCode = 1;
});
