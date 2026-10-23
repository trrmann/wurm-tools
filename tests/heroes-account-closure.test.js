import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createHeroesSetupCode,
  heroesIdentityAction,
  heroesPrincipal,
  grantCreator,
  totpCode,
} from '../scripts/heroes-identity.js';
import {
  createHeroesWorld,
  createHeroesObject,
  listHeroesManagement,
} from '../scripts/heroes-store.js';
import { createServer } from '../scripts/wurm-local.js';

const password = 'account-closure-test-password';
const origin = 'http://localhost:3000';
let root, identity, database, admin, owner, recipient;
const call = (action, body = {}, bearer = '') =>
  heroesIdentityAction(action, body, { file: identity, databaseFile: database, origin, bearer });
const stored = () => JSON.parse(fs.readFileSync(identity, 'utf8'));
async function account(username) {
  await call('register', { username, password });
  return call('login', { username, password });
}
async function ownedWorld(user = owner, name = 'Private world') {
  const world = await createHeroesWorld(name, database);
  const object = await createHeroesObject(
    world.id,
    { name: 'Equipment', kind: 'equipment' },
    database
  );
  await grantCreator(user.user, 'world', world.id, identity);
  await grantCreator(user.user, 'object', object.id, identity);
  return { world, object };
}
const close = (choice, extra = {}) =>
  call(
    'closure/request',
    {
      choice,
      password,
      confirmation: owner.user.username,
      ...extra,
    },
    owner.token
  );

beforeEach(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'heroes-closure-'));
  identity = path.join(root, 'identity.json');
  database = path.join(root, 'heroes.db');
  const setupCode = await createHeroesSetupCode(identity);
  await call('setup', { setupCode, username: 'administrator', password });
  admin = await call('login', { username: 'administrator', password });
  const enrollment = await call('mfa/start', {}, admin.token);
  await call('mfa/confirm', { code: totpCode(enrollment.secret) }, admin.token);
  owner = await account('owner');
  recipient = await account('recipient');
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe('self-service HERO account closure', () => {
  it('retains identity, ownership and data for administrator-verified recovery', async () => {
    await ownedWorld();
    expect(await close('retain')).toMatchObject({ closed: true });
    expect(() => heroesPrincipal(owner.token, origin, identity)).toThrow();
    expect(stored().users.find((user) => user.id === owner.user.id)).toMatchObject({
      disabled: true,
      closure: 'retained',
      username: 'owner',
    });
    expect((await listHeroesManagement(database)).objects).toHaveLength(1);
    await call(
      'admin/user',
      { userId: owner.user.id, roles: ['visitor'], disabled: false },
      admin.token
    );
    const restored = await call('login', { username: 'owner', password });
    expect((await call('closure/status', {}, restored.token)).ownedCount).toBe(2);
  });

  it('deletes only unshared owned data, preserving shared contexts, unknown ownership and ACL-only data', async () => {
    const privateData = await ownedWorld();
    const shared = await ownedWorld(owner, 'Shared world');
    const legacy = await ownedWorld(recipient, 'Someone else world');
    await call(
      'admin/grant',
      {
        userId: recipient.user.id,
        resourceType: 'object',
        resourceId: shared.object.id,
        access: 'read',
      },
      admin.token
    );
    await call(
      'admin/grant',
      {
        userId: owner.user.id,
        resourceType: 'world',
        resourceId: legacy.world.id,
        access: 'write',
      },
      admin.token
    );
    owner = await call('login', { username: 'owner', password });
    const unknown = await createHeroesWorld('Legacy unknown owner', database);
    const result = await close('delete');
    expect(result).toMatchObject({ closed: true, deleted: 2, retained: 2 });
    const data = await listHeroesManagement(database);
    expect(data.worlds.map((world) => world.id)).not.toContain(privateData.world.id);
    expect(data.worlds.map((world) => world.id)).toEqual(
      expect.arrayContaining([shared.world.id, legacy.world.id, unknown.id])
    );
    const deleted = stored().users.find((user) => user.id === owner.user.id);
    expect(deleted).toMatchObject({ closure: 'deleted', disabled: true, roles: [] });
    expect(deleted.passwordHash).toBeUndefined();
    expect(stored().ownership.some((item) => item.userId === owner.user.id)).toBe(false);
    await expect(
      call(
        'admin/user',
        { userId: owner.user.id, roles: ['visitor'], disabled: false },
        admin.token
      )
    ).rejects.toMatchObject({ status: 400 });
  });

  it('requires recipient acceptance, then transfers ownership without deleting data or third-party grants', async () => {
    const { object } = await ownedWorld();
    await close('transfer', { recipient: 'recipient' });
    expect(heroesPrincipal(owner.token, origin, identity).id).toBe(owner.user.id);
    const pending = await call('closure/status', {}, recipient.token);
    expect(pending.incoming).toHaveLength(1);
    await expect(
      call('closure/accept', { id: pending.incoming[0].id }, admin.token)
    ).rejects.toMatchObject({ status: 404 });
    expect(
      await call('closure/accept', { id: pending.incoming[0].id }, recipient.token)
    ).toMatchObject({ accepted: true, transferred: 2 });
    expect(() => heroesPrincipal(owner.token, origin, identity)).toThrow();
    expect((await listHeroesManagement(database)).objects[0].id).toBe(object.id);
    expect(stored().ownership.every((item) => item.userId === recipient.user.id)).toBe(true);
    expect(heroesPrincipal(recipient.token, origin, identity).grants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ resourceType: 'object', resourceId: object.id, access: 'write' }),
      ])
    );
    await expect(
      call('closure/accept', { id: pending.incoming[0].id }, recipient.token)
    ).rejects.toMatchObject({ status: 404 });
  });

  it('allows cancellation and rejection, validates password, confirmation and recipient, and protects the last administrator', async () => {
    await expect(close('delete', { password: 'wrong' })).rejects.toMatchObject({ status: 403 });
    await expect(close('delete', { confirmation: 'someone-else' })).rejects.toMatchObject({
      status: 400,
    });
    await expect(close('transfer', { recipient: 'owner' })).rejects.toMatchObject({ status: 400 });
    await expect(
      call(
        'closure/request',
        { choice: 'retain', password, confirmation: 'administrator' },
        admin.token
      )
    ).rejects.toMatchObject({ status: 400 });
    await close('transfer', { recipient: 'recipient' });
    let status = await call('closure/status', {}, owner.token);
    await call('closure/cancel', { id: status.outgoing[0].id }, owner.token);
    expect((await call('closure/status', {}, recipient.token)).incoming).toHaveLength(0);
    await close('transfer', { recipient: 'recipient' });
    status = await call('closure/status', {}, recipient.token);
    await call('closure/reject', { id: status.incoming[0].id }, recipient.token);
    expect((await call('closure/status', {}, owner.token)).outgoing).toHaveLength(0);
  });

  it('tracks creator ownership on actual helper routes, including administrator creations and generated scope records', async () => {
    const server = createServer({
      env: { HEROES_IDENTITY_PATH: identity, WURM_HEROES_DB_PATH: database },
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
      const response = await fetch(`${base}/heroes/objects`, {
        method: 'POST',
        headers: {
          Origin: origin,
          'X-Heroes-Session': admin.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Created by administrator', kind: 'equipment' }),
      });
      expect(response.status).toBe(201);
      const status = await fetch(`${base}/heroes/auth/closure/status`, {
        headers: { Origin: origin, 'X-Heroes-Session': admin.token },
      });
      expect(status.status).toBe(200);
      expect(await status.json()).toMatchObject({ ownedCount: 2, incoming: [], outgoing: [] });
      await call(
        'admin/user',
        {
          userId: owner.user.id,
          roles: ['game-master'],
          disabled: false,
        },
        admin.token
      );
      owner = await call('login', { username: 'owner', password });
      const headers = {
        Origin: origin,
        'X-Heroes-Session': owner.token,
        'Content-Type': 'application/json',
      };
      const worldResponse = await fetch(`${base}/heroes/worlds`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'Owner world via HTTP' }),
      });
      expect(worldResponse.status).toBe(201);
      const world = (await worldResponse.json()).world;
      const objectResponse = await fetch(`${base}/heroes/worlds/${world.id}/objects`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'Owner object via HTTP', kind: 'equipment' }),
      });
      expect(objectResponse.status).toBe(201);
      const closed = await fetch(`${base}/heroes/auth/closure/request`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ choice: 'delete', confirmation: 'owner', password }),
      });
      expect(closed.status).toBe(200);
      expect(await closed.json()).toMatchObject({ closed: true, deleted: 2 });
      expect((await listHeroesManagement(database)).objects).toHaveLength(1);
      const adminObject = (await listHeroesManagement(database)).objects[0];
      const deleted = await fetch(`${base}/heroes/objects/${adminObject.id}`, {
        method: 'DELETE',
        headers: { Origin: origin, 'X-Heroes-Session': admin.token },
      });
      expect(deleted.status).toBe(200);
      expect((await call('closure/status', {}, admin.token)).ownedCount).toBe(0);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
