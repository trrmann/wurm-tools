import { afterEach, describe, expect, it } from 'vitest';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const folders = [];
afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});

function setup(extra = {}) {
  const folder = mkdtempSync(path.join(tmpdir(), 'wurm-setup-'));
  folders.push(folder);
  for (const directory of ['scripts', 'bin', 'node_modules', 'nvm'])
    mkdirSync(path.join(folder, directory));
  copyFileSync(
    fileURLToPath(new URL('../scripts/setup.sh', import.meta.url)),
    path.join(folder, 'scripts/setup.sh')
  );
  writeFileSync(path.join(folder, 'scripts/deploy'), '');
  writeFileSync(path.join(folder, '.setup-complete'), 'previous run');
  writeFileSync(path.join(folder, '.nvmrc'), '24.22.1\n');
  writeFileSync(path.join(folder, 'nvm/nvm.sh'), 'nvm() { return 0; }\n');
  const log = path.join(folder, 'commands');
  writeFileSync(log, '');
  for (const command of ['dnf', 'sudo', 'java', 'node', 'pnpm', 'git', 'google-chrome', 'id']) {
    writeFileSync(
      path.join(folder, 'bin', command),
      `#!/bin/sh
echo '${command}' "$@" >> "$SETUP_LOG"
case '${command}' in
  id) echo 0 ;;
  node) if [ "$1" = -p ]; then echo "\${TEST_NODE_MAJOR:-24}"; elif [ "$1" = -v ]; then echo "v\${TEST_NODE_MAJOR:-24}.0.0"; fi ;;
  java) if [ "$JAVA_PRESENT" = yes ] || [ -f "$JAVA_INSTALLED" ]; then echo 'openjdk 21.0.1'; else exit 1; fi ;;
  dnf) touch "$JAVA_INSTALLED" ;;
  pnpm) if [ "$1" = --version ]; then echo "\${TEST_PNPM_VERSION:-12.15.0}"; elif [ "$FAIL_W3C" = yes ] && [ "$2" = test:w3c:setup ]; then echo 'download failed' >&2; exit 1; fi ;;
esac
exit 0
`,
      { mode: 0o755 }
    );
  }
  const result = spawnSync('bash', [path.join(folder, 'scripts/setup.sh')], {
    env: {
      ...process.env,
      PATH: `${folder}/bin:${process.env.PATH}`,
      SETUP_LOG: log,
      JAVA_INSTALLED: path.join(folder, 'installed'),
      NVM_DIR: path.join(folder, 'nvm'),
      ...extra,
    },
    encoding: 'utf8',
  });
  return {
    ...result,
    log: readFileSync(log, 'utf8'),
    marker: readFileSync(path.join(folder, '.setup-complete'), 'utf8'),
  };
}

describe.skipIf(process.platform === 'win32')('Fedora W3C developer prerequisites', () => {
  it('requires nvm instead of silently using system Node', () => {
    const result = setup({ NVM_DIR: '/nonexistent-wurm-test-nvm' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('nvm is missing');
    expect(result.marker).toBe('previous run');
  });
  it('rejects a different pnpm version before restoring dependencies', () => {
    const result = setup({ TEST_PNPM_VERSION: '10.0.0' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('pnpm 12.15.0 is required');
    expect(result.log).not.toContain('pnpm install');
    expect(result.marker).toBe('previous run');
  });
  it('rejects an older Node runtime without installing a competing system Node', () => {
    const result = setup({ TEST_NODE_MAJOR: '22' });
    expect(result.status).toBe(1);
    expect(result.log).not.toContain('dnf install -y nodejs');
    expect(result.stderr).toContain('Node.js 24+ required, found v22.0.0');
    expect(result.log).not.toContain('pnpm run test:w3c:setup');
    expect(result.marker).toBe('previous run');
  });
  it('installs missing Java and prepares validators despite a previous completion marker', () => {
    const result = setup();
    expect(result.status, result.stderr).toBe(0);
    expect(result.log).toContain('dnf install -y java-21-openjdk-headless');
    expect(result.log).toContain('pnpm run test:w3c:setup');
    expect(result.log).not.toContain('pnpm install --frozen-lockfile');
  });
  it('reuses supported Java and still checks validator downloads', () => {
    const result = setup({ JAVA_PRESENT: 'yes' });
    expect(result.status, result.stderr).toBe(0);
    expect(result.log).not.toContain('dnf install');
    expect(result.log).toContain('pnpm run test:w3c:setup');
  });
  it('fails explicitly and does not update the marker when validator preparation fails', () => {
    const result = setup({ JAVA_PRESENT: 'yes', FAIL_W3C: 'yes' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('download failed');
    expect(result.marker).toBe('previous run');
  });
});
