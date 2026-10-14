import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PAIRING_CODE_TTL_MS = 10 * 60 * 1000;
const MAX_PAIRED_BROWSERS = 16;

export function authFilePath(env = process.env) {
  if (env.WURM_HELPER_AUTH_FILE) return env.WURM_HELPER_AUTH_FILE;
  const root = env.APPDATA || env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(root, 'wurm-tools', 'helper-auth.json');
}

function emptyState() {
  return { version: 1, pairingCodeHash: null, pairingExpiresAt: 0, tokens: [] };
}

function readState(file) {
  try {
    const state = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (state.version !== 1 || !Array.isArray(state.tokens)) {
      throw new Error('Unsupported helper authentication file format');
    }
    return state;
  } catch (err) {
    if (err.code === 'ENOENT') return emptyState();
    throw err;
  }
}

function writeState(file, state) {
  const directory = path.dirname(file);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (process.platform !== 'win32') fs.chmodSync(directory, 0o700);
  const temporaryFile = `${file}.${crypto.randomUUID()}.tmp`;
  const fd = fs.openSync(temporaryFile, 'wx', 0o600);
  try {
    fs.writeFileSync(fd, JSON.stringify(state));
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(temporaryFile, file);
  if (process.platform !== 'win32') fs.chmodSync(file, 0o600);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function safeEqual(left, right) {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && crypto.timingSafeEqual(leftBytes, rightBytes);
}

export function rotatePairingCode(file = authFilePath()) {
  const state = readState(file);
  const code = String(crypto.randomInt(0, 100_000_000)).padStart(8, '0');
  state.pairingCodeHash = sha256(code);
  state.pairingExpiresAt = Date.now() + PAIRING_CODE_TTL_MS;
  writeState(file, state);
  return code;
}

export function ensurePairingCode(file = authFilePath()) {
  const state = readState(file);
  if (!state.pairingCodeHash || state.pairingExpiresAt <= Date.now()) {
    return rotatePairingCode(file);
  }
  return null;
}

export function pairBrowser(code, file = authFilePath()) {
  if (typeof code !== 'string' || !/^\d{8}$/.test(code)) return null;
  const state = readState(file);
  const candidate = sha256(code);
  if (
    !state.pairingCodeHash ||
    state.pairingExpiresAt <= Date.now() ||
    !safeEqual(candidate, state.pairingCodeHash)
  ) {
    return null;
  }

  const token = crypto.randomBytes(32).toString('base64url');
  state.pairingCodeHash = null;
  state.pairingExpiresAt = 0;
  state.tokens = [
    ...state.tokens,
    { hash: sha256(token), pairedAt: new Date().toISOString() },
  ].slice(-MAX_PAIRED_BROWSERS);
  writeState(file, state);
  return token;
}

export function isPairedToken(token, file = authFilePath()) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const candidate = sha256(token);
  return readState(file).tokens.some(
    (entry) =>
      typeof entry?.hash === 'string' &&
      /^[0-9a-f]{64}$/.test(entry.hash) &&
      safeEqual(candidate, entry.hash)
  );
}

export function revokePairedToken(token, file = authFilePath()) {
  const state = readState(file);
  const candidate = sha256(token);
  const tokens = state.tokens.filter(
    (entry) =>
      typeof entry?.hash === 'string' &&
      /^[0-9a-f]{64}$/.test(entry.hash) &&
      !safeEqual(candidate, entry.hash)
  );
  if (tokens.length === state.tokens.length) return false;
  state.tokens = tokens;
  writeState(file, state);
  return true;
}

export function revokeAllPairedTokens(file = authFilePath()) {
  const state = readState(file);
  state.tokens = [];
  writeState(file, state);
}
