import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function gpg(args, env, status = false) {
  const result = spawnSync(
    'gpg',
    [
      '--batch',
      '--no-auto-key-retrieve',
      '--auto-key-locate',
      'clear',
      ...(status ? ['--status-fd', '1'] : []),
      ...args,
    ],
    { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `GPG failed (${result.status}); check the selected fingerprint, local agent/token and pinentry. No password is accepted by this script.`
    );
  return result.stdout;
}

function fingerprint(value) {
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(value || ''))
    throw new Error(
      'Set WURM_SIGNING_FINGERPRINT to the full signing-subkey fingerprint (not an email, short key ID or private key)'
    );
  return value.toUpperCase();
}

function verify(file, signature, expected, env) {
  const output = gpg(['--verify', signature, file], env, true);
  const lines = output.split(/\r?\n/);
  if (
    lines.some((line) =>
      /^\[GNUPG:\] (?:BADSIG|ERRSIG|EXPSIG|EXPKEYSIG|REVKEYSIG|KEYEXPIRED|SIGEXPIRED|FAILURE)\b/.test(
        line
      )
    )
  )
    throw new Error('Rejected invalid, expired or revoked signature');
  const signatures = lines.filter((line) => line.startsWith('[GNUPG:] VALIDSIG '));
  if (signatures.length !== 1 || signatures[0].split(' ')[2] !== expected)
    throw new Error('Signature does not match the exact expected signing fingerprint');
}

function metadata(file) {
  if (!fs.lstatSync(file).isFile()) throw new Error('Build metadata must be a regular file');
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (
    value.format !== 1 ||
    value.platform !== 'linux' ||
    value.arch !== 'x64' ||
    !/^\d+\.\d+\.\d+$/.test(value.version) ||
    typeof value.artifact !== 'string' ||
    value.artifact !== path.basename(value.artifact) ||
    !/^[a-zA-Z0-9._-]+\.run$/.test(value.artifact) ||
    !/^[a-f0-9]{64}$/.test(value.sha256)
  )
    throw new Error('Invalid Fedora build metadata');
  return value;
}

export function signing({ action, directory, expectedFingerprint, env = process.env }) {
  const expected = fingerprint(expectedFingerprint);
  const manifestFile = path.join(directory, 'fedora-build.json');
  const manifest = metadata(manifestFile);
  const manifestDigest = createHash('sha256').update(fs.readFileSync(manifestFile)).digest('hex');
  const artifact = path.join(directory, manifest.artifact);
  if (!fs.lstatSync(artifact).isFile()) throw new Error('Installer must be a regular file');
  const digest = createHash('sha256').update(fs.readFileSync(artifact)).digest('hex');
  if (digest !== manifest.sha256)
    throw new Error(
      'Installer hash does not match build metadata; rebuild before signing or verification'
    );
  if (action === 'verify') {
    verify(manifestFile, `${manifestFile}.asc`, expected, env);
    verify(artifact, `${artifact}.asc`, expected, env);
    console.log(
      'Both signatures and installer hash verified against the exact pinned fingerprint. Signing alone does not approve public release.'
    );
    return;
  }
  if (!['sign', 'resume', 'check-existing'].includes(action))
    throw new Error('Usage: sign-helper-installer.js sign|resume|verify [artifact-directory]');
  const missing = [];
  for (const file of [manifestFile, artifact]) {
    const signature = `${file}.asc`;
    if (fs.existsSync(signature)) {
      if (action === 'sign')
        throw new Error(
          `Signature already exists: ${signature}. Refusing to replace signed artifacts.`
        );
      if (!fs.lstatSync(signature).isFile())
        throw new Error(`Existing signature must be a regular file: ${signature}`);
      verify(file, signature, expected, env);
      console.log(`Verified existing signature; preserving ${signature}`);
    } else {
      missing.push(file);
    }
  }
  if (action === 'check-existing') return;
  if (!missing.length) {
    console.log('All signatures already exist and verified; no files changed.');
    return;
  }
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'wurm-signing-'));
  try {
    for (const [index, file] of missing.entries()) {
      const signature = path.join(temporary, `${index}.asc`);
      gpg(
        ['--local-user', `${expected}!`, '--armor', '--detach-sign', '--output', signature, file],
        env
      );
      verify(file, signature, expected, env);
    }
    if (
      createHash('sha256').update(fs.readFileSync(artifact)).digest('hex') !== digest ||
      createHash('sha256').update(fs.readFileSync(manifestFile)).digest('hex') !== manifestDigest
    )
      throw new Error('Build outputs changed during signing; signatures not saved');
    const created = [];
    try {
      for (const [index, file] of missing.entries()) {
        fs.copyFileSync(
          path.join(temporary, `${index}.asc`),
          `${file}.asc`,
          fs.constants.COPYFILE_EXCL
        );
        created.push(`${file}.asc`);
      }
    } catch (error) {
      for (const file of created) fs.unlinkSync(file);
      throw error;
    }
    console.log(
      'Signed and independently verified installer and build metadata. No private key exported. Existing public-release gates remain in force.'
    );
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 4) throw new Error('Too many signing arguments');
    signing({
      action: process.argv[2],
      directory: path.resolve(process.argv[3] || 'artifacts'),
      expectedFingerprint: process.env.WURM_SIGNING_FINGERPRINT,
    });
  } catch (error) {
    console.error(`[FAIL] ${error.message}`);
    process.exitCode = 1;
  }
}
