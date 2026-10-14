import { Buffer } from 'node:buffer';
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  mapSize,
  decodeTile,
  readTile,
  readFlags,
  readProtectedTiles,
  tileFromPosition,
  decodeResources,
  decodeFlags,
  decodeTileData,
  loadTile,
} from '../scripts/wurm-map.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'map-'));

describe('wurm-map', () => {
  it('detects size and decodes tiles', () => {
    expect(mapSize(1024 + 4 * 4)).toBe(2);
    expect(mapSize(100)).toBeNull();
    expect(decodeTile([5, 7, 0xff, 0xf6])).toEqual({ type: 5, data: 7, height: -10 });
    expect(tileFromPosition(11, 7)).toEqual({ x: 2, y: 1 });
  });

  it('reads tiles and flags from a file', () => {
    const f = path.join(tmp(), 't.map');
    const b = Buffer.alloc(1024 + 16);
    Buffer.from([2, 9, 0x00, 0x14]).copy(b, 1024 + 12);
    fs.writeFileSync(f, b);
    expect(readTile(f, 1, 1)).toEqual({ type: 2, data: 9, height: 2 });
    expect(readFlags(f, 1, 1)).toBe(0x14);
    expect(() => readTile(f, 2, 0)).toThrow(RangeError);
  });

  it('parses a Java serialized boolean[][] protected tile file', () => {
    const size = 3;
    const len = Buffer.alloc(4);
    len.writeUInt32BE(size);
    const parts = [
      Buffer.from([0xac, 0xed, 0, 5, 0x75, 0x72, 0, 3, 0x5b, 0x5b, 0x5a]),
      Buffer.alloc(8),
      Buffer.from([2, 0, 0, 0x78, 0x70]),
      len,
      Buffer.from([0x75, 0x72, 0, 2, 0x5b, 0x5a]),
      Buffer.alloc(8),
      Buffer.from([2, 0, 0, 0x78, 0x70]),
      len,
      Buffer.from([0, 1, 0]),
    ];
    for (let r = 1; r < size; r++) {
      parts.push(
        Buffer.from([0x75, 0x71, 0, 0x7e, 0, 2]),
        len,
        Buffer.from([0, 0, r === 2 ? 1 : 0])
      );
    }
    const f = path.join(tmp(), 'p.bmap');
    fs.writeFileSync(f, Buffer.concat(parts));
    const p = readProtectedTiles(f);
    expect(p.size).toBe(3);
    expect(p.protectedCount).toBe(2);
    expect(p.isProtected(0, 1)).toBe(true);
    expect(p.isProtected(2, 2)).toBe(true);
    expect(p.isProtected(1, 1)).toBe(false);
  });
});

describe('tile names and altitudes', () => {
  it('names tile ids', async () => {
    const m = await import('../scripts/wurm-map.js');
    expect(m.tileTypeName(2)).toBe('Grass');
    expect(m.tileTypeEnum(4)).toBe('TILE_ROCK');
    expect(m.tileTypeName(999)).toBeNull();
  });

  it('decodes resources, flags, tile data and loads a tile', () => {
    expect(decodeResources(0xffffffff | 0)).toEqual({ cave: null, world: null });
    expect(decodeResources(0x11630000 | 0)).toEqual({ cave: 4451, world: 0 });
    expect(decodeFlags(0xffffffc0 | 0)).toMatchObject({
      botanizable: true,
      foragable: true,
      gatherable: false,
    });
    expect(decodeTileData(2, 0)).toMatchObject({ growth: 'SHORT', grassType: 'GRASS' });
    expect(decodeTileData(1, 0)).toBeNull();
    const dir = tmp();
    for (const n of ['top_layer', 'rock_layer', 'map_cave', 'resources', 'flags']) {
      const b = Buffer.alloc(1024 + 16);
      b.writeInt32BE(n === 'resources' ? -1 : n === 'flags' ? 0x80 : (2 << 24) | 50, 1024 + 4 * 3);
      fs.writeFileSync(path.join(dir, n + '.map'), b);
    }
    const t = loadTile(dir, 1, 1);
    expect(t.surface).toMatchObject({ name: 'Grass', height: 5 });
    expect(t.resources).toEqual({ cave: null, world: null });
    expect(t.flags.botanizable).toBe(true);
  });
});
