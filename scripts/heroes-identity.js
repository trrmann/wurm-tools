import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { promisify } from 'node:util';
import { heroesDatabasePath, deleteUnsharedHeroesData } from './heroes-store.js';
import { httpError } from './wurm-db.js';
import {
  normalizeAccountName,
  accountDisplayName,
  DEFAULT_NAME_CULTURES,
  normalizeNameCultures,
  accountPersonName,
} from '../src/js/modules/objects/heroes/account-name.mjs';

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
  state.invitations ||= [];
  state.playRelationships ||= [];
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

function removePreview(root) {
  const resolved = path.resolve(root);
  if (
    path.dirname(resolved) !== path.resolve(os.tmpdir()) ||
    !/^heroes-preview-[a-zA-Z0-9]{6}$/.test(path.basename(resolved))
  )
    throw new Error('Invalid disposable preview directory; cleanup refused');
  fs.rmSync(resolved, { recursive: true, force: true });
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
      const previews = state.sessions
        .map((entry) => entry.impersonation?.previewRoot)
        .filter(Boolean);
      state.ownership ||= [];
      state.transfers ||= [];
      if (!state.nameCultures) {
        state.nameCultures = DEFAULT_NAME_CULTURES.map((culture) => ({ ...culture }));
        for (const account of state.users) {
          const code = account.personalName?.culture;
          if (code && !state.nameCultures.some((culture) => culture.code === code))
            state.nameCultures.push({
              code,
              label: code,
              nameOrder:
                accountPersonName(account.personalName).culture?.nameOrder || 'given-first',
            });
        }
      }
      const result = await action(state);
      save(file, state);
      for (const preview of previews)
        if (!state.sessions.some((entry) => entry.impersonation?.previewRoot === preview))
          removePreview(preview);
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

function publicUser(user, state) {
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
    roleRequest: user.roleRequest || null,
    listedAsGameMaster: user.listedAsGameMaster === true,
    listedAsPlayer: user.listedAsPlayer === true,
    wurmAccess: user.wurmAccess === true,
    personalName: user.personalName || null,
    preferences: user.preferences || { theme: 'dark', locations: {} },
    displayName: user.personalName
      ? accountDisplayName(user.personalName, state?.nameCultures || DEFAULT_NAME_CULTURES)
      : '',
  };
}

function cancelPendingRoleRequest(user) {
  if (user.roleRequest?.status === 'pending') {
    user.roleRequest.status = 'cancelled';
    user.roleRequest.resolvedAt = new Date().toISOString();
  }
}

function invalidatePlayRelationships(state, user) {
  for (const relationship of state.playRelationships) {
    if (
      (relationship.playerId === user.id && (user.disabled || !user.roles.includes('player'))) ||
      (relationship.gameMasterId === user.id &&
        (user.disabled || !user.roles.includes('game-master')))
    ) {
      if (['pending', 'approved'].includes(relationship.status)) {
        relationship.status = relationship.status === 'pending' ? 'cancelled' : 'ended';
        relationship.resolvedAt = new Date().toISOString();
      }
    }
  }
  if (user.disabled || !user.roles.includes('game-master')) user.listedAsGameMaster = false;
}

function session(state, bearer, origin, complete = true, effective = true) {
  const entry = state.sessions.find(
    (item) =>
      item.hash === hash(bearer || '') && item.origin === origin && item.expiresAt > Date.now()
  );
  const user = state.users.find((item) => item.id === entry?.userId && !item.disabled);
  if (!entry || !user) throw httpError(401, 'Sign in to Heros Tools');
  if (complete && (user.mfa || user.roles.includes('admin')) && !entry.mfa)
    throw httpError(403, 'Complete two-factor authentication before accessing HERO data');
  if (!effective || !entry.impersonation) return { user, entry, actor: user };
  const target =
    (entry.impersonation.previewRoot
      ? read(path.join(entry.impersonation.previewRoot, 'identity.json')).users[0]
      : null) ||
    state.users.find((item) => item.id === entry.impersonation.userId && !item.disabled);
  if (!target) throw httpError(403, 'Impersonated account is unavailable. Release impersonation.');
  return { user: target, entry, actor: user };
}

function activeRoles(user, entry) {
  const role = entry.impersonation?.role || entry.activeRole;
  if (!role) return [preferredRole(user)];
  if (!user.roles.includes(role))
    throw httpError(403, 'The selected role is no longer assigned. Sign in again.');
  return [role];
}

function preferredRole(user) {
  return user.roles.includes(user.preferences?.role)
    ? user.preferences.role
    : ['admin', 'game-master', 'player', 'visitor'].find((role) => user.roles.includes(role));
}

export function updateHeroesIdentity(file, action) {
  return transact(file, action);
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
        accountFeatures: {
          personalNames: true,
          nameConfiguration: true,
          accountClosure: true,
          invitations: true,
          roleRequests: true,
          playRelationships: true,
          wurmAccess: true,
          preferences: true,
          impersonation: true,
          approvedCopies: true,
          subscriptions: true,
        },
      };
    if (['register', 'setup', 'login', 'invite/redeem'].includes(action)) {
      const blocked = throttle(state, `public:${remote}`, 30);
      if (blocked) return blocked;
    }
    if (['register', 'setup', 'invite/redeem'].includes(action)) {
      let invitation;
      if (action === 'invite/redeem') {
        invitation = state.invitations.find(
          (item) =>
            typeof body.code === 'string' &&
            body.code.length <= 256 &&
            equal(item.hash, hash(body.code.trim())) &&
            item.expiresAt > Date.now() &&
            state.users.some(
              (issuer) =>
                issuer.id === item.createdBy && !issuer.disabled && issuer.roles.includes('admin')
            )
        );
        if (!invitation) return httpError(403, 'Invitation code is invalid, expired, or revoked');
      }
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
        roles: invitation ? [...invitation.roles] : action === 'setup' ? ['admin'] : ['visitor'],
        disabled: false,
        createdAt: new Date().toISOString(),
      };
      key(file);
      state.users.push(user);
      if (invitation) state.invitations = state.invitations.filter((item) => item !== invitation);
      if (action === 'setup') delete state.setup;
      return { user: publicUser(user, state), message: 'Account created. Sign in to continue.' };
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
        user: publicUser(user, state),
        mfaRequired: needsMfa,
        enrollmentRequired: user.roles.includes('admin') && !user.mfa,
      };
    }
    const release = action === 'impersonation/release';
    const { user, entry, actor } = session(state, bearer, origin, false, !release);
    if (action === 'me')
      return {
        user: {
          ...publicUser(user, state),
          roles: activeRoles(user, entry),
          assignedRoles: [...user.roles],
          activeRole: activeRoles(user, entry)[0],
          impersonation: entry.impersonation
            ? {
                actorId: actor.id,
                actorName: actor.username,
                preview: Boolean(entry.impersonation.previewRoot),
              }
            : null,
        },
        mfaRequired: Boolean(actor.mfa && !entry.mfa),
        enrollmentRequired: actor.roles.includes('admin') && !actor.mfa,
      };
    if (action === 'logout') {
      if (entry.impersonation) throw httpError(409, 'Release impersonation before logging out');
      state.sessions = state.sessions.filter((item) => item !== entry);
      return { loggedOut: true };
    }
    if (
      entry.impersonation &&
      /^(?:mfa\/|password$|closure\/|admin\/|roles\/|impersonation\/start)/.test(action)
    )
      throw httpError(
        403,
        'Release impersonation before changing account security or administrator settings'
      );
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
        return { recoveryCodes, user: publicUser(user, state) };
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
      return { user: publicUser(user, state) };
    }
    session(state, bearer, origin, true, !release);
    state.impersonationAudit ||= [];
    state.impersonationApprovals ||= [];
    if (release) {
      const current = entry.impersonation;
      if (!current) throw httpError(409, 'No impersonation is active');
      if (current.previewRoot) removePreview(current.previewRoot);
      state.impersonationAudit.push({
        id: crypto.randomUUID(),
        actorId: user.id,
        targetId: current.userId,
        role: current.role,
        action: 'release',
        at: new Date().toISOString(),
      });
      delete entry.impersonation;
      for (const pending of state.impersonationApprovals)
        if (pending.sessionHash === entry.hash && pending.status === 'pending')
          pending.status = 'rejected';
      return { released: true };
    }
    if (action === 'impersonation/start') {
      if (!activeRoles(user, entry).includes('admin') || entry.impersonation)
        throw httpError(
          403,
          'Select administrator role and release any current impersonation first'
        );
      if (body.userId === user.id) throw httpError(400, 'Choose another account');
      const target = body.userId
        ? state.users.find((item) => item.id === body.userId && !item.disabled)
        : null;
      if (body.userId && !target) throw httpError(404, 'Active target account not found');
      const role = body.role || (target && preferredRole(target));
      if (!roles.has(role) || (target && !target.roles.includes(role)))
        throw httpError(400, 'Select a role assigned to the target account');
      const current = { userId: target?.id || null, role, startedAt: Date.now() };
      if (!target) {
        const previewRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'heroes-preview-'));
        fs.chmodSync(previewRoot, 0o700);
        current.previewRoot = previewRoot;
        current.previewUser = {
          id: crypto.randomUUID(),
          username: `preview-${role}`,
          roles: [role],
          disabled: false,
          provider: 'preview',
          mfa: 'preview-only',
          preferences: { theme: user.preferences?.theme || 'dark', locations: {} },
        };
        const previewState = {
          version: 1,
          users: [current.previewUser],
          grants: [],
          ownership: [],
          sessions: [
            {
              hash: hash(bearer),
              userId: current.previewUser.id,
              origin,
              mfa: true,
              activeRole: role,
              expiresAt: entry.expiresAt,
              passwordAt: Date.now(),
            },
          ],
          attempts: {},
          nameCultures: state.nameCultures,
        };
        save(path.join(previewRoot, 'identity.json'), previewState);
      }
      entry.impersonation = current;
      state.impersonationAudit.push({
        id: crypto.randomUUID(),
        actorId: actor.id,
        targetId: target?.id || null,
        role,
        action: 'start',
        preview: !target,
        at: new Date().toISOString(),
      });
      return { started: true, preview: !target };
    }
    if (action === 'impersonation/status') {
      const pending = state.impersonationApprovals.filter(
        (item) => item.targetId === actor.id && item.status === 'pending'
      );
      return {
        approvals: pending.map(
          ({ fingerprint: _fingerprint, sessionHash: _sessionHash, ...item }) => item
        ),
        outgoing: state.impersonationApprovals
          .filter((item) => item.actorId === actor.id && item.status === 'pending')
          .map(({ id, summary, expiresAt }) => ({ id, summary, expiresAt })),
        audit:
          activeRoles(user, entry).includes('admin') && !entry.impersonation
            ? state.impersonationAudit
            : [],
      };
    }
    if (action === 'impersonation/cancel') {
      const approval = state.impersonationApprovals.find(
        (item) => item.id === body.id && item.actorId === actor.id
      );
      if (!approval || approval.status !== 'pending')
        throw httpError(409, 'Pending update not found');
      approval.status = 'rejected';
      state.impersonationAudit.push({
        id: crypto.randomUUID(),
        actorId: actor.id,
        targetId: approval.targetId,
        action: 'approval-cancel',
        approvalId: approval.id,
        at: new Date().toISOString(),
      });
      return { cancelled: true };
    }
    if (action === 'impersonation/respond') {
      if (entry.impersonation)
        throw httpError(403, 'Only the real account session can review impersonation updates');
      const approval = state.impersonationApprovals.find(
        (item) => item.id === body.id && item.targetId === user.id
      );
      if (!approval || approval.status !== 'pending' || Date.now() >= approval.expiresAt)
        throw httpError(
          409,
          'This approval is unavailable or its five-minute response window has expired'
        );
      if (!['approve', 'reject'].includes(body.decision))
        throw httpError(400, 'Choose Approve or Reject');
      approval.status = body.decision === 'approve' ? 'approved' : 'rejected';
      state.impersonationAudit.push({
        id: crypto.randomUUID(),
        actorId: user.id,
        action: `approval-${body.decision}`,
        approvalId: approval.id,
        at: new Date().toISOString(),
      });
      return { saved: true };
    }
    if (action === 'role/select') {
      if (!user.roles.includes(body.role)) throw httpError(403, 'Select an assigned role');
      if (entry.impersonation) entry.impersonation.role = body.role;
      else entry.activeRole = body.role;
      user.preferences ||= { theme: 'dark', locations: {} };
      user.preferences.role = body.role;
      return { selectedRole: body.role, location: user.preferences.locations?.[body.role] || null };
    }
    if (action === 'preferences/save') {
      user.preferences ||= { theme: 'dark', locations: {} };
      if (body.theme !== undefined) {
        if (!['dark', 'light'].includes(body.theme))
          throw httpError(400, 'Choose Light or Dark mode');
        user.preferences.theme = body.theme;
      }
      if (body.location !== undefined) {
        if (
          typeof body.location !== 'string' ||
          body.location.length > 2048 ||
          !/^\/site\/heroes\/(?:[a-z-]+\/)*(?:\?[^#]*)?$/.test(body.location) ||
          /\/(?:login|logout|register|setup)(?:\/|$)/.test(body.location)
        )
          throw httpError(400, 'Choose a workspace location on this site');
        user.preferences.locations ||= {};
        user.preferences.locations[activeRoles(user, entry)[0]] = body.location;
      }
      return { preferences: user.preferences };
    }
    if (action.startsWith('admin/') && !activeRoles(user, entry).includes('admin'))
      throw httpError(403, 'Select the system-administrator role to use administrator controls');
    if (action === 'admin/sessions/revoke') {
      if (!state.users.some((account) => account.id === body.userId && account.id !== user.id))
        throw httpError(400, 'Choose another existing account; use Logout for your own session');
      const previous = state.sessions.length;
      state.sessions = state.sessions.filter((session) => session.userId !== body.userId);
      return { revoked: previous - state.sessions.length };
    }
    if (action === 'admin/play/revoke') {
      const relationship = state.playRelationships.find(
        (item) => item.id === body.id && ['pending', 'approved'].includes(item.status)
      );
      if (!relationship) throw httpError(404, 'Active relationship or invitation not found');
      relationship.status = relationship.status === 'pending' ? 'cancelled' : 'ended';
      relationship.resolvedAt = new Date().toISOString();
      return { relationship };
    }
    if (action.startsWith('directory/') || action.startsWith('messages/')) {
      const roles = activeRoles(user, entry);
      const administrator = roles.includes('admin');
      const relationships = state.playRelationships.filter(
        (item) =>
          ['pending', 'approved'].includes(item.status) &&
          (administrator || item.playerId === user.id || item.gameMasterId === user.id)
      );
      const connected = (id) =>
        relationships.some((item) => item.playerId === id || item.gameMasterId === id);
      const contacted = (id) =>
        state.messages?.some(
          (message) =>
            (message.from === user.id && message.to === id) ||
            (message.to === user.id && message.from === id)
        );
      const visible = (account) =>
        !account.disabled &&
        (administrator ||
          account.id === user.id ||
          connected(account.id) ||
          contacted(account.id) ||
          account.roles.includes('admin') ||
          (account.roles.includes('game-master') && account.listedAsGameMaster) ||
          (account.roles.includes('player') && account.listedAsPlayer));
      const label = (account) => {
        const value = publicUser(account, state);
        return {
          id: value.id,
          username: value.username,
          displayName: value.displayName,
          roles: value.roles,
          online:
            administrator || account.showOnline === true
              ? state.sessions.some(
                  (item) =>
                    item.userId === account.id && item.expiresAt > Date.now() && !item.impersonation
                )
              : null,
        };
      };
      if (action === 'directory/status')
        return {
          users: state.users.filter(visible).map(label),
          relationships,
          listing: {
            gameMaster: user.listedAsGameMaster === true,
            player: user.listedAsPlayer === true,
            online: user.showOnline === true,
          },
        };
      if (action === 'directory/online') {
        if (typeof body.visible !== 'boolean')
          throw httpError(400, 'Choose whether to publish online status');
        user.showOnline = body.visible;
        return { visible: body.visible };
      }
      if (action === 'directory/listing') {
        const field =
          body.role === 'player'
            ? 'listedAsPlayer'
            : body.role === 'game-master'
              ? 'listedAsGameMaster'
              : null;
        if (!field || !roles.includes(body.role) || typeof body.visible !== 'boolean')
          throw httpError(400, 'Select an active Player or Game Master role and a listing choice');
        user[field] = body.visible;
        return { listed: body.visible };
      }
      state.messages ||= [];
      if (action === 'messages/list')
        return {
          messages: state.messages
            .filter(
              (message) =>
                (message.from === user.id || message.to === user.id) &&
                !message.hiddenFor.includes(user.id)
            )
            .map((message) => ({ ...message })),
        };
      if (action === 'messages/send') {
        const recipient = state.users.find((account) => account.id === body.to && visible(account));
        if (!recipient || recipient.id === user.id)
          throw httpError(404, 'Choose an available directory account or relationship contact');
        if (typeof body.text !== 'string' || !body.text.trim() || body.text.trim().length > 4000)
          throw httpError(400, 'Enter a message of 1–4000 characters');
        const blocked = throttle(state, `message:${user.id}`, 30);
        if (blocked) return blocked;
        const message = {
          id: crypto.randomUUID(),
          from: user.id,
          to: recipient.id,
          text: body.text.trim(),
          createdAt: new Date().toISOString(),
          hiddenFor: [],
        };
        state.messages.push(message);
        return { message };
      }
      if (action === 'messages/remove') {
        const message = state.messages.find(
          (item) => item.id === body.id && (item.from === user.id || item.to === user.id)
        );
        if (!message) throw httpError(404, 'Message not found');
        if (!message.hiddenFor.includes(user.id)) message.hiddenFor.push(user.id);
        return { removed: true };
      }
      throw httpError(404, 'Unknown directory or message action');
    }
    if (action === 'wurm/access') {
      if (entry.impersonation)
        throw httpError(403, 'Release impersonation before opening Wurm tools');
      if (!activeRoles(user, entry).includes('admin') && user.wurmAccess !== true)
        throw httpError(
          403,
          'Wurm tools require system-administrator access or explicit delegation'
        );
      return { allowed: true };
    }
    if (action === 'play/status') {
      const label = (id) => {
        const { username, displayName } = publicUser(
          state.users.find((item) => item.id === id),
          state
        );
        return { username, displayName };
      };
      const directory = activeRoles(user, entry).includes('player')
        ? state.users
            .filter(
              (account) =>
                account.id !== user.id &&
                !account.disabled &&
                account.roles.includes('game-master') &&
                account.listedAsGameMaster === true
            )
            .map((account) => label(account.id))
            .sort((left, right) => left.username.localeCompare(right.username))
        : [];
      return {
        directory,
        relationships: state.playRelationships
          .filter((item) => item.playerId === user.id || item.gameMasterId === user.id)
          .map((item) => ({
            ...item,
            player: label(item.playerId),
            gameMaster: label(item.gameMasterId),
          })),
      };
    }
    if (action === 'play/listing') {
      if (!activeRoles(user, entry).includes('game-master'))
        throw httpError(403, 'Select the Game Master role');
      if (typeof body.visible !== 'boolean')
        throw httpError(400, 'Choose whether to list your Game Master name');
      user.listedAsGameMaster = body.visible;
      return { user: publicUser(user, state) };
    }
    if (action === 'play/request' || action === 'play/invite') {
      const invitation = action === 'play/invite';
      if (!activeRoles(user, entry).includes(invitation ? 'game-master' : 'player'))
        throw httpError(
          403,
          invitation
            ? 'Select Game Master to invite a Player'
            : 'Select Player to request a Game Master'
        );
      const gm = state.users.find(
        (account) =>
          account.username === body.username &&
          account.id !== user.id &&
          !account.disabled &&
          account.roles.includes(invitation ? 'player' : 'game-master') &&
          (invitation ? account.listedAsPlayer === true : account.listedAsGameMaster === true)
      );
      if (!gm)
        throw httpError(
          404,
          'This Game Master is no longer listed. Refresh the available Game Masters.'
        );
      const previous = state.playRelationships.find(
        (item) =>
          item.playerId === (invitation ? gm.id : user.id) &&
          item.gameMasterId === (invitation ? user.id : gm.id)
      );
      if (previous && ['pending', 'approved'].includes(previous.status))
        throw httpError(
          409,
          'You already have a pending or approved relationship with this Game Master'
        );
      state.playRelationships = state.playRelationships.filter((item) => item !== previous);
      const relationship = {
        id: crypto.randomUUID(),
        playerId: invitation ? gm.id : user.id,
        gameMasterId: invitation ? user.id : gm.id,
        initiatedBy: invitation ? 'game-master' : 'player',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      state.playRelationships.push(relationship);
      return { relationship };
    }
    if (action === 'play/respond') {
      const relationship = state.playRelationships.find(
        (item) =>
          item.id === body.id && (item.playerId === user.id || item.gameMasterId === user.id)
      );
      if (!relationship) throw httpError(404, 'Play relationship not found');
      const player = state.users.find((account) => account.id === relationship.playerId);
      const gm = state.users.find((account) => account.id === relationship.gameMasterId);
      if (body.decision === 'cancel') {
        const requester =
          relationship.initiatedBy === 'game-master'
            ? relationship.gameMasterId
            : relationship.playerId;
        if (requester !== user.id || relationship.status !== 'pending')
          throw httpError(409, 'Only the requesting player can cancel a pending request');
        relationship.status = 'cancelled';
      } else if (body.decision === 'end') {
        if (relationship.status !== 'approved')
          throw httpError(409, 'Only an approved relationship can be ended');
        relationship.status = 'ended';
      } else if (['approve', 'reject'].includes(body.decision)) {
        const invite = relationship.initiatedBy === 'game-master';
        if (
          (invite ? relationship.playerId : relationship.gameMasterId) !== user.id ||
          !activeRoles(user, entry).includes(invite ? 'player' : 'game-master')
        )
          throw httpError(403, 'Only the addressed Game Master can review this request');
        if (
          relationship.status !== 'pending' ||
          player.disabled ||
          gm.disabled ||
          !player.roles.includes('player') ||
          !gm.roles.includes('game-master')
        )
          throw httpError(
            409,
            'This play request is no longer pending or its participants are unavailable'
          );
        relationship.status = body.decision === 'approve' ? 'approved' : 'rejected';
      } else throw httpError(400, 'Choose approve, reject, cancel, or end');
      relationship.resolvedAt = new Date().toISOString();
      return { relationship };
    }
    if (action === 'roles/request') {
      if (!user.roles.includes('visitor') || user.roles.includes('admin'))
        throw httpError(403, 'Only Visitor accounts can request Player or Game Master roles');
      if (
        !Array.isArray(body.roles) ||
        !body.roles.length ||
        body.roles.some(
          (role) => !['player', 'game-master'].includes(role) || user.roles.includes(role)
        )
      )
        throw httpError(400, 'Select Player and/or Game Master roles you do not already have');
      if (user.roleRequest?.status === 'pending')
        throw httpError(409, 'Cancel your pending role request before submitting another');
      user.roleRequest = {
        id: crypto.randomUUID(),
        roles: [...new Set(body.roles)],
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      return { user: publicUser(user, state) };
    }
    if (action === 'roles/cancel') {
      if (user.roleRequest?.status !== 'pending' || user.roleRequest.id !== body.requestId)
        throw httpError(409, 'This role request is no longer pending. Refresh Account & security.');
      cancelPendingRoleRequest(user);
      return { user: publicUser(user, state) };
    }
    if (action === 'name-config') return { cultures: state.nameCultures || DEFAULT_NAME_CULTURES };
    if (action === 'admin/name-config') {
      if (!user.roles.includes('admin')) throw httpError(403, 'Administrator access required');
      try {
        const cultures = normalizeNameCultures(body.cultures);
        const codes = new Set(cultures.map((culture) => culture.code));
        if (
          state.users.some(
            (account) => account.personalName && !codes.has(account.personalName.culture)
          )
        )
          throw new RangeError(
            'Cannot remove a culture used by an account; keep it in the configuration'
          );
        state.nameCultures = cultures;
      } catch (error) {
        if (!(error instanceof TypeError || error instanceof RangeError)) throw error;
        throw httpError(400, error.message);
      }
      return { cultures: state.nameCultures, user: publicUser(user, state) };
    }
    if (action === 'profile/name') {
      try {
        const personalName = normalizeAccountName(body.personalName);
        if (
          !(state.nameCultures || DEFAULT_NAME_CULTURES).some(
            (culture) => culture.code === personalName.culture
          )
        )
          throw new RangeError('Select a culture configured by your system administrator');
        personalName.nameOrder = 'auto';
        user.personalName = personalName;
      } catch (error) {
        if (!(error instanceof TypeError || error instanceof RangeError)) throw error;
        throw httpError(400, error.message);
      }
      return { user: publicUser(user, state) };
    }
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
      state.playRelationships = state.playRelationships.filter(
        (item) => item.playerId !== target.id && item.gameMasterId !== target.id
      );
      delete target.roleRequest;
      state.invitations = state.invitations.filter((item) => item.createdBy !== target.id);
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
        'personalName',
      ])
        delete target[field];
      state.sessions = state.sessions.filter((item) => item.userId !== target.id);
      state.grants = state.grants.filter((item) => item.userId !== target.id);
      const steward = state.users.find((item) => !item.disabled && item.roles.includes('admin'));
      state.ownership = state.ownership.map((item) =>
        item.userId === target.id ? { ...item, userId: steward.id } : item
      );
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
        invalidatePlayRelationships(state, user);
        cancelPendingRoleRequest(user);
        state.invitations = state.invitations.filter((item) => item.createdBy !== user.id);
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
      state.ownership = state.ownership.filter(
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
    if (action === 'admin/wurm-access') {
      const target = state.users.find(
        (account) => account.id === body.userId && account.closure !== 'deleted'
      );
      if (!target) throw httpError(404, 'Account not found');
      if (typeof body.allowed !== 'boolean')
        throw httpError(400, 'Choose whether to delegate Wurm tools');
      target.wurmAccess = body.allowed;
      state.sessions = state.sessions.filter((item) => item.userId !== target.id);
      return { user: publicUser(target, state) };
    }
    if (action === 'admin/roles/review') {
      if (!['approve', 'reject'].includes(body.decision))
        throw httpError(400, 'Choose approve or reject for the pending role request');
      const target = state.users.find((account) => account.id === body.userId);
      if (!target || target.disabled || target.closure === 'deleted')
        throw httpError(409, 'The requesting account is unavailable. Refresh the account lists.');
      const request = target.roleRequest;
      if (request?.status !== 'pending' || request.id !== body.requestId)
        throw httpError(409, 'This role request is no longer pending. Refresh the account lists.');
      if (body.decision === 'approve') {
        target.roles = [
          ...new Set([...target.roles.filter((role) => role !== 'visitor'), ...request.roles]),
        ];
        state.sessions = state.sessions.filter((item) => item.userId !== target.id);
      }
      request.status = body.decision === 'approve' ? 'approved' : 'rejected';
      request.resolvedAt = new Date().toISOString();
      return { user: publicUser(target, state) };
    }
    if (action === 'admin/list')
      return {
        users: state.users.map((account) => publicUser(account, state)),
        grants: state.grants,
        invitations: state.invitations
          .filter(
            (item) =>
              item.expiresAt > Date.now() &&
              state.users.some(
                (issuer) =>
                  issuer.id === item.createdBy && !issuer.disabled && issuer.roles.includes('admin')
              )
          )
          .map(({ id, roles, createdAt, expiresAt }) => ({ id, roles, createdAt, expiresAt })),
      };
    if (action === 'admin/invite') {
      if (
        !Array.isArray(body.roles) ||
        !body.roles.length ||
        body.roles.some((role) => !roles.has(role))
      )
        throw httpError(400, 'Select at least one valid invitation role');
      state.invitations = state.invitations.filter((item) => item.expiresAt > Date.now());
      if (state.invitations.length >= 100)
        throw httpError(400, 'Revoke unused invitations before creating more (maximum 100)');
      const code = token();
      const invitation = {
        id: crypto.randomUUID(),
        hash: hash(code),
        roles: [...new Set(body.roles)],
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };
      state.invitations.push(invitation);
      return {
        code,
        invitation: { id: invitation.id, roles: invitation.roles, expiresAt: invitation.expiresAt },
      };
    }
    if (action === 'admin/invite/revoke') {
      if (!state.invitations.some((item) => item.id === body.invitationId))
        throw httpError(404, 'Invitation not found; it may already have been used or revoked');
      state.invitations = state.invitations.filter((item) => item.id !== body.invitationId);
      return { revoked: true };
    }
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
      invalidatePlayRelationships(state, target);
      cancelPendingRoleRequest(target);
      if (target.disabled || !target.roles.includes('admin'))
        state.invitations = state.invitations.filter((item) => item.createdBy !== target.id);
      if (!body.disabled) delete target.closure;
      state.sessions = state.sessions.filter((item) => item.userId !== target.id);
      return { user: publicUser(target, state) };
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
  const { user, entry } = session(state, bearer, origin);
  return {
    id: user.id,
    impersonating: Boolean(entry.impersonation),
    roles: activeRoles(user, entry),
    grants: state.grants.filter((grant) => grant.userId === user.id),
    wurmAccess: user.wurmAccess === true,
    ...sharingPrincipal(state, user, activeRoles(user, entry)),
  };
}

export function heroesRequestContext(bearer, origin, file, databaseFile, complete = true) {
  const state = read(file);
  const { entry, actor } = session(state, bearer, origin, complete, false);
  const impersonation = entry.impersonation;
  return {
    actorId: actor.id,
    sessionHash: entry.hash,
    impersonation,
    identityFile: impersonation?.previewRoot
      ? path.join(impersonation.previewRoot, 'identity.json')
      : file,
    databaseFile: impersonation?.previewRoot
      ? path.join(impersonation.previewRoot, 'heroes.db')
      : databaseFile,
  };
}

function sharingPrincipal(state, current, roles = []) {
  return {
    ownership: state.ownership || [],
    accounts: state.users
      .filter((user) => !user.disabled)
      .map((user) => ({
        id: user.id,
        username: user.username,
        displayName: publicUser(user, state).displayName,
        roles: [...user.roles],
        discoverable: Boolean(
          current &&
          (roles.includes('admin') ||
            current.id === user.id ||
            user.roles.includes('admin') ||
            user.listedAsPlayer ||
            user.listedAsGameMaster ||
            state.messages?.some(
              (message) =>
                (message.from === current.id && message.to === user.id) ||
                (message.to === current.id && message.from === user.id)
            ) ||
            state.ownership?.some(
              (item) =>
                item.userId === current.id &&
                (item.editors?.includes(user.id) ||
                  item.publication?.viewers?.includes(user.id) ||
                  item.creatorId === user.id)
            ) ||
            state.playRelationships?.some(
              (item) =>
                ['pending', 'approved'].includes(item.status) &&
                ((item.playerId === current.id && item.gameMasterId === user.id) ||
                  (item.gameMasterId === current.id && item.playerId === user.id))
            ))
        ),
      })),
    relationships: (state.playRelationships || []).filter((item) => item.status === 'approved'),
    scopeInvitations: state.scopeInvitations || [],
    subscriptions: state.subscriptions || [],
    objectPermissions: state.objectPermissions || [],
  };
}

export function heroesPublicPrincipal(file = heroesIdentityPath()) {
  return { id: null, roles: [], grants: [], ...sharingPrincipal(read(file)) };
}

export function saveHeroesSharing(principal, resource, body, file = heroesIdentityPath()) {
  return transact(file, (state) => {
    let owner = state.ownership.find(
      (item) => item.resourceType === resource.type && item.resourceId === resource.id
    );
    if (!owner && principal.roles.includes('admin') && body.adopt === true) {
      owner = { userId: principal.id, resourceType: resource.type, resourceId: resource.id };
      state.ownership.push(owner);
    }
    if (!owner || (!principal.roles.includes('admin') && owner.userId !== principal.id))
      throw httpError(
        403,
        'Only the content owner or system administrator can change publication and editors'
      );
    const audiences = [
      'private',
      'public',
      'player-group',
      'gm-group',
      'campaign',
      'world',
      'genre',
      'campaign-group',
      'world-group',
      'genre-group',
    ];
    if (!audiences.includes(body.audience))
      throw httpError(400, 'Choose a supported publication audience');
    for (const key of ['editors', 'viewers']) {
      if (
        !Array.isArray(body[key]) ||
        body[key].some((id) => !state.users.some((user) => user.id === id && !user.disabled))
      )
        throw httpError(400, 'Select existing active accounts for editors and audience members');
    }
    owner.editors = [...new Set(body.editors)];
    owner.publication = {
      audience: body.audience,
      scopeId: typeof body.scopeId === 'string' ? body.scopeId : '',
      viewers: [...new Set(body.viewers)],
    };
    return { saved: true, ownerId: owner.userId };
  });
}

export function canAccess(principal, type, id, write = false) {
  const owned = principal.ownership?.find(
    (item) => item.resourceType === type && item.resourceId === id
  );
  return (
    principal.roles.includes('admin') ||
    (principal.id && (owned?.userId === principal.id || owned?.editors?.includes(principal.id))) ||
    (!write &&
      (owned?.publication?.audience === 'public' ||
        (principal.id && owned?.readers?.includes(principal.id)))) ||
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
    for (const resource of created) {
      const { resourceType: type, resourceId: id } = resource;
      if (!state.ownership.some((item) => item.resourceType === type && item.resourceId === id))
        state.ownership.push({
          userId: principal.id,
          creatorId: Object.hasOwn(resource, 'creatorId') ? resource.creatorId : principal.id,
          ...(resource.provenance ? { provenance: resource.provenance } : {}),
          resourceType: type,
          resourceId: id,
        });
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
