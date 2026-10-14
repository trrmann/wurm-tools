// Read-only access to a Wurm Unlimited server's SQLite databases via sql.js (pure WASM).
// Databases are loaded into memory from a copy of the file bytes, so the live files are never written.
// Table and column names are always validated against the real schema before use in SQL.
import fs from 'node:fs';
import path from 'node:path';
import initSqlJs from 'sql.js';

const SAFE_NAME = /^[\w .-]+$/;
const MAX_DB_BYTES = 512 * 1024 * 1024;
const MAX_LIMIT = 500;

let sqlPromise;
const getSql = () => (sqlPromise ??= initSqlJs());

export function safeName(name) {
  return typeof name === 'string' && SAFE_NAME.test(name) && !name.includes('..');
}

// Worlds are server subfolders that contain a "sqlite" directory.
export function listWorlds(serverDir) {
  if (!serverDir || !fs.existsSync(serverDir)) return [];
  return fs
    .readdirSync(serverDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(serverDir, d.name, 'sqlite')))
    .map((d) => {
      const dbs = fs
        .readdirSync(path.join(serverDir, d.name, 'sqlite'))
        .filter((f) => f.toLowerCase().endsWith('.db'));
      return { world: d.name, databases: dbs };
    });
}

export async function openDb(serverDir, world, dbFile) {
  if (!safeName(world) || !safeName(dbFile)) throw httpError(400, 'Invalid world or database name');
  const file = path.join(serverDir, world, 'sqlite', dbFile);
  if (!fs.existsSync(file)) throw httpError(404, 'Database not found');
  if (fs.statSync(file).size > MAX_DB_BYTES) throw httpError(413, 'Database too large to load');
  const SQL = await getSql();
  return new SQL.Database(fs.readFileSync(file));
}

export function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function rows(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const out = [];
  while (stmt.step()) out.push(stmt.getAsObject());
  stmt.free();
  return out;
}

export function listTables(db) {
  return rows(db, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").map((r) => ({
    name: r.name,
    columns: columnsOf(db, r.name),
  }));
}

export function columnsOf(db, table) {
  return rows(db, `PRAGMA table_info("${table.replace(/"/g, '""')}")`).map((c) => c.name);
}

function resolveTable(db, name) {
  const found = rows(db, "SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [
    name,
  ])[0];
  if (!found) throw httpError(404, `Unknown table: ${name}`);
  return found.name;
}

export function clampLimit(value) {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? 50 : Math.min(Math.max(n, 1), MAX_LIMIT);
}

// Browses a table with paging and an optional case-insensitive text search over all columns.
export function browseTable(db, tableName, { limit, offset, search } = {}) {
  const table = resolveTable(db, tableName);
  const cols = columnsOf(db, table);
  const lim = clampLimit(limit);
  const off = Math.max(Number.parseInt(offset, 10) || 0, 0);
  const quoted = `"${table.replace(/"/g, '""')}"`;
  let where = '';
  const params = [];
  if (search) {
    where =
      ' WHERE ' + cols.map((c) => `CAST("${c.replace(/"/g, '""')}" AS TEXT) LIKE ?`).join(' OR ');
    cols.forEach(() => params.push(`%${search}%`));
  }
  const total = rows(db, `SELECT COUNT(*) AS n FROM ${quoted}${where}`, params)[0].n;
  const data = rows(db, `SELECT * FROM ${quoted}${where} LIMIT ? OFFSET ?`, [...params, lim, off]);
  return { table, columns: cols, total, limit: lim, offset: off, rows: data };
}

// Best-effort player list: picks the first table that looks like a players table and returns
// whichever of the well-known columns exist. Schema is discovered, not assumed.
export function listPlayers(db) {
  const tables = rows(db, "SELECT name FROM sqlite_master WHERE type='table'").map((t) => t.name);
  const find = (re) => tables.find((t) => re.test(t));
  const table = find(/^players$/i);
  if (!table) return { table: null, columns: [], rows: [] };
  const have = columnsOf(db, table);
  const pick = (cols, source) =>
    cols.map((w) => source.find((h) => h.toUpperCase() === w)).filter(Boolean);
  const own = pick(
    ['WURMID', 'NAME', 'POWER', 'POSX', 'POSY', 'POSZ', 'SURFACED', 'KINGDOM'],
    have
  );
  const select = own.map((c) => `p."${c}"`);
  let join = '';
  // Live coordinates are stored in a separate POSITION table keyed by WURMID.
  const posTable = find(/^position$/i);
  if (posTable && own.some((c) => c.toUpperCase() === 'WURMID')) {
    const posCols = columnsOf(db, posTable);
    const idCol = own.find((c) => c.toUpperCase() === 'WURMID');
    const joinId = posCols.find((c) => c.toUpperCase() === 'WURMID');
    const extra = pick(['POSX', 'POSY', 'POSZ', 'LAYER', 'ZONEID'], posCols).filter(
      (c) => !own.some((o) => o.toUpperCase() === c.toUpperCase())
    );
    if (joinId && extra.length) {
      join = ` LEFT JOIN "${posTable}" pos ON pos."${joinId}" = p."${idCol}"`;
      select.push(...extra.map((c) => `pos."${c}"`));
      own.push(...extra);
    }
  }
  const data = rows(db, `SELECT ${select.join(', ')} FROM "${table}" p${join} LIMIT ${MAX_LIMIT}`);
  return { table, columns: own, rows: data };
}

function toId(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n)) throw httpError(400, 'Invalid id');
  return n;
}

// SKILLS.OWNER is the player's WURMID (wurmplayers.db). NUMBER is the game's
// skill id; names live in the server jar, so the id is returned as-is.
export function listSkills(db, wurmId) {
  const tables = rows(db, "SELECT name FROM sqlite_master WHERE type='table'").map((t) => t.name);
  if (!tables.includes('SKILLS')) return { columns: [], rows: [] };
  const data = rows(
    db,
    'SELECT NUMBER, VALUE, MINVALUE, LASTUSED FROM SKILLS WHERE OWNER = ? ORDER BY NUMBER LIMIT ?',
    [toId(wurmId), MAX_LIMIT]
  );
  return { columns: ['NUMBER', 'VALUE', 'MINVALUE', 'LASTUSED'], rows: data };
}

// ITEMS.PARENTID equals the player's PLAYERS.INVENTORYID (wurmitems.db).
export function listInventory(db, inventoryId) {
  const tables = rows(db, "SELECT name FROM sqlite_master WHERE type='table'").map((t) => t.name);
  if (!tables.includes('ITEMS')) return { columns: [], rows: [] };
  const columns = ['WURMID', 'TEMPLATEID', 'NAME', 'QUALITYLEVEL', 'PLACE'];
  const data = rows(
    db,
    `SELECT ${columns.join(', ')} FROM ITEMS WHERE PARENTID = ? ORDER BY NAME LIMIT ?`,
    [toId(inventoryId), MAX_LIMIT]
  );
  return { columns, rows: data };
}

// World coordinates (POSX/POSY) are in metres; one tile is 4 m, so tile = floor(pos / 4).
export const TILE_METRES = 4;

function tileRegion(q = {}) {
  const num = (v, d) => (v === undefined || v === null || v === '' ? d : Number(v));
  const x = num(q.x, 0);
  const y = num(q.y, 0);
  const w = num(q.w, 2048);
  const h = num(q.h, 2048);
  for (const n of [x, y, w, h])
    if (!Number.isSafeInteger(n) || n < 0) throw httpError(400, 'Invalid region');
  return {
    x0: x * TILE_METRES,
    y0: y * TILE_METRES,
    x1: (x + w) * TILE_METRES,
    y1: (y + h) * TILE_METRES,
  };
}

const hasTable = (db, name) =>
  rows(db, "SELECT name FROM sqlite_master WHERE type='table'").some((t) => t.name === name);

// wurmcreatures.db: CREATURES.WURMID = POSITION.WURMID. LAYER 0 is the surface, -1 the caves.
export function listCreatures(db, query) {
  const columns = [
    'WURMID',
    'NAME',
    'TEMPLATENAME',
    'TEMPLATEID',
    'SEX',
    'KINGDOM',
    'DEAD',
    'LAYER',
    'TILEX',
    'TILEY',
    'POSZ',
  ];
  if (!hasTable(db, 'CREATURES') || !hasTable(db, 'POSITION')) return { columns, rows: [] };
  const r = tileRegion(query);
  const data = rows(
    db,
    `SELECT c.WURMID, c.NAME, c.TEMPLATENAME, c.TEMPLATEID, c.SEX, c.KINGDOM, c.DEAD, p.LAYER,
            CAST(p.POSX / ${TILE_METRES} AS INTEGER) AS TILEX, CAST(p.POSY / ${TILE_METRES} AS INTEGER) AS TILEY, p.POSZ
     FROM CREATURES c JOIN POSITION p ON p.WURMID = c.WURMID
     WHERE p.POSX >= ? AND p.POSX < ? AND p.POSY >= ? AND p.POSY < ? LIMIT ?`,
    [r.x0, r.x1, r.y0, r.y1, MAX_LIMIT]
  );
  return { columns, rows: data };
}

// wurmitems.db: items lying on the ground have PARENTID = -10 and their own POSX/POSY/POSZ.
// ITEMS has no layer column, so POSZ and ZONEID are returned for callers to interpret.
export function listGroundItems(db, query) {
  const columns = ['WURMID', 'TEMPLATEID', 'NAME', 'QUALITYLEVEL', 'TILEX', 'TILEY', 'POSZ'];
  if (!hasTable(db, 'ITEMS')) return { columns, rows: [] };
  const r = tileRegion(query);
  const data = rows(
    db,
    `SELECT WURMID, TEMPLATEID, NAME, QUALITYLEVEL,
            CAST(POSX / ${TILE_METRES} AS INTEGER) AS TILEX, CAST(POSY / ${TILE_METRES} AS INTEGER) AS TILEY, POSZ
     FROM ITEMS WHERE PARENTID = -10 AND POSX >= ? AND POSX < ? AND POSY >= ? AND POSY < ? LIMIT ?`,
    [r.x0, r.x1, r.y0, r.y1, MAX_LIMIT]
  );
  return { columns, rows: data };
}
