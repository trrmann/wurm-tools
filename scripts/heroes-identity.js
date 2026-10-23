import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { heroesDatabasePath, deleteUnsharedHeroesData } from './heroes-store.js';
import { httpError } from './wurm-db.js';

const scrypt = promisify(crypto.scrypt);
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const token = () => crypto.randomBytes(32).toString('base64url');
const roles = new Set(['visitor', 'player', 'game-master', 'admin']);
const SESSION_MS = 8 * 60 * 60 * 1000;
let queue = Promise.resolve();

export function heroesIdentityPath(env = process.env) {
  return env.HEROES_IDENTITY_PATH || `${heroesDatabasePath(env)}.identity`;
}

function read(file) {
  if (!fs.existsSync(file))
    return { version: 1, users: [], sessions: [], grants: [], attempts: {} };
  const state = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (
    state.version !== 1 ||
    !Array.isArray(state.users) ||
    !Array.isArray(state.sessions) ||
    !Array.isArray(state.grants) ||
    !state.attempts
  )
    throw new Error('Invalid HERO identity store; restore its matching encryption key and backup');
  state.ownership ||= [];
  state.transfers ||= [];
  return state;
}

function key(file) {
  const keyFile = `${file}.key`;
  if (!fs.existsSync(keyFile)) {
    if (fs.existsSync(file)) throw new Error('HERO identity encryption key is missing');
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    fs.writeFileSync(keyFile, crypto.randomBytes(32), { flag: 'wx', mode: 0o600 });
  }
  const value = fs.readFileSync(keyFile);
  if (value.length !== 32) throw new Error('Invalid HERO identity encryption key');
  return value;
}

function save(file, state) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(state), { flag: 'wx', mode: 0o600 });
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function encrypt(secret, file) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(file), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64')).join('.');
}

function decrypt(secret, file) {
  const [iv, tag, bytes] = secret.split('.').map((part) => Buffer.from(part, 'base64'));
  const cipher = crypto.createDecipheriv('aes-256-gcm', key(file), iv);
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(bytes), cipher.final()]).toString('utf8');
}

function transact(file, action) {
  const operation = queue.then(async () => {
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    const lockFile = `${file}.lock`;
    let lock;
    for (let attempt = 0; !lock; attempt++) {
      try {
        lock = fs.openSync(lockFile, 'wx', 0o600);
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        if (attempt >= 100)
          throw httpError(
            503,
            'HERO identity store is locked. Stop competing helpers; inspect the identity lock before removing a stale lock.'
          );
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    try {
      fs.writeSync(lock, String(process.pid));
      const state = read(file);
      state.ownership ||= [];
      state.transfers ||= [];
      const result = await action(state);
      save(file, state);
      return result;
    } finally {
      fs.closeSync(lock);
      fs.unlinkSync(lockFile);
    }
  });
  queue = operation.catch(() => {});
  return operation;
}

function username(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,63}$/.test(value))
    throw httpError(400, 'Username must be 3-64 letters, numbers, dots, underscores or hyphens');
  return value.toLowerCase();
}

function password(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 256)
    throw httpError(400, 'Use a password between 12 and 256 characters');
  return value;
}

async function passwordHash(value, salt) {
  return (
    await scrypt(value, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
  ).toString('hex');
}

function equal(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    roles: user.roles,
    disabled: user.disabled,
    mfaEnabled: Boolean(user.mfa),
    provider: user.provider,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt || null,
    closure: user.closure || null,
  };
}

function session(state, bearer, origin, complete = true) {
  const entry = state.sessions.find(
    (item) =>
      item.hash === hash(bearer || '') && item.origin === origin && item.expiresAt > Date.now()
  );
  const user = state.users.find((item) => item.id === entry?.userId && !item.disabled);
  if (!entry || !user) throw httpError(401, 'Sign in to Heros Tools');
  if (complete && (user.mfa || user.roles.includes('admin')) && !entry.mfa)
    throw httpError(403, 'Complete two-factor authentication before accessing HERO data');
  return { user, entry };
}

function throttle(state, label, limit = 10) {
  const now = Date.now();
  for (const [id, entry] of Object.entries(state.attempts))
    if (entry.until <= now) delete state.attempts[id];
  const entry = (state.attempts[label] ||= { count: 0, until: now + 15 * 60 * 1000 });
  if (++entry.count > limit) return httpError(429, 'Too many attempts; try again in 15 minutes');
  return null;
}

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32(bytes) {
  let bits = '';
  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0');
  return bits
    .match(/.{1,5}/g)
    .map((part) => alphabet[parseInt(part.padEnd(5, '0'), 2)])
    .join('');
}

export function totpCode(secret, step = Math.floor(Date.now() / 30000)) {
  const bits = [...secret]
    .map((char) => alphabet.indexOf(char).toString(2).padStart(5, '0'))
    .join('');
  const bytes = Buffer.from((bits.match(/.{8}/g) || []).map((part) => parseInt(part, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = crypto.createHmac('sha1', bytes).update(counter).digest();
  const offset = digest.at(-1) & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, '0');
}

function verifyTotp(user, secret, code) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return false;
  const current = Math.floor(Date.now() / 30000);
  for (const step of [current - 1, current, current + 1]) {
    if (step > (user.lastTotpStep ?? -1) && equal(totpCode(secret, step), code)) {
      user.lastTotpStep = step;
      return true;
    }
  }
  return false;
}

export function createHeroesSetupCode(file = heroesIdentityPath()) {
  return transact(file, (state) => {
    if (state.users.some((user) => user.roles.includes('admin')))
      throw httpError(409, 'An administrator already exists');
    const code = token();
    key(file);
    state.setup = { hash: hash(code), expiresAt: Date.now() + 10 * 60 * 1000 };
    return code;
  });
}

// External adapters must validate issuer, audience, nonce and proof server-side before provisioning.
// No browser-supplied external identity is accepted by the local provider.
export const HEROES_IDENTITY_CAPABILITIES = Object.freeze({
  local: { enabled: true, methods: ['password', 'totp', 'recovery-code'] },
  oidc: { enabled: false, requires: ['issuer', 'client configuration', 'server callback'] },
  webauthn: { enabled: false, requires: ['stable relying-party domain', 'challenge verification'] },
});

export async function heroesIdentityAction(action, body, context) {
  const { file = heroesIdentityPath(), bearer = '', origin, remote = 'local' } = context;
  const result = await transact(file, async (state) => {
    state.sessions = state.sessions.filter((entry) => entry.expiresAt > Date.now());
    if (action === 'status')
      return {
        setupRequired: !state.users.some((user) => user.roles.includes('admin')),
        providers: HEROES_IDENTITY_CAPABILITIES,
      };
    if (['register', 'setup', 'login'].includes(action)) {
      const blocked = throttle(state, `public:${remote}`, 30);
      if (blocked) return blocked;
    }
    if (action === 'register' || action === 'setup') {
      if (
        action === 'setup' &&
        (state.users.some((user) => user.roles.includes('admin')) ||
          !state.setup ||
          state.setup.expiresAt <= Date.now() ||
          typeof body.setupCode !== 'string' ||
          !equal(hash(body.setupCode), state.setup.hash))
      )
        return httpError(403, 'Setup code is invalid or expired');
      const name = username(body.username);
      password(body.password);
      if (state.users.some((user) => user.username === name))
        return httpError(409, 'Username unavailable');
      const salt = crypto.randomBytes(16).toString('hex');
      const user = {
        id: crypto.randomUUID(),
        username: name,
        provider: 'local',
        salt,
        passwordHash: await passwordHash(body.password, salt),
        roles: action === 'setup' ? ['admin'] : ['visitor'],
        disabled: false,
        createdAt: new Date().toISOString(),
      };
      key(file);
      state.users.push(user);
      if (action === 'setup') delete state.setup;
      return { user: publicUser(user), message: 'Account created. Sign in to continue.' };
    }
    if (action === 'login') {
      const name = typeof body.username === 'string' ? body.username.toLowerCase() : '';
      const blocked = throttle(state, `login:${hash(name)}`, 10);
      if (blocked) return blocked;
      const user = state.users.find((item) => item.username === name);
      const candidate =
        typeof body.password === 'string' && body.password.length <= 256 ? body.password : '';
      const expected = user?.passwordHash || '0'.repeat(128);
      const actual = await passwordHash(candidate, user?.salt || 'unknown-user-salt');
      if (!user || user.disabled || !equal(actual, expected))
        return httpError(401, 'Invalid username or password');
      const needsMfa = Boolean(user.mfa);
      const value = token();
      state.sessions = state.sessions.filter(
        (item) => item.userId !== user.id || item.origin !== origin
      );
      state.sessions.push({
        hash: hash(value),
        userId: user.id,
        origin,
        expiresAt:
          Date.now() + (needsMfa || user.roles.includes('admin') ? 10 * 60 * 1000 : SESSION_MS),
        passwordAt: Date.now(),
        mfa: false,
      });
      if (!needsMfa && !user.roles.includes('admin')) user.lastLoginAt = new Date().toISOString();
      delete state.attempts[`login:${hash(name)}`];
      return {
        token: value,
        user: publicUser(user),
        mfaRequired: needsMfa,
        enrollmentRequired: user.roles.includes('admin') && !user.mfa,
      };
    }
    const { user, entry } = session(state, bearer, origin, false);
    if (action === 'me')
      return {
        user: publicUser(user),
        mfaRequired: Boolean(user.mfa && !entry.mfa),
        enrollmentRequired: user.roles.includes('admin') && !user.mfa,
      };
    if (action === 'logout') {
      state.sessions = state.sessions.filter((item) => item !== entry);
      return { loggedOut: true };
    }
    if (action === 'mfa/start') {
      if (user.mfa) throw httpError(409, 'Two-factor authentication is already enabled');
      if (Date.now() - entry.passwordAt > 5 * 60 * 1000)
        throw httpError(403, 'Sign in again before configuring two-factor authentication');
      const secret = base32(crypto.randomBytes(20));
      user.pendingMfa = { secret: encrypt(secret, file), expiresAt: Date.now() + 5 * 60 * 1000 };
      return {
        secret,
        uri: `otpauth://totp/${encodeURIComponent(`Heros Tools:${user.username}`)}?secret=${secret}&issuer=Heros%20Tools&algorithm=SHA1&digits=6&period=30`,
      };
    }
    if (action === 'mfa/confirm' || action === 'mfa/verify') {
      const blocked = throttle(state, `mfa:${user.id}`, 5);
      if (blocked) return blocked;
      if (action === 'mfa/confirm') {
        if (!user.pendingMfa || user.pendingMfa.expiresAt <= Date.now() || user.mfa)
          return httpError(400, 'Two-factor enrollment expired; start again');
        if (!verifyTotp(user, decrypt(user.pendingMfa.secret, file), body.code))
          return httpError(401, 'Invalid or already-used authentication code');
        user.mfa = user.pendingMfa.secret;
        delete user.pendingMfa;
        const recoveryCodes = Array.from({ length: 10 }, () =>
          crypto.randomBytes(12).toString('hex')
        );
        user.recoveryHashes = recoveryCodes.map(hash);
        entry.mfa = true;
        entry.expiresAt = Date.now() + SESSION_MS;
        user.lastLoginAt = new Date().toISOString();
        state.sessions = state.sessions.filter((item) => item === entry || item.userId !== user.id);
        return { recoveryCodes, user: publicUser(user) };
      }
      if (!user.mfa) return httpError(400, 'Two-factor authentication is not enabled');
      const recovery =
        typeof body.code === 'string' ? user.recoveryHashes?.indexOf(hash(body.code)) : -1;
      if (recovery >= 0) user.recoveryHashes.splice(recovery, 1);
      else if (!verifyTotp(user, decrypt(user.mfa, file), body.code))
        return httpError(401, 'Invalid or already-used authentication code');
      entry.mfa = true;
      entry.expiresAt = Date.now() + SESSION_MS;
      user.lastLoginAt = new Date().toISOString();
      delete state.attempts[`mfa:${user.id}`];
      return { user: publicUser(user) };
    }
    session(state, bearer, origin);
    const protectLastAdmin = (target) => {
      if (
        target.roles.includes('admin') &&
        !state.users.some(
          (item) => item.id !== target.id && item.roles.includes('admin') && !item.disabled
        )
      )
        throw httpError(
          400,
          'Another active system administrator is required before closing this account'
        );
    };
    const removeAccount = (target) => {
      target.disabled = true;
      target.closure = 'deleted';
      target.username = `deleted-${target.id}`;
      target.roles = [];
      for (const field of [
        'passwordHash',
        'salt',
        'mfa',
        'pendingMfa',
        'recoveryHashes',
        'lastTotpStep',
      ])
        delete target[field];
      state.sessions = state.sessions.filter((item) => item.userId !== target.id);
      state.grants = state.grants.filter((item) => item.userId !== target.id);
      state.ownership = state.ownership.filter((item) => item.userId !== target.id);
      state.transfers = state.transfers.filter(
        (item) => item.from !== target.id && item.to !== target.id
      );
    };
    if (action === 'closure/status') {
      return {
        ownedCount: state.ownership.filter((item) => item.userId === user.id).length,
        incoming: state.transfers
          .filter((item) => item.to === user.id)
          .map((item) => ({
            id: item.id,
            username: state.users.find((account) => account.id === item.from)?.username,
            ownedCount: state.ownership.filter((owner) => owner.userId === item.from).length,
          })),
        outgoing: state.transfers
          .filter((item) => item.from === user.id)
          .map((item) => ({
            id: item.id,
            username: state.users.find((account) => account.id === item.to)?.username,
          })),
      };
    }
    if (action === 'closure/cancel' || action === 'closure/reject') {
      const transfer = state.transfers.find((item) => item.id === body.id);
      if (!transfer || (action === 'closure/cancel' ? transfer.from : transfer.to) !== user.id)
        throw httpError(404, 'Transfer request not found');
      state.transfers = state.transfers.filter((item) => item !== transfer);
      return { cancelled: true };
    }
    if (action === 'closure/accept') {
      const transfer = state.transfers.find((item) => item.id === body.id && item.to === user.id);
      const owner = state.users.find((item) => item.id === transfer?.from && !item.disabled);
      if (!transfer || !owner) throw httpError(404, 'Active transfer request not found');
      protectLastAdmin(owner);
      const owned = state.ownership.filter((item) => item.userId === owner.id);
      for (const resource of owned) {
        resource.userId = user.id;
        state.grants = state.grants.filter(
          (grant) =>
            !(
              grant.userId === user.id &&
              grant.resourceType === resource.resourceType &&
              grant.resourceId === resource.resourceId
            )
        );
        state.grants.push({ ...resource, access: 'write' });
      }
      removeAccount(owner);
      return { accepted: true, transferred: owned.length };
    }
    if (action === 'closure/request') {
      if (
        !['retain', 'delete', 'transfer'].includes(body.choice) ||
        body.confirmation !== user.username
      )
        throw httpError(400, 'Choose a data option and type your exact username to confirm');
      const blocked = throttle(state, `closure:${user.id}`, 5);
      if (blocked) return blocked;
      if (
        typeof body.password !== 'string' ||
        body.password.length > 256 ||
        !equal(await passwordHash(body.password, user.salt), user.passwordHash)
      )
        return httpError(403, 'Current password is incorrect; account closure was not performed');
      protectLastAdmin(user);
      if (body.choice === 'transfer') {
        const recipient = state.users.find(
          (item) =>
            typeof body.recipient === 'string' &&
            item.username === body.recipient.toLowerCase() &&
            !item.disabled &&
            item.id !== user.id
        );
        if (!recipient) throw httpError(400, 'Choose a different active account by its username');
        if (state.transfers.some((item) => item.from === user.id))
          throw httpError(409, 'Cancel your pending transfer before requesting another');
        state.transfers.push({ id: crypto.randomUUID(), from: user.id, to: recipient.id });
        return {
          pending: true,
          message:
            'Transfer requested. Your account stays active until the recipient accepts. All items you own at acceptance will transfer.',
        };
      }
      if (body.choice === 'retain') {
        user.disabled = true;
        user.closure = 'retained';
        state.sessions = state.sessions.filter((item) => item.userId !== user.id);
        state.transfers = state.transfers.filter(
          (item) => item.from !== user.id && item.to !== user.id
        );
        return {
          closed: true,
          message:
            'Account deactivated. Your identity and data are retained. A system administrator can restore access after verifying your identity.',
        };
      }
      const cleanup = await deleteUnsharedHeroesData(
        user.id,
        state.ownership,
        state.grants,
        context.databaseFile || heroesDatabasePath()
      );
      const removed = new Set(
        cleanup.deleted.map((item) => `${item.resourceType}:${item.resourceId}`)
      );
      state.grants = state.grants.filter(
        (item) => !removed.has(`${item.resourceType}:${item.resourceId}`)
      );
      removeAccount(user);
      return {
        closed: true,
        deleted: cleanup.deleted.length,
        retained: cleanup.retained,
        message: `Account credentials deleted. Deleted ${cleanup.deleted.length} unshared resources; retained ${cleanup.retained} shared or linked resources under system-administrator stewardship. This account cannot be restored.`,
      };
    }
    if (action === 'password') {
      const blocked = throttle(state, `password:${user.id}`, 5);
      if (blocked) return blocked;
      if (
        typeof body.currentPassword !== 'string' ||
        body.currentPassword.length > 256 ||
        !equal(await passwordHash(body.currentPassword, user.salt), user.passwordHash)
      )
        return httpError(401, 'Current password is incorrect');
      password(body.password);
      user.salt = crypto.randomBytes(16).toString('hex');
      user.passwordHash = await passwordHash(body.password, user.salt);
      state.sessions = state.sessions.filter((item) => item === entry || item.userId !== user.id);
      return { changed: true };
    }
    if (!user.roles.includes('admin')) throw httpError(403, 'Administrator access required');
    if (action === 'admin/list')
      return { users: state.users.map(publicUser), grants: state.grants };
    if (action === 'admin/user') {
      const target = state.users.find((item) => item.id === body.userId);
      if (!target) throw httpError(404, 'Account not found');
      if (target.closure === 'deleted')
        throw httpError(400, 'A permanently deleted account cannot be restored');
      if (
        !Array.isArray(body.roles) ||
        !body.roles.length ||
        body.roles.some((role) => !roles.has(role)) ||
        typeof body.disabled !== 'boolean'
      )
        throw httpError(400, 'Invalid account roles or disabled flag');
      if (
        target.roles.includes('admin') &&
        (body.disabled || !body.roles.includes('admin')) &&
        !state.users.some(
          (item) => item.id !== target.id && item.roles.includes('admin') && !item.disabled
        )
      )
        throw httpError(400, 'Cannot disable or demote the last administrator');
      target.roles = [...new Set(body.roles)];
      target.disabled = body.disabled;
      if (!body.disabled) delete target.closure;
      state.sessions = state.sessions.filter((item) => item.userId !== target.id);
      return { user: publicUser(target) };
    }
    if (action === 'admin/grant') {
      if (
        !state.users.some((item) => item.id === body.userId && item.closure !== 'deleted') ||
        !['world', 'object', 'library', 'record'].includes(body.resourceType) ||
        typeof body.resourceId !== 'string' ||
        !body.resourceId ||
        !['none', 'read', 'write'].includes(body.access)
      )
        throw httpError(400, 'Invalid ACL entry');
      state.grants = state.grants.filter(
        (grant) =>
          !(
            grant.userId === body.userId &&
            grant.resourceType === body.resourceType &&
            grant.resourceId === body.resourceId
          )
      );
      if (body.access !== 'none')
        state.grants.push({
          userId: body.userId,
          resourceType: body.resourceType,
          resourceId: body.resourceId,
          access: body.access,
        });
      state.sessions = state.sessions.filter(
        (item) => item.userId !== body.userId || item === entry
      );
      return { saved: true };
    }
    throw httpError(404, 'Unknown identity action');
  });
  if (result instanceof Error) throw result;
  return result;
}

export function heroesPrincipal(bearer, origin, file = heroesIdentityPath()) {
  const state = read(file);
  const { user } = session(state, bearer, origin);
  return {
    id: user.id,
    roles: [...user.roles],
    grants: state.grants.filter((grant) => grant.userId === user.id),
  };
}

export function canAccess(principal, type, id, write = false) {
  return (
    principal.roles.includes('admin') ||
    principal.grants.some(
      (grant) =>
        grant.resourceType === type &&
        grant.resourceId === id &&
        (!write || grant.access === 'write')
    )
  );
}

export function grantCreator(principal, type, id, file = heroesIdentityPath()) {
  return recordHeroesResources(principal, [{ resourceType: type, resourceId: id }], [], file);
}

export function recordHeroesResources(principal, created, removed, file = heroesIdentityPath()) {
  return transact(file, (state) => {
    if (!state.users.some((user) => user.id === principal.id && !user.disabled))
      throw httpError(403, 'Creator account is no longer active; ownership was not assigned');
    const deleted = new Set(removed.map((item) => `${item.resourceType}:${item.resourceId}`));
    state.ownership = state.ownership.filter(
      (item) => !deleted.has(`${item.resourceType}:${item.resourceId}`)
    );
    state.grants = state.grants.filter(
      (item) => !deleted.has(`${item.resourceType}:${item.resourceId}`)
    );
    for (const { resourceType: type, resourceId: id } of created) {
      if (!state.ownership.some((item) => item.resourceType === type && item.resourceId === id))
        state.ownership.push({ userId: principal.id, resourceType: type, resourceId: id });
      if (
        !state.grants.some(
          (grant) =>
            grant.userId === principal.id && grant.resourceType === type && grant.resourceId === id
        )
      )
        state.grants.push({
          userId: principal.id,
          resourceType: type,
          resourceId: id,
          access: 'write',
        });
    }
  });
}
