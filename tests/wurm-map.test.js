import { Buffer } from 'node:buffer';
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { mapSize, decodeTile, readTile, tileFromPosition } from '../scripts/wurm-map.js';

describe('wurm-map', () => {
  it('detects size and decodes tiles', () => {
    expect(mapSize(1024 + 4 * 4)).toBe(2);
    expect(mapSize(100)).toBeNull();
    expect(decodeTile(((-2560 & 0xffff) << 16) | (5 >>> 0))).toEqual({ type: 5, height: -1 });
    expect(tileFromPosition(11, 7)).toEqual({ x: 2, y: 1 });
  });
  it('reads a tile from a file', () => {
    const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'map-')), 't.map');
    const b = Buffer.alloc(1024 + 16);
    b.writeUInt32LE((5120 << 16) | 2, 1024 + 12);
    fs.writeFileSync(f, b);
    expect(readTile(f, 1, 1)).toEqual({ type: 2, height: 2 });
    expect(() => readTile(f, 2, 0)).toThrow(RangeError);
  });
});
