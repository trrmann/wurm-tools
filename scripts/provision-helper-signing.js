import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { signing } from './sign-helper-installer.js';
import { assertCurrentInstaller } from './helper-build-state.js';

const project = fileURLToPath(new URL('../', import.meta.url));
const actions = [
  'recover-local',
  'setup-local',
  'sign-local',
  'inspect',
  'create-primary',
  'add-signing-key',
  'export-public',
  'sign',
];
const help = `Fedora signing setup (run in your own terminal):
ONE LAPTOP, NO HARDWARE TOKEN, internet may stay connected:
  pnpm run helper:signing:setup setup-local
  pnpm run helper:signing:setup recover-local   (resume setup after a timeout)
  pnpm run helper:installer:refresh
  pnpm run helper:signing:setup sign-local
setup-local asks permission to keep password-protected signing keys on this laptop.
Enter a strong, nonempty password only in the local GPG password window.
This is less isolated than hardware signing: malware on the laptop could misuse keys.
Keys default to ~/.wurm-tools-signing, outside the project; nothing is uploaded.

OPTIONAL ADVANCED HARDWARE workflow (separate from the one-laptop instructions):
  pnpm run helper:signing:setup inspect
  pnpm run helper:signing:setup create-primary --home /offline-media/new-private-keyring
  pnpm run helper:signing:setup add-signing-key --home /offline-media/new-private-keyring --primary FULL_PRIMARY_FINGERPRINT
  pnpm run helper:signing:setup export-public --home /offline-media/new-private-keyring --primary FULL_PRIMARY_FINGERPRINT --output /transfer/publisher-public.asc
  pnpm run helper:signing:setup sign --fingerprint FULL_SIGNING_SUBKEY_FINGERPRINT

Use a trusted OFFLINE machine for create-primary and add-signing-key. The offline
machine needs a copy of this project with dependencies already restored.
Keep the primary key and its GPG-generated revocation certificate offline.
Import ONLY publisher-public.asc on the release laptop, insert the token, then sign.
inspect is read-only. Other actions require a real terminal and typed consent.
No PIN/passphrase arguments, private-key export, token reset, or factory-default PINs.
See documentation/helper-signing.md for backup, recovery and public-key trust steps.`;

export function parseProvisionArgs(args) {
  if (!args.length || (args.length === 1 && ['--help', '-h'].includes(args[0])))
    return { action: 'help' };
  const [action, ...rest] = args;
  if (!actions.includes(action)) throw new Error(`Unknown setup action: ${action}`);
  const options = { action };
  const allowed = {
    'recover-local': ['home'],
    'setup-local': ['home'],
    'sign-local': ['home'],
    inspect: ['home'],
    'create-primary': ['home'],
    'add-signing-key': ['home', 'primary'],
    'export-public': ['home', 'primary', 'output'],
    sign: ['home', 'fingerprint'],
  };
  for (let index = 0; index < rest.length; index += 2) {
    const name = rest[index].replace(/^--/, '');
    const value = rest[index + 1];
    if (
      !rest[index].startsWith('--') ||
      !allowed[action].includes(name) ||
      !value ||
      value.startsWith('--') ||
      options[name] !== undefined
    )
      throw new Error(`Unknown, duplicate or incomplete setup option: ${rest[index]}`);
    options[name] = value;
  }
  for (const name of ['primary', 'fingerprint'])
    if (options[name]) {
      if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(options[name]))
        throw new Error(`${name} requires the full public fingerprint`);
      options[name] = options[name].toUpperCase();
    }
  const required = {
    'recover-local': [],
    'setup-local': [],
    'sign-local': [],
    inspect: [],
    'create-primary': ['home'],
    'add-signing-key': ['home', 'primary'],
    'export-public': ['home', 'primary', 'output'],
    sign: ['fingerprint'],
  };
  for (const name of required[action])
    if (!options[name]) throw new Error(`${action} requires --${name}`);
  return options;
}

export function parseCard(text, agentText) {
  const rows = text.split(/\r?\n/).map((line) => line.split(':'));
  const serial = agentText?.match(/^S SERIALNO ([A-F0-9]+)\s*$/im)?.[1];
  const fingerprints = rows.find(([name]) => name === 'fpr')?.slice(1, 4) || [];
  const signingFingerprint = fingerprints[0];
  if (
    !rows.some(([name]) => name === 'openpgp-card') ||
    !/^D27600012401[a-f0-9]{20}$/i.test(serial || '')
  )
    throw new Error(
      'No OpenPGP token serial found. Connect one compatible token; install/configure GPG scdaemon locally if required.'
    );
  const occupied = Boolean(signingFingerprint && !/^0+$/.test(signingFingerprint));
  if (
    fingerprints.length !== 3 ||
    fingerprints.some((value) => value && !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(value))
  )
    throw new Error('Unrecognized token signing fingerprint; do not modify this token.');
  return {
    serial: serial.toUpperCase(),
    signingFingerprint: occupied ? signingFingerprint.toUpperCase() : null,
    occupiedSlots: fingerprints.filter((value) => value && !/^0+$/.test(value)).length,
  };
}

export function parseSecretKeys(text) {
  const keys = [];
  let current;
  for (const line of text.split(/\r?\n/)) {
    const fields = line.split(':');
    if (['sec', 'ssb'].includes(fields[0])) {
      if (fields[6] && !/^\d+$/.test(fields[6]))
        throw new Error('Unrecognized key expiry in GPG output.');
      current = {
        kind: fields[0],
        validity: fields[1],
        expires: Number(fields[6]) || null,
        capabilities: fields[11] || '',
        storage: fields[14] || '',
      };
      keys.push(current);
    } else if (fields[0] === 'fpr' && current && !current.fingerprint) {
      if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(fields[9] || ''))
        throw new Error('Unrecognized public fingerprint in GPG output.');
      current.fingerprint = fields[9].toUpperCase();
    }
  }
  return keys;
}

export function requireHardwareSigner(card, keys, fingerprint, now = Date.now() / 1000) {
  const key = keys.find((entry) => entry.fingerprint === fingerprint);
  if (
    !key ||
    key.kind !== 'ssb' ||
    !key.capabilities.includes('s') ||
    key.capabilities.includes('D') ||
    /[redi]/.test(key.validity) ||
    !key.expires ||
    key.expires <= now
  )
    throw new Error(
      'Select an available, unexpired dedicated signing SUBKEY, not a primary/software key.'
    );
  if (card.signingFingerprint !== fingerprint || key.storage.toUpperCase() !== card.serial)
    throw new Error(
      'The selected signing subkey is not on the connected token; no signatures created.'
    );
  const primary = keys.find((entry) => entry.kind === 'sec');
  if (
    !primary ||
    primary.storage !== '#' ||
    !primary.capabilities.includes('c') ||
    primary.capabilities.includes('s') ||
    primary.capabilities.includes('D') ||
    /[redi]/.test(primary.validity) ||
    (primary.expires && primary.expires <= now)
  )
    throw new Error(
      'Release signing requires an unexpired offline primary key stub (#), not primary secret material on this laptop. Import the authenticated public key only.'
    );
  return key;
}

export function requireLocalSigner(keys, now = Date.now() / 1000) {
  const primaries = keys.filter((key) => key.kind === 'sec');
  const subkeys = keys.filter((key) => key.kind === 'ssb');
  const usable = (key) =>
    key.storage === '+' &&
    !/[redi]/.test(key.validity) &&
    !key.capabilities.includes('D') &&
    key.expires > now;
  if (
    primaries.length !== 1 ||
    subkeys.length !== 1 ||
    !usable(primaries[0]) ||
    !usable(subkeys[0]) ||
    !primaries[0].capabilities.includes('c') ||
    primaries[0].capabilities.includes('s') ||
    !subkeys[0].capabilities.includes('s') ||
    !primaries[0].fingerprint ||
    !subkeys[0].fingerprint
  )
    throw new Error(
      'The dedicated laptop signing folder must contain one unexpired certification identity and one available signing key. Do not delete it or generate a replacement blindly; see the signing guide.'
    );
  return subkeys[0];
}

function requireLocalPrimary(keys, now = Date.now() / 1000) {
  const primaries = keys.filter((key) => key.kind === 'sec');
  const primary = primaries[0];
  if (
    primaries.length !== 1 ||
    !primary.fingerprint ||
    primary.storage !== '+' ||
    !primary.capabilities.includes('c') ||
    primary.capabilities.includes('s') ||
    primary.capabilities.includes('D') ||
    /[redi]/.test(primary.validity) ||
    !(primary.expires > now)
  )
    throw new Error(
      'Cannot safely recover this signing folder: expected one available, unexpired certification-only identity. Your existing keys were not replaced.'
    );
  return primary;
}

function finishLocalSetup(home, env, primary) {
  let keys = keysFor(null, env);
  requireLocalPrimary(keys);
  if (!keys.some((key) => key.kind === 'ssb')) {
    gpg(
      ['--pinentry-mode', 'ask', '--quick-add-key', primary.fingerprint, 'rsa3072', 'sign', '1y'],
      env,
      true
    );
    keys = keysFor(null, env);
  }
  const subkey = requireLocalSigner(keys);
  const publicKey = gpg(['--armor', '--export', primary.fingerprint], env);
  if (!publicKey.startsWith('-----BEGIN PGP PUBLIC KEY BLOCK-----'))
    throw new Error(
      'Public certificate export failed. Keep the signing folder; run recover-local to retry.'
    );
  const certificate = path.join(home, 'publisher-public.asc');
  if (fs.existsSync(certificate)) {
    if (!fs.lstatSync(certificate).isFile() || fs.readFileSync(certificate, 'utf8') !== publicKey)
      throw new Error(
        'Existing public certificate differs from this identity. It was not overwritten; inspect it before continuing.'
      );
    console.log('Existing public certificate matches; preserved without rewriting.');
  } else {
    fs.writeFileSync(certificate, publicKey, { flag: 'wx', mode: 0o644 });
  }
  console.log(`Setup complete. Public certificate (safe to share): ${certificate}`);
  console.log(`Signing key public fingerprint: ${subkey.fingerprint}`);
  console.log(
    'Your keys remain on this laptop, NOT on hardware or an offline computer. Password strength/encryption and recovery backups have NOT been verified by this script.'
  );
  console.log(
    `Keep ${home} private. Follow the guide to make a removable-drive recovery backup and record renewal dates. Nothing has been signed or published yet.`
  );
  console.log(
    'Next: pnpm run helper:installer:refresh, then pnpm run helper:signing:setup sign-local'
  );
}

function gpg(args, env, interactive = false) {
  const result = spawnSync(
    'gpg',
    [
      '--no-auto-key-retrieve',
      '--auto-key-locate',
      'clear',
      ...(interactive ? [] : ['--batch']),
      ...args,
    ],
    { env, encoding: 'utf8', stdio: interactive ? 'inherit' : ['ignore', 'pipe', 'pipe'] }
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `GPG failed (${result.status}): ${result.stderr || 'See local GPG/pinentry prompts. Token PINs are never supplied by this script.'}`
    );
  return result.stdout;
}

function keysFor(primary, env) {
  return parseSecretKeys(
    gpg(
      [
        '--with-colons',
        '--with-secret',
        '--with-fingerprint',
        '--with-subkey-fingerprint',
        '--list-secret-keys',
        ...(!primary ? [] : [primary]),
      ],
      env
    )
  );
}

function cardStatus(env) {
  const text = gpg(['--with-colons', '--card-status'], env);
  const result = spawnSync('gpg-connect-agent', ['SCD SERIALNO', '/bye'], {
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Cannot inspect card identity: ${result.stderr}`);
  return parseCard(text, result.stdout);
}

function insideProject(directory) {
  const relative = path.relative(project, directory);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function checkPrivateHome(home) {
  const resolved = fs.realpathSync(home);
  if (insideProject(resolved))
    throw new Error('Signing keyrings must be outside the project and installers.');
  const stat = fs.lstatSync(home);
  if (
    stat.isSymbolicLink() ||
    !stat.isDirectory() ||
    stat.uid !== process.getuid() ||
    stat.mode & 0o077
  )
    throw new Error('GPG home must be a real directory owned by you with mode 0700.');
}

async function confirm(rl, message, expected) {
  const value = await rl.question(`${message}\nType ${expected} to proceed: `);
  if (value !== expected)
    throw new Error('Cancelled: confirmation did not match. No further actions performed.');
}

export async function provision(args = process.argv.slice(2)) {
  const options = parseProvisionArgs(args);
  if (options.action === 'help') {
    console.log(help);
    return;
  }
  if (process.platform !== 'linux' || process.getuid() === 0)
    throw new Error('Run signing setup as your normal Linux user, not root/sudo.');
  const local = ['setup-local', 'recover-local', 'sign-local'].includes(options.action);
  const home = path.resolve(
    options.home ||
      (local
        ? path.join(os.homedir(), '.wurm-tools-signing')
        : process.env.GNUPGHOME || path.join(os.homedir(), '.gnupg'))
  );
  const env = { ...process.env, GNUPGHOME: home };
  if (options.action === 'inspect') {
    console.log(gpg(['--version'], env).split('\n').slice(0, 2).join('\n'));
    if (!fs.existsSync(home))
      throw new Error(
        'GPG home does not exist. Provision on the offline machine first; no keyring created.'
      );
    checkPrivateHome(home);
    const card = cardStatus(env);
    console.log(JSON.stringify(card, null, 2));
    console.log(
      'Public token identifiers only. No key generation, PIN changes, reset or signing performed.'
    );
    return;
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    throw new Error(
      'Use a local interactive terminal; do not pipe answers or run this from CI/chat tools.'
    );
  const tty = spawnSync('tty', [], { encoding: 'utf8', stdio: ['inherit', 'pipe', 'pipe'] });
  if (tty.status !== 0 || !tty.stdout.trim().startsWith('/dev/'))
    throw new Error('Cannot determine a local controlling terminal for pinentry.');
  env.GPG_TTY = tty.stdout.trim();
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const recovering = options.action === 'recover-local';
    if (recovering && fs.existsSync(home)) {
      checkPrivateHome(home);
      const keys = keysFor(null, env);
      const publicKeys = gpg(['--with-colons', '--list-keys'], env);
      if (keys.length) {
        const primary = requireLocalPrimary(keys);
        if (keys.some((key) => key.kind === 'ssb')) requireLocalSigner(keys);
        console.log(
          `Found your existing identity: ${primary.fingerprint}. No replacement identity will be created.`
        );
        await confirm(
          rl,
          'Resume only missing setup steps on THIS laptop? Enter your existing signing password only in the local GPG window if asked.',
          'RECOVER SETUP'
        );
        rl.pause();
        finishLocalSetup(home, env, primary);
        return;
      }
      if (publicKeys.split(/\r?\n/).some((line) => line.startsWith('pub:')))
        throw new Error(
          'Public keys exist but private keys are unavailable. Recovery cannot recreate them; keep this folder and use your private backup.'
        );
      console.log(
        'No saved identity found. Recovery will request approval and publisher details before retrying creation in this existing folder.'
      );
    }
    if (options.action === 'create-primary' || options.action === 'setup-local' || recovering) {
      if (fs.existsSync(home) && !recovering)
        throw new Error(
          'The signing folder already exists. It has NOT been overwritten. Run pnpm run helper:signing:setup recover-local to resume safely, or sign-local if setup already finished.'
        );
      // Validate the parent first, before creating any private material.
      const parent = fs.realpathSync(path.dirname(home));
      if (insideProject(parent)) throw new Error('Choose signing storage outside this project.');
      await confirm(
        rl,
        local
          ? `No extra computer or token is needed. Your internet can remain connected. This creates signing keys in ${home} on THIS laptop. A password helps protect saved keys but cannot protect a compromised running laptop. Enter a strong nonempty password in GPG's local window; never send it in chat. Nothing is uploaded. Proceed with laptop-based keys instead of the earlier hardware-only plan?`
          : 'Only on a trusted OFFLINE machine with protected offline storage. This script cannot prove disk encryption or network isolation. The primary must never be created on the online release laptop. Use a strong nonempty passphrase in pinentry.',
        local ? 'USE THIS LAPTOP' : 'OFFLINE PRIMARY'
      );
      const name = (await rl.question('Public publisher name: ')).trim();
      const email = (await rl.question('Public monitored contact email: ')).trim();
      if (
        !name ||
        name.startsWith('-') ||
        /[<>]/.test(name) ||
        [...`${name}${email}`].some(
          (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
        ) ||
        !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email)
      )
        throw new Error('Provide a valid public publisher name and contact email.');
      await confirm(
        rl,
        `Create certification-only RSA3072 primary for ${name} <${email}>, expiring in 2 years, in ${home}?`,
        'CREATE PRIMARY'
      );
      if (!fs.existsSync(home)) fs.mkdirSync(home, { mode: 0o700 });
      checkPrivateHome(home);
      rl.pause();
      gpg(
        [
          '--pinentry-mode',
          'ask',
          '--quick-generate-key',
          `${name} <${email}>`,
          'rsa3072',
          'cert',
          '2y',
        ],
        env,
        true
      );
      const keys = parseSecretKeys(
        gpg(['--with-colons', '--with-secret', '--with-fingerprint', '--list-secret-keys'], env)
      );
      const primary = keys.find((key) => key.kind === 'sec');
      if (!primary?.fingerprint)
        throw new Error('Primary generation not confirmed; inspect the offline keyring locally.');
      console.log(`Primary public fingerprint: ${primary.fingerprint}`);
      if (local) {
        finishLocalSetup(home, env, primary);
        return;
      }
      console.log(
        `Keep ${home} and its openpgp-revocs.d revocation certificate OFFLINE. Make/test encrypted recovery backups with your trusted offline process; this script does not export private keys or claim a backup exists.`
      );
      return;
    }
    checkPrivateHome(home);
    if (options.action === 'export-public') {
      keysFor(options.primary, env);
      const output = path.resolve(options.output);
      if (fs.existsSync(output))
        throw new Error('Public-key output already exists; refusing overwrite.');
      await confirm(rl, `Export ONLY public key ${options.primary} to ${output}?`, 'EXPORT PUBLIC');
      const publicKey = gpg(['--armor', '--export', options.primary], env);
      if (!publicKey.startsWith('-----BEGIN PGP PUBLIC KEY BLOCK-----'))
        throw new Error('No public key exported.');
      fs.writeFileSync(output, publicKey, { flag: 'wx', mode: 0o644 });
      console.log(
        'Transfer this public file only. Authenticate its fingerprint independently; never copy the offline GPG home to the release laptop.'
      );
      return;
    }
    const card = local ? null : cardStatus(env);
    if (options.action === 'add-signing-key') {
      if (card.occupiedSlots)
        throw new Error(
          'Token has existing keys. This beginner workflow requires an empty token and never resets or replaces existing keys.'
        );
      const primary = keysFor(options.primary, env).find((key) => key.kind === 'sec');
      if (
        primary?.fingerprint !== options.primary ||
        primary.storage !== '+' ||
        !primary.capabilities.includes('c') ||
        primary.capabilities.includes('s') ||
        primary.capabilities.includes('D') ||
        /[redi]/.test(primary.validity) ||
        (primary.expires && primary.expires <= Date.now() / 1000)
      )
        throw new Error(
          'Requires the unexpired certification-only primary on the trusted offline machine.'
        );
      await confirm(
        rl,
        `Stay OFFLINE. Back up/test the protected primary and its revocation certificate first. Token ${card.serial} has an empty signing slot. Configure non-default PIN/admin PIN locally via gpg --card-edit if not already done; this script will not reset or guess PINs.`,
        'BACKUP AND PINS READY'
      );
      console.log(
        'GPG will open addcardkey. Select the Signature key (normally option 1), choose a bounded expiry (recommended 1y), approve on-card generation, and use local pinentry/touch prompts. The script passes save after that operation. Do NOT select encryption/authentication; only the signing slot is approved.'
      );
      await confirm(
        rl,
        'Generate one on-card signing subkey for this primary?',
        `ADD ${card.serial}`
      );
      rl.pause();
      gpg(
        ['--pinentry-mode', 'ask', '--edit-key', options.primary, 'addcardkey', 'save'],
        env,
        true
      );
      const after = cardStatus(env);
      if (after.serial !== card.serial || !after.signingFingerprint)
        throw new Error(
          'The original token signing slot was not provisioned. Do not sign; inspect it locally.'
        );
      const subkey = keysFor(options.primary, env).find(
        (key) =>
          key.kind === 'ssb' &&
          key.fingerprint === after.signingFingerprint &&
          key.storage.toUpperCase() === after.serial &&
          key.capabilities.includes('s') &&
          !/[redi]/.test(key.validity) &&
          key.expires > Date.now() / 1000
      );
      if (!subkey)
        throw new Error(
          'A saved, unexpired, hardware-backed signing subkey with a bounded expiry was not confirmed.'
        );
      console.log(`Signing subkey public fingerprint: ${subkey.fingerprint}`);
      console.log(
        'On-card key has no backup. Token loss requires revoking/replacing this subkey using the offline primary. Export public material, then detach and securely retain the offline primary storage.'
      );
      return;
    }
    const localKey = local ? requireLocalSigner(keysFor(null, env)) : null;
    const selectedFingerprint = localKey?.fingerprint || options.fingerprint;
    if (!local) requireHardwareSigner(card, keysFor(selectedFingerprint, env), selectedFingerprint);
    for (const directory of ['artifacts', 'artifacts/developer'])
      await assertCurrentInstaller(project, path.join(project, directory));
    for (const directory of ['artifacts', 'artifacts/developer']) {
      const full = path.join(project, directory);
      if (local) {
        signing({
          action: 'check-existing',
          directory: full,
          expectedFingerprint: selectedFingerprint,
          env,
        });
      } else if (fs.readdirSync(full).some((name) => name.endsWith('.asc')))
        throw new Error(
          `Existing signatures in ${directory}; refusing to replace or partially re-sign a release.`
        );
    }
    await confirm(
      rl,
      local
        ? `Sign BOTH tested Fedora installers using the key on THIS laptop (${selectedFingerprint})? No token is used. Nothing is uploaded and public release is NOT approved.`
        : `Sign BOTH current Fedora installers and metadata with token ${card.serial}, signing subkey ${selectedFingerprint}? This does NOT authorize public release.`,
      local ? 'SIGN BOTH' : `SIGN ${selectedFingerprint}`
    );
    rl.pause();
    for (const directory of ['artifacts', 'artifacts/developer']) {
      if (local) {
        if (requireLocalSigner(keysFor(null, env)).fingerprint !== selectedFingerprint)
          throw new Error('Laptop signing identity changed; signing stopped.');
      } else {
        const current = cardStatus(env);
        requireHardwareSigner(current, keysFor(selectedFingerprint, env), selectedFingerprint);
      }
      const target = path.join(project, directory);
      signing({
        action: local ? 'resume' : 'sign',
        directory: target,
        expectedFingerprint: selectedFingerprint,
        env,
      });
      signing({
        action: 'verify',
        directory: target,
        expectedFingerprint: selectedFingerprint,
        env,
      });
    }
    console.log(
      'Both Fedora installers and metadata signed and verified. No publishing or release-gate changes performed.'
    );
  } finally {
    rl.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  provision().catch((error) => {
    console.error(`[FAIL] ${error.message}`);
    process.exitCode = 1;
  });
}
