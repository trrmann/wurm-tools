import TILE_TYPES from './wurm-tiles.json' with { type: 'json' };
import TILE_DATA from './wurm-tile-data.json' with { type: 'json' };
import { MapTile } from './wurm-map-model.js';

export function tileTypeName(id) {
  return TILE_TYPES[id]?.name ?? null;
}

export function tileTags(id) {
  return TILE_TAGS_CACHE[id] ?? [];
}
const TILE_TAGS_CACHE = Object.fromEntries(
  Object.entries(TILE_TYPES).map(([k, v]) => [k, v.tags ?? []])
);

/** resources.map: high 16 bits = cave (ore) resource, low 16 = world resource; 0xFFFF = none. */
export function decodeResources(int32) {
  const cave = (int32 >>> 16) & 0xffff;
  const world = int32 & 0xffff;
  return {
    cave: cave === 0xffff ? null : cave,
    world: world === 0xffff ? null : world,
  };
}

/** flags.map: byte 3 holds the surface client flags (botanizable/foragable/gatherable). */
export function decodeFlags(int32) {
  return {
    raw: int32 >>> 0,
    botanizable: (int32 & 0x80) !== 0,
    foragable: (int32 & 0x40) !== 0,
    gatherable: (int32 & 0x20) !== 0,
  };
}

/** Decode the tile data byte according to the tile's tags. */
export function decodeTileData(typeId, data) {
  const tags = tileTags(typeId);
  const d = data & 0xff;
  if (tags.includes('tree') || tags.includes('bush')) {
    return {
      age: TILE_DATA.foliageAge[d],
      growth: TILE_DATA.treeGrowth[d],
    };
  }
  if (tags.includes('grass')) {
    return {
      growth: TILE_DATA.grassGrowth[d],
      grassType: TILE_DATA.grassType[d],
      flower: TILE_DATA.flower[d] || null,
    };
  }
  // Observed on Clay, Tar and Mycelium: same layout as grass (growth in the top bits).
  if (GRASS_LIKE.has(typeId) && d !== 0) {
    return {
      growth: TILE_DATA.grassGrowth[d],
      grassType: TILE_DATA.grassType[d],
      flower: TILE_DATA.flower[d] || null,
    };
  }
  return d === 0 ? null : { raw: d };
}

const GRASS_LIKE = new Set([6, 10, 24, 40]);

/** map_cave: the data byte is the ceiling height above the floor in decimetres (0 = none). */
export function caveCeiling(floorHeight, data) {
  return data > 0 ? Math.round((floorHeight + data / 10) * 10) / 10 : null;
}

export function tileFromRow(row) {
  const layer = (prefix) => {
    const type = row[`${prefix}_type`];
    const dataByte = row[`${prefix}_data`];
    const heightDm = row[`${prefix}_height_dm`];
    return {
      type,
      name: tileTypeName(type),
      tags: tileTags(type),
      dataByte,
      heightDm,
      data: decodeTileData(type, dataByte),
      ...(prefix === 'cave'
        ? { ceilingDm: caveCeiling(heightDm / 10, dataByte) === null ? null : heightDm + dataByte }
        : {}),
    };
  };
  return new MapTile({
    x: row.x,
    y: row.y,
    surface: layer('surface'),
    rock: layer('rock'),
    cave: layer('cave'),
    resources: decodeResources(row.resources),
    flags: decodeFlags(row.flags),
  });
}

/** Builds a tile and its corner altitudes from raw 4-byte-per-tile layer arrays. */
export function tileFromLayers(layers, bounds, tileX, tileY) {
  const { x0, y0, width, height } = bounds;
  if (tileX < x0 || tileY < y0 || tileX >= x0 + width || tileY >= y0 + height) {
    throw new Error('Tile is outside this map baseline');
  }
  const build = (x, y) => {
    const offset = ((y - y0) * width + (x - x0)) * 4;
    const read = (bytes) => new DataView(bytes.buffer, bytes.byteOffset + offset, 4);
    const record = (bytes) => {
      const view = read(bytes);
      return { type: view.getUint8(0), data: view.getUint8(1), heightDm: view.getInt16(2) };
    };
    const surface = record(layers.surface);
    const rock = record(layers.rock);
    const cave = record(layers.cave);
    return tileFromRow({
      x,
      y,
      surface_type: surface.type,
      surface_data: surface.data,
      surface_height_dm: surface.heightDm,
      rock_type: rock.type,
      rock_data: rock.data,
      rock_height_dm: rock.heightDm,
      cave_type: cave.type,
      cave_data: cave.data,
      cave_height_dm: cave.heightDm,
      resources: read(layers.resources).getInt32(0),
      flags: read(layers.flags).getInt32(0),
    });
  };
  const inside = (x, y) => x < x0 + width && y < y0 + height;
  const tile = build(tileX, tileY);
  const neighbor = (x, y) => (inside(x, y) ? build(x, y) : undefined);
  return {
    tile,
    cornerAltitudes: tile.cornerAltitudes({
      east: neighbor(tileX + 1, tileY),
      south: neighbor(tileX, tileY + 1),
      southEast: neighbor(tileX + 1, tileY + 1),
    }),
  };
}

/** Collapses a 4-byte-per-tile layer into one byte per tile for drawing. */
export function layerPixels(bytes, layer) {
  const pixels = new Uint8Array(bytes.length / 4);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
  for (let i = 0; i < pixels.length; i++) {
    const offset = i * 4;
    if (layer === 'resources') {
      pixels[i] =
        view.getUint16(offset) === 0xffff && view.getUint16(offset + 2) === 0xffff ? 0 : 1;
    } else if (layer === 'flags') {
      pixels[i] = bytes[offset + 3];
    } else {
      pixels[i] = bytes[offset];
    }
  }
  return pixels;
}
