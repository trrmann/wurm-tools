import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import zlib from 'node:zlib';
import initSqlJs from 'sql.js';
import {
  caveCeiling,
  decodeFlags,
  decodeResources,
  decodeTileData,
  mapSize,
  readRegionRows,
  tileFromPosition,
  tileTags,
  tileTypeName,
} from './wurm-map.js';
import { httpError, listPlayers, openDb, safeName } from './wurm-db.js';
import { MapSnapshot, MapTile } from './wurm-map-model.js';

export const SNAPSHOT_RADIUS = 1000;
export const EXPORT_FORMAT = 'wurm-tools-map-baseline';
export const EXPORT_VERSION = 1;
const LAYER_NAMES = ['surface', 'rock', 'cave', 'resources', 'flags'];
const deflate = promisify(zlib.deflate);
const inflate = promisify(zlib.inflate);
const BATCH_YIELD_ROWS = 8;
const jobs = new Map();
let sqlPromise;

const getSql = () => (sqlPromise ??= initSqlJs());
const schedule = () => new Promise((resolve) => setImmediate(resolve));

export function baselineFilePath(
  env = process.env,
  platform = process.platform,
  home = os.homedir()
) {
  const pathApi = platform === 'win32' ? path.win32 : path.posix;
  if (env.WURM_MAP_BASELINE_PATH) return pathApi.resolve(env.WURM_MAP_BASELINE_PATH);
  const root =
    platform === 'win32'
      ? env.LOCALAPPDATA || pathApi.join(home, 'AppData', 'Local')
      : platform === 'darwin'
        ? pathApi.join(home, 'Library', 'Application Support')
        : env.XDG_DATA_HOME || pathApi.join(home, '.local', 'share');
  return pathApi.join(root, 'wurm-tools', 'map-baseline.db');
}

async function openBaseline(file) {
  const SQL = await getSql();
  const db = fs.existsSync(file) ? new SQL.Database(fs.readFileSync(file)) : new SQL.Database();
  db.run(`
    CREATE TABLE IF NOT EXISTS map_snapshots (
      id TEXT PRIMARY KEY,
      world TEXT NOT NULL,
      player_id INTEGER NOT NULL,
      player_name TEXT NOT NULL,
      center_x INTEGER NOT NULL,
      center_y INTEGER NOT NULL,
      radius INTEGER NOT NULL,
      x0 INTEGER NOT NULL,
      y0 INTEGER NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS map_snapshot_layers (
      snapshot_id TEXT NOT NULL,
      surface BLOB NOT NULL,
      rock BLOB NOT NULL,
      cave BLOB NOT NULL,
      resources BLOB NOT NULL,
      flags BLOB NOT NULL,
      PRIMARY KEY (snapshot_id),
      FOREIGN KEY (snapshot_id) REFERENCES map_snapshots(id) ON DELETE CASCADE
    );
  `);
  return db;
}

function persistBaseline(db, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temp, Buffer.from(db.export()));
    fs.renameSync(temp, file);
  } catch (err) {
    try {
      fs.unlinkSync(temp);
    } catch (cleanupError) {
      if (cleanupError.code !== 'ENOENT') throw cleanupError;
    }
    throw err;
  }
}

function integer(value, label) {
  if (value === undefined || value === null || value === '') {
    throw httpError(400, `Invalid ${label}`);
  }
  const n = Number(value);
  if (!Number.isSafeInteger(n)) throw httpError(400, `Invalid ${label}`);
  return n;
}

function dimension(value, label, max) {
  const n = integer(value, label);
  if (n < 1 || n > max) throw httpError(400, `Invalid ${label}`);
  return n;
}

export async function worldMapInfo(serverDir, world) {
  if (!safeName(world)) throw httpError(400, 'Invalid world name');
  const mapFile = path.join(serverDir, world, 'top_layer.map');
  if (!fs.existsSync(mapFile)) throw httpError(404, 'World map files not found');
  const size = mapSize(fs.statSync(mapFile).size);
  if (!size) throw httpError(422, 'World map has an unrecognised size');
  return { world, size };
}

// Region options: { whole: true } for the entire world, { width, height } for a custom
// player-centered region (kept at the requested size by shifting at world edges), or
// { radius } for the legacy square that is clipped at world edges.
function snapshotBounds(center, size, options) {
  if (options.whole) {
    return { bounds: { x0: 0, y0: 0, width: size, height: size }, radius: Math.floor(size / 2) };
  }
  if (options.width !== undefined || options.height !== undefined) {
    const width = dimension(options.width, 'width', size);
    const height = dimension(options.height, 'height', size);
    const x0 = Math.min(Math.max(0, center.x - Math.floor(width / 2)), size - width);
    const y0 = Math.min(Math.max(0, center.y - Math.floor(height / 2)), size - height);
    return {
      bounds: { x0, y0, width, height },
      radius: Math.max(Math.floor(width / 2), Math.floor(height / 2)),
    };
  }
  const radius = options.radius ?? SNAPSHOT_RADIUS;
  if (!Number.isSafeInteger(radius) || radius < 0) throw httpError(400, 'Invalid snapshot radius');
  const x0 = Math.max(0, center.x - radius);
  const y0 = Math.max(0, center.y - radius);
  return {
    bounds: {
      x0,
      y0,
      width: Math.min(size, center.x + radius + 1) - x0,
      height: Math.min(size, center.y + radius + 1) - y0,
    },
    radius,
  };
}

export async function startMapSnapshot(serverDir, world, playerId, options = {}) {
  const file = options.filePath ?? baselineFilePath();
  if (!safeName(world)) throw httpError(400, 'Invalid world name');
  if (
    options.radius !== undefined &&
    (!Number.isSafeInteger(options.radius) ||
      options.radius < 0 ||
      options.radius > SNAPSHOT_RADIUS)
  ) {
    throw httpError(400, 'Invalid snapshot radius');
  }
  if ([...jobs.values()].some((job) => job.status === 'running')) {
    throw httpError(409, 'A map baseline is already being created');
  }

  const id = randomUUID();
  const wholeWorld =
    options.whole && (playerId === undefined || playerId === null || playerId === '');
  const { size } = await worldMapInfo(serverDir, world);
  let player;
  let center;
  if (wholeWorld) {
    player = { WURMID: 0, NAME: 'Entire world' };
    center = { x: Math.floor(size / 2), y: Math.floor(size / 2) };
  } else {
    const targetPlayerId = integer(playerId, 'player id');
    const playerDb = await openDb(serverDir, world, 'wurmplayers.db');
    try {
      player = listPlayers(playerDb, 10_000).rows.find((row) => row.WURMID === targetPlayerId);
    } finally {
      playerDb.close();
    }
    if (!player) throw httpError(404, 'Player not found');
    if (!Number.isFinite(Number(player.POSX)) || !Number.isFinite(Number(player.POSY))) {
      throw httpError(422, 'Player has no saved map position');
    }
    center = tileFromPosition(Number(player.POSX), Number(player.POSY));
    if (center.x < 0 || center.y < 0 || center.x >= size || center.y >= size) {
      throw httpError(422, 'Player position is outside the world map');
    }
  }
  const { bounds, radius } = snapshotBounds(center, size, options);
  if (bounds.width < 1 || bounds.height < 1) {
    throw httpError(422, 'Player position is outside the world map');
  }
  const snapshot = new MapSnapshot({
    id,
    world,
    playerId: player.WURMID,
    playerName: player.NAME,
    centerX: center.x,
    centerY: center.y,
    radius,
    bounds,
    createdAt: new Date().toISOString(),
  });
  const job = { ...snapshot, status: 'running', processed: 0, total: bounds.width * bounds.height };
  jobs.set(id, job);

  void writeSnapshot(serverDir, snapshot, job, file).catch((err) => {
    job.status = 'failed';
    job.error = err.message;
  });
  return jobStatus(job);
}

function insertSnapshot(db, snapshot, records) {
  db.run(
    `INSERT INTO map_snapshots
     (id, world, player_id, player_name, center_x, center_y, radius, x0, y0, width, height, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      snapshot.id,
      snapshot.world,
      snapshot.playerId,
      snapshot.playerName,
      snapshot.centerX,
      snapshot.centerY,
      snapshot.radius,
      snapshot.bounds.x0,
      snapshot.bounds.y0,
      snapshot.bounds.width,
      snapshot.bounds.height,
      snapshot.createdAt,
    ]
  );
  db.run(
    `INSERT INTO map_snapshot_layers (snapshot_id, surface, rock, cave, resources, flags)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [snapshot.id, ...LAYER_NAMES.map((name) => records[name])]
  );
}

async function writeSnapshot(serverDir, snapshot, job, file) {
  const db = await openBaseline(file);
  let transaction = false;
  try {
    db.run('BEGIN');
    transaction = true;
    const bytesPerLayer = snapshot.bounds.width * snapshot.bounds.height * 4;
    const records = {
      surface: Buffer.allocUnsafe(bytesPerLayer),
      rock: Buffer.allocUnsafe(bytesPerLayer),
      cave: Buffer.allocUnsafe(bytesPerLayer),
      resources: Buffer.alloc(bytesPerLayer, 0xff),
      flags: Buffer.alloc(bytesPerLayer),
    };
    let rowNumber = 0;
    for (const row of readRegionRows(
      path.join(serverDir, snapshot.world),
      snapshot.bounds.x0,
      snapshot.bounds.y0,
      snapshot.bounds.width,
      snapshot.bounds.height
    )) {
      const destinationOffset = rowNumber * snapshot.bounds.width * 4;
      row.top_layer.copy(records.surface, destinationOffset);
      row.rock_layer.copy(records.rock, destinationOffset);
      row.map_cave.copy(records.cave, destinationOffset);
      row.resources.copy(records.resources, destinationOffset);
      row.flags.copy(records.flags, destinationOffset);
      job.processed = Math.min(job.total, job.processed + snapshot.bounds.width);
      rowNumber++;
      if (rowNumber % BATCH_YIELD_ROWS === 0) await schedule();
    }
    insertSnapshot(db, snapshot, records);
    db.run('COMMIT');
    transaction = false;
    persistBaseline(db, file);
    job.status = 'completed';
  } catch (err) {
    if (transaction) db.run('ROLLBACK');
    throw err;
  } finally {
    db.close();
  }
}

function jobStatus(job) {
  return {
    id: job.id,
    status: job.status,
    processed: job.processed,
    total: job.total,
    error: job.error,
    snapshot: new MapSnapshot(job),
  };
}

function readRows(db, query, params = []) {
  const statement = db.prepare(query);
  try {
    statement.bind(params);
    const out = [];
    while (statement.step()) out.push(statement.getAsObject());
    return out;
  } finally {
    statement.free();
  }
}

export function getMapJob(id) {
  const job = jobs.get(id);
  if (!job) throw httpError(404, 'Map baseline job not found');
  return jobStatus(job);
}

export async function listMapSnapshots(world, file = baselineFilePath()) {
  const db = await openBaseline(file);
  try {
    const rows = readRows(
      db,
      `SELECT id, world, player_id AS playerId, player_name AS playerName,
              center_x AS centerX, center_y AS centerY, radius, x0, y0, width, height,
              created_at AS createdAt
       FROM map_snapshots ${world ? 'WHERE world = ?' : ''}
       ORDER BY created_at DESC LIMIT 50`,
      world ? [world] : []
    );
    return rows.map(
      (row) =>
        new MapSnapshot({
          ...row,
          bounds: { x0: row.x0, y0: row.y0, width: row.width, height: row.height },
        })
    );
  } finally {
    db.close();
  }
}

export async function getMapSnapshot(id, file = baselineFilePath()) {
  const db = await openBaseline(file);
  try {
    const row = readRows(
      db,
      `SELECT id, world, player_id AS playerId, player_name AS playerName,
              center_x AS centerX, center_y AS centerY, radius, x0, y0, width, height,
              created_at AS createdAt
       FROM map_snapshots WHERE id = ?`,
      [id]
    )[0];
    if (!row) throw httpError(404, 'Map baseline not found');
    return new MapSnapshot({
      ...row,
      bounds: { x0: row.x0, y0: row.y0, width: row.width, height: row.height },
    });
  } finally {
    db.close();
  }
}

export async function getMapRaster(id, layer, file = baselineFilePath()) {
  const columns = {
    surface: 'surface',
    rock: 'rock',
    cave: 'cave',
    resources: 'resources',
    flags: 'flags',
  };
  const column = columns[layer];
  if (!column) throw httpError(400, 'Invalid map layer');
  const db = await openBaseline(file);
  try {
    const snapshotRow = readRows(
      db,
      `SELECT id, world, player_id AS playerId, player_name AS playerName,
              center_x AS centerX, center_y AS centerY, radius, x0, y0, width, height,
              created_at AS createdAt
       FROM map_snapshots WHERE id = ?`,
      [id]
    )[0];
    if (!snapshotRow) throw httpError(404, 'Map baseline not found');
    const snapshot = new MapSnapshot({
      ...snapshotRow,
      bounds: {
        x0: snapshotRow.x0,
        y0: snapshotRow.y0,
        width: snapshotRow.width,
        height: snapshotRow.height,
      },
    });
    const record = readRows(
      db,
      `SELECT ${column} AS bytes FROM map_snapshot_layers WHERE snapshot_id = ?`,
      [id]
    )[0]?.bytes;
    if (!record) throw new Error('Map baseline data is missing');
    const bytes = Buffer.from(record);
    const { width, height } = snapshot.bounds;
    if (bytes.length !== width * height * 4) throw new Error('Map baseline data is incomplete');
    const pixels = Buffer.alloc(width * height);
    for (let i = 0; i < pixels.length; i++) {
      const offset = i * 4;
      if (layer === 'resources') {
        const caveResource = bytes.readUInt16BE(offset);
        const worldResource = bytes.readUInt16BE(offset + 2);
        pixels[i] = caveResource === 0xffff && worldResource === 0xffff ? 0 : 1;
      } else if (layer === 'flags') {
        pixels[i] = bytes[offset + 3];
      } else {
        pixels[i] = bytes[offset];
      }
    }
    return { pixels, snapshot };
  } finally {
    db.close();
  }
}

function tileFromRow(row) {
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

export async function getMapTile(id, x, y, file = baselineFilePath()) {
  const tileX = integer(x, 'tile x');
  const tileY = integer(y, 'tile y');
  const db = await openBaseline(file);
  try {
    const snapshot = readRows(db, 'SELECT x0, y0, width, height FROM map_snapshots WHERE id = ?', [
      id,
    ])[0];
    if (!snapshot) throw httpError(404, 'Map baseline not found');
    const { x0, y0, width, height } = snapshot;
    if (tileX < x0 || tileY < y0 || tileX >= x0 + width || tileY >= y0 + height) {
      throw httpError(404, 'Tile is outside this map baseline');
    }
    const points = [
      [tileX, tileY],
      [tileX + 1, tileY],
      [tileX, tileY + 1],
      [tileX + 1, tileY + 1],
    ].filter(([pointX, pointY]) => pointX < x0 + width && pointY < y0 + height);
    const tiles = new Map();
    for (const [pointX, pointY] of points) {
      const byteOffset = ((pointY - y0) * width + (pointX - x0)) * 4 + 1;
      const records = readRows(
        db,
        `SELECT substr(surface, ?, 4) AS surface, substr(rock, ?, 4) AS rock,
                substr(cave, ?, 4) AS cave, substr(resources, ?, 4) AS resources,
                substr(flags, ?, 4) AS flags
         FROM map_snapshot_layers WHERE snapshot_id = ?`,
        [byteOffset, byteOffset, byteOffset, byteOffset, byteOffset, id]
      )[0];
      if (!records) throw new Error('Map baseline data is missing');
      const toRecord = (buffer) => {
        const bytes = Buffer.from(buffer);
        return {
          type: bytes[0],
          data: bytes[1],
          heightDm: bytes.readInt16BE(2),
        };
      };
      const resourceBytes = Buffer.from(records.resources);
      const flagBytes = Buffer.from(records.flags);
      const surface = toRecord(records.surface);
      const rock = toRecord(records.rock);
      const cave = toRecord(records.cave);
      const row = {
        x: pointX,
        y: pointY,
        surface_type: surface.type,
        surface_data: surface.data,
        surface_height_dm: surface.heightDm,
        rock_type: rock.type,
        rock_data: rock.data,
        rock_height_dm: rock.heightDm,
        cave_type: cave.type,
        cave_data: cave.data,
        cave_height_dm: cave.heightDm,
        resources: resourceBytes.readInt32BE(0),
        flags: flagBytes.readInt32BE(0),
      };
      tiles.set(`${pointX},${pointY}`, tileFromRow(row));
    }
    const tile = tiles.get(`${tileX},${tileY}`);
    const cornerAltitudes = tile.cornerAltitudes({
      east: tiles.get(`${tileX + 1},${tileY}`),
      south: tiles.get(`${tileX},${tileY + 1}`),
      southEast: tiles.get(`${tileX + 1},${tileY + 1}`),
    });
    return { tile, cornerAltitudes };
  } finally {
    db.close();
  }
}

export async function exportMapSnapshot(id, file = baselineFilePath()) {
  const snapshot = await getMapSnapshot(id, file);
  const db = await openBaseline(file);
  try {
    const record = readRows(db, 'SELECT * FROM map_snapshot_layers WHERE snapshot_id = ?', [id])[0];
    if (!record) throw new Error('Map baseline data is missing');
    const layers = {};
    for (const name of LAYER_NAMES) {
      layers[name] = (await deflate(Buffer.from(record[name]))).toString('base64');
    }
    return {
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      snapshot: { ...snapshot, bounds: { ...snapshot.bounds } },
      layers,
    };
  } finally {
    db.close();
  }
}

const isInt = (value) => Number.isSafeInteger(value);

export async function importMapSnapshot(data, file = baselineFilePath()) {
  if (data?.format !== EXPORT_FORMAT) throw httpError(400, 'Not a Wurm Tools map baseline export');
  if (data.version !== EXPORT_VERSION) throw httpError(400, 'Unsupported export version');
  const source = data.snapshot ?? {};
  const bounds = source.bounds ?? {};
  if (
    typeof source.world !== 'string' ||
    !safeName(source.world) ||
    typeof source.playerName !== 'string' ||
    ![source.playerId, source.centerX, source.centerY, bounds.x0, bounds.y0].every(isInt) ||
    !isInt(bounds.width) ||
    !isInt(bounds.height) ||
    bounds.width < 1 ||
    bounds.height < 1 ||
    bounds.x0 < 0 ||
    bounds.y0 < 0
  ) {
    throw httpError(400, 'Invalid baseline metadata');
  }
  const expected = bounds.width * bounds.height * 4;
  const records = {};
  for (const name of LAYER_NAMES) {
    if (typeof data.layers?.[name] !== 'string') throw httpError(400, `Missing ${name} layer`);
    try {
      records[name] = await inflate(Buffer.from(data.layers[name], 'base64'));
    } catch {
      throw httpError(400, `Corrupt ${name} layer`);
    }
    if (records[name].length !== expected) throw httpError(400, `Wrong size for ${name} layer`);
  }
  const snapshot = new MapSnapshot({
    id: randomUUID(),
    world: source.world,
    playerId: source.playerId,
    playerName: source.playerName,
    centerX: source.centerX,
    centerY: source.centerY,
    radius: isInt(source.radius) ? source.radius : 0,
    bounds: { x0: bounds.x0, y0: bounds.y0, width: bounds.width, height: bounds.height },
    createdAt: typeof source.createdAt === 'string' ? source.createdAt : new Date().toISOString(),
  });
  const db = await openBaseline(file);
  try {
    db.run('BEGIN');
    try {
      insertSnapshot(db, snapshot, records);
      db.run('COMMIT');
    } catch (err) {
      db.run('ROLLBACK');
      throw err;
    }
    persistBaseline(db, file);
  } finally {
    db.close();
  }
  return { snapshot };
}

// Removes only rows in the site's own baseline database; Wurm server files are untouched.
export async function deleteMapSnapshots({ id, world } = {}, file = baselineFilePath()) {
  if ([...jobs.values()].some((job) => job.status === 'running')) {
    throw httpError(409, 'A map baseline is being created');
  }
  const db = await openBaseline(file);
  try {
    const where = id ? 'WHERE id = ?' : world ? 'WHERE world = ?' : '';
    const params = id ? [id] : world ? [world] : [];
    const deleted = readRows(db, `SELECT COUNT(*) AS n FROM map_snapshots ${where}`, params)[0].n;
    if (id && !deleted) throw httpError(404, 'Map baseline not found');
    db.run(
      `DELETE FROM map_snapshot_layers WHERE snapshot_id IN (SELECT id FROM map_snapshots ${where})`,
      params
    );
    db.run(`DELETE FROM map_snapshots ${where}`, params);
    db.run('VACUUM');
    persistBaseline(db, file);
    for (const [key, job] of jobs) if (!id || key === id) jobs.delete(job.id);
    return { deleted };
  } finally {
    db.close();
  }
}
