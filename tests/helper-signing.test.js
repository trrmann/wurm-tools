import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { signing } from '../scripts/sign-helper-installer.js';
import {
  parseSecretKeys,
  requireHardwareSigner,
  requireLocalSigner,
} from '../scripts/provision-helper-signing.js';

const available = spawnSync('gpg', ['--version'], { stdio: 'ignore' }).status === 0;
describe.skipIf(!available)(
  'local installer signing with an isolated disposable test identity',
  () => {
    let root, env, expected, output;
    function command(args) {
      const result = spawnSync('gpg', ['--batch', ...args], { env, encoding: 'utf8' });
      if (result.error || result.status !== 0) throw result.error || new Error(result.stderr);
      return result.stdout;
    }
    function fixture() {
      const directory = fs.mkdtempSync(path.join(root, 'build-'));
      const artifact = 'test-unsigned.run';
      fs.writeFileSync(path.join(directory, artifact), 'test installer');
      fs.writeFileSync(
        path.join(directory, 'fedora-build.json'),
        JSON.stringify({
          format: 1,
          version: '1.5.2',
          platform: 'linux',
          arch: 'x64',
          artifact,
          sha256: createHash('sha256').update('test installer').digest('hex'),
          publicReleaseAllowed: false,
          trust: 'unsigned-test-only',
        })
      );
      return directory;
    }
    beforeAll(() => {
      root = fs.mkdtempSync(path.join(os.tmpdir(), 'wurm-signing-test-'));
      const home = path.join(root, 'gpg');
      fs.mkdirSync(home, { mode: 0o700 });
      env = { ...process.env, GNUPGHOME: home };
      // This unprotected identity is disposable test data, never a production signer.
      command([
        '--pinentry-mode',
        'loopback',
        '--passphrase',
        '',
        '--quick-generate-key',
        'Installer disposable test <installer-test@example.invalid>',
        'ed25519',
        'sign',
        '1d',
      ]);
      expected = command(['--with-colons', '--fingerprint', '--list-secret-keys'])
        .split('\n')
        .find((line) => line.startsWith('fpr:'))
        .split(':')[9];
      output = vi.spyOn(console, 'log').mockImplementation(() => {});
    });
    afterAll(() => {
      output?.mockRestore();
      if (env) spawnSync('gpgconf', ['--kill', 'gpg-agent'], { env, stdio: 'ignore' });
      if (root) fs.rmSync(root, { recursive: true, force: true });
    });
    it('parses real GPG storage markers and rejects the disposable software key as a hardware signer', () => {
      const keys = parseSecretKeys(
        command([
          '--with-colons',
          '--with-secret',
          '--with-fingerprint',
          '--list-secret-keys',
          expected,
        ])
      );
      expect(keys[0]).toMatchObject({ kind: 'sec', storage: '+', fingerprint: expected });
      expect(() =>
        requireHardwareSigner(
          {
            serial: 'D2760001240103040006123456780000',
            signingFingerprint: expected,
          },
          keys,
          expected
        )
      ).toThrow('SUBKEY');
    });
    it('recognizes a real password-protected local certification identity and signing subkey', () => {
      // Only disposable keys in the temporary test keyring use a test password argument.
      const password = 'disposable-test-only-not-a-production-password';
      const uid = 'Local disposable test <local-test@example.invalid>';
      command([
        '--pinentry-mode',
        'loopback',
        '--passphrase',
        password,
        '--quick-generate-key',
        uid,
        'rsa3072',
        'cert',
        '2y',
      ]);
      const list = () =>
        parseSecretKeys(
          command([
            '--with-colons',
            '--with-secret',
            '--with-fingerprint',
            '--with-subkey-fingerprint',
            '--list-secret-keys',
            uid,
          ])
        );
      const primary = list()[0].fingerprint;
      command([
        '--pinentry-mode',
        'loopback',
        '--passphrase',
        password,
        '--quick-add-key',
        primary,
        'rsa3072',
        'sign',
        '1y',
      ]);
      const keys = list();
      const subkey = requireLocalSigner(keys);
      expect(keys[0]).toMatchObject({ fingerprint: primary, storage: '+', kind: 'sec' });
      expect(subkey).toMatchObject({ storage: '+', kind: 'ssb', capabilities: 's' });
      expect(() =>
        requireHardwareSigner(
          {
            serial: 'D2760001240103040006123456780000',
            signingFingerprint: subkey.fingerprint,
          },
          keys,
          subkey.fingerprint
        )
      ).toThrow('connected token');
    }, 30000);
    it('signs both immutable outputs and verifies the exact expected identity without approving public release', () => {
      const directory = fixture();
      const options = { directory, expectedFingerprint: expected, env };
      signing({ ...options, action: 'sign' });
      signing({ ...options, action: 'verify' });
      expect(
        JSON.parse(fs.readFileSync(path.join(directory, 'fedora-build.json'))).publicReleaseAllowed
      ).toBe(false);
      expect(() => signing({ ...options, action: 'sign' })).toThrow('already exists');
    });
    it('resumes a partially signed installer without overwriting the completed signature', () => {
      const directory = fixture();
      const options = { directory, expectedFingerprint: expected, env };
      signing({ ...options, action: 'sign' });
      const metadataSignature = path.join(directory, 'fedora-build.json.asc');
      const before = fs.readFileSync(metadataSignature);
      const stat = fs.statSync(metadataSignature);
      fs.unlinkSync(path.join(directory, 'test-unsigned.run.asc'));
      signing({ ...options, action: 'check-existing' });
      expect(fs.existsSync(path.join(directory, 'test-unsigned.run.asc'))).toBe(false);
      signing({ ...options, action: 'resume' });
      signing({ ...options, action: 'verify' });
      expect(fs.readFileSync(metadataSignature)).toEqual(before);
      expect(fs.statSync(metadataSignature).mtimeMs).toBe(stat.mtimeMs);
      const installerSignature = fs.readFileSync(path.join(directory, 'test-unsigned.run.asc'));
      signing({ ...options, action: 'resume' });
      expect(fs.readFileSync(path.join(directory, 'test-unsigned.run.asc'))).toEqual(
        installerSignature
      );
    });
    it('does not replace or ignore invalid or wrong-key signatures during recovery', () => {
      const directory = fixture();
      const options = { directory, expectedFingerprint: expected, env };
      signing({ ...options, action: 'sign' });
      const signature = path.join(directory, 'fedora-build.json.asc');
      const valid = fs.readFileSync(signature);
      fs.unlinkSync(path.join(directory, 'test-unsigned.run.asc'));
      expect(() =>
        signing({ ...options, expectedFingerprint: 'A'.repeat(40), action: 'resume' })
      ).toThrow('exact expected');
      expect(fs.readFileSync(signature)).toEqual(valid);
      fs.writeFileSync(signature, 'invalid signature');
      expect(() => signing({ ...options, action: 'resume' })).toThrow('GPG failed');
      expect(fs.readFileSync(signature, 'utf8')).toBe('invalid signature');
      expect(fs.existsSync(path.join(directory, 'test-unsigned.run.asc'))).toBe(false);
    });
    it('rejects missing or abbreviated fingerprints, missing signatures and tampered build bytes', () => {
      const directory = fixture();
      const options = { directory, expectedFingerprint: expected, env };
      expect(() => signing({ ...options, expectedFingerprint: '', action: 'sign' })).toThrow(
        'full signing'
      );
      expect(() =>
        signing({ ...options, expectedFingerprint: expected.slice(-16), action: 'sign' })
      ).toThrow('full signing');
      expect(() => signing({ ...options, action: 'verify' })).toThrow('GPG failed');
      fs.appendFileSync(path.join(directory, 'test-unsigned.run'), 'changed');
      expect(() => signing({ ...options, action: 'sign' })).toThrow('hash');
    });
    it('rejects a different expected signer and changed signed metadata', () => {
      const directory = fixture();
      const options = { directory, expectedFingerprint: expected, env };
      signing({ ...options, action: 'sign' });
      expect(() =>
        signing({ ...options, expectedFingerprint: 'A'.repeat(40), action: 'verify' })
      ).toThrow('exact expected');
      const file = path.join(directory, 'fedora-build.json');
      const metadata = JSON.parse(fs.readFileSync(file));
      metadata.version = '9.9.9';
      fs.writeFileSync(file, JSON.stringify(metadata));
      expect(() => signing({ ...options, action: 'verify' })).toThrow('GPG failed');
    });
    it('does not leave success-shaped signatures when the requested signing identity is absent', () => {
      const directory = fixture();
      expect(() =>
        signing({ action: 'sign', directory, expectedFingerprint: 'A'.repeat(40), env })
      ).toThrow('GPG failed');
      expect(fs.readdirSync(directory).some((name) => name.endsWith('.asc'))).toBe(false);
    });
    it('rejects an otherwise valid signature after its signing key expires', () => {
      const directory = fixture();
      const time = String(Math.floor(Date.now() / 1000) - 3 * 24 * 60 * 60);
      command([
        '--faked-system-time',
        time,
        '--pinentry-mode',
        'loopback',
        '--passphrase',
        '',
        '--quick-generate-key',
        'Expired disposable test <expired-test@example.invalid>',
        'ed25519',
        'sign',
        '1d',
      ]);
      const expired = command([
        '--with-colons',
        '--fingerprint',
        '--list-secret-keys',
        'expired-test@example.invalid',
      ])
        .split('\n')
        .find((line) => line.startsWith('fpr:'))
        .split(':')[9];
      for (const name of ['fedora-build.json', 'test-unsigned.run']) {
        const file = path.join(directory, name);
        command([
          '--faked-system-time',
          time,
          '--local-user',
          `${expired}!`,
          '--armor',
          '--detach-sign',
          '--output',
          `${file}.asc`,
          file,
        ]);
      }
      expect(() =>
        signing({ action: 'verify', directory, expectedFingerprint: expired, env })
      ).toThrow(/expired|GPG failed/);
    });
  }
);
