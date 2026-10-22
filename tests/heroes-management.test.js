import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import {
  createHeroesWorld,
  createHeroesObject,
  updateHeroesObject,
  deleteHeroesWorld,
  deleteHeroesObject,
  listHeroesManagement,
  saveHeroesManagement,
  deleteHeroesManagement,
  exportHeroesManagement,
  importHeroesManagement,
  saveHeroesLibrary,
} from '../scripts/heroes-store.js';
import { createServer, handleHeroes } from '../scripts/wurm-local.js';
import { normalizeManagementRecord } from '../src/js/modules/objects/heroes/campaign-management.mjs';

let root;
let file;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'heroes-management-'));
  file = path.join(root, 'heroes.db');
});
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});
const save = (kind, data, id = null) => saveHeroesManagement({ kind, data }, id, file);
async function example() {
  const gm = await save('profile', { name: 'Morgan', roles: ['game-master', 'player'] });
  const player = await save('profile', { name: 'Alex', roles: ['player'] });
  const world = await createHeroesWorld('Asterion', file);
  const worldRecord = await save('world', {
    name: 'Asterion management',
    worldId: world.id,
    gameMasterId: gm.id,
    playerIds: [player.id],
    genres: ['Fantasy Hero'],
  });
  const campaign = await save('campaign', {
    name: 'Northern journey',
    worldId: world.id,
    active: true,
    genre: 'Fantasy Hero',
  });
  const object = await createHeroesObject(world.id, { kind: 'character', name: 'Scout' }, file);
  const assignment = await save('character', {
    name: 'Alex scout',
    objectId: object.id,
    playerId: player.id,
    campaignId: campaign.id,
  });
  const note = await save('note', {
    name: 'Session 1',
    worldId: world.id,
    playerId: player.id,
    objectId: object.id,
    notes: 'Found the village.',
  });
  return { gm, player, world, worldRecord, campaign, object, assignment, note };
}

describe('local HERO campaign records', () => {
  it('retries transient replacement locks and surfaces persistent write errors without losing old data', async () => {
    await createHeroesWorld('Original', file);
    const rename = fs.promises.rename.bind(fs.promises);
    const spy = vi.spyOn(fs.promises, 'rename');
    try {
      spy
        .mockRejectedValueOnce(Object.assign(new Error('Temporarily locked'), { code: 'EPERM' }))
        .mockRejectedValueOnce(Object.assign(new Error('Busy'), { code: 'EBUSY' }))
        .mockImplementation(rename);
      await createHeroesWorld('Retried', file);
      expect(spy).toHaveBeenCalledTimes(3);
      spy.mockClear();
      spy.mockRejectedValue(Object.assign(new Error('Still locked'), { code: 'EACCES' }));
      await expect(createHeroesWorld('Not persisted', file)).rejects.toMatchObject({
        code: 'EACCES',
      });
      expect(spy).toHaveBeenCalledTimes(7);
      spy.mockClear();
      spy.mockRejectedValue(Object.assign(new Error('Disk error'), { code: 'EIO' }));
      await expect(createHeroesWorld('Also not persisted', file)).rejects.toMatchObject({
        code: 'EIO',
      });
      expect(spy).toHaveBeenCalledTimes(1);
      expect((await listHeroesManagement(file)).worlds.map((world) => world.name)).toEqual([
        'Original',
        'Retried',
      ]);
      expect(fs.readdirSync(root)).toEqual(['heroes.db']);
    } finally {
      spy.mockRestore();
    }
  });
  it('stores roles, ownership, subscriptions, campaigns, character links, and GM notes in the same database', async () => {
    const data = await example();
    const state = await listHeroesManagement(file);
    expect(state.records).toHaveLength(6);
    expect(state.records.find((record) => record.id === data.note.id).data.notes).toBe(
      'Found the village.'
    );
    expect(state.worlds[0].id).toBe(data.world.id);
    expect(state.objects[0].id).toBe(data.object.id);
    const updated = await save(
      'profile',
      { ...data.player.data, name: 'Alex updated' },
      data.player.id
    );
    expect((await listHeroesManagement(file)).records).toContainEqual(updated);
  });

  it('permits external Game Masters, external players, and unassigned characters', async () => {
    const world = await createHeroesWorld('Remote table', file);
    await save('world', {
      name: 'Remote table',
      worldId: world.id,
      externalGameMaster: 'Off-system GM',
      playerIds: [],
      genres: [],
    });
    for (const externalPlayer of ['Off-system player', '']) {
      const object = await createHeroesObject(
        world.id,
        { name: `Character ${externalPlayer}`, kind: 'character' },
        file
      );
      await save('character', {
        name: object.name,
        objectId: object.id,
        externalPlayer,
        externalGameMaster: 'Off-system GM',
      });
    }
    expect(
      (await listHeroesManagement(file)).records.filter((record) => record.kind === 'character')
    ).toHaveLength(2);
  });

  it('rejects invalid roles and does not persist password fields or unknown metadata', () => {
    expect(() =>
      normalizeManagementRecord('profile', { name: 'Admin', roles: ['admin'] })
    ).toThrow();
    expect(() => normalizeManagementRecord('profile', { name: 'Empty', roles: [] })).toThrow();
    expect(
      normalizeManagementRecord('profile', {
        name: 'Alex',
        roles: ['player'],
        password: 'not retained',
      })
    ).toEqual({ name: 'Alex', roles: ['player'], notes: '' });
    expect(() => normalizeManagementRecord('note', { name: 'Missing targets' })).toThrow();
    expect(() =>
      normalizeManagementRecord('profile', { name: 'x'.repeat(121), roles: ['player'] })
    ).toThrow();
  });

  it('enforces relationships on create, edit, and delete without persisting failed changes', async () => {
    const { gm, player, worldRecord, world, campaign, object } = await example();
    await expect(async () =>
      save('profile', { name: 'No GM role', roles: ['player'] }, gm.id)
    ).rejects.toMatchObject({ status: 400 });
    await expect(deleteHeroesManagement(player.id, file)).rejects.toMatchObject({ status: 400 });
    await expect(deleteHeroesManagement(campaign.id, file)).rejects.toMatchObject({ status: 400 });
    await expect(deleteHeroesManagement(worldRecord.id, file)).rejects.toMatchObject({
      status: 400,
    });
    await expect(async () =>
      save('world', { ...worldRecord.data, playerIds: [] }, worldRecord.id)
    ).rejects.toMatchObject({ status: 400 });
    await expect(async () =>
      save('world', { ...worldRecord.data, gameMasterId: 'missing' }, worldRecord.id)
    ).rejects.toMatchObject({ status: 400 });
    await expect(async () => save('world', worldRecord.data)).rejects.toMatchObject({
      status: 400,
    });
    await expect(async () =>
      save('character', { name: 'Duplicate', objectId: object.id })
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      updateHeroesObject(object.id, { name: 'Changed type', kind: 'equipment' }, file)
    ).rejects.toMatchObject({ status: 400 });
    const otherWorld = await createHeroesWorld('Other', file);
    const otherCampaign = await save('campaign', {
      name: 'Other campaign',
      worldId: otherWorld.id,
      active: true,
    });
    const unassigned = await createHeroesObject(
      world.id,
      { name: 'Unassigned', kind: 'character' },
      file
    );
    await expect(async () =>
      save('character', {
        name: 'Wrong campaign',
        objectId: unassigned.id,
        campaignId: otherCampaign.id,
      })
    ).rejects.toMatchObject({
      status: 400,
      message: 'Character and campaign must belong to the same world',
    });
    expect((await listHeroesManagement(file)).objects[0].kind).toBe('character');
    expect(
      (await listHeroesManagement(file)).records.find((record) => record.id === gm.id).data.roles
    ).toContain('game-master');
    expect(world.id).not.toBe(otherWorld.id);
  });

  it('cleans up deleted object links while preserving notes about subscribed players', async () => {
    const { object, note, assignment } = await example();
    await deleteHeroesObject(object.id, file);
    const state = await listHeroesManagement(file);
    expect(state.records.some((record) => record.id === assignment.id)).toBe(false);
    expect(state.records.find((record) => record.id === note.id).data).toMatchObject({
      objectId: '',
      notes: 'Found the village.',
    });
    expect(await exportHeroesManagement({}, file)).toMatchObject({ objects: [] });
  });

  it('cleans up a deleted world without deleting people or shared library definitions', async () => {
    const { world } = await example();
    await saveHeroesLibrary(
      { name: 'Template', kind: 'object', definition: { name: 'Template', kind: 'character' } },
      null,
      file
    );
    await deleteHeroesWorld(world.id, file);
    const state = await listHeroesManagement(file);
    expect(state.records.map((record) => record.kind)).toEqual(['profile', 'profile']);
    expect(state.objects).toEqual([]);
    expect((await exportHeroesManagement({}, file)).worlds).toEqual([]);
  });
});

describe('portable campaign collections', () => {
  it('exports a player collection without unrelated characters, and includes external-GM worlds', async () => {
    const { player, world, campaign } = await example();
    const outsider = await createHeroesObject(
      world.id,
      { name: 'Other player character', kind: 'character' },
      file
    );
    const externalWorld = await createHeroesWorld('External GM world', file);
    await save('world', {
      name: 'External world',
      worldId: externalWorld.id,
      externalGameMaster: 'Remote GM',
      playerIds: [player.id],
      genres: ['Star Hero'],
    });
    const externalCharacter = await createHeroesObject(
      externalWorld.id,
      { name: 'Space scout', kind: 'character' },
      file
    );
    await save('character', {
      name: 'Space scout',
      objectId: externalCharacter.id,
      playerId: player.id,
    });
    const exported = await exportHeroesManagement({ type: 'profile', id: player.id }, file);
    expect(exported.objects.map((object) => object.name).sort()).toEqual(['Scout', 'Space scout']);
    expect(exported.objects.some((object) => object.id === outsider.id)).toBe(false);
    expect(exported.worlds).toHaveLength(2);
    expect(exported.records.some((record) => record.id === campaign.id)).toBe(true);
    await importHeroesManagement(exported, path.join(root, 'player.db'));
    const campaignExport = await exportHeroesManagement(
      { type: 'campaign', id: campaign.id },
      file
    );
    expect(campaignExport.objects.map((object) => object.name)).toEqual(['Scout']);
    const emptyCampaign = await save('campaign', {
      name: 'Empty',
      worldId: world.id,
      active: false,
    });
    const emptyExport = await exportHeroesManagement(
      { type: 'campaign', id: emptyCampaign.id },
      file
    );
    expect(emptyExport.objects).toEqual([]);
    await importHeroesManagement(emptyExport, path.join(root, 'empty-campaign.db'));
  });
  it.each(['all', 'profile', 'world', 'campaign', 'genre', 'record'])(
    'round-trips %s collections with remapped identities and relationships',
    async (type) => {
      const { gm, world, campaign, assignment } = await example();
      const id = {
        all: '',
        profile: gm.id,
        world: world.id,
        campaign: campaign.id,
        genre: 'Fantasy Hero',
        record: assignment.id,
      }[type];
      const exported = await exportHeroesManagement({ type, id }, file);
      const sourceIds = new Set(
        [...exported.records, ...exported.worlds, ...exported.objects].map((item) => item.id)
      );
      const importedFile = path.join(root, `${type}-imported.db`);
      await importHeroesManagement(exported, importedFile);
      const restored = await listHeroesManagement(importedFile);
      expect(restored.records.length).toBe(exported.records.length);
      expect(restored.worlds).toHaveLength(1);
      expect(restored.objects[0].definition).toEqual({ name: 'Scout', kind: 'character' });
      for (const item of [...restored.records, ...restored.worlds, ...restored.objects])
        expect(sourceIds.has(item.id)).toBe(false);
      const character = restored.records.find((record) => record.kind === 'character');
      expect(character.data.objectId).toBe(restored.objects[0].id);
      expect(restored.records.find((record) => record.id === character.data.campaignId)?.kind).toBe(
        'campaign'
      );
      await exportHeroesManagement({}, importedFile);
    }
  );

  it('exports independent definitions rather than nonportable library references', async () => {
    const { world } = await example();
    const template = await saveHeroesLibrary(
      { name: 'Template', kind: 'object', definition: { name: 'Template', kind: 'equipment' } },
      null,
      file
    );
    await createHeroesObject(
      world.id,
      { name: 'Container', kind: 'base', containedObjects: [{ libraryRef: template.id }] },
      file
    );
    const exported = await exportHeroesManagement({}, file);
    expect(JSON.stringify(exported)).not.toContain('libraryRef');
    await importHeroesManagement(exported, path.join(root, 'no-library.db'));
  });

  it('rejects malformed backups atomically and preserves existing data', async () => {
    await example();
    const exported = await exportHeroesManagement({}, file);
    for (const mutate of [
      (data) => {
        data.version = 2;
      },
      (data) => {
        data.worlds.push(data.worlds[0]);
      },
      (data) => {
        data.records.find((record) => record.kind === 'character').data.playerId = 'missing';
      },
      (data) => {
        data.objects[0].worldId = data.records[0].id;
      },
      (data) => {
        data.objects[0].definition.name = 'Mismatch';
      },
    ]) {
      const invalid = structuredClone(exported);
      mutate(invalid);
      await expect(importHeroesManagement(invalid, file)).rejects.toMatchObject({ status: 400 });
      expect(await exportHeroesManagement({}, file)).toMatchObject({
        worlds: exported.worlds,
        records: exported.records,
        objects: exported.objects,
      });
    }
  });
});

describe('paired helper management routes', () => {
  const req = (method, data) =>
    Object.assign(Readable.from([Buffer.from(JSON.stringify(data))]), { method });
  const url = (route) => new URL(`http://localhost/heroes/management${route}`);
  it('supports create/list/update/export/import/delete and explicit route errors', async () => {
    const created = await handleHeroes(
      req('POST', { kind: 'profile', data: { name: 'GM', roles: ['game-master'] } }),
      url(''),
      file
    );
    expect(created.statusCode).toBe(201);
    const id = created.body.record.id;
    await handleHeroes(
      req('PUT', { kind: 'profile', data: { name: 'GM renamed', roles: ['game-master'] } }),
      url(`/${id}`),
      file
    );
    expect((await handleHeroes({ method: 'GET' }, url(''), file)).records[0].data.name).toBe(
      'GM renamed'
    );
    const exported = await handleHeroes(
      { method: 'GET' },
      url('/export?type=profile&id=' + id),
      file
    );
    expect(await handleHeroes(req('POST', exported), url('/import'), file)).toMatchObject({
      imported: 1,
      worlds: 0,
      objects: 0,
    });
    await handleHeroes({ method: 'DELETE' }, url(`/${id}`), file);
    expect((await listHeroesManagement(file)).records).toHaveLength(1);
    await expect(handleHeroes({ method: 'DELETE' }, url(`/${id}`), file)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      handleHeroes({ method: 'GET' }, url('/export?type=invalid'), file)
    ).rejects.toMatchObject({ status: 400 });
  });

  it('requires helper pairing for every management endpoint', async () => {
    const server = createServer({
      env: { WURM_HEROES_DB_PATH: file, WURM_HELPER_AUTH_FILE: path.join(root, 'auth.json') },
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    try {
      for (const [method, route] of [
        ['GET', ''],
        ['POST', ''],
        ['PUT', '/unknown'],
        ['DELETE', '/unknown'],
        ['GET', '/export'],
        ['POST', '/import'],
      ]) {
        const response = await fetch(
          `http://127.0.0.1:${server.address().port}/heroes/management${route}`,
          { method }
        );
        expect(response.status).toBe(401);
      }
    } finally {
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    }
  });
});
