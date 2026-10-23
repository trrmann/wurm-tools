import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createHeroesSetupCode,
  heroesIdentityAction,
  heroesPrincipal,
  totpCode,
} from '../scripts/heroes-identity.js';
import { createServer } from '../scripts/wurm-local.js';
import {
  createHeroesObject,
  createHeroesWorld,
  saveHeroesManagement,
  saveHeroesLibrary,
} from '../scripts/heroes-store.js';
import { rotatePairingCode, pairBrowser } from '../scripts/wurm-helper-auth.js';

let root;
let identity;
let database;
const origin = 'http://localhost:3000';
const password = 'separate-test-password-1234';
const call = (action, body = {}, bearer = '', extra = {}) =>
  heroesIdentityAction(action, body, { file: identity, origin, bearer, ...extra });

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'heroes-identity-'));
  identity = path.join(root, 'identity.json');
  database = path.join(root, 'heroes.db');
});
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

async function adminAccount() {
  const setupCode = await createHeroesSetupCode(identity);
  await call('setup', { setupCode, username: 'administrator', password });
  const login = await call('login', { username: 'administrator', password });
  const enrollment = await call('mfa/start', {}, login.token);
  const confirmed = await call('mfa/confirm', { code: totpCode(enrollment.secret) }, login.token);
  return { ...login, secret: enrollment.secret, recovery: confirmed.recoveryCodes };
}

async function startServer() {
  const server = createServer({
    env: {
      WURM_HEROES_DB_PATH: database,
      HEROES_IDENTITY_PATH: identity,
      WURM_HELPER_AUTH_FILE: path.join(root, 'helper-auth.json'),
    },
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (route, bearer = '', method = 'GET', body) => {
    const response = await fetch(`${base}${route}`, {
      method,
      headers: { Origin: origin, 'X-Heroes-Session': bearer, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  };
  const close = () =>
    new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  return { request, close, base };
}

describe('local HERO identity', () => {
  it('creates visitors only, hashes passwords and rejects invalid or duplicate registrations', async () => {
    const result = await call('register', { username: 'Visitor', password, roles: ['admin'] });
    expect(result.user).toMatchObject({
      username: 'visitor',
      roles: ['visitor'],
      mfaEnabled: false,
    });
    expect(result.user.passwordHash).toBeUndefined();
    expect(fs.readFileSync(identity, 'utf8')).not.toContain(password);
    await expect(call('register', { username: 'Visitor', password })).rejects.toMatchObject({
      status: 409,
    });
    await expect(call('register', { username: 'Other', password: 'short' })).rejects.toMatchObject({
      status: 400,
    });
    await expect(call('login', { username: 'visitor', password: 'wrong' })).rejects.toMatchObject({
      status: 401,
    });
    const logged = await call('login', { username: 'visitor', password });
    expect(heroesPrincipal(logged.token, origin, identity).roles).toEqual(['visitor']);
    expect(fs.readFileSync(identity, 'utf8')).not.toContain(logged.token);
  });

  it('requires one-time setup and administrator MFA, encrypts TOTP secrets and prevents code replay', async () => {
    const setupCode = await createHeroesSetupCode(identity);
    await expect(
      call('setup', { setupCode: 'wrong', username: 'administrator', password })
    ).rejects.toMatchObject({ status: 403 });
    await call('setup', { setupCode, username: 'administrator', password });
    await expect(
      call('setup', { setupCode, username: 'other-admin', password })
    ).rejects.toMatchObject({ status: 403 });
    await expect(createHeroesSetupCode(identity)).rejects.toMatchObject({ status: 409 });
    const login = await call('login', { username: 'administrator', password });
    expect(login.enrollmentRequired).toBe(true);
    expect(() => heroesPrincipal(login.token, origin, identity)).toThrow('Complete two-factor');
    const enrollment = await call('mfa/start', {}, login.token);
    expect(fs.readFileSync(identity, 'utf8')).not.toContain(enrollment.secret);
    const code = totpCode(enrollment.secret);
    const confirmed = await call('mfa/confirm', { code }, login.token);
    expect(confirmed.recoveryCodes).toHaveLength(10);
    expect(heroesPrincipal(login.token, origin, identity).roles).toContain('admin');
    const nextLogin = await call('login', { username: 'administrator', password });
    expect(nextLogin.mfaRequired).toBe(true);
    await expect(call('mfa/verify', { code }, nextLogin.token)).rejects.toMatchObject({
      status: 401,
    });
    await call('mfa/verify', { code: confirmed.recoveryCodes[0] }, nextLogin.token);
    await expect(
      call('mfa/verify', { code: confirmed.recoveryCodes[0] }, nextLogin.token)
    ).rejects.toMatchObject({ status: 401 });
    const stored = fs.readFileSync(identity, 'utf8');
    expect(stored).not.toContain(confirmed.recoveryCodes[0]);
    expect(stored).not.toContain(setupCode);
  });

  it('makes sessions origin-bound, revokes them on logout and does not report false logout success', async () => {
    await call('register', { username: 'player', password });
    const login = await call('login', { username: 'player', password });
    await expect(
      call('me', {}, login.token, { origin: 'http://localhost:4173' })
    ).rejects.toMatchObject({ status: 401 });
    expect(await call('logout', {}, login.token)).toEqual({ loggedOut: true });
    await expect(call('me', {}, login.token)).rejects.toMatchObject({ status: 401 });
    await expect(call('logout', {}, login.token)).rejects.toMatchObject({ status: 401 });
  });

  it('allows optional user TOTP and a password change without storing plaintext credentials', async () => {
    await call('register', { username: 'player', password });
    const login = await call('login', { username: 'player', password });
    const enrollment = await call('mfa/start', {}, login.token);
    await call('mfa/confirm', { code: totpCode(enrollment.secret) }, login.token);
    await call(
      'password',
      { currentPassword: password, password: 'replacement-password-456' },
      login.token
    );
    await expect(call('login', { username: 'player', password })).rejects.toMatchObject({
      status: 401,
    });
    expect(
      (await call('login', { username: 'player', password: 'replacement-password-456' }))
        .mfaRequired
    ).toBe(true);
  });

  it('persists login throttles and invalidates sessions when roles change or accounts are disabled', async () => {
    const admin = await adminAccount();
    const visitor = await call('register', { username: 'visitor', password });
    const login = await call('login', { username: 'visitor', password });
    await call(
      'admin/user',
      { userId: visitor.user.id, roles: ['player'], disabled: false },
      admin.token
    );
    expect(() => heroesPrincipal(login.token, origin, identity)).toThrow();
    for (let index = 0; index < 10; index++)
      await expect(
        call('login', { username: 'visitor', password: 'incorrect' })
      ).rejects.toMatchObject({ status: 401 });
    await expect(call('login', { username: 'visitor', password })).rejects.toMatchObject({
      status: 429,
    });
    const state = JSON.parse(fs.readFileSync(identity, 'utf8'));
    expect(Object.values(state.attempts).some((entry) => entry.count > 10)).toBe(true);
    await expect(
      call(
        'admin/user',
        { userId: admin.user.id, roles: ['visitor'], disabled: false },
        admin.token
      )
    ).rejects.toMatchObject({ status: 400 });
  }, 15_000);

  it('checks a standard TOTP test vector', () => {
    expect(totpCode('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 1)).toBe('287082');
  });
});

describe('server-enforced HERO authorization', () => {
  it('denies anonymous and paired-only callers and leaves Wurm pairing separate', async () => {
    const { request, close, base } = await startServer();
    try {
      expect((await request('/heroes/objects')).status).toBe(401);
      const authFile = path.join(root, 'helper-auth.json');
      const paired = pairBrowser(rotatePairingCode(authFile), authFile);
      const response = await fetch(`${base}/heroes/objects`, {
        headers: { Origin: origin, Authorization: `Bearer ${paired}` },
      });
      expect(response.status).toBe(401);
      expect(
        (
          await fetch(`${base}/heroes/auth/status`, {
            headers: { Origin: 'https://untrusted.invalid' },
          })
        ).status
      ).toBe(403);
      expect((await fetch(`${base}/heroes/auth/status`)).status).toBe(403);
      expect((await request('/status')).status).toBe(401);
    } finally {
      await close();
    }
  });

  it('defaults legacy data to admin-only, filters every list and rejects direct-ID/export/write bypasses', async () => {
    const world = await createHeroesWorld('Private legacy world', database);
    const object = await createHeroesObject(
      world.id,
      { name: 'Private legacy object', kind: 'equipment' },
      database
    );
    const secretProfile = await saveHeroesManagement(
      { kind: 'profile', data: { name: 'Private GM', roles: ['game-master'] } },
      null,
      database
    );
    const entry = await saveHeroesLibrary(
      {
        name: 'Private template',
        kind: 'object',
        definition: { name: 'Private template', kind: 'equipment' },
      },
      null,
      database
    );
    const admin = await adminAccount();
    const visitor = await call('register', { username: 'visitor', password });
    let login = await call('login', { username: 'visitor', password });
    const { request, close } = await startServer();
    try {
      expect((await request('/heroes/management', admin.token)).body.objects).toHaveLength(1);
      for (const [route, key] of [
        ['/heroes/worlds', 'worlds'],
        ['/heroes/objects', 'objects'],
        ['/heroes/library', 'entries'],
      ])
        expect((await request(route, login.token)).body[key]).toEqual([]);
      expect((await request('/heroes/management', login.token)).body).toEqual({
        records: [],
        worlds: [],
        objects: [],
      });
      for (const [route, method, body] of [
        [`/heroes/objects/${object.id}`, 'PUT', { name: 'Hijacked', kind: 'equipment' }],
        [`/heroes/objects/${object.id}`, 'DELETE'],
        [`/heroes/objects/${object.id}/export`, 'GET'],
        [`/heroes/worlds/${world.id}/objects`, 'GET'],
        [`/heroes/worlds/${world.id}`, 'DELETE'],
        ['/heroes/management/export', 'GET'],
        ['/heroes/management/import', 'POST', {}],
        ['/heroes/library/export', 'GET'],
        [`/heroes/library/${entry.id}`, 'DELETE'],
        [
          `/heroes/management/${secretProfile.id}`,
          'PUT',
          { kind: 'profile', data: { name: 'Hijacked', roles: ['player'] } },
        ],
      ])
        expect((await request(route, login.token, method, body)).status, route).toBe(403);
      expect((await request('/heroes/auth/admin/list', login.token)).status).toBe(403);
      await call(
        'admin/grant',
        { userId: visitor.user.id, resourceType: 'object', resourceId: object.id, access: 'read' },
        admin.token
      );
      expect((await request('/heroes/objects', login.token)).status).toBe(401);
      login = await call('login', { username: 'visitor', password });
      expect((await request('/heroes/objects', login.token)).body.objects[0].id).toBe(object.id);
      expect((await request(`/heroes/objects/${object.id}/export`, login.token)).status).toBe(200);
      expect(
        (
          await request(`/heroes/objects/${object.id}`, login.token, 'PUT', {
            name: 'Denied',
            kind: 'equipment',
          })
        ).status
      ).toBe(403);
      await call(
        'admin/grant',
        { userId: visitor.user.id, resourceType: 'object', resourceId: object.id, access: 'write' },
        admin.token
      );
      login = await call('login', { username: 'visitor', password });
      expect(
        (
          await request(`/heroes/objects/${object.id}`, login.token, 'PUT', {
            name: 'Allowed edit',
            kind: 'equipment',
          })
        ).status
      ).toBe(200);
      expect(
        (
          await request('/heroes/auth/admin/grant', admin.token, 'POST', {
            userId: visitor.user.id,
            resourceType: 'object',
            resourceId: 'missing',
            access: 'read',
          })
        ).status
      ).toBe(400);
    } finally {
      await close();
    }
  });

  it('grants creators access without making organizational roles or global availability authorization', async () => {
    const admin = await adminAccount();
    const visitor = await call('register', { username: 'player', password });
    await call(
      'admin/user',
      { userId: visitor.user.id, roles: ['player'], disabled: false },
      admin.token
    );
    const login = await call('login', { username: 'player', password });
    const { request, close } = await startServer();
    try {
      expect(
        (await request('/heroes/worlds', login.token, 'POST', { name: 'Forbidden GM action' }))
          .status
      ).toBe(403);
      const created = await request('/heroes/objects', login.token, 'POST', {
        name: 'Owned global object',
        kind: 'equipment',
      });
      expect(created.status).toBe(201);
      const id = created.body.object.id;
      expect((await request('/heroes/objects', login.token)).body.objects[0].id).toBe(id);
      expect((await request('/heroes/management', login.token)).body.records[0].kind).toBe(
        'object-scope'
      );
      const other = await call('register', { username: 'other', password });
      expect(other.user.roles).toEqual(['visitor']);
      const second = await call('login', { username: 'other', password });
      expect((await request('/heroes/objects', second.token)).body.objects).toEqual([]);
      expect(
        (
          await request(`/heroes/objects/${id}`, login.token, 'PUT', {
            name: 'Edited by creator',
            kind: 'equipment',
          })
        ).status
      ).toBe(200);
    } finally {
      await close();
    }
  });

  it('rejects password-only administrator sessions for data, ACLs and exports', async () => {
    const code = await createHeroesSetupCode(identity);
    await call('setup', { setupCode: code, username: 'administrator', password });
    const login = await call('login', { username: 'administrator', password });
    const { request, close } = await startServer();
    try {
      for (const route of [
        '/heroes/objects',
        '/heroes/management/export',
        '/heroes/auth/admin/list',
      ])
        expect((await request(route, login.token)).status).toBe(403);
    } finally {
      await close();
    }
  });
});
