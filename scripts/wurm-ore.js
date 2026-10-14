import tileTypes from './wurm-tiles.json' with { type: 'json' };
import { tileTypeName } from './wurm-tile-decode.js';

export const DENSITY_CELLS = 32;
const UNSET = 0xffff;

/**
 * Ores are the cave-layer wall tile types. The tile type says which ore a wall holds; the high
 * 16 bits of `resources.map` hold its quantity, and 0xFFFF means it has not been rolled yet.
 */
export function oreKind(typeId) {
  const name = tileTypes[typeId]?.enum ?? '';
  if (name.startsWith('TILE_CAVE_WALL_ORE_')) return 'metal';
  if (/^TILE_CAVE_WALL_(SLATE|MARBLE|SANDSTONE|ROCKSALT)$/.test(name)) return 'mineral';
  return null;
}

const MULT_HI = 0x5de;
const MULT_LO = 0xece66d;
const TWO24 = 0x1000000;
const MAX_QL = 100;

/** Java's `new Random(seed).nextInt(bound)` for a non-power-of-two bound and a non-negative seed. */
export function javaRandomNextInt(seed, bound) {
  let lo = (seed % TWO24) ^ MULT_LO;
  let hi = (Math.floor(seed / TWO24) % TWO24) ^ MULT_HI;
  for (;;) {
    const low = lo * MULT_LO + 0xb;
    const carry = Math.floor(low / TWO24);
    hi = (hi * MULT_LO + lo * MULT_HI + carry) % TWO24;
    lo = low % TWO24;
    const bits = hi * 128 + (lo >>> 17);
    const value = bits % bound;
    if (bits - value + (bound - 1) < 0x80000000) return value;
  }
}

/**
 * The server seeds a Random with (x + y * worldSize) * 789221 before rolling a wall's quality
 * ceiling as 20 + nextInt(80), capped at 100. The ore quality a miner gets is that ceiling or
 * lower depending on skill and tool. Needs the full world size; null when it is unknown.
 */
export function oreQualityCap(x, y, worldSize) {
  if (!worldSize) return null;
  return Math.min(MAX_QL, 20 + javaRandomNextInt((x + y * worldSize) * 789221, 80));
}

/** Scans the cave and resources layers (4 bytes per tile) and returns one summary per ore. */
export function summarizeOres(cave, resources, bounds, worldSize = null) {
  const { x0, y0, width, height } = bounds;
  const cell = Math.max(1, Math.ceil(Math.max(width, height) / DENSITY_CELLS));
  const columns = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const view = new DataView(resources.buffer, resources.byteOffset, resources.byteLength);
  const ores = new Map();
  for (let i = 0; i < width * height; i++) {
    const type = cave[i * 4];
    if (type < 200) continue;
    let ore = ores.get(type);
    if (!ore) {
      const kind = oreKind(type);
      if (!kind) continue;
      ore = {
        tileType: type,
        name: tileTypeName(type),
        kind,
        count: 0,
        rolled: 0,
        quantity: 0,
        qualityMin: null,
        qualityMax: null,
        qualitySum: 0,
        minX: Infinity,
        maxX: -Infinity,
        minY: Infinity,
        maxY: -Infinity,
        density: new Array(columns * rows).fill(0),
      };
      ores.set(type, ore);
    }
    const x = x0 + (i % width);
    const y = y0 + Math.floor(i / width);
    const amount = view.getUint32(i * 4) >>> 16;
    ore.count++;
    if (amount !== UNSET) {
      ore.rolled++;
      ore.quantity += amount;
    }
    const quality = oreQualityCap(x, y, worldSize);
    if (quality !== null) {
      ore.qualityMin = ore.qualityMin === null ? quality : Math.min(ore.qualityMin, quality);
      ore.qualityMax = ore.qualityMax === null ? quality : Math.max(ore.qualityMax, quality);
      ore.qualitySum += quality;
    }
    ore.minX = Math.min(ore.minX, x);
    ore.maxX = Math.max(ore.maxX, x);
    ore.minY = Math.min(ore.minY, y);
    ore.maxY = Math.max(ore.maxY, y);
    ore.density[Math.floor((y - y0) / cell) * columns + Math.floor((x - x0) / cell)]++;
  }
  return [...ores.values()]
    .sort((a, b) => a.tileType - b.tileType)
    .map((ore) => ({ ...ore, cellSize: cell, columns, rows }));
}

/** Lists the tiles of one ore type, up to `limit`, with their remaining quantity (null = unrolled). */
export function oreTiles(cave, resources, bounds, tileType, limit = 1000, worldSize = null) {
  const { x0, y0, width, height } = bounds;
  const view = new DataView(resources.buffer, resources.byteOffset, resources.byteLength);
  const tiles = [];
  for (let i = 0; i < width * height && tiles.length < limit; i++) {
    if (cave[i * 4] !== tileType) continue;
    const amount = view.getUint32(i * 4) >>> 16;
    const x = x0 + (i % width);
    const y = y0 + Math.floor(i / width);
    tiles.push({
      x,
      y,
      quantity: amount === UNSET ? null : amount,
      unrolled: amount === UNSET,
      qualityCap: oreQualityCap(x, y, worldSize),
    });
  }
  return tiles;
}

/** The ore under one tile (or null): type, quantity (null while unrolled) and quality ceiling. */
export function tileOre(caveType, resourcesInt, x, y, worldSize = null) {
  const kind = oreKind(caveType);
  if (!kind) return null;
  const amount = resourcesInt >>> 16;
  return {
    tileType: caveType,
    name: tileTypeName(caveType),
    kind,
    quantity: amount === UNSET ? null : amount,
    unrolled: amount === UNSET,
    qualityCap: oreQualityCap(x, y, worldSize),
  };
}
