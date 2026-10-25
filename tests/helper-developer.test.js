import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { installDeveloperProfile, rpmRows, rpmUpdates } from '../scripts/helper-developer.js';

vi.mock('node:child_process', () => ({ spawnSync: vi.fn() }));
const directories = [];
afterEach(() => {
  vi.resetAllMocks();
  for (const directory of directories.splice(0))
    fs.rmSync(directory, { recursive: true, force: true });
});
function fixture({ missingEditor = false, installedVersion = '0:1-1' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'developer profile # %-'));
  directories.push(root);
  const payload = path.join(root, 'payload');
  fs.mkdirSync(path.join(payload, 'developer/workspace/scripts'), { recursive: true });
  fs.mkdirSync(path.join(payload, 'developer/rpms'));
  fs.mkdirSync(path.join(payload, 'developer/pnpm-store'));
  fs.mkdirSync(path.join(payload, 'developer/pnpm-cache'));
  fs.mkdirSync(path.join(payload, 'developer/nvm'));
  fs.writeFileSync(path.join(payload, 'developer/nvm/nvm.sh'), 'test nvm');
  fs.mkdirSync(path.join(payload, 'runtime/bin'), { recursive: true });
  fs.writeFileSync(path.join(payload, 'runtime/bin/node'), 'test runtime');
  fs.writeFileSync(path.join(payload, 'developer/rpms/bash.rpm'), 'test rpm');
  fs.writeFileSync(
    path.join(payload, 'developer/workspace/scripts/deploy'),
    'test deployment entry'
  );
  fs.writeFileSync(path.join(payload, 'installer-manifest.json'), '{"version":"1.5.2"}');
  fs.writeFileSync(
    path.join(payload, 'developer/components.json'),
    JSON.stringify({
      rpms: [{ name: 'bash', arch: 'x86_64', version: '0:2-1', file: 'bash.rpm' }],
      requiredRpms: [{ name: 'bash', arch: 'x86_64', version: '0:2-1', file: 'bash.rpm' }],
      node: '24.22.1',
      pnpm: 'test',
      packages: {},
    })
  );
  const env = { ...process.env, HOME: root, XDG_DATA_HOME: path.join(root, 'data') };
  const calls = [];
  let updated = false;
  vi.mocked(spawnSync).mockImplementation((command, args, options) => {
    calls.push({ command, args, options });
    if (command === 'code' && missingEditor)
      return {
        error: Object.assign(
          new Error('VS Code missing; provision its official offline installer first'),
          { code: 'ENOENT' }
        ),
      };
    let stdout = '';
    if (command === 'rpm' && args[0] === '--checksig') stdout = 'digests signatures OK';
    if (command === 'sudo') updated = true;
    if (command === 'rpm' && args[0] === '-qa')
      stdout = `bash\tx86_64\t${updated ? '0:2-1' : installedVersion}\n`;
    if (command === 'rpm' && args[0] === '--eval')
      stdout = args[1].includes('"0:2-1", "0:2-1"')
        ? '0'
        : installedVersion === '0:3-1'
          ? '1'
          : '-1';
    return { status: 0, stdout, stderr: '' };
  });
  return { root, payload, env, calls };
}
describe('offline developer profile', () => {
  it('compares every bundled component, adding absent packages without downgrading newer ones', () => {
    const bundled = [
      { name: 'bash', arch: 'x86_64', version: '2' },
      { name: 'git', arch: 'x86_64', version: '2' },
    ];
    expect(
      rpmUpdates(
        bundled,
        [{ name: 'bash', arch: 'x86_64', version: '3' }],
        (a, b) => Number(a) - Number(b)
      )
    ).toEqual([bundled[1]]);
    expect(rpmRows('bash\tx86_64\t0:5.3-1.fc44')).toEqual([
      { name: 'bash', arch: 'x86_64', version: '0:5.3-1.fc44' },
    ]);
    expect(() => rpmRows('bash\tx86_64\t"%{unsafe}"')).toThrow('Invalid');
    expect(() => rpmRows('')).toThrow('empty');
  });
  it('blocks missing editor and absent developer payload before any system/workspace changes', () => {
    const data = fixture({ missingEditor: true });
    expect(() =>
      installDeveloperProfile(data.payload, { env: data.env, approveSystemChanges: true })
    ).toThrow('VS Code missing');
    expect(data.calls.some((call) => call.command === 'sudo')).toBe(false);
    expect(fs.existsSync(path.join(data.env.XDG_DATA_HOME, 'wurm-tools/developer'))).toBe(false);
    expect(() => installDeveloperProfile(data.root, { env: data.env })).toThrow('user-only');
  });
  it('requires explicit approval and disables every repository during offline system installation', () => {
    const data = fixture();
    expect(() => installDeveloperProfile(data.payload, { env: data.env })).toThrow(
      '--approve-system-changes'
    );
    expect(data.calls.some((call) => call.command === 'sudo')).toBe(false);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      installDeveloperProfile(data.payload, { env: data.env, approveSystemChanges: true });
    } finally {
      log.mockRestore();
    }
    const install = data.calls.find((call) => call.command === 'sudo');
    expect(install.args).toContain('--disable-repo=*');
    expect(install.args).toContain('--setopt=localpkg_gpgcheck=True');
    expect(install.args.find((arg) => arg.startsWith('--repofrompath='))).toContain('%23');
    expect(install.args).not.toContain('--nogpgcheck');
    expect(install.args.some((arg) => /^https?:/.test(arg))).toBe(false);
    expect(data.calls.some((call) => ['curl', 'wget', 'pnpm'].includes(call.command))).toBe(false);
  });
  it('retains newer packages and existing developer edits; generates a scoped deployment PATH', () => {
    const data = fixture({ installedVersion: '0:3-1' });
    const componentFile = path.join(data.payload, 'developer/components.json');
    const components = JSON.parse(fs.readFileSync(componentFile));
    components.rpms.push({
      name: 'fedora-release-identity-basic',
      arch: 'noarch',
      version: '0:44-18',
      file: 'unused-provider.rpm',
    });
    fs.writeFileSync(componentFile, JSON.stringify(components));
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      installDeveloperProfile(data.payload, { env: data.env });
      const base = path.join(data.env.XDG_DATA_HOME, 'wurm-tools/developer');
      const first = JSON.parse(
        fs.readFileSync(path.join(base, 'installed-components.json'))
      ).workspace;
      fs.writeFileSync(path.join(first, 'local-edits.js'), 'my local changes');
      installDeveloperProfile(data.payload, { env: data.env });
      const second = JSON.parse(
        fs.readFileSync(path.join(base, 'installed-components.json'))
      ).workspace;
      expect(first).not.toBe(second);
      expect(fs.readFileSync(path.join(first, 'local-edits.js'), 'utf8')).toBe('my local changes');
      const activation = fs.readFileSync(path.join(second, 'activate.sh'), 'utf8');
      expect(activation).toContain('/toolchains/');
      expect(activation).toContain('/scripts');
      expect(activation).toContain('source "$NVM_DIR/nvm.sh"');
      expect(activation).toContain('nvm use --silent');
      const workspaceConfig = fs.readFileSync(path.join(second, 'pnpm-workspace.yaml'), 'utf8');
      expect(workspaceConfig).toContain('offline: true');
      expect(workspaceConfig).toContain('/pnpm-stores/');
      expect(workspaceConfig).toContain('/pnpm-caches/');
      expect(fs.existsSync(path.join(base, 'wurm-dev'))).toBe(true);
      for (const command of ['psql', 'pg_dump', 'pg_restore', 'sqlite3'])
        expect(data.calls.some((call) => call.command === command)).toBe(true);
      expect(
        data.calls.some((call) => ['initdb', 'postgres', 'pg_ctl'].includes(call.command))
      ).toBe(false);
      expect(data.calls.some((call) => call.command === 'sudo')).toBe(false);
      expect(data.calls.some((call) => call.command === 'git' && call.args.includes('push'))).toBe(
        false
      );
    } finally {
      log.mockRestore();
    }
  });
});
