import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from '../scripts/wurm-local.js';
import {
  createHeroesSetupCode,
  heroesIdentityAction,
  totpCode,
  heroesRequestContext,
} from '../scripts/heroes-identity.js';

let root, file, database, admin, player, server, base;
const origin = 'http://localhost:3000';
const password = 'long-test-password-123';
const call = (action, body = {}, bearer = '') =>
  heroesIdentityAction(action, body, { file, origin, bearer, databaseFile: database });
const request = async (route, bearer, method = 'GET', body, approvalId) => {
  const response = await fetch(base + route, {
    method,
    headers: {
      Origin: origin,
      'X-Heroes-Session': bearer,
      'Content-Type': 'application/json',
      ...(approvalId ? { 'X-Heroes-Approval': approvalId } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() };
};

beforeEach(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'heroes-impersonation-test-'));
  file = path.join(root, 'identity.json');
  database = path.join(root, 'heroes.db');
  const setupCode = await createHeroesSetupCode(file);
  await call('setup', { setupCode, username: 'administrator', password });
  admin = await call('login', { username: 'administrator', password });
  const mfa = await call('mfa/start', {}, admin.token);
  admin.recoveryCodes = (
    await call('mfa/confirm', { code: totpCode(mfa.secret) }, admin.token)
  ).recoveryCodes;
  const account = await call('register', { username: 'target-player', password });
  await call(
    'admin/user',
    { userId: account.user.id, roles: ['player'], disabled: false },
    admin.token
  );
  player = await call('login', { username: 'target-player', password });
  server = createServer({
    env: {
      HEROES_IDENTITY_PATH: file,
      WURM_HEROES_DB_PATH: database,
      WURM_HELPER_AUTH_FILE: path.join(root, 'helper-auth.json'),
    },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
afterEach(async () => {
  vi.restoreAllMocks();
  const state = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const entry of state.sessions) {
    if (entry.impersonation?.previewRoot)
      fs.rmSync(entry.impersonation.previewRoot, { recursive: true, force: true });
  }
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(root, { recursive: true, force: true });
});

describe('audited HERO impersonation', () => {
  it('saves registered editor participants without granting scope access or changing ownership', async () => {
    const registered = await call('register', { username: 'participant-gm', password });
    await call(
      'admin/user',
      {
        userId: registered.user.id,
        roles: ['game-master'],
        disabled: false,
      },
      admin.token
    );
    const gm = await call('login', { username: 'participant-gm', password });
    expect(
      (await request('/heroes/object-participants', player.token)).body.accounts.map((a) => a.id)
    ).not.toContain(gm.user.id);
    expect(
      (
        await request('/heroes/objects', player.token, 'POST', {
          name: 'Forbidden GM',
          kind: 'equipment',
          participants: { gameMasterId: gm.user.id },
        })
      ).status
    ).toBe(403);
    await call('play/listing', { visible: true }, gm.token);
    expect(
      (await request('/heroes/object-participants', player.token)).body.accounts.map((a) => a.id)
    ).toContain(gm.user.id);
    for (const definition of [
      { kind: 'player-character', participants: { playerId: player.user.id, gameMasterId: '' } },
      { kind: 'non-player-character', participants: { playerId: '', gameMasterId: '' } },
      { kind: 'equipment', participants: { playerId: '', gameMasterId: gm.user.id } },
    ]) {
      const created = await request('/heroes/objects', player.token, 'POST', {
        name: `Assigned ${definition.kind}`,
        ...definition,
      });
      expect(created.status).toBe(201);
      const object = created.body.object;
      expect(object.definition.participants).toEqual(definition.participants);
      const loaded = (await request('/heroes/objects', player.token)).body.objects.find(
        (o) => o.id === object.id
      );
      expect(loaded.definition.participants).toEqual(definition.participants);
      expect(
        (await request('/heroes/objects', gm.token)).body.objects.map((o) => o.id)
      ).not.toContain(object.id);
      expect((await request('/heroes/access', player.token)).body.owned.object).toContain(
        object.id
      );
    }
    for (const definition of [
      { kind: 'player-character', participants: {} },
      { kind: 'non-player-character', participants: { playerId: player.user.id } },
      { kind: 'equipment', participants: {} },
    ])
      expect(
        (
          await request('/heroes/objects', player.token, 'POST', {
            name: 'Missing or invalid assignment',
            ...definition,
          })
        ).status
      ).toBe(400);
    expect(
      (
        await request('/heroes/objects', player.token, 'POST', {
          name: 'Wrong role',
          kind: 'player-character',
          participants: { playerId: gm.user.id },
        })
      ).status
    ).toBe(403);
    const equipment = (await request('/heroes/objects', player.token)).body.objects.find(
      (object) => object.name === 'Assigned equipment'
    );
    await call('play/listing', { visible: false }, gm.token);
    expect(
      (await request('/heroes/object-participants', player.token)).body.accounts.map((a) => a.id)
    ).not.toContain(gm.user.id);
    expect(
      (
        await request(`/heroes/objects/${equipment.id}`, player.token, 'PUT', {
          ...equipment.definition,
          name: 'Retained private GM association',
        })
      ).status
    ).toBe(200);
  });

  it('retains old missing participants and unchanged unavailable account assignments during edits', async () => {
    const legacy = await request('/heroes/objects', player.token, 'POST', {
      name: 'Legacy PC',
      kind: 'player-character',
    });
    expect(legacy.status).toBe(201);
    expect(
      (
        await request(`/heroes/objects/${legacy.body.object.id}`, player.token, 'PUT', {
          ...legacy.body.object.definition,
          name: 'Edited legacy PC',
        })
      ).status
    ).toBe(200);
    const assigned = await request('/heroes/objects', player.token, 'POST', {
      name: 'Assigned PC',
      kind: 'player-character',
      participants: { playerId: player.user.id, gameMasterId: '' },
    });
    const { participants, ...definition } = assigned.body.object.definition;
    expect(participants.playerId).toBe(player.user.id);
    expect(
      (await request(`/heroes/objects/${assigned.body.object.id}`, player.token, 'PUT', definition))
        .status
    ).toBe(400);
    expect(
      (
        await request(`/heroes/objects/${assigned.body.object.id}`, player.token, 'PUT', {
          ...assigned.body.object.definition,
          name: 'Retained account',
        })
      ).status
    ).toBe(200);
  });

  it('keeps active administrators out of game-content editors even when GM and Player roles are assigned', async () => {
    await call(
      'admin/user',
      { userId: admin.user.id, roles: ['admin', 'game-master', 'player'], disabled: false },
      admin.token
    );
    const login = await call('login', { username: 'administrator', password });
    await call('mfa/verify', { code: admin.recoveryCodes[0] }, login.token);
    admin.token = login.token;
    const access = (await request('/heroes/access', admin.token)).body;
    expect(access.routes).toContain('/site/heroes/people/admin-notes/');
    expect(access.routes).toContain('/site/heroes/sharing/');
    for (const route of [
      '/site/heroes/',
      '/site/heroes/campaigns/',
      '/site/heroes/objects/',
      '/site/heroes/people/notes/',
    ])
      expect(access.routes).not.toContain(route);
    expect(
      (await request('/heroes/worlds', admin.token, 'POST', { name: 'Wrong active role' })).status
    ).toBe(403);
    expect(
      (
        await request('/heroes/objects', admin.token, 'POST', {
          name: 'Wrong active role',
          kind: 'equipment',
        })
      ).status
    ).toBe(403);
    expect(
      (
        await request('/heroes/library', admin.token, 'POST', {
          name: 'Wrong active role',
          kind: 'object',
          definition: { name: 'Wrong active role', kind: 'equipment' },
        })
      ).status
    ).toBe(403);
    await call('role/select', { role: 'game-master' }, admin.token);
    const created = await request('/heroes/worlds', admin.token, 'POST', {
      name: 'Correct active role',
    });
    expect(created.status).toBe(201);
    expect((await request('/heroes/access', admin.token)).body.deletable.world).toContain(
      created.body.world.id
    );
    expect(
      (await request(`/heroes/worlds/${created.body.world.id}`, player.token, 'DELETE')).status
    ).toBe(403);
    await call('role/select', { role: 'admin' }, admin.token);
    await call(
      'admin/grant',
      {
        userId: player.user.id,
        resourceType: 'world',
        resourceId: created.body.world.id,
        access: 'write',
      },
      admin.token
    );
    player = await call('login', { username: 'target-player', password });
    await call('role/select', { role: 'game-master' }, admin.token);
    const foreignObject = await request(
      `/heroes/worlds/${created.body.world.id}/objects`,
      player.token,
      'POST',
      {
        name: 'Player-owned world object',
        kind: 'equipment',
      }
    );
    expect(foreignObject.status).toBe(201);
    expect((await request('/heroes/access', admin.token)).body.deletable.world).not.toContain(
      created.body.world.id
    );
    expect(
      (await request(`/heroes/worlds/${created.body.world.id}`, admin.token, 'DELETE')).status
    ).toBe(403);
    expect(
      (await request(`/heroes/objects/${foreignObject.body.object.id}`, player.token, 'DELETE'))
        .status
    ).toBe(200);
    expect(
      (await request(`/heroes/worlds/${created.body.world.id}`, admin.token, 'DELETE')).status
    ).toBe(200);
    await call('role/select', { role: 'admin' }, admin.token);
    expect((await request('/heroes/management/export', admin.token)).status).toBe(200);
  });

  it('allows owner library deletion only when every live use is writable', async () => {
    const entry = (
      await request('/heroes/library', player.token, 'POST', {
        name: 'Owned equipment template',
        kind: 'object',
        definition: { name: 'Owned equipment template', kind: 'equipment' },
      })
    ).body.entry;
    expect(entry).toBeDefined();
    expect((await request('/heroes/access', player.token)).body.deletable.library).toContain(
      entry.id
    );
    const registered = await call('register', { username: 'library-gm', password });
    await call(
      'admin/user',
      {
        userId: registered.user.id,
        roles: ['game-master'],
        disabled: false,
      },
      admin.token
    );
    await call(
      'admin/grant',
      {
        userId: registered.user.id,
        resourceType: 'library',
        resourceId: entry.id,
        access: 'read',
      },
      admin.token
    );
    const gm = await call('login', { username: 'library-gm', password });
    expect((await request(`/heroes/library/${entry.id}`, gm.token, 'DELETE')).status).toBe(403);
    const object = await request('/heroes/objects', gm.token, 'POST', {
      ...entry.definition,
      libraryRef: entry.id,
      name: 'Foreign live use',
      kind: 'equipment',
    });
    expect(object.status).toBe(201);
    expect(object.body.object.definition.libraryRef).toBe(entry.id);
    expect((await request('/heroes/access', player.token)).body.deletable.library).not.toContain(
      entry.id
    );
    expect((await request(`/heroes/library/${entry.id}`, player.token, 'DELETE')).status).toBe(403);
    expect(
      (
        await request(`/heroes/library/${entry.id}`, player.token, 'PUT', {
          name: 'Cannot modify foreign use',
          kind: 'object',
          definition: entry.definition,
        })
      ).status
    ).toBe(403);
    expect(
      (await request(`/heroes/objects/${object.body.object.id}`, gm.token, 'DELETE')).status
    ).toBe(200);
    expect((await request(`/heroes/library/${entry.id}`, player.token, 'DELETE')).status).toBe(200);
  });

  it('integrates invitations, object-use approval, scope publication, independent copies and immediate revocation', async () => {
    const registered = await call('register', { username: 'campaign-gm', password });
    await call(
      'admin/user',
      { userId: registered.user.id, roles: ['game-master'], disabled: false },
      admin.token
    );
    const gm = await call('login', { username: 'campaign-gm', password });
    await call('play/listing', { visible: true }, gm.token);
    const relationship = (await call('play/request', { username: 'campaign-gm' }, player.token))
      .relationship;
    await call('play/respond', { id: relationship.id, decision: 'approve' }, gm.token);
    const world = (await request('/heroes/worlds', gm.token, 'POST', { name: 'GM owned world' }))
      .body.world;
    const scope = { scopeType: 'world', scopeId: world.id };
    const invite = await request('/heroes/subscriptions', gm.token, 'POST', {
      action: 'invite',
      ...scope,
      playerId: player.user.id,
    });
    expect(invite.status).toBe(200);
    expect(
      (await request('/heroes/subscriptions', player.token)).body.scopes.map((item) => item.scopeId)
    ).toContain(world.id);
    expect(
      (
        await request('/heroes/subscriptions', player.token, 'POST', {
          action: 'respond',
          id: invite.body.subscription.id,
          decision: 'approve',
        })
      ).status
    ).toBe(200);
    const ownObject = (
      await request('/heroes/objects', player.token, 'POST', {
        name: 'Player prop',
        kind: 'equipment',
      })
    ).body.object;
    const enrollment = await request('/heroes/subscriptions', player.token, 'POST', {
      action: 'enroll',
      ...scope,
      objectId: ownObject.id,
    });
    expect(enrollment.body.permission.status).toBe('pending');
    expect(
      (await request('/heroes/objects', gm.token)).body.objects.map((item) => item.id)
    ).not.toContain(ownObject.id);
    expect(
      (
        await request('/heroes/subscriptions', gm.token, 'POST', {
          action: 'object-respond',
          id: enrollment.body.permission.id,
          decision: 'approve',
        })
      ).status
    ).toBe(200);
    expect(
      (await request(`/heroes/worlds/${world.id}/objects`, gm.token)).body.objects.map(
        (item) => item.id
      )
    ).toContain(ownObject.id);
    const source = (
      await request('/heroes/objects', gm.token, 'POST', { name: 'GM template', kind: 'equipment' })
    ).body.object;
    expect(
      (
        await request('/heroes/sharing', gm.token, 'POST', {
          resourceType: 'object',
          resourceId: source.id,
          audience: 'world',
          scopeId: world.id,
          viewers: [],
          editors: [],
        })
      ).status
    ).toBe(200);
    expect(
      (await request('/heroes/objects', player.token)).body.objects.map((item) => item.id)
    ).toContain(source.id);
    const copy = await request('/heroes/copies', player.token, 'POST', {
      action: 'request',
      resourceType: 'object',
      resourceId: source.id,
    });
    expect(copy.status).toBe(200);
    expect(
      (
        await request('/heroes/copies', gm.token, 'POST', {
          action: 'approve',
          requestId: copy.body.request.id,
        })
      ).status
    ).toBe(200);
    const copied = (await request('/heroes/objects', player.token)).body.objects.find(
      (item) => item.id !== source.id && item.name === 'GM template'
    );
    expect(copied).toBeDefined();
    const metadata = (await request('/heroes/sharing', player.token)).body.resources.find(
      (item) => item.id === copied.id
    );
    expect(metadata.ownerId).toBe(player.user.id);
    expect(metadata.creatorId).toBe(gm.user.id);
    expect((await request(`/heroes/objects/${source.id}/export`, player.token)).status).toBe(403);
    expect((await request(`/heroes/objects/${copied.id}/export`, player.token)).status).toBe(200);
    const libraryCopy = await request('/heroes/library', player.token, 'POST', {
      name: copied.name,
      kind: 'object',
      definition: copied.definition,
      sourceObjectId: copied.id,
    });
    expect(libraryCopy.status).toBe(201);
    expect(
      (await request('/heroes/sharing', player.token)).body.resources.find(
        (item) => item.id === libraryCopy.body.entry.id
      ).creatorId
    ).toBe(gm.user.id);
    await request(`/heroes/objects/${source.id}`, gm.token, 'PUT', {
      name: 'Updated original',
      kind: 'equipment',
    });
    expect(
      (await request('/heroes/objects', player.token)).body.objects.find(
        (item) => item.id === copied.id
      ).name
    ).toBe('GM template');
    await request('/heroes/subscriptions', gm.token, 'POST', {
      action: 'respond',
      id: invite.body.subscription.id,
      decision: 'revoke',
    });
    expect(
      (await request('/heroes/objects', player.token)).body.objects.map((item) => item.id)
    ).not.toContain(source.id);
    expect(
      (await request('/heroes/objects', gm.token)).body.objects.map((item) => item.id)
    ).not.toContain(ownObject.id);
    expect(
      (await request('/heroes/objects', player.token)).body.objects.map((item) => item.id)
    ).toContain(copied.id);
  });

  it('persists per-account theme, last role and safe per-role locations across logins', async () => {
    await call(
      'admin/user',
      { userId: player.user.id, roles: ['visitor', 'player', 'game-master'], disabled: false },
      admin.token
    );
    const login = await call('login', { username: 'target-player', password });
    expect((await call('me', {}, login.token)).user.activeRole).toBe('game-master');
    await call(
      'preferences/save',
      { theme: 'light', location: '/site/heroes/campaigns/?world=fixture' },
      login.token
    );
    await call('role/select', { role: 'player' }, login.token);
    await call('preferences/save', { location: '/site/heroes/people/players/' }, login.token);
    await expect(
      call('preferences/save', { location: '//evil.example/' }, login.token)
    ).rejects.toMatchObject({ status: 400 });
    await expect(call('preferences/save', { theme: 'invalid' }, login.token)).rejects.toMatchObject(
      { status: 400 }
    );
    const relogin = await call('login', { username: 'target-player', password });
    const me = (await call('me', {}, relogin.token)).user;
    expect(me.activeRole).toBe('player');
    expect(me.preferences.theme).toBe('light');
    expect(me.preferences.locations['game-master']).toBe('/site/heroes/campaigns/?world=fixture');
    expect((await call('role/select', { role: 'game-master' }, relogin.token)).location).toBe(
      '/site/heroes/campaigns/?world=fixture'
    );
    expect((await call('me', {}, admin.token)).user.preferences.theme).not.toBe('light');
  });

  it('requires an administrator, creates no target login, rejects logout/security changes and releases to the administrator', async () => {
    expect(
      (
        await request('/heroes/auth/impersonation/start', player.token, 'POST', {
          userId: admin.user.id,
        })
      ).status
    ).toBe(403);
    const before = JSON.parse(fs.readFileSync(file, 'utf8')).sessions.length;
    expect(
      (
        await request('/heroes/auth/impersonation/start', admin.token, 'POST', {
          userId: player.user.id,
        })
      ).status
    ).toBe(200);
    const me = (await request('/heroes/auth/me', admin.token)).body;
    expect(me.user.id).toBe(player.user.id);
    expect(me.user.impersonation.actorId).toBe(admin.user.id);
    expect(me.user.roles).toEqual(['player']);
    expect(JSON.parse(fs.readFileSync(file, 'utf8')).sessions).toHaveLength(before);
    for (const action of ['logout', 'password', 'mfa/start', 'closure/request', 'admin/user'])
      expect((await request(`/heroes/auth/${action}`, admin.token, 'POST', {})).status).toBe(403);
    expect(
      (await request('/heroes/auth/impersonation/release', admin.token, 'POST', {})).body.released
    ).toBe(true);
    expect((await request('/heroes/auth/me', admin.token)).body.user.id).toBe(admin.user.id);
  });

  it('does not write until the real user approves, binds approval to the exact update and executes it only once', async () => {
    await call('impersonation/start', { userId: player.user.id }, admin.token);
    const payload = { name: 'Approved prop', kind: 'equipment' };
    const pending = await request('/heroes/objects', admin.token, 'POST', payload);
    expect(pending.status).toBe(202);
    expect((await request('/heroes/objects', player.token)).body.objects).toEqual([]);
    const inbox = (await request('/heroes/auth/impersonation/status', player.token)).body;
    expect(inbox.approvals[0]).toMatchObject({ actorId: admin.user.id, targetId: player.user.id });
    expect(inbox.approvals[0]).not.toHaveProperty('sessionHash');
    expect(
      (
        await request('/heroes/auth/impersonation/respond', admin.token, 'POST', {
          id: pending.body.pendingApproval,
          decision: 'approve',
        })
      ).status
    ).toBe(403);
    await request('/heroes/auth/impersonation/respond', player.token, 'POST', {
      id: pending.body.pendingApproval,
      decision: 'approve',
    });
    expect(
      (
        await request(
          '/heroes/objects',
          admin.token,
          'POST',
          { ...payload, name: 'Changed' },
          pending.body.pendingApproval
        )
      ).status
    ).toBe(403);
    const saved = await request(
      '/heroes/objects',
      admin.token,
      'POST',
      payload,
      pending.body.pendingApproval
    );
    expect(saved.status).toBe(201);
    const repeat = await request(
      '/heroes/objects',
      admin.token,
      'POST',
      payload,
      pending.body.pendingApproval
    );
    expect(repeat.body.object.id).toBe(saved.body.object.id);
    expect((await request('/heroes/objects', player.token)).body.objects).toHaveLength(1);
    await call('impersonation/release', {}, admin.token);
    const audit = (await call('impersonation/status', {}, admin.token)).audit;
    expect(
      audit.some(
        (item) =>
          item.actorId === admin.user.id &&
          item.targetId === player.user.id &&
          item.outcome === 'completed'
      )
    ).toBe(true);
  });

  it('supports rejection and five-minute autoapproval without silently autoapproving early', async () => {
    await call('impersonation/start', { userId: player.user.id }, admin.token);
    const payload = { name: 'Timed prop', kind: 'equipment' };
    const first = await request('/heroes/objects', admin.token, 'POST', payload);
    await call(
      'impersonation/respond',
      { id: first.body.pendingApproval, decision: 'reject' },
      player.token
    );
    expect(
      (await request('/heroes/objects', admin.token, 'POST', payload, first.body.pendingApproval))
        .status
    ).toBe(403);
    const second = await request('/heroes/objects', admin.token, 'POST', payload);
    const realNow = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(realNow + 5 * 60 * 1000 - 1000);
    expect(
      (await request('/heroes/objects', admin.token, 'POST', payload, second.body.pendingApproval))
        .status
    ).toBe(202);
    vi.spyOn(Date, 'now').mockReturnValue(realNow + 5 * 60 * 1000 + 1000);
    expect(
      (await request('/heroes/objects', admin.token, 'POST', payload, second.body.pendingApproval))
        .status
    ).toBe(201);
  });

  it('isolates role previews in disposable storage and discards it on Release', async () => {
    const original = fs.readFileSync(file, 'utf8');
    const count = JSON.parse(original).users.length;
    await call('impersonation/start', { role: 'game-master' }, admin.token);
    const context = heroesRequestContext(admin.token, origin, file, database);
    expect(context.databaseFile).not.toBe(database);
    expect(
      (
        await request('/heroes/objects', admin.token, 'POST', {
          name: 'Disposable',
          kind: 'equipment',
        })
      ).status
    ).toBe(201);
    expect((await request('/heroes/objects', admin.token)).body.objects).toHaveLength(1);
    expect((await request('/heroes/objects', player.token)).body.objects).toEqual([]);
    expect(JSON.parse(fs.readFileSync(file, 'utf8')).users).toHaveLength(count);
    await call('impersonation/release', {}, admin.token);
    expect(fs.existsSync(context.impersonation.previewRoot)).toBe(false);
    expect((await request('/heroes/objects', admin.token)).body.objects).toEqual([]);
  });
  it('allows administrator maintenance only in isolated role-preview storage', async () => {
    const cultures = (await call('name-config', {}, admin.token)).cultures;
    await call('impersonation/start', { role: 'admin' }, admin.token);
    const updated = cultures.map((item, index) =>
      index === 0 ? { ...item, label: 'Disposable culture label' } : item
    );
    expect(
      (await request('/heroes/auth/admin/name-config', admin.token, 'POST', { cultures: updated }))
        .status
    ).toBe(200);
    expect((await request('/heroes/auth/name-config', admin.token)).body.cultures[0].label).toBe(
      'Disposable culture label'
    );
    expect((await request('/heroes/auth/password', admin.token, 'POST', {})).status).toBe(403);
    await call('impersonation/release', {}, admin.token);
    expect((await call('name-config', {}, admin.token)).cultures[0].label).toBe(cultures[0].label);
  });
});
