import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import {
  parseProvisionArgs,
  parseCard,
  parseSecretKeys,
  requireHardwareSigner,
  requireLocalSigner,
} from '../scripts/provision-helper-signing.js';

const primary = 'A'.repeat(40);
const fingerprint = 'B'.repeat(40);
const serial = 'D2760001240103040006123456780000';
const card = { serial, signingFingerprint: fingerprint };
const keys = [
  {
    kind: 'sec',
    fingerprint: primary,
    capabilities: 'cSC',
    storage: '#',
    validity: 'u',
    expires: null,
  },
  { kind: 'ssb', fingerprint, capabilities: 's', storage: serial, validity: 'u', expires: 200 },
];

describe('hardware signing setup', () => {
  it('makes local setup/signing explicit and rejects ambiguous or invalid local identities', () => {
    expect(parseProvisionArgs(['setup-local'])).toEqual({ action: 'setup-local' });
    expect(parseProvisionArgs(['sign-local'])).toEqual({ action: 'sign-local' });
    const local = [
      { ...keys[0], storage: '+', expires: 200 },
      { ...keys[1], storage: '+' },
    ];
    expect(requireLocalSigner(local, 100)).toBe(local[1]);
    for (const invalid of [
      [],
      [local[0]],
      [...local, local[1]],
      [...local, local[0]],
      [local[0], { ...local[1], storage: serial }],
      [{ ...local[0], storage: '#' }, local[1]],
      [local[0], { ...local[1], expires: 99 }],
      [local[0], { ...local[1], expires: null }],
      [local[0], { ...local[1], validity: 'r' }],
      [local[0], { ...local[1], capabilities: 'sD' }],
    ])
      expect(() => requireLocalSigner(invalid, 100)).toThrow('dedicated laptop');
  });
  it('requires explicit actions, exact fingerprints and no PIN/passphrase/overwrite options', () => {
    expect(parseProvisionArgs([])).toEqual({ action: 'help' });
    expect(parseProvisionArgs(['sign', '--fingerprint', fingerprint.toLowerCase()])).toEqual({
      action: 'sign',
      fingerprint,
    });
    for (const args of [
      ['reset'],
      ['sign'],
      ['create-primary'],
      ['sign', '--fingerprint', 'B'.repeat(16)],
      ['inspect', '--pin', '123456'],
      ['create-primary', '--home', '/offline', '--passphrase', 'bad'],
      ['inspect', '--yes'],
      ['inspect', '--home', '/first', '--home', '/second'],
    ])
      expect(() => parseProvisionArgs(args)).toThrow();
  });

  it('uses the full OpenPGP application ID, not the short displayed card serial', () => {
    expect(
      parseCard(
        `openpgp-card:\nserial:12345678:\nfpr:${fingerprint}:::\n`,
        `S SERIALNO ${serial}\nOK\n`
      )
    ).toEqual({ ...card, occupiedSlots: 1 });
    expect(parseCard('openpgp-card:\nfpr::::\n', `S SERIALNO ${serial}\nOK\n`)).toEqual({
      serial,
      signingFingerprint: null,
      occupiedSlots: 0,
    });
    expect(
      parseCard(`openpgp-card:\nfpr::${fingerprint}::\n`, `S SERIALNO ${serial}\nOK\n`)
        .occupiedSlots
    ).toBe(1);
    expect(() => parseCard('serial:12345678:\n', 'ERR No card')).toThrow('No OpenPGP');
    expect(() => parseCard('openpgp-card:\nfpr:bad:::\n', `S SERIALNO ${serial}\nOK\n`)).toThrow(
      'Unrecognized'
    );
  });

  it('parses only public fingerprints and token-storage markers from secret-key listings', () => {
    const row = (kind, caps, storage) => {
      const fields = Array(16).fill('');
      Object.assign(fields, { 0: kind, 1: 'u', 6: '200', 11: caps, 14: storage });
      return fields.join(':');
    };
    const fpr = (value) => `fpr:::::::::${value}:`;
    const parsed = parseSecretKeys(
      [
        row('sec', 'cSC', '#'),
        fpr(primary),
        'uid:::::::::not collected:',
        row('ssb', 's', serial),
        fpr(fingerprint),
      ].join('\n')
    );
    expect(parsed).toHaveLength(2);
    expect(parsed[1]).toMatchObject({ fingerprint, storage: serial, kind: 'ssb' });
    expect(requireHardwareSigner(card, parsed, fingerprint, 100)).toBe(parsed[1]);
  });

  it('rejects software keys, wrong cards, expired/revoked keys and an online primary secret', () => {
    expect(requireHardwareSigner(card, keys, fingerprint, 100)).toBe(keys[1]);
    for (const changed of [
      { storage: '+' },
      { storage: '#' },
      { validity: 'r' },
      { validity: 'd' },
      { expires: 99 },
      { expires: null },
      { capabilities: 'sD' },
      { capabilities: 'e' },
      { kind: 'sec' },
    ]) {
      expect(() =>
        requireHardwareSigner(card, [keys[0], { ...keys[1], ...changed }], fingerprint, 100)
      ).toThrow();
    }
    expect(() =>
      requireHardwareSigner({ ...card, serial: '0'.repeat(32) }, keys, fingerprint, 100)
    ).toThrow('connected token');
    expect(() =>
      requireHardwareSigner(card, [{ ...keys[0], storage: '+' }, keys[1]], fingerprint, 100)
    ).toThrow('offline primary');
    expect(() =>
      requireHardwareSigner(card, [{ ...keys[0], expires: 99 }, keys[1]], fingerprint, 100)
    ).toThrow('offline primary');
    expect(() =>
      requireHardwareSigner(card, [{ ...keys[0], capabilities: 'csSC' }, keys[1]], fingerprint, 100)
    ).toThrow('offline primary');
  });

  it('refuses unattended key creation without creating a private keyring', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'wurm-provision-guard-'));
    try {
      const home = path.join(directory, 'new-home');
      const result = spawnSync(
        process.execPath,
        ['scripts/provision-helper-signing.js', 'create-primary', '--home', home],
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/interactive terminal|normal Linux user/);
      expect(fs.existsSync(home)).toBe(false);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
