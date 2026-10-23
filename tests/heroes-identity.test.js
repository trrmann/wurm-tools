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

async function accountWithRoles(admin, username, roles) {
  const registered = await call('register', { username, password });
  await call('admin/user', { userId: registered.user.id, roles, disabled: false }, admin.token);
  return call('login', { username, password });
}

describe('player and Game Master account relationships', () => {
  it('lists only opted-in active GMs to Players and exposes only consented display names and usernames', async () => {
    const admin = await adminAccount();
    const player = await accountWithRoles(admin, 'directory-player', ['player']);
    const gm = await accountWithRoles(admin, 'directory-gm', ['game-master']);
    const dual = await accountWithRoles(admin, 'directory-dual', ['player', 'game-master']);
    await call('register', { username: 'directory-visitor', password });
    const visitor = await call('login', { username: 'directory-visitor', password });
    await call('profile/name', { personalName: { preferredName: 'Private GM name' } }, gm.token);
    expect((await call('play/status', {}, player.token)).directory).toEqual([]);
    expect(gm.user.listedAsGameMaster).toBe(false);
    await expect(call('play/listing', { visible: true }, player.token)).rejects.toMatchObject({
      status: 403,
    });
    await expect(call('play/listing', { visible: 'true' }, gm.token)).rejects.toMatchObject({
      status: 400,
    });
    await call('play/listing', { visible: true }, gm.token);
    await call('play/listing', { visible: true }, dual.token);
    expect((await call('play/status', {}, player.token)).directory).toEqual([
      { username: 'directory-dual', displayName: '' },
      { username: 'directory-gm', displayName: 'Private GM name' },
    ]);
    expect((await call('play/status', {}, visitor.token)).directory).toEqual([]);
    expect((await call('play/status', {}, gm.token)).directory).toEqual([]);
    expect((await call('play/status', {}, dual.token)).directory).toEqual([
      { username: 'directory-gm', displayName: 'Private GM name' },
    ]);
    await call('play/listing', { visible: false }, gm.token);
    expect((await call('play/status', {}, player.token)).directory).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ username: 'directory-gm' })])
    );
    await expect(
      call('play/request', { username: 'directory-gm' }, player.token)
    ).rejects.toMatchObject({ status: 404 });
    await call(
      'admin/user',
      { userId: dual.user.id, roles: ['player', 'game-master'], disabled: true },
      admin.token
    );
    expect((await call('play/status', {}, player.token)).directory).toEqual([]);
    await call(
      'admin/user',
      { userId: dual.user.id, roles: ['player', 'game-master'], disabled: false },
      admin.token
    );
    expect((await call('play/status', {}, player.token)).directory).toEqual([]);
  });

  it('requires addressed-GM approval over HTTP, keeps relationships private and grants no resource ACLs', async () => {
    const admin = await adminAccount();
    const player = await accountWithRoles(admin, 'play-player', ['player']);
    const gm = await accountWithRoles(admin, 'play-gm', ['game-master']);
    const other = await accountWithRoles(admin, 'other-play-gm', ['game-master']);
    await call('play/listing', { visible: true }, gm.token);
    const world = await createHeroesWorld('GM private world', database);
    const { request, close } = await startServer();
    try {
      expect((await request('/heroes/auth/play/status')).status).toBe(401);
      const submitted = await request('/heroes/auth/play/request', player.token, 'POST', {
        username: 'play-gm',
        playerId: other.user.id,
        status: 'approved',
      });
      expect(submitted.status).toBe(200);
      const relationship = submitted.body.relationship;
      expect(relationship).toMatchObject({
        playerId: player.user.id,
        gameMasterId: gm.user.id,
        status: 'pending',
      });
      const status = await request('/heroes/auth/play/status', gm.token);
      expect(status.status).toBe(200);
      expect(status.body.relationships[0].player.username).toBe('play-player');
      expect((await call('play/status', {}, other.token)).relationships).toEqual([]);
      expect((await call('play/status', {}, admin.token)).relationships).toEqual([]);
      const review = { id: relationship.id, decision: 'approve' };
      expect((await request('/heroes/auth/play/respond', other.token, 'POST', review)).status).toBe(
        404
      );
      expect(
        (await request('/heroes/auth/play/respond', player.token, 'POST', review)).status
      ).toBe(403);
      await expect(
        call('play/request', { username: 'play-gm' }, player.token)
      ).rejects.toMatchObject({ status: 409 });
      await call('play/listing', { visible: false }, gm.token);
      expect(
        (await request('/heroes/auth/play/respond', gm.token, 'POST', review)).body.relationship
          .status
      ).toBe('approved');
      expect((await call('play/status', {}, player.token)).relationships[0].status).toBe(
        'approved'
      );
      expect(heroesPrincipal(player.token, origin, identity).grants).toEqual([]);
      expect((await request(`/heroes/worlds/${world.id}/objects`, player.token)).status).toBe(403);
      await expect(call('play/respond', review, gm.token)).rejects.toMatchObject({ status: 409 });
      const ended = await call(
        'play/respond',
        { id: relationship.id, decision: 'end' },
        player.token
      );
      expect(ended.relationship.status).toBe('ended');
      await expect(
        call('play/respond', { id: relationship.id, decision: 'end' }, gm.token)
      ).rejects.toMatchObject({ status: 409 });
    } finally {
      await close();
    }
  });

  it('allows dual-role accounts to play under each other and rejects self-requests, wrong roles and stale reviews', async () => {
    const admin = await adminAccount();
    const first = await accountWithRoles(admin, 'first-dual', ['player', 'game-master']);
    const second = await accountWithRoles(admin, 'second-dual', ['player', 'game-master']);
    const gmOnly = await accountWithRoles(admin, 'gm-only', ['game-master']);
    for (const account of [first, second])
      await call('play/listing', { visible: true }, account.token);
    await expect(call('play/request', { username: 'gm-only' }, first.token)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      call('play/request', { username: 'first-dual' }, first.token)
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      call('play/request', { username: 'first-dual' }, gmOnly.token)
    ).rejects.toMatchObject({ status: 403 });
    let submitted = await call('play/request', { username: 'second-dual' }, first.token);
    const staleId = submitted.relationship.id;
    await expect(
      call('play/respond', { id: staleId, decision: 'cancel' }, second.token)
    ).rejects.toMatchObject({ status: 409 });
    await call('play/respond', { id: staleId, decision: 'cancel' }, first.token);
    submitted = await call('play/request', { username: 'second-dual' }, first.token);
    expect(submitted.relationship.id).not.toBe(staleId);
    await expect(
      call('play/respond', { id: staleId, decision: 'approve' }, second.token)
    ).rejects.toMatchObject({ status: 404 });
    await call('play/respond', { id: submitted.relationship.id, decision: 'reject' }, second.token);
    submitted = await call('play/request', { username: 'second-dual' }, first.token);
    const reverse = await call('play/request', { username: 'first-dual' }, second.token);
    await expect(
      call('play/respond', { id: submitted.relationship.id, decision: 'invalid' }, second.token)
    ).rejects.toMatchObject({ status: 400 });
    const decisions = await Promise.allSettled(
      ['approve', 'reject'].map((decision) =>
        call('play/respond', { id: submitted.relationship.id, decision }, second.token)
      )
    );
    expect(decisions.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(decisions.find((result) => result.status === 'rejected').reason.status).toBe(409);
    await call('play/respond', { id: reverse.relationship.id, decision: 'approve' }, first.token);
    expect((await call('play/status', {}, first.token)).relationships).toHaveLength(2);
    await call('play/respond', { id: reverse.relationship.id, decision: 'end' }, first.token);
  });

  it.each(['disable', 'demote', 'retain', 'delete'])(
    'invalidates pending/approved relationships on %s and preserves independent ACLs',
    async (choice) => {
      const admin = await adminAccount();
      let player = await accountWithRoles(admin, 'lifecycle-player', ['player']);
      const second = await accountWithRoles(admin, 'lifecycle-second', ['player']);
      const gm = await accountWithRoles(admin, 'lifecycle-gm', ['game-master']);
      await call('play/listing', { visible: true }, gm.token);
      const approved = await call('play/request', { username: 'lifecycle-gm' }, player.token);
      await call('play/respond', { id: approved.relationship.id, decision: 'approve' }, gm.token);
      const pending = await call('play/request', { username: 'lifecycle-gm' }, second.token);
      await call(
        'admin/grant',
        {
          userId: player.user.id,
          resourceType: 'world',
          resourceId: 'separate-world',
          access: 'read',
        },
        admin.token
      );
      player = await call('login', { username: 'lifecycle-player', password });
      if (['disable', 'demote'].includes(choice))
        await call(
          'admin/user',
          {
            userId: gm.user.id,
            roles: choice === 'demote' ? ['player'] : ['game-master'],
            disabled: choice === 'disable',
          },
          admin.token
        );
      else
        await call(
          'closure/request',
          { choice, confirmation: 'lifecycle-gm', password },
          gm.token,
          { databaseFile: database }
        );
      const relationships = (await call('play/status', {}, player.token)).relationships;
      expect(relationships).toEqual(
        choice === 'delete' ? [] : [expect.objectContaining({ status: 'ended' })]
      );
      expect((await call('play/status', {}, second.token)).relationships).toEqual(
        choice === 'delete' ? [] : [expect.objectContaining({ status: 'cancelled' })]
      );
      expect((await call('play/status', {}, player.token)).directory).toEqual([]);
      expect((await call('admin/list', {}, admin.token)).grants).toContainEqual(
        expect.objectContaining({ userId: player.user.id, resourceId: 'separate-world' })
      );
      await expect(
        call('play/respond', { id: pending.relationship.id, decision: 'approve' }, gm.token)
      ).rejects.toMatchObject({ status: 401 });
    }
  );

  it('invalidates the Player side when its role is removed without disturbing unrelated GM relationships', async () => {
    const admin = await adminAccount();
    const dual = await accountWithRoles(admin, 'changed-player', ['player', 'game-master']);
    const first = await accountWithRoles(admin, 'unchanged-first', ['player', 'game-master']);
    const second = await accountWithRoles(admin, 'unchanged-second', ['player', 'game-master']);
    for (const account of [dual, first, second])
      await call('play/listing', { visible: true }, account.token);
    const approved = await call('play/request', { username: 'unchanged-first' }, dual.token);
    await call('play/respond', { id: approved.relationship.id, decision: 'approve' }, first.token);
    await call('play/request', { username: 'unchanged-second' }, dual.token);
    const incoming = await call('play/request', { username: 'changed-player' }, second.token);
    await call('play/respond', { id: incoming.relationship.id, decision: 'approve' }, dual.token);
    await call(
      'admin/user',
      { userId: dual.user.id, roles: ['game-master'], disabled: false },
      admin.token
    );
    expect((await call('play/status', {}, first.token)).relationships[0].status).toBe('ended');
    const relationships = (await call('play/status', {}, second.token)).relationships;
    expect(relationships.find((item) => item.playerId === dual.user.id).status).toBe('cancelled');
    expect(relationships.find((item) => item.playerId === second.user.id).status).toBe('approved');
    expect((await call('play/status', {}, second.token)).directory).toContainEqual({
      username: 'changed-player',
      displayName: '',
    });
  });
});

describe('local HERO identity', () => {
  it('reports workspace routes only for role-authorized creation or fully ACL-readable resources and context', async () => {
    const admin = await adminAccount();
    const registered = await call('register', { username: 'route-reader', password });
    let reader = await call('login', { username: 'route-reader', password });
    const world = await createHeroesWorld('Route-private world', database);
    const genre = await saveHeroesManagement(
      { kind: 'genre', data: { name: 'Route genre' } },
      null,
      database
    );
    const campaign = await saveHeroesManagement(
      { kind: 'campaign', data: { name: 'Route campaign', genreId: genre.id, active: true } },
      null,
      database
    );
    const { request, close } = await startServer();
    try {
      expect((await request('/heroes/access')).status).toBe(401);
      expect((await request('/heroes/access', reader.token)).body.routes).toEqual([]);
      expect((await request('/heroes/access', admin.token)).body.routes).toContain(
        '/site/heroes/people/notes/'
      );
      await call(
        'admin/grant',
        {
          userId: registered.user.id,
          resourceType: 'record',
          resourceId: campaign.id,
          access: 'read',
        },
        admin.token
      );
      reader = await call('login', { username: 'route-reader', password });
      expect((await request('/heroes/access', reader.token)).body.routes).toEqual([]);
      await call(
        'admin/grant',
        {
          userId: registered.user.id,
          resourceType: 'record',
          resourceId: genre.id,
          access: 'read',
        },
        admin.token
      );
      reader = await call('login', { username: 'route-reader', password });
      expect((await request('/heroes/access', reader.token)).body.routes).toEqual([
        '/site/heroes/genres/',
        '/site/heroes/campaigns/',
      ]);
      await call(
        'admin/grant',
        { userId: registered.user.id, resourceType: 'world', resourceId: world.id, access: 'read' },
        admin.token
      );
      reader = await call('login', { username: 'route-reader', password });
      expect((await request('/heroes/access', reader.token)).body.routes).toContain(
        '/site/heroes/'
      );
      await call(
        'admin/grant',
        {
          userId: registered.user.id,
          resourceType: 'record',
          resourceId: genre.id,
          access: 'none',
        },
        admin.token
      );
      reader = await call('login', { username: 'route-reader', password });
      expect((await request('/heroes/access', reader.token)).body.routes).toEqual([
        '/site/heroes/',
      ]);
      await call(
        'admin/user',
        { userId: registered.user.id, roles: ['player'], disabled: false },
        admin.token
      );
      reader = await call('login', { username: 'route-reader', password });
      const routes = (await request('/heroes/access', reader.token)).body.routes;
      expect(routes).toContain('/site/heroes/objects/');
      expect(routes).not.toContain('/site/heroes/genres/');
      expect(routes).not.toContain('/site/heroes/people/notes/');
    } finally {
      await close();
    }
  });

  it('requires both account authorization and pairing for every Wurm API and allows revocable all-tools delegation', async () => {
    const admin = await adminAccount();
    const player = await accountWithRoles(admin, 'wurm-player', ['player', 'game-master']);
    expect(player.user.wurmAccess).toBe(false);
    await expect(call('wurm/access', {}, player.token)).rejects.toMatchObject({ status: 403 });
    await expect(
      call('admin/wurm-access', { userId: player.user.id, allowed: true }, player.token)
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      call('admin/wurm-access', { userId: player.user.id, allowed: 'yes' }, admin.token)
    ).rejects.toMatchObject({ status: 400 });
    expect(await call('wurm/access', {}, admin.token)).toEqual({ allowed: true });
    const authFile = path.join(root, 'helper-auth.json');
    const token = pairBrowser(rotatePairingCode(authFile), authFile);
    const { base, close } = await startServer();
    const request = (route, bearer, pairing = true, method = 'GET') =>
      fetch(`${base}${route}`, {
        method,
        headers: {
          Origin: origin,
          ...(bearer ? { 'X-Heroes-Session': bearer } : {}),
          ...(pairing ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    try {
      for (const [route, method] of [
        ['/status', 'GET'],
        ['/db/worlds', 'GET'],
        ['/map/snapshots', 'GET'],
        ['/start/server', 'POST'],
        ['/start/client', 'POST'],
        ['/pair', 'POST'],
        ['/unpair', 'POST'],
      ]) {
        expect((await request(route, '', true, method)).status).toBe(401);
        expect((await request(route, player.token, true, method)).status).toBe(403);
      }
      expect((await request('/status', admin.token, false)).status).toBe(401);
      expect((await request('/status', admin.token)).status).toBe(200);
      expect(
        (
          await fetch(`${base}/status`, {
            headers: { Authorization: `Bearer ${token}`, 'X-Heroes-Session': admin.token },
          })
        ).status
      ).toBe(403);
      const granted = await call(
        'admin/wurm-access',
        { userId: player.user.id, allowed: true },
        admin.token
      );
      expect(granted.user.wurmAccess).toBe(true);
      expect((await request('/status', player.token)).status).toBe(401);
      const delegated = await call('login', { username: 'wurm-player', password });
      expect(await call('wurm/access', {}, delegated.token)).toEqual({ allowed: true });
      expect((await request('/status', delegated.token, false)).status).toBe(401);
      expect((await request('/status', delegated.token)).status).toBe(200);
      const start = await request('/start/invalid', delegated.token, true, 'POST');
      expect(start.status).toBe(404);
      expect((await request('/map/snapshots', delegated.token)).status).not.toBe(403);
      await call('admin/wurm-access', { userId: player.user.id, allowed: false }, admin.token);
      expect((await request('/status', delegated.token)).status).toBe(401);
      const revoked = await call('login', { username: 'wurm-player', password });
      expect((await request('/status', revoked.token)).status).toBe(403);
      expect((await request('/status', admin.token)).status).toBe(200);
    } finally {
      await close();
    }
  });

  it('lets Visitors request both roles over HTTP and only an authenticated administrator approve them without sharing data', async () => {
    const admin = await adminAccount();
    await call('register', { username: 'role-visitor', password });
    const visitor = await call('login', { username: 'role-visitor', password });
    const world = await createHeroesWorld('Private admin world', database);
    const { request, close } = await startServer();
    try {
      expect(
        (await request('/heroes/auth/roles/request', '', 'POST', { roles: ['player'] })).status
      ).toBe(401);
      for (const roles of [[], ['admin'], ['visitor'], ['player', 'admin'], 'player']) {
        expect(
          (await request('/heroes/auth/roles/request', visitor.token, 'POST', { roles })).status
        ).toBe(400);
      }
      const submitted = await request('/heroes/auth/roles/request', visitor.token, 'POST', {
        roles: ['player', 'game-master'],
        userId: admin.user.id,
      });
      expect(submitted.status).toBe(200);
      expect(submitted.body.user.roles).toEqual(['visitor']);
      const pending = submitted.body.user.roleRequest;
      expect(pending).toMatchObject({ roles: ['player', 'game-master'], status: 'pending' });
      expect((await call('me', {}, visitor.token)).user.roleRequest.id).toBe(pending.id);
      await expect(
        call('roles/request', { roles: ['player'] }, visitor.token)
      ).rejects.toMatchObject({ status: 409 });
      const review = {
        userId: visitor.user.id,
        requestId: pending.id,
        decision: 'approve',
        roles: ['admin'],
      };
      expect(
        (await request('/heroes/auth/admin/roles/review', visitor.token, 'POST', review)).status
      ).toBe(403);
      const incompleteAdmin = await call('login', { username: 'administrator', password });
      expect(
        (await request('/heroes/auth/admin/roles/review', incompleteAdmin.token, 'POST', review))
          .status
      ).toBe(403);
      await call('mfa/verify', { code: admin.recovery[0] }, incompleteAdmin.token);
      const approved = await request(
        '/heroes/auth/admin/roles/review',
        incompleteAdmin.token,
        'POST',
        review
      );
      expect(approved.status).toBe(200);
      expect(approved.body.user.roles).toEqual(['player', 'game-master']);
      expect(approved.body.user.roleRequest).toMatchObject({ status: 'approved', id: pending.id });
      expect((await request('/heroes/auth/me', visitor.token)).status).toBe(401);
      const login = await call('login', { username: 'role-visitor', password });
      expect(login.user.roleRequest.status).toBe('approved');
      expect((await request(`/heroes/worlds/${world.id}/objects`, login.token)).status).toBe(403);
      expect((await request('/heroes/management', login.token)).body.worlds).toEqual([]);
      expect(heroesPrincipal(login.token, origin, identity).grants).toEqual([]);
      await expect(call('roles/request', { roles: ['player'] }, login.token)).rejects.toMatchObject(
        { status: 403 }
      );
      await expect(call('admin/roles/review', review, incompleteAdmin.token)).rejects.toMatchObject(
        { status: 409 }
      );
    } finally {
      await close();
    }
  });

  it('keeps role requests private and supports cancellation, rejection and resubmission without stale decisions', async () => {
    const admin = await adminAccount();
    for (const username of ['requester', 'other-visitor'])
      await call('register', { username, password });
    const visitor = await call('login', { username: 'requester', password });
    const other = await call('login', { username: 'other-visitor', password });
    const submitted = await call('roles/request', { roles: ['player'] }, visitor.token);
    const id = submitted.user.roleRequest.id;
    expect((await call('me', {}, other.token)).user.roleRequest).toBeNull();
    await expect(call('roles/cancel', { requestId: id }, other.token)).rejects.toMatchObject({
      status: 409,
    });
    const cancel = await call('roles/cancel', { requestId: id }, visitor.token);
    expect(cancel.user.roleRequest.status).toBe('cancelled');
    const review = { userId: visitor.user.id, requestId: id, decision: 'approve' };
    await expect(call('admin/roles/review', review, admin.token)).rejects.toMatchObject({
      status: 409,
    });
    const next = await call('roles/request', { roles: ['game-master'] }, visitor.token);
    expect(next.user.roleRequest.id).not.toBe(id);
    await expect(call('admin/roles/review', review, admin.token)).rejects.toMatchObject({
      status: 409,
    });
    const requestId = next.user.roleRequest.id;
    await expect(
      call('admin/roles/review', { ...review, requestId, decision: 'invalid' }, admin.token)
    ).rejects.toMatchObject({ status: 400 });
    const rejected = await call(
      'admin/roles/review',
      { ...review, requestId, decision: 'reject' },
      admin.token
    );
    expect(rejected.user.roleRequest).toMatchObject({ id: requestId, status: 'rejected' });
    expect((await call('me', {}, visitor.token)).user.roles).toEqual(['visitor']);
    await expect(call('roles/cancel', { requestId }, visitor.token)).rejects.toMatchObject({
      status: 409,
    });
    const fresh = await call('roles/request', { roles: ['player'] }, visitor.token);
    const decisions = await Promise.allSettled(
      ['approve', 'reject'].map((decision) =>
        call(
          'admin/roles/review',
          { ...review, requestId: fresh.user.roleRequest.id, decision },
          admin.token
        )
      )
    );
    expect(decisions.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(decisions.find((result) => result.status === 'rejected').reason.status).toBe(409);
  });

  it.each(['retain', 'delete'])(
    'invalidates a pending role request on %s account closure',
    async (choice) => {
      const admin = await adminAccount();
      await call('register', { username: 'closing-requester', password });
      const visitor = await call('login', { username: 'closing-requester', password });
      const submitted = await call('roles/request', { roles: ['player'] }, visitor.token);
      await call(
        'closure/request',
        { choice, password, confirmation: 'closing-requester' },
        visitor.token,
        { databaseFile: database }
      );
      const target = (await call('admin/list', {}, admin.token)).users.find(
        (user) => user.id === visitor.user.id
      );
      expect(target.roleRequest).toEqual(
        choice === 'retain' ? expect.objectContaining({ status: 'cancelled' }) : null
      );
      await expect(
        call(
          'admin/roles/review',
          {
            userId: visitor.user.id,
            requestId: submitted.user.roleRequest.id,
            decision: 'approve',
          },
          admin.token
        )
      ).rejects.toMatchObject({ status: 409 });
    }
  );

  it('cancels pending role requests when an administrator edits or disables the requesting account', async () => {
    const admin = await adminAccount();
    await call('register', { username: 'edited-requester', password });
    let visitor = await call('login', { username: 'edited-requester', password });
    for (const disabled of [false, true]) {
      const submitted = await call('roles/request', { roles: ['game-master'] }, visitor.token);
      await call(
        'admin/user',
        { userId: visitor.user.id, roles: ['visitor'], disabled },
        admin.token
      );
      const updated = (await call('admin/list', {}, admin.token)).users.find(
        (user) => user.id === visitor.user.id
      );
      expect(updated.roleRequest.status).toBe('cancelled');
      await expect(
        call(
          'admin/roles/review',
          {
            userId: visitor.user.id,
            requestId: submitted.user.roleRequest.id,
            decision: 'approve',
          },
          admin.token
        )
      ).rejects.toMatchObject({ status: 409 });
      if (!disabled) visitor = await call('login', { username: 'edited-requester', password });
    }
  });

  it('creates hash-only single-use invitations and applies only administrator-approved roles over HTTP', async () => {
    const admin = await adminAccount();
    const { request, close } = await startServer();
    try {
      expect(
        (await request('/heroes/auth/admin/invite', '', 'POST', { roles: ['admin'] })).status
      ).toBe(401);
      const created = await request('/heroes/auth/admin/invite', admin.token, 'POST', {
        roles: ['player', 'game-master'],
      });
      expect(created.status).toBe(200);
      expect(created.body.invitation.expiresAt - Date.now()).toBeGreaterThan(23 * 60 * 60 * 1000);
      expect(fs.readFileSync(identity, 'utf8')).not.toContain(created.body.code);
      const listing = await request('/heroes/auth/admin/list', admin.token);
      expect(listing.body.invitations).toHaveLength(1);
      expect(listing.body.invitations[0]).not.toHaveProperty('hash');
      expect(listing.body.invitations[0]).not.toHaveProperty('code');
      expect(
        (
          await request('/heroes/auth/invite/redeem', '', 'POST', {
            code: created.body.code,
            username: 'invited-user',
            password: 'short',
          })
        ).status
      ).toBe(400);
      const body = {
        code: created.body.code,
        username: 'invited-user',
        password,
        roles: ['admin'],
      };
      const results = await Promise.all([
        request('/heroes/auth/invite/redeem', '', 'POST', body),
        request('/heroes/auth/invite/redeem', '', 'POST', body),
      ]);
      expect(results.map((result) => result.status).sort()).toEqual([200, 403]);
      const account = results.find((result) => result.status === 200).body.user;
      expect(account.roles).toEqual(['player', 'game-master']);
      expect((await call('login', { username: 'invited-user', password })).user.id).toBe(
        account.id
      );
      expect((await call('admin/list', {}, admin.token)).invitations).toEqual([]);
      const login = await call('login', { username: 'invited-user', password });
      await expect(call('admin/invite', { roles: ['admin'] }, login.token)).rejects.toMatchObject({
        status: 403,
      });
      await expect(
        call('admin/invite/revoke', { invitationId: 'none' }, login.token)
      ).rejects.toMatchObject({ status: 403 });
    } finally {
      await close();
    }
  });

  it('rejects invalid, expired, revoked invitations and requires MFA for invited administrators', async () => {
    const admin = await adminAccount();
    for (const roles of [[], ['invalid'], 'admin'])
      await expect(call('admin/invite', { roles }, admin.token)).rejects.toMatchObject({
        status: 400,
      });
    const revoked = await call('admin/invite', { roles: ['player'] }, admin.token);
    await call('admin/invite/revoke', { invitationId: revoked.invitation.id }, admin.token);
    await expect(
      call('invite/redeem', { code: revoked.code, username: 'revoked', password })
    ).rejects.toMatchObject({ status: 403 });
    const expired = await call('admin/invite', { roles: ['player'] }, admin.token);
    const state = JSON.parse(fs.readFileSync(identity, 'utf8'));
    state.invitations.find((item) => item.id === expired.invitation.id).expiresAt = Date.now() - 1;
    fs.writeFileSync(identity, JSON.stringify(state));
    await expect(
      call('invite/redeem', { code: expired.code, username: 'expired', password })
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      call('invite/redeem', { code: 'invalid', username: 'invalid', password })
    ).rejects.toMatchObject({ status: 403 });
    const elevated = await call('admin/invite', { roles: ['admin'] }, admin.token);
    await expect(
      call('invite/redeem', { code: elevated.code, username: 'administrator', password })
    ).rejects.toMatchObject({ status: 409 });
    await call('invite/redeem', { code: elevated.code, username: 'second-admin', password });
    const login = await call('login', { username: 'second-admin', password });
    expect(login.enrollmentRequired).toBe(true);
    await expect(call('admin/list', {}, login.token)).rejects.toMatchObject({ status: 403 });
    const enrollment = await call('mfa/start', {}, login.token);
    await call('mfa/confirm', { code: totpCode(enrollment.secret) }, login.token);
    const pending = await call('admin/invite', { roles: ['player'] }, admin.token);
    await call(
      'admin/user',
      { userId: admin.user.id, roles: ['player'], disabled: false },
      login.token
    );
    await expect(
      call('invite/redeem', { code: pending.code, username: 'demoted-issuer', password })
    ).rejects.toMatchObject({ status: 403 });
    expect((await call('admin/list', {}, login.token)).invitations).toEqual([]);
  });

  it('allows only system administrators to configure selectable cultures and enforces configured order for all accounts', async () => {
    const admin = await adminAccount();
    await call('register', { username: 'culture-user', password });
    const login = await call('login', { username: 'culture-user', password });
    const { cultures } = await call('name-config', {}, login.token);
    expect(cultures.some((culture) => culture.code === 'ja-JP')).toBe(true);
    await expect(call('admin/name-config', { cultures }, login.token)).rejects.toMatchObject({
      status: 403,
    });
    const configured = cultures.map((culture) => ({
      ...culture,
      nameOrder: culture.code === 'ja-JP' ? 'given-first' : culture.nameOrder,
    }));
    await call('admin/name-config', { cultures: configured }, admin.token);
    const saved = await call(
      'profile/name',
      {
        personalName: {
          culture: 'ja-JP',
          firstName: 'Hana',
          familyName: 'Tanaka',
          nameOrder: 'family-first',
        },
      },
      login.token
    );
    expect(saved.user.displayName).toBe('Hana Tanaka');
    expect(saved.user.personalName.nameOrder).toBe('auto');
    await call(
      'profile/name',
      {
        personalName: {
          culture: 'ja-JP',
          firstName: 'Hana',
          familyName: 'Tanaka',
          preferredName: 'Hani',
        },
      },
      login.token
    );
    expect((await call('me', {}, login.token)).user.displayName).toBe('Hani');
    await expect(
      call('profile/name', { personalName: { culture: 'it-IT' } }, login.token)
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      call(
        'admin/name-config',
        { cultures: configured.filter((entry) => entry.code !== 'ja-JP') },
        admin.token
      )
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      call(
        'admin/name-config',
        { cultures: [{ code: '', label: 'Default', nameOrder: 'invalid' }] },
        admin.token
      )
    ).rejects.toMatchObject({ status: 400 });
  });

  it('saves a structured personal name only for the signed-in account without changing login or granting roles', async () => {
    const registered = await call('register', { username: 'named-user', password });
    const login = await call('login', { username: 'named-user', password });
    const saved = await call(
      'profile/name',
      {
        personalName: { firstName: 'Hana', familyName: 'Tanaka', culture: 'ja-JP' },
        userId: 'some-other-account',
        roles: ['admin'],
      },
      login.token
    );
    expect(saved.user).toMatchObject({
      id: registered.user.id,
      username: 'named-user',
      roles: ['visitor'],
      displayName: 'Tanaka Hana',
      personalName: {
        firstName: 'Hana',
        familyName: 'Tanaka',
        culture: 'ja-JP',
        nameOrder: 'auto',
      },
    });
    const relogin = await call('login', { username: 'named-user', password });
    expect((await call('me', {}, relogin.token)).user.displayName).toBe('Tanaka Hana');
    await expect(
      call('profile/name', { personalName: { firstName: 42 } }, relogin.token)
    ).rejects.toMatchObject({ status: 400 });
    expect((await call('me', {}, relogin.token)).user.displayName).toBe('Tanaka Hana');
    const cleared = await call('profile/name', { personalName: {} }, relogin.token);
    expect(cleared.user.displayName).toBe('');
    await expect(call('profile/name', { personalName: {} })).rejects.toMatchObject({ status: 401 });
  });

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
  it('lets a non-admin Game Master create, reload, edit and link a genre to a campaign without a world or profile', async () => {
    const admin = await adminAccount();
    const registered = await call('register', { username: 'genre-gm', password });
    await call(
      'admin/user',
      {
        userId: registered.user.id,
        roles: ['game-master'],
        disabled: false,
      },
      admin.token
    );
    const gm = await call('login', { username: 'genre-gm', password });
    await call('register', { username: 'genre-visitor', password });
    const visitor = await call('login', { username: 'genre-visitor', password });
    const playerAccount = await call('register', { username: 'genre-player', password });
    await call(
      'admin/user',
      { userId: playerAccount.user.id, roles: ['player'], disabled: false },
      admin.token
    );
    const player = await call('login', { username: 'genre-player', password });
    const { request, close } = await startServer();
    try {
      const body = { kind: 'genre', data: { name: 'New GM genre', notes: 'Organizational only' } };
      expect((await request('/heroes/management', visitor.token, 'POST', body)).status).toBe(403);
      expect((await request('/heroes/management', player.token, 'POST', body)).status).toBe(403);
      expect(
        (
          await request('/heroes/management', gm.token, 'POST', {
            kind: 'genre',
            data: { name: '' },
          })
        ).status
      ).toBe(400);
      const created = await request('/heroes/management', gm.token, 'POST', body);
      expect(created.status).toBe(201);
      const genre = created.body.record;
      const reloaded = await request('/heroes/management', gm.token);
      expect(reloaded.body.records).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: genre.id,
            kind: 'genre',
            data: expect.objectContaining({ name: 'New GM genre' }),
          }),
        ])
      );
      expect((await request('/heroes/management', visitor.token)).body.records).toEqual([]);
      expect(
        (
          await request(`/heroes/management/${genre.id}`, gm.token, 'PUT', {
            kind: 'genre',
            data: { name: 'Edited GM genre' },
          })
        ).status
      ).toBe(200);
      const campaign = await request('/heroes/management', gm.token, 'POST', {
        kind: 'campaign',
        data: { name: 'First campaign', genreId: genre.id, active: true },
      });
      expect(campaign.status).toBe(201);
      expect(campaign.body.record.data.genreId).toBe(genre.id);
      expect((await request('/heroes/management', gm.token)).body.records).toHaveLength(2);
      expect((await request('/heroes/management', visitor.token)).body.records).toEqual([]);
    } finally {
      await close();
    }
  });

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
