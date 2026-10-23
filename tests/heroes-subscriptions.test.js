import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { canAccess } from '../scripts/heroes-identity.js';
import { listHeroesManagement } from '../scripts/heroes-store.js';
import {
  handleHeroesSubscriptions,
  heroesSubscriptionMembers,
  heroesSubscriptionReadGrants,
  heroesSubscriptionWorldObjects,
} from '../scripts/heroes-subscriptions.js';
import { mountHeroesSubscriptions } from '../src/js/tools/heroes/subscriptions.js';

vi.mock('../scripts/heroes-store.js', async (original) => ({
  ...(await original()),
  listHeroesManagement: vi.fn(),
}));
const client = vi.hoisted(() => vi.fn());
vi.mock('../src/js/tools/heroes/helper-client.js', () => ({
  createHeroesClient: () => client,
}));

let root;
let identity;
let management;
const read = () => JSON.parse(fs.readFileSync(identity, 'utf8'));
const save = (state) => fs.writeFileSync(identity, JSON.stringify(state));
const owner = (resourceType, resourceId, userId) => ({
  resourceType,
  resourceId,
  userId,
  creatorId: userId,
});
function principal(id, role) {
  const state = read();
  const account = state.users.find((user) => user.id === id);
  return {
    id,
    roles: [role || account.roles[0]],
    accounts: state.users.map((user) => ({ ...user, discoverable: user.id !== 'stranger' })),
    ownership: state.ownership,
    relationships: state.playRelationships.filter((item) => item.status === 'approved'),
    grants: state.grants,
    subscriptions: state.subscriptions || [],
    scopeInvitations: state.scopeInvitations || [],
    objectPermissions: state.objectPermissions || [],
  };
}
async function call(id, body, options = {}) {
  const req = Readable.from(
    options.raw === undefined ? (body === undefined ? [] : [JSON.stringify(body)]) : [options.raw]
  );
  req.method = options.method || (body === undefined ? 'GET' : 'POST');
  const current = principal(id, options.role);
  return handleHeroesSubscriptions(
    req,
    new URL(options.route || '/heroes/subscriptions', 'http://localhost'),
    'unused',
    current,
    identity,
    {
      read: (type, id) => canAccess(current, type, id),
      write: (type, id) => canAccess(current, type, id, true),
      objectReadable: (object) => object.id !== 'private-definition',
      recordReadable: () => false,
    }
  );
}
const scope = { scopeType: 'world', scopeId: 'world' };
const show = (playerIds = ['player']) => call('gm', { action: 'visibility', ...scope, playerIds });
async function subscribe(playerId = 'player') {
  const { subscription } = await call(playerId, { action: 'request', ...scope });
  await call('gm', { action: 'respond', id: subscription.id, decision: 'approve' });
  return subscription;
}
const grants = (id) => heroesSubscriptionReadGrants(principal(id), management);

beforeEach(() => {
  root = path.join(process.cwd(), `.heroes-subscriptions-test-${randomUUID()}`);
  fs.mkdirSync(root);
  identity = path.join(root, 'identity.json');
  save({
    version: 1,
    sessions: [],
    grants: [],
    attempts: {},
    users: [
      { id: 'gm', username: 'game-master', roles: ['game-master', 'player'] },
      { id: 'other-gm', username: 'other-gm', roles: ['game-master'] },
      { id: 'player', username: 'actual-player', displayName: 'Actual Player', roles: ['player'] },
      { id: 'second-player', username: 'second-player', roles: ['player'] },
      { id: 'stranger', username: 'private-account', roles: ['player'] },
      { id: 'admin', username: 'administrator', roles: ['admin'] },
      { id: 'visitor', username: 'visitor', roles: ['visitor'] },
    ],
    playRelationships: ['player', 'second-player'].map((playerId) => ({
      id: randomUUID(),
      gameMasterId: 'gm',
      playerId,
      status: 'approved',
    })),
    ownership: [
      owner('world', 'world', 'gm'),
      owner('world', 'other-world', 'other-gm'),
      owner('record', 'campaign', 'gm'),
      owner('record', 'private-genre', 'other-gm'),
      owner('object', 'pc', 'player'),
      owner('object', 'item', 'player'),
      owner('object', 'foreign', 'second-player'),
      owner('object', 'gm-object', 'gm'),
      owner('object', 'private-definition', 'player'),
    ],
  });
  management = {
    worlds: [
      { id: 'world', name: 'Owned world' },
      { id: 'other-world', name: 'Other private world' },
    ],
    records: [
      {
        id: 'campaign',
        kind: 'campaign',
        data: { name: 'Owned campaign', genreId: 'private-genre' },
      },
      { id: 'private-genre', kind: 'genre', data: { name: 'Secret genre' } },
    ],
    objects: [
      { id: 'item', name: 'A sword', kind: 'equipment', definition: {} },
      { id: 'pc', name: 'Z character', kind: 'player-character', definition: {} },
      { id: 'foreign', name: 'Other player character', kind: 'player-character', definition: {} },
      { id: 'gm-object', name: 'GM owned object', kind: 'equipment', definition: {} },
      {
        id: 'private-definition',
        name: 'Private definition',
        kind: 'equipment',
        definition: { libraryRef: 'private-library' },
      },
    ],
  };
  listHeroesManagement.mockResolvedValue(management);
});
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('HERO scope subscriptions', () => {
  it('returns only the verified GM owner and approved active subscribers for the exact scope', async () => {
    await show(['player', 'second-player']);
    await subscribe();
    await call('second-player', { action: 'request', ...scope });
    const members = () => heroesSubscriptionMembers(principal('gm'), management, 'world', 'world');
    expect(members()).toEqual(['gm', 'player']);
    expect(heroesSubscriptionMembers(principal('gm'), management, 'campaign', 'campaign')).toEqual([
      'gm',
    ]);
    expect(heroesSubscriptionMembers(principal('gm'), management, 'world', 'campaign')).toEqual([]);
    expect(
      heroesSubscriptionMembers(principal('gm'), management, 'genre', 'private-genre')
    ).toEqual([]);
    const state = read();
    state.users.find((account) => account.id === 'player').disabled = true;
    save(state);
    expect(members()).toEqual(['gm']);
    state.users.find((account) => account.id === 'player').disabled = false;
    state.playRelationships[0].status = 'ended';
    save(state);
    expect(members()).toEqual(['gm']);
    state.playRelationships[0].status = 'approved';
    state.scopeInvitations[0].playerIds = [];
    save(state);
    expect(members()).toEqual(['gm']);
    state.users.find((account) => account.id === 'gm').disabled = true;
    save(state);
    expect(members()).toEqual([]);
  });

  it('lists account-owned scopes independently of organizational profiles, without private dependencies', async () => {
    const gm = await call('gm');
    expect(gm.scopes.map((entry) => entry.scopeId)).toEqual(['world', 'campaign']);
    expect(gm.scopes[1]).not.toHaveProperty('genreId');
    expect(gm.accounts.map((entry) => entry.id)).not.toContain('stranger');
    expect((await call('player')).scopes).toEqual([]);
    await show();
    const player = await call('player');
    expect(player.scopes.map((entry) => entry.scopeId)).toEqual(['world']);
    expect(player.ownedObjects.map((entry) => entry.id)).toEqual([
      'pc',
      'item',
      'private-definition',
    ]);
    expect(player.ownedObjects[0]).not.toHaveProperty('definition');
    expect((await call('stranger')).scopes).toEqual([]);
  });

  it('restricts visibility and invitations to the immutable GM owner and real approved Player choices', async () => {
    await expect(
      call('other-gm', { action: 'visibility', ...scope, playerIds: [] })
    ).rejects.toMatchObject({ status: 403 });
    await expect(show(['stranger'])).rejects.toMatchObject({ status: 400 });
    await expect(show(['guessed-account'])).rejects.toMatchObject({ status: 400 });
    await expect(
      call('gm', { action: 'invite', ...scope, playerId: 'stranger' })
    ).rejects.toMatchObject({ status: 403 });
    await expect(call('player', { action: 'request', ...scope })).rejects.toMatchObject({
      status: 403,
    });
    expect(read().ownership.find((entry) => entry.resourceId === 'world').userId).toBe('gm');
  });

  it('requires explicit Player acceptance of a GM invitation and supports decline and reinvite', async () => {
    const invited = await call('gm', { action: 'invite', ...scope, playerId: 'player' });
    const id = invited.subscription.id;
    expect((await call('player')).scopes).toHaveLength(1);
    expect(grants('player')).toEqual([]);
    await expect(call('gm', { action: 'respond', id, decision: 'approve' })).rejects.toMatchObject({
      status: 403,
    });
    await call('player', { action: 'respond', id, decision: 'reject' });
    expect(read().subscriptions[0].status).toBe('rejected');
    const again = await call('gm', { action: 'invite', ...scope, playerId: 'player' });
    await call('player', { action: 'respond', id: again.subscription.id, decision: 'approve' });
    expect(grants('player')).toContainEqual({
      resourceType: 'world',
      resourceId: 'world',
      access: 'read',
    });
    expect(read().grants).toEqual([]);
  });

  it('supports Player request, cancellation, GM approval, rejection and revocation', async () => {
    await show();
    const first = await call('player', { action: 'request', ...scope });
    await expect(call('player', { action: 'request', ...scope })).rejects.toMatchObject({
      status: 409,
    });
    await expect(
      call('player', { action: 'respond', id: first.subscription.id, decision: 'approve' })
    ).rejects.toMatchObject({ status: 403 });
    await call('player', { action: 'respond', id: first.subscription.id, decision: 'cancel' });
    const second = await call('player', { action: 'request', ...scope });
    await call('gm', { action: 'respond', id: second.subscription.id, decision: 'reject' });
    const third = await subscribe();
    expect(grants('player')).toHaveLength(1);
    await call('gm', { action: 'respond', id: third.id, decision: 'revoke' });
    expect(grants('player')).toEqual([]);
    expect(read().subscriptions.map((entry) => entry.status)).toEqual([
      'cancelled',
      'rejected',
      'revoked',
    ]);
  });

  it('does not implicitly grant access to campaign genres, linked profiles, or libraries', async () => {
    const campaign = { scopeType: 'campaign', scopeId: 'campaign' };
    await call('gm', { action: 'visibility', ...campaign, playerIds: ['player'] });
    const { subscription } = await call('player', { action: 'request', ...campaign });
    await call('gm', { action: 'respond', id: subscription.id, decision: 'approve' });
    expect(grants('player')).toEqual([
      { resourceType: 'record', resourceId: 'campaign', access: 'read' },
    ]);
    expect((await call('player')).scopes[0]).toEqual(
      expect.objectContaining({ name: 'Owned campaign' })
    );
    expect(JSON.stringify(await call('player'))).not.toContain('Secret genre');
  });

  it('immediately removes dynamic access when a relationship, visibility or role is withdrawn', async () => {
    await show();
    await subscribe();
    const state = read();
    state.playRelationships[0].status = 'ended';
    save(state);
    expect(grants('player')).toEqual([]);
    expect((await call('player')).scopes).toEqual([]);
    state.playRelationships[0].status = 'approved';
    state.users.find((entry) => entry.id === 'gm').roles = ['player'];
    save(state);
    expect(grants('player')).toEqual([]);
    state.users.find((entry) => entry.id === 'gm').roles = ['game-master'];
    save(state);
    await show([]);
    expect(read().subscriptions[0].status).toBe('revoked');
    expect(grants('player')).toEqual([]);
  });

  it('honors the selected role rather than using inactive assigned GM privileges', async () => {
    await expect(
      call('gm', { action: 'visibility', ...scope, playerIds: [] }, { role: 'player' })
    ).rejects.toMatchObject({ status: 403 });
    expect((await call('gm', undefined, { role: 'player' })).scopes).toEqual([]);
    await show();
    await subscribe();
    expect(
      heroesSubscriptionReadGrants({ ...principal('player'), roles: ['visitor'] }, management)
    ).toEqual([]);
    expect(
      heroesSubscriptionReadGrants({ ...principal('player'), roles: ['game-master'] }, management)
    ).toEqual([]);
    await expect(call('visitor')).rejects.toMatchObject({ status: 403 });
  });
});

describe('owned-object scope permissions', () => {
  it('keeps deleted-source pending requests cancellable and approved permissions revokeable', async () => {
    await show();
    await subscribe();
    const pending = (await call('player', { action: 'enroll', ...scope, objectId: 'pc' }))
      .permission;
    const approved = (await call('player', { action: 'enroll', ...scope, objectId: 'item' }))
      .permission;
    await call('gm', { action: 'object-respond', id: approved.id, decision: 'approve' });
    management.objects = management.objects.filter((object) => !['pc', 'item'].includes(object.id));
    const state = read();
    state.ownership = state.ownership.filter((entry) => !['pc', 'item'].includes(entry.resourceId));
    save(state);
    expect((await call('player')).objectPermissions.map((entry) => entry.objectName)).toEqual([
      'Deleted object',
      'Deleted object',
    ]);
    expect(grants('gm')).toEqual([]);
    await expect(
      call('gm', { action: 'object-respond', id: pending.id, decision: 'approve' })
    ).rejects.toMatchObject({ status: 403 });
    await call('player', { action: 'object-respond', id: pending.id, decision: 'cancel' });
    await call('gm', { action: 'object-respond', id: approved.id, decision: 'revoke' });
    expect(read().objectPermissions.map((entry) => entry.status)).toEqual(['cancelled', 'revoked']);
  });

  it('lists objects enrolled in the exact world or its parent campaign, not unrelated worlds', async () => {
    management.worlds.push({ id: 'sibling-world', name: 'Sibling world' });
    management.records.push(
      { id: 'world-link', kind: 'world', data: { worldId: 'world', campaignId: 'campaign' } },
      {
        id: 'sibling-link',
        kind: 'world',
        data: { worldId: 'sibling-world', campaignId: 'campaign' },
      }
    );
    const state = read();
    state.ownership.push(owner('world', 'sibling-world', 'gm'));
    save(state);
    const campaign = { scopeType: 'campaign', scopeId: 'campaign' };
    await show();
    await subscribe();
    await call('gm', { action: 'visibility', ...campaign, playerIds: ['player'] });
    const subscription = (await call('player', { action: 'request', ...campaign })).subscription;
    await call('gm', { action: 'respond', id: subscription.id, decision: 'approve' });
    for (const [target, objectId] of [
      [scope, 'pc'],
      [campaign, 'item'],
    ]) {
      const permission = (await call('player', { action: 'enroll', ...target, objectId }))
        .permission;
      await call('gm', { action: 'object-respond', id: permission.id, decision: 'approve' });
    }
    const objects = (worldId, role = 'player') =>
      heroesSubscriptionWorldObjects(principal('player', role), management, worldId);
    expect(objects('world')).toEqual(['pc', 'item']);
    expect(objects('sibling-world')).toEqual(['item']);
    expect(objects('other-world')).toEqual([]);
    expect(objects('guessed-world')).toEqual([]);
    expect(objects('world', 'game-master')).toEqual([]);
    const permission = read().objectPermissions.find((entry) => entry.objectId === 'item');
    await call('gm', { action: 'object-respond', id: permission.id, decision: 'revoke' });
    expect(objects('sibling-world')).toEqual([]);
    expect(objects('world')).toEqual(['pc']);
  });

  it('requires approved subscription and owner-only enrollment, not editors or guessed object IDs', async () => {
    await show();
    await expect(
      call('player', { action: 'enroll', ...scope, objectId: 'pc' })
    ).rejects.toMatchObject({ status: 403 });
    await subscribe();
    for (const objectId of ['foreign', 'guessed-object', 'private-definition'])
      await expect(call('player', { action: 'enroll', ...scope, objectId })).rejects.toMatchObject({
        status: 403,
      });
    const state = read();
    state.ownership.find((entry) => entry.resourceId === 'foreign').editors = ['player'];
    save(state);
    await expect(
      call('player', { action: 'enroll', ...scope, objectId: 'foreign' })
    ).rejects.toMatchObject({ status: 403 });
  });

  it('approves object use dynamically for the GM and approved visible scope subscribers only', async () => {
    await show(['player', 'second-player']);
    await subscribe();
    await subscribe('second-player');
    const { permission } = await call('player', { action: 'enroll', ...scope, objectId: 'pc' });
    expect(grants('gm')).not.toContainEqual(expect.objectContaining({ resourceId: 'pc' }));
    await expect(
      call('player', { action: 'object-respond', id: permission.id, decision: 'approve' })
    ).rejects.toMatchObject({ status: 403 });
    await call('gm', { action: 'object-respond', id: permission.id, decision: 'approve' });
    expect((await call('gm')).objectPermissions[0]).toMatchObject({
      objectId: 'pc',
      objectName: 'Z character',
    });
    for (const id of ['gm', 'player', 'second-player'])
      expect(grants(id)).toContainEqual({
        resourceType: 'object',
        resourceId: 'pc',
        access: 'read',
      });
    expect(grants('stranger')).toEqual([]);
    expect(read().grants).toEqual([]);
    await call('player', { action: 'object-respond', id: permission.id, decision: 'revoke' });
    expect(grants('gm')).toEqual([]);
    expect(grants('second-player')).not.toContainEqual(
      expect.objectContaining({ resourceId: 'pc' })
    );
    expect(read().ownership.find((entry) => entry.resourceId === 'pc').userId).toBe('player');
  });

  it('does not restore old permissions when scope visibility is removed then restored', async () => {
    await show();
    await subscribe();
    const { permission } = await call('player', { action: 'enroll', ...scope, objectId: 'pc' });
    await call('gm', { action: 'object-respond', id: permission.id, decision: 'approve' });
    await show([]);
    await show();
    expect(read().objectPermissions[0].status).toBe('revoked');
    expect(grants('gm')).toEqual([]);
    expect(grants('player')).toEqual([]);
  });

  it('supports cancellation, GM removal and cascade revocation on subscription withdrawal', async () => {
    await show();
    const subscription = await subscribe();
    const first = (await call('player', { action: 'enroll', ...scope, objectId: 'pc' })).permission;
    await call('player', { action: 'object-respond', id: first.id, decision: 'cancel' });
    const second = (await call('player', { action: 'enroll', ...scope, objectId: 'pc' }))
      .permission;
    await call('gm', { action: 'object-respond', id: second.id, decision: 'approve' });
    await call('gm', { action: 'object-respond', id: second.id, decision: 'revoke' });
    const third = (await call('player', { action: 'enroll', ...scope, objectId: 'pc' })).permission;
    await call('gm', { action: 'object-respond', id: third.id, decision: 'approve' });
    await call('player', { action: 'respond', id: subscription.id, decision: 'revoke' });
    expect(read().objectPermissions.map((entry) => entry.status)).toEqual([
      'cancelled',
      'revoked',
      'revoked',
    ]);
    expect(grants('gm')).toEqual([]);
  });

  it('allows a GM to enroll only their own objects directly in their own scopes', async () => {
    const { permission } = await call('gm', { action: 'enroll', ...scope, objectId: 'gm-object' });
    expect(permission.status).toBe('approved');
    await show();
    await subscribe();
    expect(grants('player')).toContainEqual({
      resourceType: 'object',
      resourceId: 'gm-object',
      access: 'read',
    });
    await expect(call('gm', { action: 'enroll', ...scope, objectId: 'pc' })).rejects.toMatchObject({
      status: 403,
    });
    await call('gm', { action: 'object-respond', id: permission.id, decision: 'revoke' });
    expect(grants('player')).not.toContainEqual(
      expect.objectContaining({ resourceId: 'gm-object' })
    );
  });

  it('rechecks immutable scope/object ownership and object existence for every dynamic grant', async () => {
    await show();
    await subscribe();
    const { permission } = await call('player', { action: 'enroll', ...scope, objectId: 'pc' });
    await call('gm', { action: 'object-respond', id: permission.id, decision: 'approve' });
    const state = read();
    state.ownership.find((entry) => entry.resourceId === 'pc').userId = 'second-player';
    save(state);
    expect(grants('gm')).toEqual([]);
    state.ownership.find((entry) => entry.resourceId === 'pc').userId = 'player';
    state.ownership.find((entry) => entry.resourceId === 'world').userId = 'other-gm';
    save(state);
    expect(grants('player')).toEqual([]);
  });
});

describe('administrator oversight and request validation', () => {
  it('shows all workflows and permits rejection/revocation, never GM impersonation', async () => {
    await show();
    const pending = (await call('player', { action: 'request', ...scope })).subscription;
    expect((await call('admin')).subscriptions).toHaveLength(1);
    await expect(
      call('admin', { action: 'respond', id: pending.id, decision: 'approve' })
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      call('admin', { action: 'invite', ...scope, playerId: 'player' })
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      call('admin', { action: 'visibility', ...scope, playerIds: [] })
    ).rejects.toMatchObject({ status: 403 });
    await call('admin', { action: 'respond', id: pending.id, decision: 'reject' });
    const approved = await subscribe();
    await call('admin', { action: 'respond', id: approved.id, decision: 'revoke' });
    expect(grants('player')).toEqual([]);
  });

  it('handles only its exact route and rejects malformed, oversized and unsupported requests', async () => {
    expect(await call('player', undefined, { route: '/heroes/objects' })).toBeUndefined();
    await expect(call('player', undefined, { method: 'DELETE' })).rejects.toMatchObject({
      status: 405,
    });
    await expect(call('player', {}, { raw: '{' })).rejects.toMatchObject({ status: 400 });
    await expect(call('player', {}, { raw: '[]' })).rejects.toMatchObject({ status: 400 });
    await expect(call('player', {}, { raw: 'x'.repeat(17 * 1024) })).rejects.toMatchObject({
      status: 413,
    });
    await expect(call('player', { action: 'guessed-action' })).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      call('player', { action: 'respond', id: 'guessed-id', decision: 'approve' })
    ).rejects.toMatchObject({ status: 403 });
  });
});

class Element {
  constructor(tag, text = '', value = '') {
    this.tag = tag;
    this.textContent = text;
    this.value = value;
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this.classList = { add: vi.fn(), remove: vi.fn() };
  }
  append(...nodes) {
    this.children.push(...nodes);
  }
  replaceChildren(...nodes) {
    this.children = nodes;
  }
  setAttribute(key, value) {
    this.attributes[key] = value;
  }
  addEventListener(event, callback) {
    this.listeners[event] = callback;
  }
}
const descendants = (node) => [node, ...node.children.flatMap(descendants)];
async function mount(role, data) {
  vi.stubGlobal('document', { createElement: (tag) => new Element(tag) });
  vi.stubGlobal(
    'Option',
    class extends Element {
      constructor(text, value) {
        super('option', text, value);
      }
    }
  );
  vi.stubGlobal('window', { confirm: vi.fn(() => false) });
  client.mockResolvedValue(data || (await call(role === 'game-master' ? 'gm' : role)));
  const container = new Element('div');
  const user = {
    id: role === 'game-master' ? 'gm' : role,
    roles: role === 'admin' ? ['admin', 'game-master'] : [role],
  };
  const dispose = mountHeroesSubscriptions(container, { user, role });
  await vi.waitFor(() =>
    expect(descendants(container).find((node) => node.tag === 'fieldset').disabled).toBe(false)
  );
  return { container, dispose, all: () => descendants(container) };
}
const click = async (node) => {
  node.listeners.click();
  await vi.waitFor(() => expect(client).toHaveBeenCalled());
};

describe('subscription dashboard UI', () => {
  it('groups and sorts legacy PCs by authoritative definition type while retaining storage kind', async () => {
    const pc = management.objects.find((object) => object.id === 'pc');
    pc.kind = 'character';
    pc.definition = { objectType: 'player-character', kind: 'non-player-character' };
    const item = management.objects.find((object) => object.id === 'item');
    item.kind = 'player-character';
    item.definition = { kind: 'equipment' };
    const data = await call('player');
    expect(data.ownedObjects[0]).toMatchObject({
      id: 'pc',
      kind: 'character',
      objectType: 'player-character',
    });
    expect(data.ownedObjects.find((object) => object.id === 'item')).toMatchObject({
      kind: 'player-character',
      objectType: 'equipment',
    });
    const { all, dispose } = await mount('player', data);
    const sections = all().filter((node) => node.tag === 'section');
    const pcSection = sections.find((node) =>
      node.children.some((child) => child.textContent === 'My player characters')
    );
    const otherSection = sections.find((node) =>
      node.children.some((child) => child.textContent === 'My other objects')
    );
    expect(descendants(pcSection).some((node) => node.textContent === 'Z character')).toBe(true);
    expect(descendants(pcSection).some((node) => node.textContent === 'A sword')).toBe(false);
    expect(descendants(otherSection).some((node) => node.textContent === 'A sword')).toBe(true);
    dispose();
  });

  it('shows explicit cleanup controls for Deleted object workflow entries', async () => {
    await show();
    await subscribe();
    const pending = (await call('player', { action: 'enroll', ...scope, objectId: 'pc' }))
      .permission;
    const approved = (await call('player', { action: 'enroll', ...scope, objectId: 'item' }))
      .permission;
    await call('gm', { action: 'object-respond', id: approved.id, decision: 'approve' });
    management.objects = [];
    const { all, dispose } = await mount('player');
    const rows = all().filter(
      (node) =>
        node.tag === 'article' &&
        node.children.some((child) => child.textContent.includes('Deleted object'))
    );
    expect(rows).toHaveLength(2);
    const cancel = descendants(rows[0]).find(
      (node) => node.textContent === 'Cancel request / invitation'
    );
    const withdraw = descendants(rows[1]).find((node) => node.textContent === 'Withdraw object');
    expect(cancel).toBeDefined();
    expect(withdraw).toBeDefined();
    await click(cancel);
    await vi.waitFor(() =>
      expect(client).toHaveBeenCalledWith('/heroes/subscriptions', {
        method: 'POST',
        body: JSON.stringify({ action: 'object-respond', id: pending.id, decision: 'cancel' }),
      })
    );
    await vi.waitFor(() =>
      expect(all().find((node) => node.tag === 'fieldset').disabled).toBe(false)
    );
    await click(withdraw);
    await vi.waitFor(() =>
      expect(client).toHaveBeenCalledWith('/heroes/subscriptions', {
        method: 'POST',
        body: JSON.stringify({ action: 'object-respond', id: approved.id, decision: 'revoke' }),
      })
    );
    dispose();
  });

  it('uses real account choices, labeled selectors, and explicit relationship visibility controls', async () => {
    const { all, dispose } = await mount('game-master');
    const choices = all()
      .filter((node) => node.tag === 'option')
      .map((node) => node.textContent);
    expect(choices).toContain('Actual Player (@actual-player)');
    expect(choices).not.toContain('private-account');
    expect(all().some((node) => node.tag === 'input' && node.value === 'player')).toBe(true);
    expect(
      all().some((node) => node.tag === 'label' && node.textContent === 'Player account')
    ).toBe(true);
    expect(all().some((node) => node.textContent === 'Refresh campaigns, worlds & objects')).toBe(
      true
    );
    dispose();
  });

  it('renders PCs before other owned objects and confirms deletion before using existing endpoints', async () => {
    const { all, dispose } = await mount('player');
    const headings = all()
      .filter((node) => node.tag === 'h3')
      .map((node) => node.textContent);
    expect(headings.indexOf('My player characters')).toBeLessThan(
      headings.indexOf('My other objects')
    );
    const deletes = all().filter((node) => node.textContent === 'Delete owned object');
    await click(deletes[0]);
    expect(window.confirm).toHaveBeenCalled();
    expect(client.mock.calls.some(([, options]) => options?.method === 'DELETE')).toBe(false);
    window.confirm.mockReturnValue(true);
    client.mockClear();
    await vi.waitFor(() =>
      expect(all().find((node) => node.tag === 'fieldset').disabled).toBe(false)
    );
    await click(all().find((node) => node.textContent === 'Delete owned object'));
    await vi.waitFor(() =>
      expect(client).toHaveBeenCalledWith('/heroes/objects/pc', { method: 'DELETE' })
    );
    dispose();
  });

  it('submits a named Player invitation using an actual account selector', async () => {
    const { all, dispose } = await mount('game-master');
    const invite = all().find(
      (node) =>
        node.tag === 'form' &&
        node.children.some((child) => child.textContent === 'Invite a Player')
    );
    const choices = descendants(invite).find((node) => node.tag === 'select');
    choices.value = 'player';
    invite.listeners.submit({ preventDefault: vi.fn() });
    await vi.waitFor(() =>
      expect(client).toHaveBeenCalledWith('/heroes/subscriptions', {
        method: 'POST',
        body: JSON.stringify({ action: 'invite', ...scope, playerId: 'player' }),
      })
    );
    dispose();
  });

  it('submits an owned PC use request for an approved named scope', async () => {
    await show();
    await subscribe();
    const { all, dispose } = await mount('player');
    const enrollment = all().find(
      (node) =>
        node.tag === 'form' &&
        node.children.some((child) => child.textContent === 'Enroll owned object in a scope')
    );
    const choices = descendants(enrollment).find((node) => node.tag === 'select');
    expect(choices.children[1].textContent).toBe('Owned world (world)');
    choices.value = JSON.stringify(scope);
    enrollment.listeners.submit({ preventDefault: vi.fn() });
    await vi.waitFor(() =>
      expect(client).toHaveBeenCalledWith('/heroes/subscriptions', {
        method: 'POST',
        body: JSON.stringify({ action: 'enroll', objectId: 'pc', ...scope }),
      })
    );
    dispose();
  });

  it('shows administrator moderation without content management even when the Admin owns objects', async () => {
    await show();
    await call('player', { action: 'request', ...scope });
    const data = await call('admin');
    data.ownedObjects = [
      { id: 'admin-pc', name: 'Admin-owned PC', kind: 'player-character', readable: true },
      { id: 'admin-item', name: 'Admin-owned item', kind: 'equipment', readable: true },
    ];
    const { all, dispose } = await mount('admin', data);
    const labels = all()
      .filter((node) => node.tag === 'button')
      .map((node) => node.textContent);
    expect(labels).toContain('Reject pending request');
    expect(labels).not.toContain('Accept / approve');
    expect(labels).not.toContain('Send scope invitation');
    expect(labels).not.toContain('Delete owned object');
    expect(labels).not.toContain('Add owned object');
    const headings = all()
      .filter((node) => node.tag === 'h3')
      .map((node) => node.textContent);
    expect(headings).toContain('All GM campaigns & worlds');
    expect(headings).toContain('Object-use requests & permissions');
    expect(headings).not.toContain('My player characters');
    expect(headings).not.toContain('My other objects');
    expect(all().some((node) => node.textContent === 'Admin-owned PC')).toBe(false);
    expect(all().some((node) => node.textContent === 'Admin-owned item')).toBe(false);
    dispose();
  });

  it('reports explicit accessible errors, enables refresh after failure and aborts on disposal', async () => {
    const { all, dispose } = await mount('player');
    client.mockRejectedValueOnce(new Error('The subscription was revoked'));
    await click(all().find((node) => node.textContent === 'Refresh campaigns, worlds & objects'));
    await vi.waitFor(() =>
      expect(
        all().some(
          (node) =>
            node.attributes.role === 'alert' && node.textContent === 'The subscription was revoked'
        )
      ).toBe(true)
    );
    expect(all().find((node) => node.tag === 'fieldset').disabled).toBe(false);
    dispose();
  });
});
