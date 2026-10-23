import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { handleHeroesCopies } from '../scripts/heroes-copies.js';
import { canAccess, updateHeroesIdentity } from '../scripts/heroes-identity.js';
import {
  createHeroesObject,
  createHeroesWorld,
  deleteHeroesObject,
  listHeroesLibrary,
  listHeroesManagement,
  saveHeroesLibrary,
  saveHeroesManagement,
  updateHeroesObject,
} from '../scripts/heroes-store.js';
import { mountHeroesCopies } from '../src/js/tools/heroes/copies.js';

const { client } = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock('../src/js/tools/heroes/helper-client.js', () => ({
  createHeroesClient: () => client,
}));

let root;
let file;
let identity;
const users = [
  { id: 'owner', roles: ['game-master'] },
  { id: 'requester', roles: ['player'] },
  { id: 'outsider', roles: ['admin'] },
  { id: 'visitor', roles: ['visitor'] },
];
const state = () => JSON.parse(fs.readFileSync(identity, 'utf8'));
beforeEach(async () => {
  root = path.resolve('tests', `.heroes-copies-${randomUUID()}`);
  fs.mkdirSync(root);
  file = path.join(root, 'heroes.db');
  identity = path.join(root, 'identity.json');
  await updateHeroesIdentity(identity, (value) => {
    value.users = structuredClone(users);
  });
});
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

async function own(type, id, userId = 'owner', creatorId = 'original-creator') {
  await updateHeroesIdentity(identity, (value) => {
    value.ownership.push({
      userId,
      creatorId,
      resourceType: type,
      resourceId: id,
      publication: { audience: 'private', viewers: [] },
    });
    value.grants.push({
      userId: 'requester',
      resourceType: type,
      resourceId: id,
      access: 'read',
    });
  });
}

async function call(id, body, override = {}) {
  const value = state();
  const principal = {
    id,
    roles: value.users.find((user) => user.id === id)?.roles || [],
    grants: value.grants.filter((grant) => grant.userId === id),
    ownership: value.ownership,
    ...override,
  };
  const library = await listHeroesLibrary(file);
  const read = (type, resourceId) => canAccess(principal, type, resourceId);
  const definitionReadable = (definition) =>
    !definition ||
    typeof definition !== 'object' ||
    ((!definition.libraryRef || read('library', definition.libraryRef)) &&
      Object.values(definition).every(definitionReadable));
  const context = {
    read,
    objectReadable: (object) =>
      object && read('object', object.id) && definitionReadable(object.definition),
    recordReadable: (record) => record && read('record', record.id),
    permittedLibrary: () =>
      library.filter((entry) => read('library', entry.id) && definitionReadable(entry.definition)),
  };
  const req =
    body === undefined
      ? { method: 'GET' }
      : Object.assign(Readable.from([Buffer.from(JSON.stringify(body))]), { method: 'POST' });
  return handleHeroesCopies(
    req,
    new URL('http://localhost/heroes/copies'),
    file,
    principal,
    identity,
    context
  );
}

async function objectFixture() {
  const world = await createHeroesWorld('Original world', file);
  const part = await saveHeroesLibrary(
    {
      name: 'Original hand',
      kind: 'part',
      definition: { anatomyType: 'part', components: [{ name: 'Request-time fingers' }] },
    },
    null,
    file
  );
  const object = await createHeroesObject(
    world.id,
    { name: 'Original hero', kind: 'character', parts: [{ libraryRef: part.id }] },
    file
  );
  await own('object', object.id);
  await own('library', part.id);
  return { object, part, world };
}
async function requestObject() {
  const fixture = await objectFixture();
  const { request } = await call('requester', {
    action: 'request',
    resourceType: 'object',
    resourceId: fixture.object.id,
    creatorId: 'forged',
    ownerId: 'forged',
  });
  return { ...fixture, request };
}

describe('approved independent HERO copies', () => {
  it('creates a private request-time object snapshot, retaining creator and immutable provenance', async () => {
    const { object, part, request } = await requestObject();
    expect(request.creatorId).toBe('original-creator');
    expect(request.ownerId).toBe('owner');
    expect(request).not.toHaveProperty('snapshot');
    await updateHeroesObject(object.id, { name: 'Changed source', kind: 'character' }, file);
    await saveHeroesLibrary(
      { ...part, definition: { anatomyType: 'part', components: [{ name: 'Changed fingers' }] } },
      part.id,
      file
    );
    await call('owner', { action: 'approve', requestId: request.id });
    const result = await call('requester');
    expect(result.copies).toHaveLength(1);
    const copy = result.copies[0];
    expect(copy).toMatchObject({
      sourceId: object.id,
      originalName: 'Original hero',
      creatorId: 'original-creator',
      sourceOwnerId: 'owner',
      approvedBy: 'owner',
    });
    const independent = (await listHeroesManagement(file)).objects.find(
      (item) => item.id === copy.resourceId
    );
    expect(independent.worldId).toBeNull();
    expect(independent.name).toBe('Original hero');
    expect(independent.definition.parts[0].components[0].name).toBe('Request-time fingers');
    expect(JSON.stringify(independent)).not.toContain('libraryRef');
    const metadata = state().ownership.find((item) => item.resourceId === independent.id);
    expect(metadata).toMatchObject({
      userId: 'requester',
      creatorId: 'original-creator',
      editors: [],
      publication: { audience: 'private', scopeId: '', viewers: [] },
      provenance: { originalName: 'Original hero', sourceId: object.id },
    });
    const owner = { id: 'owner', roles: ['game-master'], grants: [], ownership: state().ownership };
    expect(canAccess(owner, 'object', independent.id)).toBeFalsy();
    await updateHeroesObject(independent.id, { name: 'Recipient edits', kind: 'character' }, file);
    expect(
      (await listHeroesManagement(file)).objects.find((item) => item.id === object.id).name
    ).toBe('Changed source');
    expect(state().copies[0].originalName).toBe('Original hero');
    expect(state().copyAudit.map((item) => item.action)).toEqual(['requested', 'approved']);
    expect(state().copyRequests[0]).not.toHaveProperty('snapshot');
  });

  it('copies nested saved definitions without live links or source updates', async () => {
    const { part } = await objectFixture();
    const shape = await saveHeroesLibrary(
      {
        name: 'Shell',
        kind: 'shape',
        definition: { anatomyType: 'shape', parts: [{ libraryRef: part.id }] },
      },
      null,
      file
    );
    await own('library', shape.id);
    const { request } = await call('requester', {
      action: 'request',
      resourceType: 'library',
      resourceId: shape.id,
    });
    await call('owner', { action: 'approve', requestId: request.id });
    const [copy] = (await call('requester')).copies;
    const copied = (await listHeroesLibrary(file)).find((item) => item.id === copy.resourceId);
    expect(copied.definition.parts[0].components[0].name).toBe('Request-time fingers');
    expect(JSON.stringify(copied)).not.toContain('libraryRef');
  });

  it('limits request visibility to its two participants, even for administrators', async () => {
    const { request } = await requestObject();
    expect((await call('outsider')).requests).toEqual([]);
    expect((await call('outsider')).copies).toEqual([]);
    for (const action of ['approve', 'decline', 'cancel'])
      await expect(call('outsider', { action, requestId: request.id })).rejects.toMatchObject({
        status: 404,
      });
    expect((await call('owner')).requests).toEqual([request]);
  });

  it('permits only current owner review and requester cancellation, with terminal decisions', async () => {
    const { request } = await requestObject();
    await expect(
      call('requester', { action: 'approve', requestId: request.id })
    ).rejects.toMatchObject({ status: 403 });
    await expect(call('owner', { action: 'cancel', requestId: request.id })).rejects.toMatchObject({
      status: 403,
    });
    await call('requester', { action: 'cancel', requestId: request.id });
    await expect(call('owner', { action: 'approve', requestId: request.id })).rejects.toMatchObject(
      {
        status: 409,
      }
    );
    expect((await listHeroesManagement(file)).objects).toHaveLength(1);
    expect(state().copyRequests[0].status).toBe('cancelled');
    expect(state().copyRequests[0]).not.toHaveProperty('snapshot');
  });

  it('declines without creating data and allows a later new request', async () => {
    const { request, object } = await requestObject();
    await call('owner', { action: 'decline', requestId: request.id });
    expect((await call('requester')).copies).toEqual([]);
    expect(state().copyRequests[0].status).toBe('declined');
    await call('requester', { action: 'request', resourceType: 'object', resourceId: object.id });
    expect(state().copyRequests).toHaveLength(2);
  });

  it('rejects unassigned, visitor, disabled, and closed account mutation roles', async () => {
    const { request, object } = await requestObject();
    const body = { action: 'request', resourceType: 'object', resourceId: object.id };
    await expect(call('visitor', body)).rejects.toMatchObject({ status: 403 });
    await expect(call('visitor', body, { roles: ['admin'] })).rejects.toMatchObject({
      status: 403,
    });
    await expect(call('requester', body, { roles: ['visitor'] })).rejects.toMatchObject({
      status: 403,
    });
    await updateHeroesIdentity(identity, (value) => {
      value.users.find((item) => item.id === 'requester').disabled = true;
    });
    await expect(call('owner', { action: 'approve', requestId: request.id })).rejects.toMatchObject(
      {
        status: 409,
      }
    );
    await expect(call('requester')).rejects.toMatchObject({ status: 403 });
    await updateHeroesIdentity(identity, (value) => {
      value.users.find((item) => item.id === 'owner').closure = 'deleted';
    });
    await expect(call('owner', { action: 'decline', requestId: request.id })).rejects.toMatchObject(
      {
        status: 403,
      }
    );
  });

  it('refuses unreadable sources, hidden library dependencies, and ownerless legacy data', async () => {
    const { object } = await objectFixture();
    await updateHeroesIdentity(identity, (value) => {
      value.grants = value.grants.filter((grant) => grant.resourceType !== 'library');
    });
    await expect(
      call('requester', { action: 'request', resourceType: 'object', resourceId: object.id })
    ).rejects.toMatchObject({ status: 404 });
    const unowned = await createHeroesObject(null, { name: 'Legacy', kind: 'object' }, file);
    await updateHeroesIdentity(identity, (value) => {
      value.grants.push({
        userId: 'requester',
        resourceType: 'object',
        resourceId: unowned.id,
        access: 'read',
      });
    });
    await expect(
      call('requester', { action: 'request', resourceType: 'object', resourceId: unowned.id })
    ).rejects.toMatchObject({ status: 409 });
  });

  it('rechecks source ownership, existence, and consent of embedded dependency owners', async () => {
    const { request, part, object } = await requestObject();
    await updateHeroesIdentity(identity, (value) => {
      value.ownership.find((item) => item.resourceId === part.id).userId = 'outsider';
    });
    await expect(call('owner', { action: 'approve', requestId: request.id })).rejects.toMatchObject(
      {
        status: 409,
      }
    );
    await updateHeroesIdentity(identity, (value) => {
      value.ownership.find((item) => item.resourceId === object.id).userId = 'outsider';
    });
    await expect(call('owner', { action: 'approve', requestId: request.id })).rejects.toMatchObject(
      {
        status: 403,
      }
    );
    await updateHeroesIdentity(identity, (value) => {
      value.ownership.find((item) => item.resourceId === object.id).userId = 'owner';
    });
    await deleteHeroesObject(object.id, file);
    await expect(call('owner', { action: 'approve', requestId: request.id })).rejects.toMatchObject(
      {
        status: 409,
      }
    );
    expect(state().copyRequests[0].status).toBe('pending');
  });

  it('serializes duplicate requests and approvals so exactly one private copy is created', async () => {
    const { object } = await objectFixture();
    const results = await Promise.allSettled(
      [1, 2].map(() =>
        call('requester', { action: 'request', resourceType: 'object', resourceId: object.id })
      )
    );
    expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    const requestId = state().copyRequests[0].id;
    const approvals = await Promise.allSettled(
      [1, 2].map(() => call('owner', { action: 'approve', requestId }))
    );
    expect(approvals.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    expect((await listHeroesManagement(file)).objects).toHaveLength(2);
    expect(state().copies).toHaveLength(1);
  });

  it.each(['world', 'record'])(
    'deep-copies a %s graph with remapped dependencies and private ownership',
    async (type) => {
      const world = await createHeroesWorld('Graph world', file);
      const genre = await saveHeroesManagement(
        { kind: 'genre', data: { name: 'Fantasy' } },
        null,
        file
      );
      const campaign = await saveHeroesManagement(
        { kind: 'campaign', data: { name: 'Adventure', genreId: genre.id, active: true } },
        null,
        file
      );
      const profile = await saveHeroesManagement(
        { kind: 'profile', data: { name: 'GM', roles: ['game-master'], accountId: 'owner' } },
        null,
        file
      );
      const worldRecord = await saveHeroesManagement(
        {
          kind: 'world',
          data: {
            name: 'Graph context',
            worldId: world.id,
            campaignId: campaign.id,
            gameMasterId: profile.id,
            playerIds: [],
          },
        },
        null,
        file
      );
      const object = await createHeroesObject(
        world.id,
        { name: 'Graph hero', kind: 'character' },
        file
      );
      for (const record of [genre, campaign, profile, worldRecord]) await own('record', record.id);
      await own('world', world.id);
      await own('object', object.id);
      const { request } = await call('requester', {
        action: 'request',
        resourceType: type,
        resourceId: type === 'world' ? world.id : campaign.id,
      });
      await call('owner', { action: 'approve', requestId: request.id });
      const result = await listHeroesManagement(file);
      const copies = (await call('requester')).copies;
      expect(copies).toHaveLength(6);
      const mapping = new Map(copies.map((item) => [item.sourceId, item.resourceId]));
      expect(result.objects.find((item) => item.id === mapping.get(object.id)).worldId).toBe(
        mapping.get(world.id)
      );
      expect(result.records.find((item) => item.id === mapping.get(campaign.id)).data.genreId).toBe(
        mapping.get(genre.id)
      );
      const copiedWorld = result.records.find((item) => item.id === mapping.get(worldRecord.id));
      expect(copiedWorld.data).toMatchObject({
        worldId: mapping.get(world.id),
        campaignId: mapping.get(campaign.id),
        gameMasterId: mapping.get(profile.id),
      });
      expect(
        result.records.find((item) => item.id === mapping.get(profile.id)).data.accountId
      ).toBeUndefined();
      for (const copy of copies)
        expect(state().ownership.find((item) => item.resourceId === copy.resourceId)).toMatchObject(
          {
            userId: 'requester',
            creatorId: 'original-creator',
            publication: { audience: 'private' },
          }
        );
    }
  );

  it('remaps standalone object availability into one private copied record, never the original scopes', async () => {
    const genre = await saveHeroesManagement(
      { kind: 'genre', data: { name: 'Availability genre' } },
      null,
      file
    );
    const object = await createHeroesObject(null, { name: 'Shared hero', kind: 'character' }, file);
    const scope = (await listHeroesManagement(file)).records.find(
      (record) => record.kind === 'object-scope' && record.data.objectId === object.id
    );
    await saveHeroesManagement(
      { kind: 'object-scope', data: { ...scope.data, global: false, genreIds: [genre.id] } },
      scope.id,
      file
    );
    await own('record', genre.id);
    await own('record', scope.id);
    await own('object', object.id);
    const { request } = await call('requester', {
      action: 'request',
      resourceType: 'record',
      resourceId: scope.id,
    });
    await call('owner', { action: 'approve', requestId: request.id });
    const copies = (await call('requester')).copies;
    const copiedObject = copies.find((copy) => copy.sourceId === object.id);
    const copiedGenre = copies.find((copy) => copy.sourceId === genre.id);
    const copiedScope = copies.find((copy) => copy.sourceId === scope.id);
    const records = (await listHeroesManagement(file)).records.filter(
      (record) => record.kind === 'object-scope' && record.data.objectId === copiedObject.resourceId
    );
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe(copiedScope.resourceId);
    expect(records[0].data.genreIds).toEqual([copiedGenre.resourceId]);
    expect(records[0].data.global).toBe(false);
  });

  it('does not capture private graph dependencies just because its world is readable', async () => {
    const world = await createHeroesWorld('Readable world', file);
    const object = await createHeroesObject(
      world.id,
      { name: 'Hidden dependency', kind: 'object' },
      file
    );
    await own('world', world.id);
    await own('object', object.id);
    await updateHeroesIdentity(identity, (value) => {
      value.grants = value.grants.filter((grant) => grant.resourceId !== object.id);
    });
    await expect(
      call('requester', { action: 'request', resourceType: 'world', resourceId: world.id })
    ).rejects.toMatchObject({ status: 403 });
    expect(state().copyRequests || []).toEqual([]);
  });

  it('does not create partial graph nodes if store validation rejects the snapshot', async () => {
    const genre = await saveHeroesManagement(
      { kind: 'genre', data: { name: 'Genre' } },
      null,
      file
    );
    const campaign = await saveHeroesManagement(
      { kind: 'campaign', data: { name: 'Campaign', genreId: genre.id, active: true } },
      null,
      file
    );
    await own('record', genre.id);
    await own('record', campaign.id);
    const { request } = await call('requester', {
      action: 'request',
      resourceType: 'record',
      resourceId: campaign.id,
    });
    await updateHeroesIdentity(identity, (value) => {
      const snapshot = value.copyRequests[0].snapshot.value;
      snapshot.records.find((record) => record.id === campaign.id).data.genreId = 'missing';
    });
    await expect(call('owner', { action: 'approve', requestId: request.id })).rejects.toMatchObject(
      { status: 400 }
    );
    expect((await listHeroesManagement(file)).records).toHaveLength(2);
    expect(state().copies || []).toHaveLength(0);
    expect(state().copyRequests[0].status).toBe('pending');
  });

  it('rejects malformed JSON, unknown actions, anonymous callers, and unsupported methods', async () => {
    await expect(call('requester', { action: 'overwrite' })).rejects.toMatchObject({ status: 400 });
    const url = new URL('http://localhost/heroes/copies');
    await expect(
      handleHeroesCopies({ method: 'GET' }, url, file, { id: '' }, identity, {})
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      handleHeroesCopies({ method: 'DELETE' }, url, file, { id: 'requester' }, identity, {})
    ).rejects.toMatchObject({ status: 405 });
    const broken = Object.assign(Readable.from(['{bad']), { method: 'POST' });
    await expect(
      handleHeroesCopies(broken, url, file, { id: 'requester' }, identity, {})
    ).rejects.toMatchObject({ status: 400 });
    const oversized = Object.assign(Readable.from(['x'.repeat(17 * 1024)]), { method: 'POST' });
    await expect(
      handleHeroesCopies(oversized, url, file, { id: 'requester' }, identity, {})
    ).rejects.toMatchObject({ status: 413 });
    expect(await handleHeroesCopies({}, new URL('http://localhost/heroes/other'))).toBeUndefined();
  });
});

class Element {
  constructor(tag, text = '', value = '') {
    this.tag = tag;
    this.textContent = text;
    this.value = value;
    this.children = [];
    this.listeners = {};
    this.classList = { add: vi.fn() };
  }
  append(...children) {
    this.children.push(...children);
  }
  replaceChildren(...children) {
    this.children = children;
  }
  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }
  setAttribute() {}
}

async function approvedFixture() {
  const fixture = await requestObject();
  await call('owner', { action: 'approve', requestId: fixture.request.id });
  const [copy] = (await call('requester')).copies;
  return { ...fixture, copy };
}

describe('explicit independent copy revision proposals', () => {
  it('blocks direct Admin requests and revision acceptance even with an assigned Player role, until switched', async () => {
    const { object, copy } = await approvedFixture();
    await updateHeroesIdentity(identity, (value) => {
      value.users.find((item) => item.id === 'requester').roles = ['admin', 'player'];
    });
    const adminRole = { roles: ['admin'] };
    expect(await call('requester', undefined, adminRole)).toMatchObject({
      canMutate: true,
      canRequest: false,
      canAccept: false,
    });
    await expect(
      call(
        'requester',
        {
          action: 'request',
          resourceType: 'object',
          resourceId: object.id,
        },
        adminRole
      )
    ).rejects.toMatchObject({ status: 403, message: expect.stringContaining('Switch') });
    const proposal = (await call('owner', { action: 'propose', copyId: copy.id })).request;
    await expect(
      call('requester', { action: 'approve', requestId: proposal.id }, adminRole)
    ).rejects.toMatchObject({ status: 403, message: expect.stringContaining('Switch') });
    expect(state().copies).toHaveLength(1);
    await call('requester', { action: 'approve', requestId: proposal.id }, { roles: ['player'] });
    expect(state().copies).toHaveLength(2);
    await expect(
      call('outsider', { action: 'request', resourceType: 'object', resourceId: object.id })
    ).rejects.toMatchObject({ status: 403 });
  });

  it('preserves Admin owner approvals, decline, cancellation and proposals for content-role recipients', async () => {
    const { request, object } = await requestObject();
    await updateHeroesIdentity(identity, (value) => {
      value.users.find((item) => item.id === 'owner').roles = ['admin', 'game-master'];
    });
    const adminRole = { roles: ['admin'] };
    await call('owner', { action: 'approve', requestId: request.id }, adminRole);
    const [copy] = (await call('requester')).copies;
    const proposal = (await call('owner', { action: 'propose', copyId: copy.id }, adminRole))
      .request;
    await call('owner', { action: 'cancel', requestId: proposal.id }, adminRole);
    const second = (
      await call('requester', { action: 'request', resourceType: 'object', resourceId: object.id })
    ).request;
    await call('owner', { action: 'decline', requestId: second.id }, adminRole);
    const third = (
      await call('requester', { action: 'request', resourceType: 'object', resourceId: object.id })
    ).request;
    await call('owner', { action: 'approve', requestId: third.id }, adminRole);
    expect(state().copies).toHaveLength(2);
    expect((await listHeroesManagement(file)).objects).toHaveLength(3);
  });

  it('preserves recipient decline and requester cancel in Admin mode without allowing self-approval', async () => {
    const { object, copy } = await approvedFixture();
    const pending = (
      await call('requester', { action: 'request', resourceType: 'object', resourceId: object.id })
    ).request;
    const proposal = (await call('owner', { action: 'propose', copyId: copy.id })).request;
    await updateHeroesIdentity(identity, (value) => {
      value.users.find((item) => item.id === 'requester').roles = ['admin', 'player'];
    });
    await call('requester', { action: 'decline', requestId: proposal.id }, { roles: ['admin'] });
    await call('requester', { action: 'cancel', requestId: pending.id }, { roles: ['admin'] });
    expect(state().copies).toHaveLength(1);
  });

  it('blocks approving a pending self-copy after switching to Admin while preserving decline', async () => {
    const object = await createHeroesObject(null, { name: 'My source', kind: 'object' }, file);
    await own('object', object.id, 'requester');
    const { request } = await call('requester', {
      action: 'request',
      resourceType: 'object',
      resourceId: object.id,
    });
    await updateHeroesIdentity(identity, (value) => {
      value.users.find((item) => item.id === 'requester').roles = ['admin', 'player'];
    });
    await expect(
      call('requester', { action: 'approve', requestId: request.id }, { roles: ['admin'] })
    ).rejects.toMatchObject({ status: 403, message: expect.stringContaining('Switch') });
    await call('requester', { action: 'decline', requestId: request.id }, { roles: ['admin'] });
    expect((await listHeroesManagement(file)).objects).toHaveLength(1);
    expect(state().copies).toHaveLength(0);
  });

  it('delivers a private request-time revision only on recipient acceptance, retaining edits and provenance', async () => {
    const { object, copy } = await approvedFixture();
    await updateHeroesObject(copy.resourceId, { name: 'Recipient edits', kind: 'character' }, file);
    await updateHeroesObject(object.id, { name: 'Offered revision', kind: 'character' }, file);
    await updateHeroesIdentity(identity, (value) => {
      value.grants = [];
    });
    const targets = (await call('owner')).proposalTargets;
    expect(targets).toContainEqual(
      expect.objectContaining({ copyId: copy.id, recipientId: 'requester' })
    );
    expect((await call('requester')).resources.some((item) => item.id === object.id)).toBe(false);
    const { request: proposal } = await call('owner', { action: 'propose', copyId: copy.id });
    expect(proposal).toMatchObject({
      kind: 'revision',
      originalName: 'Original hero',
      creatorId: 'original-creator',
      ownerId: 'owner',
      requesterId: 'requester',
      revisionOfResourceId: copy.resourceId,
    });
    expect(proposal).not.toHaveProperty('snapshot');
    expect(JSON.stringify((await call('requester')).requests)).not.toContain('Offered revision');
    expect((await listHeroesManagement(file)).objects).toHaveLength(2);
    await updateHeroesObject(object.id, { name: 'Later source edits', kind: 'character' }, file);
    await call('requester', { action: 'approve', requestId: proposal.id });
    const copies = (await call('requester')).copies;
    expect(copies).toHaveLength(2);
    const revision = copies.find((item) => item.proposalId === proposal.id);
    expect(revision).toMatchObject({
      originalName: 'Original hero',
      creatorId: 'original-creator',
      sourceId: object.id,
      revisionOfCopyId: copy.id,
      revisionOfResourceId: copy.resourceId,
      proposedBy: 'owner',
      approvedBy: 'requester',
    });
    const objects = (await listHeroesManagement(file)).objects;
    expect(objects.find((item) => item.id === copy.resourceId).name).toBe('Recipient edits');
    expect(objects.find((item) => item.id === revision.resourceId).name).toBe('Offered revision');
    expect(objects.find((item) => item.id === object.id).name).toBe('Later source edits');
    expect(state().copies.find((item) => item.id === copy.id)).toEqual(copy);
    expect(state().copyAudit.map((item) => item.action)).toEqual([
      'requested',
      'approved',
      'revision-proposed',
      'revision-approved',
    ]);
    expect(state().copyRequests.find((item) => item.id === proposal.id)).not.toHaveProperty(
      'snapshot'
    );
  });

  it('allows only the exact current owner to propose to an existing approved recipient', async () => {
    const { copy } = await approvedFixture();
    await expect(call('outsider', { action: 'propose', copyId: copy.id })).rejects.toMatchObject({
      status: 404,
    });
    await expect(call('requester', { action: 'propose', copyId: copy.id })).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      call('owner', { action: 'propose', copyId: 'invented', recipientId: 'outsider' })
    ).rejects.toMatchObject({ status: 404 });
    await updateHeroesIdentity(identity, (value) => {
      value.ownership.find((item) => item.resourceId === copy.resourceId).userId = 'outsider';
    });
    expect((await call('owner')).proposalTargets).toEqual([]);
    await expect(call('owner', { action: 'propose', copyId: copy.id })).rejects.toMatchObject({
      status: 409,
    });
  });

  it('lets recipients decline and proposers cancel, never the reverse; proposals stay participant-private', async () => {
    const { copy } = await approvedFixture();
    const { request } = await call('owner', { action: 'propose', copyId: copy.id });
    await expect(call('owner', { action: 'approve', requestId: request.id })).rejects.toMatchObject(
      { status: 403 }
    );
    await expect(
      call('requester', { action: 'cancel', requestId: request.id })
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      call('outsider', { action: 'decline', requestId: request.id })
    ).rejects.toMatchObject({ status: 404 });
    expect((await call('outsider')).requests).toEqual([]);
    expect((await call('outsider')).proposalTargets).toEqual([]);
    await call('requester', { action: 'decline', requestId: request.id });
    await expect(
      call('requester', { action: 'approve', requestId: request.id })
    ).rejects.toMatchObject({ status: 409 });
    const second = (await call('owner', { action: 'propose', copyId: copy.id })).request;
    await call('owner', { action: 'cancel', requestId: second.id });
    expect((await call('requester')).copies).toHaveLength(1);
    expect((await listHeroesManagement(file)).objects).toHaveLength(2);
    for (const proposal of state().copyRequests.filter((item) => item.kind === 'revision'))
      expect(proposal).not.toHaveProperty('snapshot');
  });

  it('requires dependency consent before offering snapshots, and rechecks ownership before acceptance', async () => {
    const { copy, part, object } = await approvedFixture();
    await updateHeroesIdentity(identity, (value) => {
      value.ownership.find((item) => item.resourceId === part.id).userId = 'outsider';
      value.grants.push({
        userId: 'owner',
        resourceType: 'library',
        resourceId: part.id,
        access: 'read',
      });
    });
    await expect(call('owner', { action: 'propose', copyId: copy.id })).rejects.toMatchObject({
      status: 409,
    });
    expect(state().copyRequests).toHaveLength(1);
    await updateHeroesIdentity(identity, (value) => {
      value.ownership.find((item) => item.resourceId === part.id).userId = 'owner';
    });
    const { request } = await call('owner', { action: 'propose', copyId: copy.id });
    await updateHeroesIdentity(identity, (value) => {
      value.ownership.find((item) => item.resourceId === part.id).userId = 'outsider';
    });
    await expect(
      call('requester', { action: 'approve', requestId: request.id })
    ).rejects.toMatchObject({ status: 409 });
    await updateHeroesIdentity(identity, (value) => {
      value.ownership.find((item) => item.resourceId === object.id).userId = 'outsider';
    });
    await expect(
      call('requester', { action: 'approve', requestId: request.id })
    ).rejects.toMatchObject({ status: 403 });
    // A recipient can always refuse a now-invalid offer without needing access to its live source.
    await call('requester', { action: 'decline', requestId: request.id });
    expect((await call('requester')).copies).toHaveLength(1);
  });

  it('rejects revoked recipient roles and deactivated proposers without accepting any update', async () => {
    const { copy } = await approvedFixture();
    const { request } = await call('owner', { action: 'propose', copyId: copy.id });
    await expect(
      call('requester', { action: 'approve', requestId: request.id }, { roles: ['visitor'] })
    ).rejects.toMatchObject({ status: 403 });
    await updateHeroesIdentity(identity, (value) => {
      value.users.find((item) => item.id === 'owner').disabled = true;
    });
    await expect(
      call('requester', { action: 'approve', requestId: request.id })
    ).rejects.toMatchObject({ status: 409 });
    expect((await call('requester')).copies).toHaveLength(1);
  });

  it('serializes duplicate offers and acceptance into exactly one new independent revision', async () => {
    const { copy } = await approvedFixture();
    const offers = await Promise.allSettled(
      [1, 2].map(() => call('owner', { action: 'propose', copyId: copy.id }))
    );
    expect(offers.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    const proposal = state().copyRequests.find((item) => item.kind === 'revision');
    const accepts = await Promise.allSettled(
      [1, 2].map(() => call('requester', { action: 'approve', requestId: proposal.id }))
    );
    expect(accepts.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    expect((await call('requester')).copies).toHaveLength(2);
    expect((await listHeroesManagement(file)).objects).toHaveLength(3);
  });

  it('retains original creator/name/source across successive revisions without granting live access', async () => {
    const { object, copy } = await approvedFixture();
    await updateHeroesIdentity(identity, (value) => {
      value.grants = [];
    });
    await updateHeroesObject(object.id, { name: 'Second edition', kind: 'character' }, file);
    const first = (await call('owner', { action: 'propose', copyId: copy.id })).request;
    await call('requester', { action: 'approve', requestId: first.id });
    const revision = (await call('requester')).copies.find((item) => item.proposalId === first.id);
    await updateHeroesObject(object.id, { name: 'Third edition', kind: 'character' }, file);
    const second = (await call('owner', { action: 'propose', copyId: revision.id })).request;
    await call('requester', { action: 'approve', requestId: second.id });
    const result = await call('requester');
    expect(result.copies).toHaveLength(3);
    for (const item of result.copies) {
      expect(item.originalName).toBe('Original hero');
      expect(item.creatorId).toBe('original-creator');
      expect(item.sourceId).toBe(object.id);
    }
    expect(result.resources.some((item) => item.id === object.id)).toBe(false);
    expect(state().grants).toEqual([]);
    expect(result.copies.find((item) => item.proposalId === second.id).revisionOfCopyId).toBe(
      revision.id
    );
  });

  it('offers saved library revisions as independent embedded definitions', async () => {
    const { part } = await objectFixture();
    const { request } = await call('requester', {
      action: 'request',
      resourceType: 'library',
      resourceId: part.id,
    });
    await call('owner', { action: 'approve', requestId: request.id });
    const [copy] = (await call('requester')).copies;
    await saveHeroesLibrary(
      {
        ...part,
        definition: { ...part.definition, components: [{ name: 'Revised fingers' }] },
      },
      part.id,
      file
    );
    const proposal = (await call('owner', { action: 'propose', copyId: copy.id })).request;
    await call('requester', { action: 'approve', requestId: proposal.id });
    const revised = (await call('requester')).copies.find(
      (item) => item.proposalId === proposal.id
    );
    const entries = await listHeroesLibrary(file);
    expect(
      entries.find((item) => item.id === revised.resourceId).definition.components[0].name
    ).toBe('Revised fingers');
    expect(entries.find((item) => item.id === copy.resourceId).definition.components[0].name).toBe(
      'Request-time fingers'
    );
    expect(JSON.stringify(entries.find((item) => item.id === revised.resourceId))).not.toContain(
      'libraryRef'
    );
  });

  it('refuses acceptance after the earlier copy has been transferred to another account', async () => {
    const { copy } = await approvedFixture();
    const proposal = (await call('owner', { action: 'propose', copyId: copy.id })).request;
    await updateHeroesIdentity(identity, (value) => {
      value.ownership.find((item) => item.resourceId === copy.resourceId).userId = 'outsider';
    });
    await expect(
      call('requester', { action: 'approve', requestId: proposal.id })
    ).rejects.toMatchObject({ status: 409 });
    expect(state().copies).toHaveLength(1);
  });

  it('accepts graph revisions with fresh remapped worlds, objects, and management records', async () => {
    const world = await createHeroesWorld('Graph source', file);
    const genre = await saveHeroesManagement(
      { kind: 'genre', data: { name: 'Genre source' } },
      null,
      file
    );
    const campaign = await saveHeroesManagement(
      { kind: 'campaign', data: { name: 'Campaign source', genreId: genre.id, active: true } },
      null,
      file
    );
    const context = await saveHeroesManagement(
      {
        kind: 'world',
        data: {
          name: 'Context source',
          worldId: world.id,
          campaignId: campaign.id,
          gameMasterId: '',
          playerIds: [],
        },
      },
      null,
      file
    );
    const object = await createHeroesObject(
      world.id,
      { name: 'Original graph hero', kind: 'character' },
      file
    );
    await own('world', world.id);
    await own('object', object.id);
    for (const record of [genre, campaign, context]) await own('record', record.id);
    const { request } = await call('requester', {
      action: 'request',
      resourceType: 'world',
      resourceId: world.id,
    });
    await call('owner', { action: 'approve', requestId: request.id });
    const oldCopies = (await call('requester')).copies;
    const copiedWorld = oldCopies.find((item) => item.sourceId === world.id);
    const copiedObject = oldCopies.find((item) => item.sourceId === object.id);
    await updateHeroesObject(
      copiedObject.resourceId,
      { name: 'My independent edits', kind: 'character' },
      file
    );
    await updateHeroesObject(object.id, { name: 'Graph update', kind: 'character' }, file);
    await updateHeroesIdentity(identity, (value) => {
      value.grants = [];
    });
    const proposal = (await call('owner', { action: 'propose', copyId: copiedWorld.id })).request;
    await call('requester', { action: 'approve', requestId: proposal.id });
    const revisions = (await call('requester')).copies.filter(
      (item) => item.proposalId === proposal.id
    );
    expect(revisions).toHaveLength(oldCopies.length);
    const remap = new Map(revisions.map((item) => [item.sourceId, item.resourceId]));
    const result = await listHeroesManagement(file);
    expect(result.objects.find((item) => item.id === remap.get(object.id))).toMatchObject({
      name: 'Graph update',
      worldId: remap.get(world.id),
    });
    expect(result.objects.find((item) => item.id === copiedObject.resourceId).name).toBe(
      'My independent edits'
    );
    expect(result.records.find((item) => item.id === remap.get(context.id)).data).toMatchObject({
      worldId: remap.get(world.id),
      campaignId: remap.get(campaign.id),
    });
    expect(result.records.find((item) => item.id === remap.get(campaign.id)).data.genreId).toBe(
      remap.get(genre.id)
    );
    for (const revision of revisions) {
      expect(revision.creatorId).toBe('original-creator');
      expect(
        state().ownership.find((item) => item.resourceId === revision.resourceId).publication
          .audience
      ).toBe('private');
    }
    for (const copy of oldCopies)
      expect(state().copies.find((item) => item.id === copy.id)).toEqual(copy);
  });
});

const descendants = (node) => [node, ...node.children.flatMap(descendants)];
function mount() {
  vi.stubGlobal('document', { createElement: (tag) => new Element(tag) });
  vi.stubGlobal(
    'Option',
    class extends Element {
      constructor(text, value) {
        super('option', text, value);
      }
    }
  );
  const container = new Element('div');
  return { container, mounted: mountHeroesCopies(container) };
}
const uiData = {
  canMutate: true,
  canRequest: true,
  canAccept: true,
  accountId: 'owner',
  resources: [{ type: 'object', id: 'source', name: '<unsafe source>' }],
  requests: [
    {
      id: 'incoming',
      ownerId: 'owner',
      requesterId: 'requester',
      status: 'pending',
      originalName: 'Original',
      resourceType: 'object',
      resourceId: 'source',
      creatorId: 'creator',
    },
    {
      id: 'outgoing',
      ownerId: 'other',
      requesterId: 'owner',
      status: 'pending',
      originalName: 'Outgoing',
    },
  ],
  copies: [
    {
      originalName: 'Provenance',
      resourceType: 'object',
      resourceId: 'copied',
      sourceType: 'object',
      sourceId: 'source',
      creatorId: 'creator',
    },
  ],
};

describe('HERO copy request interface', () => {
  it('disables Admin requests and revision acceptance but retains owner review and stewardship controls', async () => {
    client.mockResolvedValue({
      ...uiData,
      canRequest: false,
      canAccept: false,
      proposalTargets: [{ copyId: 'target', originalName: 'Source', recipientId: 'recipient' }],
      requests: [
        ...uiData.requests,
        {
          id: 'revision-in',
          kind: 'revision',
          ownerId: 'other',
          requesterId: 'owner',
          status: 'pending',
          originalName: 'Update',
        },
        {
          id: 'revision-out',
          kind: 'revision',
          ownerId: 'owner',
          requesterId: 'other',
          status: 'pending',
          originalName: 'Offer',
        },
      ],
    });
    const { container } = mount();
    await vi.waitFor(() =>
      expect(
        descendants(container).some((node) => node.textContent === 'Offer new independent revision')
      ).toBe(true)
    );
    const nodes = descendants(container);
    expect(nodes.find((node) => node.textContent === 'Request owner approval').disabled).toBe(true);
    expect(nodes.some((node) => node.textContent === 'Accept new revision')).toBe(false);
    for (const text of [
      'Approve private copy',
      'Decline',
      'Decline revision',
      'Cancel request',
      'Cancel update proposal',
      'Offer new independent revision',
    ])
      expect(nodes.find((node) => node.textContent === text).disabled).not.toBe(true);
    expect(
      nodes.some((node) =>
        node.textContent.includes('Switch to an actually assigned Game Master or Player role')
      )
    ).toBe(true);
    const form = nodes.find((node) => node.tag === 'form');
    nodes.find((node) => node.tag === 'select').value = '0';
    form.listeners.submit({ preventDefault() {} });
    expect(client).toHaveBeenCalledTimes(1);
  });

  it('offers revision proposals, recipient acceptance/refusal, and proposer cancellation with new-copy semantics', async () => {
    client.mockResolvedValue({
      ...uiData,
      proposalTargets: [
        { copyId: 'copy-target', originalName: 'Original source', recipientId: 'recipient' },
      ],
      requests: [
        {
          id: 'offer-in',
          kind: 'revision',
          ownerId: 'other',
          requesterId: 'owner',
          status: 'pending',
          originalName: 'Incoming update',
        },
        {
          id: 'offer-out',
          kind: 'revision',
          ownerId: 'owner',
          requesterId: 'other',
          status: 'pending',
          originalName: 'Outgoing update',
        },
      ],
    });
    const { container } = mount();
    await vi.waitFor(() =>
      expect(
        descendants(container).some((node) => node.textContent === 'Offer new independent revision')
      ).toBe(true)
    );
    const form = descendants(container).filter((node) => node.tag === 'form')[1];
    descendants(form).find((node) => node.tag === 'select').value = '0';
    form.listeners.submit({ preventDefault() {} });
    await vi.waitFor(() =>
      expect(client).toHaveBeenCalledWith(
        '/heroes/copies',
        expect.objectContaining({
          body: JSON.stringify({ action: 'propose', copyId: 'copy-target' }),
        })
      )
    );
    for (const [text, action, requestId] of [
      ['Accept new revision', 'approve', 'offer-in'],
      ['Decline revision', 'decline', 'offer-in'],
      ['Cancel update proposal', 'cancel', 'offer-out'],
    ]) {
      descendants(container)
        .find((node) => node.textContent === text)
        .listeners.click();
      await vi.waitFor(() =>
        expect(client).toHaveBeenCalledWith(
          '/heroes/copies',
          expect.objectContaining({
            body: JSON.stringify({ action, requestId }),
          })
        )
      );
    }
    expect(
      descendants(container).some((node) =>
        node.textContent.includes('keeps your existing copy and edits unchanged')
      )
    ).toBe(true);
  });

  it('allows requests, owner review, cancellation, provenance, and abort cleanup', async () => {
    client.mockResolvedValue(uiData);
    const { container, mounted } = mount();
    await vi.waitFor(() =>
      expect(descendants(container).some((node) => node.tag === 'form')).toBe(true)
    );
    let nodes = descendants(container);
    expect(nodes.some((node) => node.textContent.includes('Original source: object:source'))).toBe(
      true
    );
    expect(
      nodes.some((node) => node.textContent.includes('Updates are not automatically accepted'))
    ).toBe(true);
    nodes.find((node) => node.tag === 'select').value = '0';
    nodes.find((node) => node.tag === 'form').listeners.submit({ preventDefault() {} });
    await vi.waitFor(() =>
      expect(client).toHaveBeenCalledWith(
        '/heroes/copies',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ action: 'request', resourceType: 'object', resourceId: 'source' }),
        })
      )
    );
    for (const [text, action, requestId] of [
      ['Approve private copy', 'approve', 'incoming'],
      ['Decline', 'decline', 'incoming'],
      ['Cancel request', 'cancel', 'outgoing'],
    ]) {
      nodes = descendants(container);
      nodes.find((node) => node.textContent === text).listeners.click();
      await vi.waitFor(() =>
        expect(client).toHaveBeenCalledWith(
          '/heroes/copies',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ action, requestId }),
          })
        )
      );
    }
    mounted.destroy();
  });

  it('makes visitor mode read-only and shows recoverable helper failures', async () => {
    client.mockResolvedValue({ ...uiData, canMutate: false, canRequest: false, canAccept: false });
    const { container } = mount();
    await vi.waitFor(() =>
      expect(descendants(container).some((node) => node.tag === 'select')).toBe(true)
    );
    expect(descendants(container).find((node) => node.tag === 'select').disabled).toBe(true);
    expect(descendants(container).some((node) => node.textContent === 'Approve private copy')).toBe(
      false
    );
    client.mockRejectedValueOnce(new Error('Helper unavailable'));
    const second = mount();
    await vi.waitFor(() =>
      expect(
        descendants(second.container).some((node) => node.textContent === 'Helper unavailable')
      ).toBe(true)
    );
  });
});
