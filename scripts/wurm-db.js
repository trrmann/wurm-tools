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
  const table = tables.find((t) => /^players$/i.test(t));
  if (!table) return { table: null, columns: [], rows: [] };
  const wanted = ['WURMID', 'NAME', 'POWER', 'POSX', 'POSY', 'POSZ', 'SURFACED', 'KINGDOM'];
  const have = columnsOf(db, table);
  const cols = wanted.filter((w) => have.some((h) => h.toUpperCase() === w));
  const real = cols.map((w) => have.find((h) => h.toUpperCase() === w));
  const data = rows(
    db,
    `SELECT ${real.map((c) => `"${c}"`).join(', ')} FROM "${table}" LIMIT ${MAX_LIMIT}`
  );
  return { table, columns: real, rows: data };
}
