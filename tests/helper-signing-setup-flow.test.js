import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { provision } from '../scripts/provision-helper-signing.js';
import { signing } from '../scripts/sign-helper-installer.js';
import { assertCurrentInstaller } from '../scripts/helper-build-state.js';

vi.mock('node:child_process', () => ({ spawnSync: vi.fn() }));
vi.mock('node:readline/promises', () => ({ createInterface: vi.fn() }));
vi.mock('../scripts/sign-helper-installer.js', () => ({ signing: vi.fn() }));
vi.mock('../scripts/helper-build-state.js', () => ({ assertCurrentInstaller: vi.fn() }));

const primary = 'A'.repeat(40);
const fingerprint = 'B'.repeat(40);
const serial = 'D2760001240103040006123456780000';
const secretListing = (storage) => {
  const row = (kind, caps, marker, value) => {
    const fields = Array(16).fill('');
    Object.assign(fields, { 0: kind, 1: 'u', 6: '4102444800', 11: caps, 14: marker });
    return `${fields.join(':')}\nfpr:::::::::${value}:`;
  };
  return `${row('sec', 'cSC', storage, primary)}\n${row('ssb', 's', serial, fingerprint)}`;
};
let directory;
let rl;
let cardFingerprint;
let storage;
let output;
let inputDescriptor;
let outputDescriptor;

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'wurm-signing-flow-'));
  inputDescriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  outputDescriptor = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
  Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
  Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
  vi.spyOn(process, 'getuid').mockReturnValue(1000);
  vi.spyOn(fs, 'lstatSync').mockReturnValue({
    isSymbolicLink: () => false,
    isDirectory: () => true,
    isFile: () => true,
    uid: 1000,
    mode: 0o40700,
  });
  output = vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(fs, 'readdirSync').mockReturnValue([]);
  rl = { question: vi.fn(), pause: vi.fn(), close: vi.fn() };
  createInterface.mockReturnValue(rl);
  cardFingerprint = fingerprint;
  storage = '#';
  spawnSync.mockImplementation((command, args) => {
    let stdout;
    if (command === 'tty') stdout = '/dev/pts/1\n';
    else if (command === 'gpg-connect-agent') stdout = `S SERIALNO ${serial}\nOK\n`;
    else if (command === 'gpg' && args.includes('--card-status'))
      stdout = `openpgp-card:\nserial:12345678:\nfpr:${cardFingerprint}:::\n`;
    else if (command === 'gpg' && args.includes('--list-secret-keys'))
      stdout = secretListing(storage);
    else throw new Error(`Unexpected process: ${command} ${args.join(' ')}`);
    return { status: 0, stdout, stderr: '' };
  });
});

afterEach(() => {
  if (inputDescriptor) Object.defineProperty(process.stdin, 'isTTY', inputDescriptor);
  else delete process.stdin.isTTY;
  if (outputDescriptor) Object.defineProperty(process.stdout, 'isTTY', outputDescriptor);
  else delete process.stdout.isTTY;
  vi.restoreAllMocks();
  vi.clearAllMocks();
  fs.rmSync(directory, { recursive: true, force: true });
});

describe('guided signing orchestration (mocked GPG, no real identity)', () => {
  it('creates a local identity and public certificate only after plain-language approval', async () => {
    const home = path.join(directory, 'local-signing');
    const fallback = spawnSync.getMockImplementation();
    let added = false;
    spawnSync.mockImplementation((command, args, options) => {
      if (args.includes('--quick-add-key')) added = true;
      if (args.includes('--quick-generate-key') || args.includes('--quick-add-key'))
        return { status: 0, stdout: '', stderr: '' };
      if (args.includes('--list-secret-keys'))
        return {
          status: 0,
          stdout: added
            ? secretListing('+').replace(serial, '+')
            : secretListing('+').split('\n').slice(0, 2).join('\n'),
          stderr: '',
        };
      if (args.includes('--export'))
        return {
          status: 0,
          stdout: '-----BEGIN PGP PUBLIC KEY BLOCK-----\nTEST PUBLIC ONLY',
          stderr: '',
        };
      return fallback(command, args, options);
    });
    rl.question
      .mockResolvedValueOnce('USE THIS LAPTOP')
      .mockResolvedValueOnce('Test Publisher')
      .mockResolvedValueOnce('publisher@example.invalid')
      .mockResolvedValueOnce('CREATE PRIMARY');
    await provision(['setup-local', '--home', home]);
    expect(fs.readFileSync(path.join(home, 'publisher-public.asc'), 'utf8')).toContain(
      'PGP PUBLIC KEY BLOCK'
    );
    expect(spawnSync.mock.calls.some(([command]) => command === 'gpg-connect-agent')).toBe(false);
    const generation = spawnSync.mock.calls.filter(
      ([, args]) => args.includes('--quick-generate-key') || args.includes('--quick-add-key')
    );
    expect(generation).toHaveLength(2);
    expect(generation[1][1].slice(-5)).toEqual([
      '--quick-add-key',
      primary,
      'rsa3072',
      'sign',
      '1y',
    ]);
    for (const [, args, options] of generation) {
      expect(options.stdio).toBe('inherit');
      expect(args).not.toContain('--passphrase');
      expect(args).not.toContain('--batch');
    }
    expect(signing).not.toHaveBeenCalled();
  });

  it('creates nothing when local custody is not explicitly approved and preserves existing folders', async () => {
    const home = path.join(directory, 'declined');
    rl.question.mockResolvedValue('NO');
    await expect(provision(['setup-local', '--home', home])).rejects.toThrow(
      'confirmation did not match'
    );
    expect(fs.existsSync(home)).toBe(false);
    await expect(provision(['setup-local', '--home', directory])).rejects.toThrow('already exists');
    expect(spawnSync.mock.calls.some(([, args]) => args.includes('--quick-generate-key'))).toBe(
      false
    );
  });

  it('keeps a partially created local identity and reports subkey generation failure without success', async () => {
    const home = path.join(directory, 'partial-local');
    const fallback = spawnSync.getMockImplementation();
    spawnSync.mockImplementation((command, args, options) => {
      if (args.includes('--quick-generate-key')) return { status: 0, stdout: '', stderr: '' };
      if (args.includes('--quick-add-key'))
        return { status: 1, stdout: '', stderr: 'password cancelled' };
      if (args.includes('--list-secret-keys'))
        return {
          status: 0,
          stdout: secretListing('+').split('\n').slice(0, 2).join('\n'),
          stderr: '',
        };
      return fallback(command, args, options);
    });
    rl.question
      .mockResolvedValueOnce('USE THIS LAPTOP')
      .mockResolvedValueOnce('Test Publisher')
      .mockResolvedValueOnce('publisher@example.invalid')
      .mockResolvedValueOnce('CREATE PRIMARY');
    await expect(provision(['setup-local', '--home', home])).rejects.toThrow('password cancelled');
    expect(fs.existsSync(home)).toBe(true);
    expect(fs.existsSync(path.join(home, 'publisher-public.asc'))).toBe(false);
    expect(output.mock.calls.flat().some((text) => text.includes('Setup complete'))).toBe(false);
    expect(signing).not.toHaveBeenCalled();
  });

  it('signs both profiles locally without hardware and still refuses stale installers', async () => {
    const fallback = spawnSync.getMockImplementation();
    spawnSync.mockImplementation((command, args, options) =>
      args.includes('--list-secret-keys')
        ? { status: 0, stdout: secretListing('+').replace(serial, '+'), stderr: '' }
        : fallback(command, args, options)
    );
    rl.question.mockResolvedValue('SIGN BOTH');
    await provision(['sign-local', '--home', directory]);
    expect(signing.mock.calls.map(([options]) => options.action)).toEqual([
      'check-existing',
      'check-existing',
      'resume',
      'verify',
      'resume',
      'verify',
    ]);
    expect(spawnSync.mock.calls.some(([command]) => command === 'gpg-connect-agent')).toBe(false);
    signing.mockClear();
    assertCurrentInstaller.mockRejectedValueOnce(new Error('stale source'));
    await expect(provision(['sign-local', '--home', directory])).rejects.toThrow('stale source');
    expect(signing).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'recovers an existing primary without replacing it (subkey present: %s)',
    async (complete) => {
      let added = complete;
      const fallback = spawnSync.getMockImplementation();
      spawnSync.mockImplementation((command, args, options) => {
        if (args.includes('--quick-add-key')) {
          added = true;
          return { status: 0, stdout: '', stderr: '' };
        }
        if (args.includes('--list-keys')) return { status: 0, stdout: 'pub:u:\n', stderr: '' };
        if (args.includes('--list-secret-keys'))
          return {
            status: 0,
            stdout: added
              ? secretListing('+').replace(serial, '+')
              : secretListing('+').split('\n').slice(0, 2).join('\n'),
            stderr: '',
          };
        if (args.includes('--export'))
          return {
            status: 0,
            stdout: '-----BEGIN PGP PUBLIC KEY BLOCK-----\nRECOVERED',
            stderr: '',
          };
        return fallback(command, args, options);
      });
      rl.question.mockResolvedValue('RECOVER SETUP');
      await provision(['recover-local', '--home', directory]);
      expect(fs.readFileSync(path.join(directory, 'publisher-public.asc'), 'utf8')).toContain(
        'RECOVERED'
      );
      expect(spawnSync.mock.calls.some(([, args]) => args.includes('--quick-generate-key'))).toBe(
        false
      );
      expect(
        spawnSync.mock.calls.filter(([, args]) => args.includes('--quick-add-key'))
      ).toHaveLength(complete ? 0 : 1);
      await provision(['recover-local', '--home', directory]);
      expect(
        spawnSync.mock.calls.filter(([, args]) => args.includes('--quick-add-key'))
      ).toHaveLength(complete ? 0 : 1);
      expect(signing).not.toHaveBeenCalled();
    }
  );

  it('refuses recovery of public-only identities instead of creating replacements', async () => {
    const fallback = spawnSync.getMockImplementation();
    spawnSync.mockImplementation((command, args, options) => {
      if (args.includes('--list-secret-keys')) return { status: 0, stdout: '', stderr: '' };
      if (args.includes('--list-keys')) return { status: 0, stdout: 'pub:u:\n', stderr: '' };
      return fallback(command, args, options);
    });
    await expect(provision(['recover-local', '--home', directory])).rejects.toThrow(
      'private keys are unavailable'
    );
    expect(rl.question).not.toHaveBeenCalled();
    expect(spawnSync.mock.calls.some(([, args]) => args.includes('--quick-generate-key'))).toBe(
      false
    );
  });

  it('keeps an unexpected public certificate intact and reports the conflict', async () => {
    const certificate = path.join(directory, 'publisher-public.asc');
    fs.writeFileSync(certificate, 'do not overwrite');
    const fallback = spawnSync.getMockImplementation();
    spawnSync.mockImplementation((command, args, options) => {
      if (args.includes('--list-keys')) return { status: 0, stdout: 'pub:u:\n', stderr: '' };
      if (args.includes('--list-secret-keys'))
        return {
          status: 0,
          stdout: secretListing('+').replace(serial, '+'),
          stderr: '',
        };
      if (args.includes('--export'))
        return {
          status: 0,
          stdout: '-----BEGIN PGP PUBLIC KEY BLOCK-----\nDIFFERENT',
          stderr: '',
        };
      return fallback(command, args, options);
    });
    rl.question.mockResolvedValue('RECOVER SETUP');
    await expect(provision(['recover-local', '--home', directory])).rejects.toThrow('differs');
    expect(fs.readFileSync(certificate, 'utf8')).toBe('do not overwrite');
  });

  it('blocks all local signing if an existing profile signature fails preflight', async () => {
    const fallback = spawnSync.getMockImplementation();
    spawnSync.mockImplementation((command, args, options) =>
      args.includes('--list-secret-keys')
        ? { status: 0, stdout: secretListing('+').replace(serial, '+'), stderr: '' }
        : fallback(command, args, options)
    );
    signing.mockImplementationOnce(() => {
      throw new Error('invalid existing signature');
    });
    await expect(provision(['sign-local', '--home', directory])).rejects.toThrow(
      'invalid existing signature'
    );
    expect(signing).toHaveBeenCalledOnce();
    expect(signing.mock.calls[0][0].action).toBe('check-existing');
    expect(rl.question).not.toHaveBeenCalled();
  });

  it('retries creation in an empty existing folder only after new approval', async () => {
    let generated = false;
    let added = false;
    const fallback = spawnSync.getMockImplementation();
    spawnSync.mockImplementation((command, args, options) => {
      if (args.includes('--quick-generate-key')) {
        generated = true;
        return { status: 0, stdout: '', stderr: '' };
      }
      if (args.includes('--quick-add-key')) {
        added = true;
        return { status: 0, stdout: '', stderr: '' };
      }
      if (args.includes('--list-keys')) return { status: 0, stdout: '', stderr: '' };
      if (args.includes('--list-secret-keys'))
        return {
          status: 0,
          stdout: !generated
            ? ''
            : added
              ? secretListing('+').replace(serial, '+')
              : secretListing('+').split('\n').slice(0, 2).join('\n'),
          stderr: '',
        };
      if (args.includes('--export'))
        return {
          status: 0,
          stdout: '-----BEGIN PGP PUBLIC KEY BLOCK-----\nRETRY',
          stderr: '',
        };
      return fallback(command, args, options);
    });
    rl.question
      .mockResolvedValueOnce('USE THIS LAPTOP')
      .mockResolvedValueOnce('Test Publisher')
      .mockResolvedValueOnce('publisher@example.invalid')
      .mockResolvedValueOnce('CREATE PRIMARY');
    await provision(['recover-local', '--home', directory]);
    expect(generated).toBe(true);
    expect(added).toBe(true);
    expect(fs.readFileSync(path.join(directory, 'publisher-public.asc'), 'utf8')).toContain(
      'RETRY'
    );
  });

  it('hands terminal input to GPG before creating the explicitly approved offline primary', async () => {
    const fallback = spawnSync.getMockImplementation();
    spawnSync.mockImplementation((command, args, options) =>
      args.includes('--quick-generate-key')
        ? { status: 0, stdout: '', stderr: '' }
        : fallback(command, args, options)
    );
    rl.question
      .mockResolvedValueOnce('OFFLINE PRIMARY')
      .mockResolvedValueOnce('Test Publisher')
      .mockResolvedValueOnce('publisher@example.invalid')
      .mockResolvedValueOnce('CREATE PRIMARY');
    const home = path.join(directory, 'new-offline-home');
    await provision(['create-primary', '--home', home]);
    const index = spawnSync.mock.calls.findIndex(([, args]) =>
      args.includes('--quick-generate-key')
    );
    expect(spawnSync.mock.calls[index][1].slice(-4)).toEqual([
      'Test Publisher <publisher@example.invalid>',
      'rsa3072',
      'cert',
      '2y',
    ]);
    expect(spawnSync.mock.calls[index][2].stdio).toBe('inherit');
    expect(rl.pause.mock.invocationCallOrder[0]).toBeLessThan(
      spawnSync.mock.invocationCallOrder[index]
    );
    expect(fs.statSync(home).mode & 0o777).toBe(0o700);
  });

  it('uses addcardkey and save only after empty-token and offline-primary consent', async () => {
    cardFingerprint = '';
    storage = '+';
    const fallback = spawnSync.getMockImplementation();
    spawnSync.mockImplementation((command, args, options) => {
      if (args.includes('--edit-key')) {
        cardFingerprint = fingerprint;
        return { status: 0, stdout: '', stderr: '' };
      }
      return fallback(command, args, options);
    });
    rl.question
      .mockResolvedValueOnce('BACKUP AND PINS READY')
      .mockResolvedValueOnce(`ADD ${serial}`);
    await provision(['add-signing-key', '--home', directory, '--primary', primary]);
    const index = spawnSync.mock.calls.findIndex(([, args]) => args.includes('--edit-key'));
    expect(spawnSync.mock.calls[index][1].slice(-4)).toEqual([
      '--edit-key',
      primary,
      'addcardkey',
      'save',
    ]);
    expect(rl.pause.mock.invocationCallOrder[0]).toBeLessThan(
      spawnSync.mock.invocationCallOrder[index]
    );
    expect(signing).not.toHaveBeenCalled();
  });

  it('stops before GPG generation when any token slot is occupied', async () => {
    await expect(
      provision(['add-signing-key', '--home', directory, '--primary', primary])
    ).rejects.toThrow('existing keys');
    expect(rl.question).not.toHaveBeenCalled();
    expect(spawnSync.mock.calls.some(([, args]) => args.includes('--edit-key'))).toBe(false);
    expect(rl.close).toHaveBeenCalledOnce();
  });

  it('does not sign when consent is wrong or a source provenance check fails', async () => {
    rl.question.mockResolvedValue('NO');
    await expect(
      provision(['sign', '--home', directory, '--fingerprint', fingerprint])
    ).rejects.toThrow('confirmation did not match');
    expect(signing).not.toHaveBeenCalled();
    assertCurrentInstaller.mockRejectedValueOnce(new Error('stale source'));
    await expect(
      provision(['sign', '--home', directory, '--fingerprint', fingerprint])
    ).rejects.toThrow('stale source');
    expect(signing).not.toHaveBeenCalled();
  });

  it('signs and verifies both profiles only after exact consent and hardware checks', async () => {
    rl.question.mockResolvedValue(`SIGN ${fingerprint}`);
    await provision(['sign', '--home', directory, '--fingerprint', fingerprint]);
    expect(assertCurrentInstaller).toHaveBeenCalledTimes(2);
    expect(signing.mock.calls.map(([options]) => options.action)).toEqual([
      'sign',
      'verify',
      'sign',
      'verify',
    ]);
    expect(rl.pause.mock.invocationCallOrder[0]).toBeLessThan(signing.mock.invocationCallOrder[0]);
    expect(signing.mock.calls.map(([options]) => options.directory)).toEqual([
      expect.stringMatching(/\/artifacts$/),
      expect.stringMatching(/\/artifacts$/),
      expect.stringMatching(/\/artifacts\/developer$/),
      expect.stringMatching(/\/artifacts\/developer$/),
    ]);
    for (const [options] of signing.mock.calls) {
      expect(options.expectedFingerprint).toBe(fingerprint);
      expect(options.env.GPG_TTY).toBe('/dev/pts/1');
    }
  });

  it('rejects an available primary secret and stops on a signing failure', async () => {
    storage = '+';
    await expect(
      provision(['sign', '--home', directory, '--fingerprint', fingerprint])
    ).rejects.toThrow('offline primary');
    expect(signing).not.toHaveBeenCalled();
    storage = '#';
    rl.question.mockResolvedValue(`SIGN ${fingerprint}`);
    signing.mockImplementationOnce(() => {
      throw new Error('PIN cancelled');
    });
    await expect(
      provision(['sign', '--home', directory, '--fingerprint', fingerprint])
    ).rejects.toThrow('PIN cancelled');
    expect(signing).toHaveBeenCalledOnce();
  });

  it('uses inherited terminal input for tty discovery and reports missing tools', async () => {
    spawnSync.mockReturnValueOnce({ status: 1, stdout: '', stderr: 'not a tty' });
    await expect(
      provision(['sign', '--home', directory, '--fingerprint', fingerprint])
    ).rejects.toThrow('controlling terminal');
    expect(spawnSync.mock.calls[0][2].stdio[0]).toBe('inherit');
    expect(signing).not.toHaveBeenCalled();
  });
});
