import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { installerSourceFiles } from './helper-build-state.js';

const packages = [
  'bash',
  'coreutils',
  'findutils',
  'gawk',
  'grep',
  'sed',
  'which',
  'git',
  'openssh-clients',
  'ca-certificates',
  'curl',
  'tar',
  'gzip',
  'xz',
  'unzip',
  'procps-ng',
  'java-25-openjdk-headless',
  'chromium',
  'gnupg2',
  'xdg-utils',
  'dnf5-plugins',
  'sudo',
  'shadow-utils',
  'gh',
  'postgresql',
  'sqlite',
];
const quote = (value) => `'${value.replace(/'/g, "'\\''")}'`;

function execute(command, args, { env = process.env, cwd, capture = false } = {}) {
  const result = spawnSync(command, args, {
    env: { ...env, LC_ALL: 'C' },
    cwd,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${command} failed (${result.status})${capture ? `: ${result.stderr}` : ''}`);
  return capture ? result.stdout.trim() : '';
}

export function rpmRows(text) {
  if (!text.trim()) throw new Error('RPM inventory is empty');
  return text
    .trim()
    .split('\n')
    .map((line) => {
      const [name, arch, version] = line.split('\t');
      if (
        !/^[a-zA-Z0-9._+-]+$/.test(name || '') ||
        !/^(x86_64|noarch|i686|\(none\))$/.test(arch || '') ||
        !/^[a-zA-Z0-9._+~^:-]+$/.test(version || '')
      )
        throw new Error(`Invalid RPM inventory row: ${line}`);
      return { name, arch, version };
    });
}

export function rpmUpdates(bundled, installed, compare) {
  return bundled.filter((item) => {
    const versions = installed.filter(
      (entry) => entry.name === item.name && entry.arch === item.arch
    );
    return !versions.length || versions.every((entry) => compare(entry.version, item.version) < 0);
  });
}

function replaceBinLinks(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) replaceBinLinks(file);
    else if (entry.isSymbolicLink()) {
      const target = fs.readlinkSync(file);
      const resolved = fs.realpathSync(file);
      const relative = path.relative(directory, resolved);
      if (path.basename(directory) !== '.bin' && !['npm', 'npx', 'corepack'].includes(entry.name))
        throw new Error(`Unexpected toolchain symlink: ${file}`);
      if (!fs.statSync(resolved).isFile() || path.isAbsolute(target))
        throw new Error(`Unsafe toolchain symlink: ${file}`);
      fs.unlinkSync(file);
      fs.writeFileSync(
        file,
        `#!/bin/sh\nHERE="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"\nexec "$HERE"/${quote(relative)} "$@"\n`,
        { mode: 0o755 }
      );
    }
  }
}

function repositoryMetadata(directory) {
  const container = `wurm-repository-build-${randomUUID()}`;
  let created = false;
  try {
    execute('podman', ['image', 'exists', 'registry.fedoraproject.org/fedora:44']);
    execute('podman', [
      'create',
      '--name',
      container,
      'registry.fedoraproject.org/fedora:44',
      'bash',
      '-c',
      'set -euo pipefail; dnf --assumeyes --disable-repo="*" --enable-repo=fedora --enable-repo=updates install createrepo_c; createrepo_c /rpms',
    ]);
    created = true;
    execute('podman', ['cp', directory, `${container}:/rpms`]);
    execute('podman', ['start', '--attach', container]);
    execute('podman', ['cp', `${container}:/rpms/repodata`, path.join(directory, 'repodata')]);
  } finally {
    if (created) execute('podman', ['rm', '--force', container]);
  }
}

export function buildDeveloperPayload({ project, payload, nodeArchive, nodeVersion, cache }) {
  const developer = path.join(payload, 'developer');
  const workspace = path.join(developer, 'workspace');
  const rpms = path.join(developer, 'rpms');
  fs.mkdirSync(workspace, { recursive: true });
  fs.mkdirSync(rpms);
  execute(
    'tar',
    ['-xJf', nodeArchive, '--strip-components=1', '-C', path.join(payload, 'runtime')],
    { cwd: project }
  );
  replaceBinLinks(path.join(payload, 'runtime'));
  for (const relative of installerSourceFiles(project)) {
    const source = path.join(project, relative);
    fs.mkdirSync(path.dirname(path.join(workspace, relative)), { recursive: true });
    fs.copyFileSync(source, path.join(workspace, relative));
  }
  const pnpmVersion = JSON.parse(
    fs.readFileSync(path.join(project, 'package.json'))
  ).packageManager.replace(/^pnpm@/, '');
  if (execute('pnpm', ['--version'], { capture: true }) !== pnpmVersion)
    throw new Error(`Build requires pinned pnpm ${pnpmVersion}`);
  const pnpmBinary = execute('pnpm', ['exec', 'node', '-p', 'process.env.npm_execpath'], {
    cwd: project,
    capture: true,
  });
  // pnpm 12 ships a standalone native executable; copying it avoids install-time bootstrapping.
  const resolvedPnpm = fs.realpathSync(pnpmBinary);
  const magic = fs.readFileSync(resolvedPnpm).subarray(0, 4);
  if (!magic.equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46])))
    throw new Error('Build requires the pinned standalone Linux pnpm executable');
  fs.copyFileSync(resolvedPnpm, path.join(payload, 'runtime/bin/pnpm'));
  fs.chmodSync(path.join(payload, 'runtime/bin/pnpm'), 0o755);
  const pnpmNotices = path.join(payload, 'runtime/share/pnpm');
  fs.mkdirSync(pnpmNotices, { recursive: true });
  for (const name of ['package.json', 'README.md', 'THIRD-PARTY-NOTICES.md'])
    fs.copyFileSync(path.join(path.dirname(resolvedPnpm), name), path.join(pnpmNotices, name));
  const nvmSource = process.env.NVM_DIR;
  if (!nvmSource || !fs.existsSync(path.join(nvmSource, 'nvm.sh')))
    throw new Error('Build the developer payload from an activated nvm environment');
  const nvmVersion = execute('bash', ['-c', '. "$NVM_DIR/nvm.sh" --no-use; nvm --version'], {
    capture: true,
  });
  if (nvmVersion !== '0.40.8') throw new Error('Build requires nvm 0.40.8');
  fs.mkdirSync(path.join(developer, 'nvm'));
  for (const name of ['nvm.sh', 'nvm-exec', 'bash_completion', 'LICENSE.md'])
    fs.copyFileSync(path.join(nvmSource, name), path.join(developer, 'nvm', name));
  const pnpmStore = path.join(developer, 'pnpm-store');
  const pnpmCache = path.join(developer, 'pnpm-cache');
  const workspaceSettingsFile = path.join(workspace, 'pnpm-workspace.yaml');
  const workspaceSettings = fs.readFileSync(workspaceSettingsFile, 'utf8');
  fs.appendFileSync(workspaceSettingsFile, `\ncacheDir: ${JSON.stringify(pnpmCache)}\n`);
  execute('pnpm', ['install', '--frozen-lockfile', '--store-dir', pnpmStore], { cwd: workspace });
  execute(
    'pnpm',
    ['install', '--offline', '--force', '--frozen-lockfile', '--store-dir', pnpmStore],
    {
      cwd: workspace,
    }
  );
  fs.writeFileSync(workspaceSettingsFile, workspaceSettings);
  // Store project registrations link to this temporary build workspace; only content is portable.
  fs.rmSync(path.join(pnpmStore, 'v11/projects'), { recursive: true, force: true });
  replaceBinLinks(path.join(workspace, 'node_modules'));
  for (const name of fs.readdirSync(path.join(workspace, 'scripts'))) {
    if (name.endsWith('.sh') || name === 'deploy')
      fs.chmodSync(path.join(workspace, 'scripts', name), 0o755);
  }
  execute('node', [path.join(project, 'scripts/w3c-local.js'), '--setup'], { cwd: project });
  fs.cpSync(path.join(project, '.w3c-tools'), path.join(workspace, '.w3c-tools'), {
    recursive: true,
  });
  const rpmCache = path.join(cache, 'developer-rpms');
  fs.mkdirSync(rpmCache, { recursive: true });
  execute(
    'dnf',
    [
      '--releasever=44',
      '--disable-repo=*',
      '--enable-repo=fedora',
      '--enable-repo=updates',
      '--setopt=install_weak_deps=False',
      'download',
      '--resolve',
      '--alldeps',
      '--arch=x86_64',
      '--arch=noarch',
      `--destdir=${rpmCache}`,
      ...packages,
    ],
    { cwd: project }
  );
  // Let DNF select the current closure in a clean destination; do not carry obsolete cached RPMs.
  const selected = execute(
    'dnf',
    [
      '--releasever=44',
      '--disable-repo=*',
      '--enable-repo=fedora',
      '--enable-repo=updates',
      '--setopt=install_weak_deps=False',
      'download',
      '--resolve',
      '--alldeps',
      '--arch=x86_64',
      '--arch=noarch',
      '--url',
      ...packages,
    ],
    { cwd: project, capture: true }
  )
    .split('\n')
    .filter((line) => /^https?:\/\//.test(line));
  if (!selected.length) throw new Error('No official Fedora RPM dependency closure resolved');
  const inventory = [];
  for (const url of selected) {
    const filename = decodeURIComponent(path.basename(new URL(url).pathname));
    if (!/^[a-zA-Z0-9._+~^-]+\.rpm$/.test(filename))
      throw new Error(`Invalid RPM filename: ${filename}`);
    const source = path.join(rpmCache, filename);
    if (!/signatures OK/.test(execute('rpm', ['--checksig', source], { capture: true })))
      throw new Error(`RPM has no verified publisher signature: ${filename}`);
    const [record] = rpmRows(
      execute(
        'rpm',
        ['-qp', '--qf', '%{NAME}\t%{ARCH}\t%{EPOCHNUM}:%{VERSION}-%{RELEASE}\n', source],
        { capture: true }
      )
    );
    if (!['x86_64', 'noarch'].includes(record.arch))
      throw new Error(`Unexpected RPM architecture in x64 payload: ${record.arch}`);
    inventory.push({ ...record, file: filename });
    fs.copyFileSync(source, path.join(rpms, filename));
  }
  const required = packages.map((name) => {
    const match = inventory.find(
      (item) => item.name === name && ['x86_64', 'noarch'].includes(item.arch)
    );
    if (!match)
      throw new Error(`Required developer package missing from the resolved closure: ${name}`);
    return match;
  });
  repositoryMetadata(rpms);
  fs.writeFileSync(
    path.join(developer, 'required-rpms.txt'),
    `${required.map((item) => item.file).join('\n')}\n`
  );
  const components = {
    node: nodeVersion,
    pnpm: pnpmVersion,
    nvm: nvmVersion,
    packages: JSON.parse(
      execute('pnpm', ['list', '--json', '--depth', 'Infinity'], { cwd: workspace, capture: true })
    ),
    rpms: inventory,
    requiredRpms: required,
    editor: 'external-vscode-required',
  };
  fs.writeFileSync(path.join(developer, 'components.json'), JSON.stringify(components, null, 2));
  return components;
}

export function installDeveloperProfile(
  payload,
  { env = process.env, approveSystemChanges = false } = {}
) {
  const developer = path.join(payload, 'developer');
  if (!fs.existsSync(path.join(developer, 'components.json')))
    throw new Error('This is a user-only installer. Build the complete developer installer first.');
  execute('code', ['--version'], { env, capture: true });
  const components = JSON.parse(fs.readFileSync(path.join(developer, 'components.json')));
  const installed = rpmRows(
    execute('rpm', ['-qa', '--qf', '%{NAME}\t%{ARCH}\t%{EPOCHNUM}:%{VERSION}-%{RELEASE}\n'], {
      env,
      capture: true,
    })
  );
  const compare = (left, right) => {
    const result = execute('rpm', ['--eval', `%{lua: print(rpm.vercmp("${left}", "${right}"))}`], {
      env,
      capture: true,
    });
    if (!/^-?[01]$/.test(result)) throw new Error('Could not compare RPM versions');
    return Number(result);
  };
  if (!Array.isArray(components.requiredRpms) || !components.requiredRpms.length)
    throw new Error('Developer payload has no required RPM component inventory');
  const managed = components.rpms.filter(
    (item) =>
      components.requiredRpms.some(
        (required) => required.name === item.name && required.arch === item.arch
      ) || installed.some((entry) => entry.name === item.name && entry.arch === item.arch)
  );
  const updates = rpmUpdates(managed, installed, compare);
  if (updates.length && !approveSystemChanges)
    throw new Error(
      `${updates.length} bundled system packages need installation/update. Rerun with --approve-system-changes to authorize an offline administrator transaction.`
    );
  if (updates.length) {
    const files = updates.map((item) => {
      if (item.file !== path.basename(item.file) || !item.file.endsWith('.rpm'))
        throw new Error('Invalid RPM component filename');
      const file = path.join(developer, 'rpms', item.file);
      if (!/signatures OK/.test(execute('rpm', ['--checksig', file], { env, capture: true })))
        throw new Error(`RPM has no verified publisher signature: ${file}`);
      return file;
    });
    execute(
      'sudo',
      [
        '--',
        'dnf',
        '--assumeyes',
        '--disable-repo=*',
        `--repofrompath=wurm-offline,${pathToFileURL(path.join(developer, 'rpms')).href}`,
        '--enable-repo=wurm-offline',
        '--setopt=wurm-offline.gpgcheck=True',
        '--setopt=localpkg_gpgcheck=True',
        '--setopt=install_weak_deps=False',
        'install',
        ...files,
      ],
      { env }
    );
  }
  const actualRpms = rpmRows(
    execute('rpm', ['-qa', '--qf', '%{NAME}\t%{ARCH}\t%{EPOCHNUM}:%{VERSION}-%{RELEASE}\n'], {
      env,
      capture: true,
    })
  );
  if (rpmUpdates(managed, actualRpms, compare).length)
    throw new Error('System package transaction did not satisfy every bundled component version');
  const toolVersions = {};
  for (const [command, args] of [
    ['git', ['--version']],
    ['java', ['--version']],
    ['chromium-browser', ['--version']],
    ['bash', ['--version']],
    ['code', ['--version']],
    ['psql', ['--version']],
    ['pg_dump', ['--version']],
    ['pg_restore', ['--version']],
    ['pg_isready', ['--version']],
    ['sqlite3', ['--version']],
  ])
    toolVersions[command] = execute(command, args, { env, capture: true });
  const base = path.join(
    env.XDG_DATA_HOME || path.join(env.HOME, '.local/share'),
    'wurm-tools/developer'
  );
  const version = JSON.parse(
    fs.readFileSync(path.join(payload, 'installer-manifest.json'))
  ).version;
  const workspace = path.join(base, 'workspaces', `${version}-${randomUUID()}`);
  fs.mkdirSync(path.dirname(workspace), { recursive: true, mode: 0o700 });
  fs.cpSync(path.join(developer, 'workspace'), workspace, { recursive: true });
  const nvmDirectory = path.join(base, 'toolchains', `${version}-${randomUUID()}`);
  const runtime = path.join(nvmDirectory, 'versions/node', `v${components.node}`);
  fs.mkdirSync(path.dirname(runtime), { recursive: true, mode: 0o700 });
  fs.cpSync(path.join(payload, 'runtime'), runtime, { recursive: true });
  fs.cpSync(path.join(developer, 'nvm'), nvmDirectory, { recursive: true });
  const pnpmStore = path.join(base, 'pnpm-stores', `${version}-${randomUUID()}`);
  fs.mkdirSync(path.dirname(pnpmStore), { recursive: true, mode: 0o700 });
  fs.cpSync(path.join(developer, 'pnpm-store'), pnpmStore, { recursive: true });
  const pnpmCache = path.join(base, 'pnpm-caches', `${version}-${randomUUID()}`);
  fs.mkdirSync(path.dirname(pnpmCache), { recursive: true, mode: 0o700 });
  fs.cpSync(path.join(developer, 'pnpm-cache'), pnpmCache, { recursive: true });
  fs.appendFileSync(
    path.join(workspace, 'pnpm-workspace.yaml'),
    `\nstoreDir: ${JSON.stringify(pnpmStore)}\ncacheDir: ${JSON.stringify(pnpmCache)}\noffline: true\n`
  );
  fs.writeFileSync(
    path.join(workspace, 'activate.sh'),
    `#!/bin/bash\nexport NVM_DIR=${quote(nvmDirectory)}\nsource "$NVM_DIR/nvm.sh" --no-use\nnvm use --silent ${quote(components.node)} || return 1\nexport PATH=${quote(`${workspace}/scripts`)}:${quote(`${workspace}/node_modules/.bin`)}:"$PATH"\n`,
    { mode: 0o600 }
  );
  const settingsFile = path.join(workspace, '.vscode/settings.json');
  fs.mkdirSync(path.dirname(settingsFile), { recursive: true });
  const settings = fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile)) : {};
  settings['terminal.integrated.env.linux'] = {
    ...settings['terminal.integrated.env.linux'],
    PATH: `${runtime}/bin:\${workspaceFolder}/scripts:\${env:PATH}`,
    NVM_DIR: nvmDirectory,
  };
  fs.writeFileSync(settingsFile, `${JSON.stringify(settings, null, 2)}\n`);
  execute('git', ['init', '--initial-branch=main', workspace], { env, capture: true });
  fs.mkdirSync(path.join(workspace, '.git/info'), { recursive: true });
  fs.appendFileSync(
    path.join(workspace, '.git/info/exclude'),
    '\n/activate.sh\n/.vscode/settings.json\n'
  );
  execute('git', ['-C', workspace, 'add', '--all'], { env, capture: true });
  execute(
    'git',
    ['-C', workspace, 'remote', 'add', 'origin', 'https://github.com/trrmann/wurm-tools.git'],
    { env, capture: true }
  );
  fs.writeFileSync(
    path.join(base, 'installed-components.json'),
    JSON.stringify(
      {
        ...components,
        actualRpms: actualRpms.filter((entry) =>
          components.rpms.some((item) => entry.name === item.name && entry.arch === item.arch)
        ),
        toolVersions,
        runtime,
        nvmDirectory,
        pnpmStore,
        pnpmCache,
        workspace,
        installedAt: new Date().toISOString(),
      },
      null,
      2
    ),
    { mode: 0o600 }
  );
  fs.writeFileSync(
    path.join(base, 'wurm-dev'),
    `#!/bin/bash\nset -euo pipefail\nsource ${quote(path.join(workspace, 'activate.sh'))}\ncd -- ${quote(workspace)}\nif [[ $# -eq 0 ]]; then exec bash --noprofile --rcfile ${quote(path.join(workspace, 'activate.sh'))} -i; fi\nexec "$@"\n`,
    { mode: 0o700 }
  );
  console.log(
    `Developer environment prepared: ${workspace}\nLaunch: ${path.join(base, 'wurm-dev')}\nExisting workspaces/edits were not changed. Source snapshot staged in a fresh repository; local activation/editor settings excluded. Git credentials/signing keys/history were not copied. Reconcile the snapshot with upstream and configure Git identity before production deployment, which still requires network and explicit approval.`
  );
}
