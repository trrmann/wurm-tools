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
  deleteHeroesObject,
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
          pointLevelClassifications: [{ name: 'Standard', points: 150, edition: '6e' }],
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
