import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import initSqlJs from 'sql.js';
import {
  deleteMapSnapshots,
  getMapJob,
  getMapRaster,
  getMapTile,
  startMapSnapshot,
} from '../scripts/wurm-map-baseline.js';

import {
  applyMapEdits,
  getMapEditReport,
  getMapEditReportCsv,
  resetMapEdits,
} from '../scripts/wurm-map-edits.js';

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
          file.set([2, 0], offset);
          file.writeInt16BE(
            x === 0 && y === 0 ? -10 : x === 1 && y === 0 ? -30 : y * 10 + x,
            offset + 2
          );
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

describe('map baseline edits and work report', () => {
  it('tracks edits apart from the baseline and reports the differences', async () => {
    const fixture = await createFixture();
    try {
      const job = await startMapSnapshot(fixture.root, 'Adventure', undefined, {
        whole: true,
        filePath: fixture.file,
      });
      await waitForJob(job.id);
      const before = (await getMapRaster(job.id, 'surface', fixture.file)).pixels;

      const result = await applyMapEdits(
        job.id,
        { layer: 'surface', x0: 0, y0: 0, x1: 1, y1: 1, set: { type: 9 } },
        fixture.file
      );
      expect(result.changed).toBe(4);
      await expect(
        applyMapEdits(job.id, { layer: 'surface', x0: 9, y0: 9, set: { type: 1 } }, fixture.file)
      ).rejects.toMatchObject({ status: 400 });

      const baseline = (await getMapRaster(job.id, 'surface', fixture.file)).pixels;
      expect([...baseline]).toEqual([...before]);
      const edited = (await getMapRaster(job.id, 'surface', fixture.file, { edited: true })).pixels;
      expect(edited[0]).toBe(9);
      expect(edited[5]).toBe(9);
      expect(edited[15]).toBe(before[15]);
      expect(
        (await getMapTile(job.id, 0, 0, fixture.file, { edited: true })).tile.surface.type
      ).toBe(9);
      expect((await getMapTile(job.id, 0, 0, fixture.file)).tile.surface.type).toBe(before[0]);

      await applyMapEdits(
        job.id,
        { layer: 'flags', x0: 3, y0: 3, set: { value: 5 } },
        fixture.file
      );
      const report = await getMapEditReport(job.id, {}, fixture.file);
      expect(report.totalChanges).toBe(5);
      expect(report.byLayer.surface.tiles).toBe(4);
      expect(report.typeChanges[0]).toMatchObject({
        layer: 'surface',
        to: expect.any(String),
        tiles: 4,
      });
      await applyMapEdits(
        job.id,
        { layer: 'rock', x0: 2, y0: 2, set: { deltaDm: -5 } },
        fixture.file
      );
      const piled = await getMapEditReport(job.id, { rates: { 'rock shards': 2 } }, fixture.file);
      const shards = piled.materials.find((m) => m.material === 'rock shards');
      expect(shards).toMatchObject({ dugPiles: 2.5, raisedPiles: 0, netPiles: -2.5 });
      await applyMapEdits(
        job.id,
        { layer: 'rock', x0: 2, y0: 2, set: { deltaDm: 5 } },
        fixture.file
      );
      const csv = await getMapEditReportCsv(job.id, fixture.file);
      expect(csv.trim().split('\n')).toHaveLength(6);

      const revert = await applyMapEdits(
        job.id,
        { layer: 'surface', x0: 0, y0: 0, x1: 1, y1: 1, set: { type: before[0] } },
        fixture.file
      );
      expect(revert.reverted).toBeGreaterThan(0);
      expect(await resetMapEdits(job.id, { layer: 'flags' }, fixture.file)).toEqual({ removed: 1 });
      await deleteMapSnapshots({ id: job.id }, fixture.file);
      await expect(getMapEditReport(job.id, {}, fixture.file)).rejects.toMatchObject({
        status: 404,
      });
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  });
});
