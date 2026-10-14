import { describe, it, expect } from 'vitest';
import { Buffer } from 'node:buffer';
import {
  summarizeOres,
  oreTiles,
  javaRandomNextInt,
  oreQualityCap,
  tileOre,
} from '../scripts/wurm-ore.js';

describe('ore decoding', () => {
  const bounds = { x0: 10, y0: 20, width: 2, height: 2 };
  const cave = Buffer.alloc(16);
  cave[0] = 222;
  cave[4] = 222;
  cave[8] = 202;
  cave[12] = 229;
  const resources = Buffer.alloc(16, 0xff);
  resources.writeUInt32BE(0x00640000, 0);

  it('summarizes ores with rolled and unrolled quantities', () => {
    const ores = summarizeOres(cave, resources, bounds);
    expect(ores.map((o) => [o.tileType, o.kind, o.count])).toEqual([
      [222, 'metal', 2],
      [229, 'mineral', 1],
    ]);
    expect(ores[0]).toMatchObject({ rolled: 1, quantity: 100, minX: 10, maxX: 11, minY: 20 });
  });

  it('lists tiles with null for unrolled quantity', () => {
    expect(oreTiles(cave, resources, bounds, 222)).toEqual([
      { x: 10, y: 20, quantity: 100, unrolled: false, qualityCap: null },
      { x: 11, y: 20, quantity: null, unrolled: true, qualityCap: null },
    ]);
  });

  it('matches Java Random.nextInt(80) for known seeds', () => {
    const seeds = [0, 1, 42, 789221 * 5, (3 + 7 * 2048) * 789221, (2047 + 2047 * 2048) * 789221];
    expect(seeds.map((seed) => javaRandomNextInt(seed, 80))).toEqual([0, 25, 10, 53, 29, 79]);
  });

  it('derives a quality ceiling from the world size', () => {
    expect(oreQualityCap(3, 7, 2048)).toBe(49);
    expect(oreQualityCap(3, 7, null)).toBeNull();
    const ores = summarizeOres(cave, resources, bounds, 2048);
    expect(ores[0].qualityMin).toBeGreaterThanOrEqual(20);
    expect(ores[0].qualityMax).toBeLessThanOrEqual(99);
    expect(tileOre(222, 0xffff0000, 10, 20, 2048)).toMatchObject({
      unrolled: true,
      quantity: null,
    });
    expect(tileOre(5, 0, 0, 0, 2048)).toBeNull();
  });
});
