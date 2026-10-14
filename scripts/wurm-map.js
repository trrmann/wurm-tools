// Read-only reader for Wurm Unlimited map layers (verified on the Adventure world).
//
// *.map files: 1024-byte header, then size*size 4-byte records, row-major
// (index = y * size + x). Record bytes:
//   top_layer / rock_layer / map_cave: [type, data, heightHi, heightLo]
//     height = big-endian int16 in decimetres (/10 = metres); matches item Z (median error 0.05 m).
//   flags: last byte holds the flag bits (observed values 0/64/128/192).
//   resources: 0xFFFFFFFF = empty; other values are resource records (not decoded).
// protectedTiles.bmap: Java-serialized boolean[size][size]; every row holds `size` bytes.
// Which axis the outer array indexes has not been verified (the sample world has no protected tiles).
import fs from 'node:fs';
import { createRequire } from 'node:module';

// Tile ids -> { name, enum } extracted from the server's com.wurmonline.mesh.Tiles.
const TILE_TYPES = createRequire(import.meta.url)('./wurm-tiles.json');

export function tileTypeName(id) {
  return TILE_TYPES[id]?.name ?? null;
}

export function tileTypeEnum(id) {
  return TILE_TYPES[id]?.enum ?? null;
}

export const HEADER_BYTES = 1024;

export function mapSize(fileBytes) {
  const size = Math.round(Math.sqrt((fileBytes - HEADER_BYTES) / 4));
  return size * size * 4 + HEADER_BYTES === fileBytes ? size : null;
}

export function decodeTile(bytes) {
  return {
    type: bytes[0],
    data: bytes[1],
    height: (((bytes[2] << 8) | bytes[3]) << 16) >> 16,
  };
}

export function readRecord(file, x, y) {
  const size = mapSize(fs.statSync(file).size);
  if (!size) throw new Error('unrecognised map size');
  if (x < 0 || y < 0 || x >= size || y >= size) throw new RangeError('tile out of range');
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4, HEADER_BYTES + (y * size + x) * 4);
    return buf;
  } finally {
    fs.closeSync(fd);
  }
}

export function readTile(file, x, y) {
  const t = decodeTile(readRecord(file, x, y));
  return { ...t, height: t.height / 10 };
}

export function readFlags(file, x, y) {
  return readRecord(file, x, y)[3];
}

export function tileFromPosition(posX, posY) {
  return { x: Math.floor(posX / 4), y: Math.floor(posY / 4) };
}

// Returns { size, protectedCount, isProtected(a, b) } with a = outer index, b = inner index.
export function readProtectedTiles(file) {
  const d = fs.readFileSync(file);
  if (d.readUInt32BE(0) !== 0xaced0005) throw new Error('not a Java serialized stream');
  const first = d.indexOf(Buffer.from([0x75, 0x72, 0x00, 0x02, 0x5b, 0x5a]));
  const size = d.readUInt32BE(first - 4);
  const firstData = first + 23;
  const rowStart = (r) => (r === 0 ? firstData : firstData + size + (r - 1) * (size + 10) + 10);
  if (rowStart(size) - 10 !== d.length) throw new Error('unexpected protected tile layout');
  let protectedCount = 0;
  for (let r = 0; r < size; r++) {
    for (let i = 0; i < size; i++) if (d[rowStart(r) + i]) protectedCount++;
  }
  return { size, protectedCount, isProtected: (a, b) => d[rowStart(a) + b] !== 0 };
}

// Altitudes (metres, sea level = 0) for a tile corner across all layers, with names.
// waterDepth is positive when the surface is below sea level.
export function readAltitudes(dir, x, y) {
  const top = readTile(`${dir}/top_layer.map`, x, y);
  const rock = readTile(`${dir}/rock_layer.map`, x, y);
  const cave = readTile(`${dir}/map_cave.map`, x, y);
  return {
    surface: top.height,
    rock: rock.height,
    caveFloor: cave.height,
    soilDepth: Math.round((top.height - rock.height) * 10) / 10,
    waterDepth: top.height < 0 ? -top.height : 0,
    surfaceType: tileTypeName(top.type),
    caveType: tileTypeName(cave.type),
  };
}

const TILE_DATA = createRequire(import.meta.url)('./wurm-tile-data.json');

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
  return d === 0 ? null : { raw: d };
}

function readInt(file, x, y) {
  const b = readRecord(file, x, y);
  return (b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3] | 0;
}

/** Load one tile as a plain object combining every map layer. */
export function loadTile(dir, x, y) {
  const layer = (name) => {
    const t = readTile(`${dir}/${name}.map`, x, y);
    return {
      type: t.type,
      name: tileTypeName(t.type),
      tags: tileTags(t.type),
      height: t.height,
      data: decodeTileData(t.type, t.data),
    };
  };
  const out = {
    x,
    y,
    surface: layer('top_layer'),
    rock: layer('rock_layer'),
    cave: layer('map_cave'),
  };
  if (fs.existsSync(`${dir}/resources.map`)) {
    out.resources = decodeResources(readInt(`${dir}/resources.map`, x, y));
  }
  if (fs.existsSync(`${dir}/flags.map`)) {
    out.flags = decodeFlags(readInt(`${dir}/flags.map`, x, y));
  }
  return out;
}

/** Load a rectangular region as an array of tile objects (row-major). */
export function loadRegion(dir, x0, y0, w, h) {
  const tiles = [];
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) tiles.push(loadTile(dir, x, y));
  }
  return tiles;
}
