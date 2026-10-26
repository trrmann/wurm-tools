import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  installationRoot,
  main,
  verifyPayload,
  dataLocations,
  waitHealth,
} from '../scripts/helper-installer.js';
import { createServer } from '../scripts/wurm-local.js';

const directories = [];
function payload() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'helper-payload-'));
  directories.push(directory);
  const manifest = { format: 1, platform: 'linux', arch: 'x64', version: '1.5.2', files: {} };
  for (const relative of [
    'runtime/bin/node',
    'scripts/wurm-local.js',
    'scripts/helper-installer.js',
  ]) {
    fs.mkdirSync(path.dirname(path.join(directory, relative)), { recursive: true });
    fs.writeFileSync(path.join(directory, relative), 'payload');
    manifest.files[relative] = createHash('sha256').update('payload').digest('hex');
  }
  const save = () =>
    fs.writeFileSync(path.join(directory, 'installer-manifest.json'), JSON.stringify(manifest));
  save();
  return { directory, manifest, save };
}
afterEach(() => {
  for (const directory of directories.splice(0))
    fs.rmSync(directory, { recursive: true, force: true });
});

describe('offline helper installer', () => {
  it('confirms shutdown with a fresh probe after a socket closes during transition', async () => {
    const closed = new Error('Cannot inspect helper port: fetch failed', {
      cause: new TypeError('fetch failed', { cause: { code: 'UND_ERR_SOCKET' } }),
    });
    const inspect = vi.fn().mockRejectedValueOnce(closed).mockResolvedValue(null);
    await waitHealth({}, false, { inspect });
    expect(inspect).toHaveBeenCalledTimes(2);
  });
  it('does not turn persistent transport failures or unexpected errors into a shutdown pass', async () => {
    const closed = new Error('Cannot inspect helper port: fetch failed', {
      cause: new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } }),
    });
    await expect(
      waitHealth({}, false, { inspect: vi.fn().mockRejectedValue(closed), timeoutMs: 0 })
    ).rejects.toThrow('did not stop');
    const unexpected = new Error('Unexpected health response');
    await expect(
      waitHealth({}, false, { inspect: vi.fn().mockRejectedValue(unexpected) })
    ).rejects.toBe(unexpected);
  });
  it('uses per-user data locations, not the checkout', () => {
    expect(installationRoot({}, '/home/a user')).toBe(
      '/home/a user/.local/share/wurm-tools/helper'
    );
    expect(installationRoot({ XDG_DATA_HOME: '/custom' })).toBe('/custom/wurm-tools/helper');
  });
  it('freezes absolute data defaults and relative overrides for use from other shells/login startup', async () => {
    const defaults = await dataLocations(path.resolve('.'), {
      XDG_DATA_HOME: '/custom/data',
      XDG_CONFIG_HOME: '/custom/config',
    });
    expect(defaults).toEqual({
      WURM_HEROES_DB_PATH: '/custom/data/wurm-tools/heroes.db',
      HEROES_IDENTITY_PATH: '/custom/data/wurm-tools/heroes.db.identity',
      WURM_HELPER_AUTH_FILE: '/custom/config/wurm-tools/helper-auth.json',
      WURM_MAP_BASELINE_PATH: '/custom/data/wurm-tools/map-baseline.db',
    });
    const overrides = await dataLocations(path.resolve('.'), {
      WURM_HEROES_DB_PATH: 'my-data/heroes.db',
      HEROES_IDENTITY_PATH: 'my-data/identity',
      WURM_HELPER_AUTH_FILE: 'my-data/pairing',
      WURM_MAP_BASELINE_PATH: 'my-data/maps',
    });
    expect(Object.values(overrides).every((value) => path.isAbsolute(value))).toBe(true);
    expect(overrides.HEROES_IDENTITY_PATH).toBe(path.resolve('my-data/identity'));
  });
  it('accepts a complete payload and rejects changed, missing and unlisted files', () => {
    const { directory } = payload();
    expect(verifyPayload(directory).version).toBe('1.5.2');
    fs.writeFileSync(path.join(directory, 'extra.js'), 'unexpected');
    expect(() => verifyPayload(directory)).toThrow('Unlisted');
    fs.unlinkSync(path.join(directory, 'extra.js'));
    fs.writeFileSync(path.join(directory, 'scripts/wurm-local.js'), 'changed');
    expect(() => verifyPayload(directory)).toThrow('integrity');
    fs.unlinkSync(path.join(directory, 'scripts/wurm-local.js'));
    expect(() => verifyPayload(directory)).toThrow('Missing');
  });
  it('rejects traversal, absolute paths, malformed manifests and missing entry points', () => {
    const { directory, manifest, save } = payload();
    for (const relative of ['../outside', '/outside', 'scripts\\file', './scripts/file']) {
      manifest.files[relative] = 'a'.repeat(64);
      save();
      expect(() => verifyPayload(directory)).toThrow('Unsafe');
      delete manifest.files[relative];
    }
    manifest.version = 'not-a-version';
    save();
    expect(() => verifyPayload(directory)).toThrow('Unsupported');
    manifest.version = '1.5.2';
    delete manifest.files['scripts/wurm-local.js'];
    fs.unlinkSync(path.join(directory, 'scripts/wurm-local.js'));
    save();
    expect(() => verifyPayload(directory)).toThrow('Missing required');
  });
  it('rejects symlink files and symlink parent directories', () => {
    const { directory } = payload();
    fs.renameSync(path.join(directory, 'runtime'), path.join(directory, 'other-runtime'));
    fs.symlinkSync('other-runtime', path.join(directory, 'runtime'));
    expect(() => verifyPayload(directory)).toThrow('Not a regular');
  });
  it('requires consent and rejects unknown installation options', async () => {
    await expect(main(['install'])).rejects.toThrow('consent');
    await expect(main(['install', '--yes', '--typo'])).rejects.toThrow('Unknown');
    await expect(main(['start', '--typo'])).rejects.toThrow('Unknown');
  });
  it('exposes only nonsecret installation ownership in health, preserving legacy health shape', async () => {
    for (const env of [
      {},
      { WURM_INSTALLATION_ID: 'installation-123', WURM_HELPER_TOKEN: 'secret' },
    ]) {
      const server = createServer({ env });
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
      });
      try {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/health`);
        expect(await response.json()).toEqual(
          env.WURM_INSTALLATION_ID ? { ok: true, installationId: 'installation-123' } : { ok: true }
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    }
  });
});
