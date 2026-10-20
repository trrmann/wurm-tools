import { describe, expect, it } from 'vitest';
import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { Readable } from 'node:stream';
import {
  createHeroesObject,
  createHeroesWorld,
  deleteHeroesWorld,
  deleteHeroesObject,
  exportHeroesObject,
  importHeroesObject,
  exportHeroesWorld,
  importHeroesWorld,
  heroesDatabasePath,
  listHeroesObjects,
  listHeroesWorlds,
  updateHeroesObject,
} from '../scripts/heroes-store.js';
import { createServer, handleHeroes } from '../scripts/wurm-local.js';

function tempDatabase() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wurm-heroes-'));
  return { root, file: path.join(root, 'heroes.db') };
}

function bodyRequest(method, value) {
  return Object.assign(Readable.from([Buffer.from(JSON.stringify(value))]), { method });
}

describe('local Heroes SQLite store', () => {
  it('uses an independent per-user database path', () => {
    expect(heroesDatabasePath({}, 'linux', '/home/test')).toBe(
      '/home/test/.local/share/wurm-tools/heroes.db'
    );
    expect(heroesDatabasePath({ WURM_HEROES_DB_PATH: '/tmp/heroes.db' }, 'linux')).toBe(
      '/tmp/heroes.db'
    );
  });

  it('persists worlds and typed object definitions across database opens', async () => {
    const fixture = tempDatabase();
    try {
      const world = await createHeroesWorld('Asterion', fixture.file);
      const object = await createHeroesObject(
        world.id,
        {
          name: 'Skimmer',
          kind: 'vehicle',
          bodyShapes: ['hovercraft'],
          pointLevelClassifications: [{ name: 'Standard', points: 150, edition: '5e' }],
          objectModelTypes: ['physical', 'mobile'],
          equation: {
            advantages: [{ name: 'Flight', value: '1/2' }],
            points: ['1/4'],
            disadvantages: [],
          },
        },
        fixture.file
      );

      expect(await listHeroesWorlds(fixture.file)).toEqual([world]);
      expect(await listHeroesObjects(world.id, fixture.file)).toEqual([object]);
      expect(
        (await listHeroesObjects(world.id, fixture.file))[0].definition.equation.points
      ).toEqual(['1/4']);
      expect(await deleteHeroesObject(object.id, fixture.file)).toEqual({ deleted: 1 });
      expect(await listHeroesObjects(world.id, fixture.file)).toEqual([]);
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  it('updates existing object definitions without changing their world identity', async () => {
    const fixture = tempDatabase();
    try {
      const world = await createHeroesWorld('Asterion', fixture.file);
      const object = await createHeroesObject(
        world.id,
        {
          name: 'Scout',
          kind: 'character',
          typedElements: [
            {
              type: 'skill',
              name: 'Stealth',
              value: '3/2',
              isBase: true,
              modelTypes: ['sentient'],
            },
          ],
        },
        fixture.file
      );
      const updated = await updateHeroesObject(
        object.id,
        {
          name: 'Pathfinder',
          kind: 'character',
          typedElements: [
            {
              type: 'power',
              name: 'Flight',
              value: '20',
              isBase: false,
              modelTypes: ['mobile'],
            },
          ],
        },
        fixture.file
      );

      expect(updated).toMatchObject({ id: object.id, worldId: world.id, name: 'Pathfinder' });
      expect((await listHeroesObjects(world.id, fixture.file))[0].definition.typedElements).toEqual(
        [
          {
            type: 'power',
            name: 'Flight',
            value: '20',
            isBase: false,
            modelTypes: ['mobile'],
          },
        ]
      );
      await expect(
        updateHeroesObject('missing', { name: 'Missing', kind: 'object' }, fixture.file)
      ).rejects.toMatchObject({ status: 404 });
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  it('exports and imports a world with objects and deletes the world cascade', async () => {
    const fixture = tempDatabase();
    try {
      const sourceWorld = await createHeroesWorld('Asterion', fixture.file);
      const sourceObject = await createHeroesObject(
        sourceWorld.id,
        {
          name: 'Scout',
          kind: 'character',
          typedElements: [{ type: 'skill', name: 'Stealth', value: '3/2' }],
        },
        fixture.file
      );
      const exported = await exportHeroesWorld(sourceWorld.id, fixture.file);
      expect(exported).toMatchObject({
        format: 'wurm-tools-heroes-world',
        version: 1,
        world: { name: 'Asterion' },
        objects: [{ name: 'Scout', definition: sourceObject.definition }],
      });

      const imported = await importHeroesWorld(exported, fixture.file);
      expect(imported.world.name).toBe(sourceWorld.name);
      expect(imported.world.id).not.toBe(sourceWorld.id);
      expect(imported.objectCount).toBe(1);
      const importedObjects = await listHeroesObjects(imported.world.id, fixture.file);
      expect(importedObjects).toHaveLength(1);
      expect(importedObjects[0].id).not.toBe(sourceObject.id);
      expect(importedObjects[0].definition).toEqual(sourceObject.definition);

      expect(await deleteHeroesWorld(imported.world.id, fixture.file)).toEqual({
        deleted: 1,
        objectsDeleted: 1,
      });
      await expect(listHeroesObjects(imported.world.id, fixture.file)).rejects.toMatchObject({
        status: 404,
      });
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  it('exports and imports an individual object into a selected world with a new id', async () => {
    const fixture = tempDatabase();
    try {
      const world = await createHeroesWorld('Asterion', fixture.file);
      const source = await createHeroesObject(
        world.id,
        { name: 'Scout', kind: 'character', typedElements: [{ type: 'skill', name: 'Stealth' }] },
        fixture.file
      );
      const exported = await exportHeroesObject(source.id, fixture.file);
      expect(exported).toMatchObject({
        format: 'wurm-tools-heroes-object',
        version: 1,
        object: { name: 'Scout', kind: 'character', definition: source.definition },
      });
      const imported = await importHeroesObject(world.id, exported, fixture.file);
      expect(imported.id).not.toBe(source.id);
      expect(imported.worldId).toBe(world.id);
      expect(imported.definition).toEqual(source.definition);
      await expect(importHeroesObject('missing', exported, fixture.file)).rejects.toMatchObject({
        status: 404,
      });
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  it('rejects unsupported or inconsistent world exports', async () => {
    const fixture = tempDatabase();
    try {
      expect(() => importHeroesWorld({ format: 'wrong', version: 1 }, fixture.file)).toThrow(
        expect.objectContaining({ status: 400 })
      );
      const world = await createHeroesWorld('Asterion', fixture.file);
      expect(() =>
        importHeroesWorld(
          {
            format: 'wurm-tools-heroes-world',
            version: 1,
            world: { name: 'Broken' },
            objects: [
              { name: 'Mismatch', kind: 'vehicle', definition: { name: 'Mismatch', kind: 'base' } },
            ],
          },
          fixture.file
        )
      ).toThrow(expect.objectContaining({ status: 400 }));
      expect(await listHeroesWorlds(fixture.file)).toEqual([world]);
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  it('validates world and object names, kinds, and referenced worlds', async () => {
    const fixture = tempDatabase();
    try {
      expect(() => createHeroesWorld('  ', fixture.file)).toThrow(
        expect.objectContaining({ status: 400 })
      );
      await expect(
        createHeroesObject('missing', { name: 'Thing', kind: 'vehicle' }, fixture.file)
      ).rejects.toMatchObject({ status: 404 });
      const world = await createHeroesWorld('Asterion', fixture.file);
      expect(() =>
        createHeroesObject(world.id, { name: 'Thing', kind: 'planet' }, fixture.file)
      ).toThrow(expect.objectContaining({ status: 400 }));
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  it('serves the paired helper route shapes for worlds and objects', async () => {
    const fixture = tempDatabase();
    try {
      const createWorld = await handleHeroes(
        bodyRequest('POST', { name: 'Asterion' }),
        new URL('http://localhost/heroes/worlds'),
        fixture.file
      );
      expect(createWorld.statusCode).toBe(201);
      const world = createWorld.body.world;
      const createObject = await handleHeroes(
        bodyRequest('POST', { name: 'Sentinel', kind: 'character' }),
        new URL(`http://localhost/heroes/worlds/${world.id}/objects`),
        fixture.file
      );
      expect(createObject.body.object.name).toBe('Sentinel');
      const updateObject = await handleHeroes(
        bodyRequest('PUT', {
          name: 'Sentinel Prime',
          kind: 'character',
          typedElements: [{ type: 'skill', name: 'Tracking' }],
        }),
        new URL(`http://localhost/heroes/objects/${createObject.body.object.id}`),
        fixture.file
      );
      expect(updateObject.object.name).toBe('Sentinel Prime');
      expect(
        await handleHeroes(
          { method: 'GET' },
          new URL(`http://localhost/heroes/worlds/${world.id}/objects`),
          fixture.file
        )
      ).toMatchObject({ objects: [{ name: 'Sentinel Prime', kind: 'character' }] });

      const objectExport = await handleHeroes(
        { method: 'GET' },
        new URL(`http://localhost/heroes/objects/${createObject.body.object.id}/export`),
        fixture.file
      );
      expect(objectExport.format).toBe('wurm-tools-heroes-object');
      const importedObject = await handleHeroes(
        bodyRequest('POST', objectExport),
        new URL(`http://localhost/heroes/worlds/${world.id}/objects/import`),
        fixture.file
      );
      expect(importedObject.statusCode).toBe(201);
      expect(importedObject.body.object.id).not.toBe(createObject.body.object.id);

      const worldExport = await handleHeroes(
        { method: 'GET' },
        new URL(`http://localhost/heroes/worlds/${world.id}/export`),
        fixture.file
      );
      const importedWorld = await handleHeroes(
        bodyRequest('POST', worldExport),
        new URL('http://localhost/heroes/worlds/import'),
        fixture.file
      );
      expect(importedWorld.body.objectCount).toBe(2);
      const deletedWorld = await handleHeroes(
        { method: 'DELETE' },
        new URL(`http://localhost/heroes/worlds/${importedWorld.body.world.id}`),
        fixture.file
      );
      expect(deletedWorld).toEqual({ deleted: 1, objectsDeleted: 2 });
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  it('requires pairing authorization before exposing Heroes storage', async () => {
    const fixture = tempDatabase();
    const server = createServer({
      env: { ...process.env, WURM_HEROES_DB_PATH: fixture.file },
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    try {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/heroes/worlds`);
      expect(response.status).toBe(401);
    } finally {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });
});
