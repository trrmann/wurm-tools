import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import initSqlJs from 'sql.js';
import { createServer, handleMap } from '../scripts/wurm-local.js';
import { MapTile, TerrainLayer } from '../scripts/wurm-map-model.js';
import {
  baselineFilePath,
  deleteMapSnapshots,
  exportMapSnapshot,
  importMapSnapshot,
  getMapJob,
  getMapRaster,
  getMapTile,
  listMapSnapshots,
  startMapSnapshot,
} from '../scripts/wurm-map-baseline.js';

async function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wurm-map-baseline-'));
  const world = path.join(root, 'Adventure');
  const sqlite = path.join(world, 'sqlite');
  fs.mkdirSync(sqlite, { recursive: true });
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run('CREATE TABLE PLAYERS (WURMID INTEGER, NAME TEXT)');
  db.run('CREATE TABLE POSITION (WURMID INTEGER, POSX REAL, POSY REAL, POSZ REAL, LAYER INTEGER)');
  db.run("INSERT INTO PLAYERS VALUES (1, 'Mira')");
  db.run('INSERT INTO POSITION VALUES (1, 6.5, 6.5, 12, 0)');
  fs.writeFileSync(path.join(sqlite, 'wurmplayers.db'), Buffer.from(db.export()));
  db.close();

  for (const layer of ['top_layer', 'rock_layer', 'map_cave', 'resources', 'flags']) {
    const file = Buffer.alloc(1024 + 4 * 4 * 4);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const offset = 1024 + (y * 4 + x) * 4;
        if (layer === 'top_layer') {
          file.set([2, 0, 0, y * 10 + x], offset);
        } else if (layer === 'rock_layer') {
          file.set([4, 0, 0xff, 0xce], offset);
        } else if (layer === 'map_cave') {
          file.set([1, 30, 0xff, 0x9c], offset);
        } else if (layer === 'resources') {
          file.writeUInt32BE(
            x === 1 && y === 1 ? 0x11630000 : x === 2 && y === 1 ? 0xffff0002 : 0xffffffff,
            offset
          );
        } else {
          file.writeInt32BE(x === 1 && y === 1 ? 0x80 : 0, offset);
        }
      }
    }
    fs.writeFileSync(path.join(world, `${layer}.map`), file);
  }
  return { root, world, file: path.join(root, 'map-baseline.db') };
}

async function waitForJob(id) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const job = getMapJob(id);
    if (job.status !== 'running') return job;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('Map snapshot job timed out');
}

describe('local map baseline snapshots', () => {
  it('allows the JSON content type on the local helper preflight', async () => {
    const server = createServer();
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    try {
      const address = server.address();
      const response = await fetch(`http://127.0.0.1:${address.port}/map/Adventure/snapshots`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:4173',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type',
        },
      });
      expect(response.status).toBe(204);
      expect(response.headers.get('access-control-allow-headers')).toContain('Content-Type');
    } finally {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it('uses a separate per-user database path', () => {
    expect(baselineFilePath({}, 'linux', '/home/test')).toBe(
      '/home/test/.local/share/wurm-tools/map-baseline.db'
    );
  });

  it('stores a player-centered region and reads terrain, corner altitudes, and resources back', async () => {
    const fixture = await createFixture();
    const priorBaselinePath = process.env.WURM_MAP_BASELINE_PATH;
    try {
      const started = await startMapSnapshot(fixture.root, 'Adventure', 1, {
        radius: 1,
        filePath: fixture.file,
      });
      const complete = await waitForJob(started.id);
      expect(complete.status).toBe('completed');
      expect(complete.processed).toBe(9);
      expect(complete.snapshot).toMatchObject({
        world: 'Adventure',
        playerName: 'Mira',
        centerX: 1,
        centerY: 1,
        bounds: { x0: 0, y0: 0, width: 3, height: 3 },
      });

      const tileResult = await getMapTile(started.id, 1, 1, fixture.file);
      expect(tileResult.tile).toBeInstanceOf(MapTile);
      expect(tileResult.tile.surface).toBeInstanceOf(TerrainLayer);
      const clientTile = new MapTile(JSON.parse(JSON.stringify(tileResult.tile)));
      expect(clientTile.surface.height).toBe(1.1);
      expect(tileResult.tile).toMatchObject({
        x: 1,
        y: 1,
        surface: { name: 'Grass', height: 1.1 },
        rock: { name: 'Rock', height: -5 },
        cave: { height: -10, ceiling: -7 },
        resources: { cave: 4451, world: 0 },
        flags: { botanizable: true },
      });
      expect(tileResult.cornerAltitudes).toEqual({
        surface: { northWest: 1.1, northEast: 1.2, southWest: 2.1, southEast: 2.2 },
        rock: { northWest: -5, northEast: -5, southWest: -5, southEast: -5 },
      });
      const raster = await getMapRaster(started.id, 'resources', fixture.file);
      expect([...raster.pixels]).toEqual([0, 0, 0, 0, 1, 1, 0, 0, 0]);
      expect([...(await getMapRaster(started.id, 'surface', fixture.file)).pixels]).toEqual(
        Array(9).fill(2)
      );
      expect([...(await getMapRaster(started.id, 'rock', fixture.file)).pixels]).toEqual(
        Array(9).fill(4)
      );
      expect([...(await getMapRaster(started.id, 'cave', fixture.file)).pixels]).toEqual(
        Array(9).fill(1)
      );
      expect([...(await getMapRaster(started.id, 'flags', fixture.file)).pixels]).toEqual([
        0, 0, 0, 0, 128, 0, 0, 0, 0,
      ]);
      expect(await listMapSnapshots('Adventure', fixture.file)).toHaveLength(1);

      process.env.WURM_MAP_BASELINE_PATH = fixture.file;
      const players = await handleMap(
        { method: 'GET' },
        new URL('http://localhost/map/Adventure/players'),
        fixture.root
      );
      expect(players.rows).toHaveLength(1);
      expect(players.rows[0]).toMatchObject({ NAME: 'Mira', POSX: 6.5, POSY: 6.5 });
      const tileRoute = await handleMap(
        { method: 'GET' },
        new URL(`http://localhost/map/snapshots/${started.id}/tile?x=1&y=1`),
        fixture.root
      );
      expect(tileRoute.tile.surface.name).toBe('Grass');
    } finally {
      if (priorBaselinePath === undefined) delete process.env.WURM_MAP_BASELINE_PATH;
      else process.env.WURM_MAP_BASELINE_PATH = priorBaselinePath;
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  it('captures the whole world or a custom size, then exports, imports and deletes locally', async () => {
    const fixture = await createFixture();
    try {
      const whole = await startMapSnapshot(fixture.root, 'Adventure', undefined, {
        whole: true,
        filePath: fixture.file,
      });
      expect((await waitForJob(whole.id)).processed).toBe(16);
      const custom = await startMapSnapshot(fixture.root, 'Adventure', 1, {
        width: 2,
        height: 3,
        filePath: fixture.file,
      });
      const done = await waitForJob(custom.id);
      expect(done.snapshot.bounds).toMatchObject({ width: 2, height: 3 });
      await expect(
        startMapSnapshot(fixture.root, 'Adventure', 1, {
          width: 99,
          height: 1,
          filePath: fixture.file,
        })
      ).rejects.toMatchObject({ status: 400 });

      const exported = JSON.parse(JSON.stringify(await exportMapSnapshot(whole.id, fixture.file)));
      const imported = await importMapSnapshot(exported, fixture.file);
      expect(imported.snapshot.id).not.toBe(whole.id);
      expect([
        ...(await getMapRaster(imported.snapshot.id, 'surface', fixture.file)).pixels,
      ]).toEqual([...(await getMapRaster(whole.id, 'surface', fixture.file)).pixels]);
      exported.layers.rock = exported.layers.surface.slice(0, 8);
      await expect(importMapSnapshot(exported, fixture.file)).rejects.toMatchObject({
        status: 400,
      });

      expect(await deleteMapSnapshots({ id: whole.id }, fixture.file)).toEqual({ deleted: 1 });
      expect(await listMapSnapshots('Adventure', fixture.file)).toHaveLength(2);
      await expect(getMapRaster(whole.id, 'surface', fixture.file)).rejects.toMatchObject({
        status: 404,
      });
      expect(await deleteMapSnapshots({}, fixture.file)).toEqual({ deleted: 2 });
      expect(await listMapSnapshots('Adventure', fixture.file)).toHaveLength(0);
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });
});
