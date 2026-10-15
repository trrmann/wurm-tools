import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import initSqlJs from 'sql.js';
import { httpError } from './wurm-db.js';

const OBJECT_KINDS = new Set(['object', 'character', 'base', 'vehicle', 'equipment']);
export const HEROES_WORLD_EXPORT_FORMAT = 'wurm-tools-heroes-world';
export const HEROES_WORLD_EXPORT_VERSION = 1;
export const HEROES_OBJECT_EXPORT_FORMAT = 'wurm-tools-heroes-object';
export const HEROES_OBJECT_EXPORT_VERSION = 1;
const MAX_IMPORTED_OBJECTS = 1000;
let sqlPromise;
let operationQueue = Promise.resolve();

function getSql() {
  return (sqlPromise ??= initSqlJs());
}

export function heroesDatabasePath(
  env = process.env,
  platform = process.platform,
  home = os.homedir()
) {
  const pathApi = platform === 'win32' ? path.win32 : path.posix;
  if (env.WURM_HEROES_DB_PATH) return pathApi.resolve(env.WURM_HEROES_DB_PATH);
  const root =
    platform === 'win32'
      ? env.LOCALAPPDATA || pathApi.join(home, 'AppData', 'Local')
      : platform === 'darwin'
        ? pathApi.join(home, 'Library', 'Application Support')
        : env.XDG_DATA_HOME || pathApi.join(home, '.local', 'share');
  return pathApi.join(root, 'wurm-tools', 'heroes.db');
}

function queryRows(db, query, values = []) {
  const statement = db.prepare(query);
  try {
    statement.bind(values);
    const result = [];
    while (statement.step()) result.push(statement.getAsObject());
    return result;
  } finally {
    statement.free();
  }
}

async function withDatabase(filePath, write, action) {
  const operation = operationQueue.then(async () => {
    const SQL = await getSql();
    const db = fs.existsSync(filePath)
      ? new SQL.Database(fs.readFileSync(filePath))
      : new SQL.Database();
    try {
      db.run('PRAGMA foreign_keys = ON');
      db.run(`
        CREATE TABLE IF NOT EXISTS heroes_worlds (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS heroes_objects (
          id TEXT PRIMARY KEY,
          world_id TEXT NOT NULL,
          name TEXT NOT NULL,
          kind TEXT NOT NULL,
          definition_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (world_id) REFERENCES heroes_worlds(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS heroes_objects_world_id ON heroes_objects(world_id);
      `);
      const result = await action(db);
      if (write) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        const temp = `${filePath}.${process.pid}.tmp`;
        try {
          fs.writeFileSync(temp, Buffer.from(db.export()));
          fs.renameSync(temp, filePath);
        } catch (error) {
          try {
            fs.unlinkSync(temp);
          } catch (cleanupError) {
            if (cleanupError.code !== 'ENOENT') throw cleanupError;
          }
          throw error;
        }
      }
      return result;
    } finally {
      db.close();
    }
  });
  operationQueue = operation.catch(() => {});
  return operation;
}

function requireName(value, label) {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name || name.length > 120) throw httpError(400, `Invalid ${label}`);
  return name;
}

function worldFromRow(row) {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

function objectFromRow(row) {
  return {
    id: row.id,
    worldId: row.world_id,
    name: row.name,
    kind: row.kind,
    definition: JSON.parse(row.definition_json),
    createdAt: row.created_at,
  };
}

function normalizeDefinition(definition) {
  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
    throw httpError(400, 'Invalid object definition');
  }
  const name = requireName(definition.name, 'object name');
  const kind = typeof definition.kind === 'string' ? definition.kind : '';
  if (!OBJECT_KINDS.has(kind)) throw httpError(400, 'Invalid object kind');
  let definitionJson;
  try {
    definitionJson = JSON.stringify({ ...definition, name, kind });
  } catch {
    throw httpError(400, 'Object definition must be JSON serializable');
  }
  if (Buffer.byteLength(definitionJson, 'utf8') > 256 * 1024) {
    throw httpError(413, 'Object definition is too large');
  }
  return { name, kind, definitionJson };
}

export function listHeroesWorlds(filePath = heroesDatabasePath()) {
  return withDatabase(filePath, false, (db) =>
    queryRows(
      db,
      'SELECT id, name, created_at FROM heroes_worlds ORDER BY name COLLATE NOCASE'
    ).map(worldFromRow)
  );
}

export function createHeroesWorld(name, filePath = heroesDatabasePath()) {
  const normalizedName = requireName(name, 'world name');
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  return withDatabase(filePath, true, (db) => {
    db.run('INSERT INTO heroes_worlds (id, name, created_at) VALUES (?, ?, ?)', [
      id,
      normalizedName,
      createdAt,
    ]);
    return { id, name: normalizedName, createdAt };
  });
}

export function deleteHeroesWorld(id, filePath = heroesDatabasePath()) {
  if (!id) throw httpError(400, 'Invalid world id');
  return withDatabase(filePath, true, (db) => {
    const exists = queryRows(db, 'SELECT id FROM heroes_worlds WHERE id = ?', [id])[0];
    if (!exists) throw httpError(404, 'Heroes world not found');
    const objectsDeleted = queryRows(
      db,
      'SELECT COUNT(*) AS count FROM heroes_objects WHERE world_id = ?',
      [id]
    )[0].count;
    db.run('DELETE FROM heroes_worlds WHERE id = ?', [id]);
    return { deleted: 1, objectsDeleted };
  });
}

export function exportHeroesWorld(id, filePath = heroesDatabasePath()) {
  if (!id) throw httpError(400, 'Invalid world id');
  return withDatabase(filePath, false, (db) => {
    const worldRow = queryRows(db, 'SELECT id, name, created_at FROM heroes_worlds WHERE id = ?', [
      id,
    ])[0];
    if (!worldRow) throw httpError(404, 'Heroes world not found');
    const objects = queryRows(
      db,
      'SELECT id, world_id, name, kind, definition_json, created_at FROM heroes_objects WHERE world_id = ? ORDER BY name COLLATE NOCASE',
      [id]
    ).map(objectFromRow);
    return {
      format: HEROES_WORLD_EXPORT_FORMAT,
      version: HEROES_WORLD_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      world: worldFromRow(worldRow),
      objects,
    };
  });
}

export function importHeroesWorld(data, filePath = heroesDatabasePath()) {
  if (data?.format !== HEROES_WORLD_EXPORT_FORMAT) {
    throw httpError(400, 'Not a Wurm Tools Heroes world export');
  }
  if (data.version !== HEROES_WORLD_EXPORT_VERSION) {
    throw httpError(400, 'Unsupported Heroes world export version');
  }
  const name = requireName(data.world?.name, 'world name');
  if (!Array.isArray(data.objects) || data.objects.length > MAX_IMPORTED_OBJECTS) {
    throw httpError(400, 'Invalid Heroes world objects');
  }
  const objects = data.objects.map((object) => {
    const { name: objectName, kind, definitionJson } = normalizeDefinition(object.definition);
    if (object.name !== objectName || object.kind !== kind) {
      throw httpError(400, 'Heroes object metadata does not match its definition');
    }
    return { name: objectName, kind, definitionJson };
  });
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  return withDatabase(filePath, true, (db) => {
    db.run('BEGIN');
    try {
      db.run('INSERT INTO heroes_worlds (id, name, created_at) VALUES (?, ?, ?)', [
        id,
        name,
        createdAt,
      ]);
      for (const object of objects) {
        db.run(
          'INSERT INTO heroes_objects (id, world_id, name, kind, definition_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [randomUUID(), id, object.name, object.kind, object.definitionJson, createdAt]
        );
      }
      db.run('COMMIT');
    } catch (error) {
      db.run('ROLLBACK');
      throw error;
    }
    return { world: { id, name, createdAt }, objectCount: objects.length };
  });
}

export function listHeroesObjects(worldId, filePath = heroesDatabasePath()) {
  if (!worldId) throw httpError(400, 'Invalid world id');
  return withDatabase(filePath, false, (db) => {
    if (!queryRows(db, 'SELECT id FROM heroes_worlds WHERE id = ?', [worldId]).length) {
      throw httpError(404, 'Heroes world not found');
    }
    return queryRows(
      db,
      'SELECT id, world_id, name, kind, definition_json, created_at FROM heroes_objects WHERE world_id = ? ORDER BY name COLLATE NOCASE',
      [worldId]
    ).map(objectFromRow);
  });
}

export function createHeroesObject(worldId, definition, filePath = heroesDatabasePath()) {
  if (!worldId) throw httpError(400, 'Invalid world id');
  const { name, kind, definitionJson } = normalizeDefinition(definition);

  const id = randomUUID();
  const createdAt = new Date().toISOString();
  return withDatabase(filePath, true, (db) => {
    if (!queryRows(db, 'SELECT id FROM heroes_worlds WHERE id = ?', [worldId]).length) {
      throw httpError(404, 'Heroes world not found');
    }
    db.run(
      'INSERT INTO heroes_objects (id, world_id, name, kind, definition_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, worldId, name, kind, definitionJson, createdAt]
    );
    return { id, worldId, name, kind, definition: JSON.parse(definitionJson), createdAt };
  });
}

export function updateHeroesObject(id, definition, filePath = heroesDatabasePath()) {
  if (!id) throw httpError(400, 'Invalid object id');
  const { name, kind, definitionJson } = normalizeDefinition(definition);
  return withDatabase(filePath, true, (db) => {
    const existing = queryRows(db, 'SELECT world_id FROM heroes_objects WHERE id = ?', [id])[0];
    if (!existing) throw httpError(404, 'Heroes object not found');
    db.run('UPDATE heroes_objects SET name = ?, kind = ?, definition_json = ? WHERE id = ?', [
      name,
      kind,
      definitionJson,
      id,
    ]);
    return objectFromRow(
      queryRows(
        db,
        'SELECT id, world_id, name, kind, definition_json, created_at FROM heroes_objects WHERE id = ?',
        [id]
      )[0]
    );
  });
}

export function deleteHeroesObject(id, filePath = heroesDatabasePath()) {
  if (!id) throw httpError(400, 'Invalid object id');
  return withDatabase(filePath, true, (db) => {
    db.run('DELETE FROM heroes_objects WHERE id = ?', [id]);
    return { deleted: db.getRowsModified() };
  });
}

export function exportHeroesObject(id, filePath = heroesDatabasePath()) {
  if (!id) throw httpError(400, 'Invalid object id');
  return withDatabase(filePath, false, (db) => {
    const row = queryRows(
      db,
      'SELECT id, world_id, name, kind, definition_json, created_at FROM heroes_objects WHERE id = ?',
      [id]
    )[0];
    if (!row) throw httpError(404, 'Heroes object not found');
    const object = objectFromRow(row);
    return {
      format: HEROES_OBJECT_EXPORT_FORMAT,
      version: HEROES_OBJECT_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      object: { name: object.name, kind: object.kind, definition: object.definition },
    };
  });
}

export function importHeroesObject(worldId, data, filePath = heroesDatabasePath()) {
  if (!worldId) throw httpError(400, 'Invalid world id');
  if (data?.format !== HEROES_OBJECT_EXPORT_FORMAT) {
    throw httpError(400, 'Not a Wurm Tools Heroes object export');
  }
  if (data.version !== HEROES_OBJECT_EXPORT_VERSION) {
    throw httpError(400, 'Unsupported Heroes object export version');
  }
  const source = data.object;
  if (
    !source ||
    source.name !== source.definition?.name ||
    source.kind !== source.definition?.kind
  ) {
    throw httpError(400, 'Heroes object metadata does not match its definition');
  }
  const { name, kind, definitionJson } = normalizeDefinition(source.definition);
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  return withDatabase(filePath, true, (db) => {
    if (!queryRows(db, 'SELECT id FROM heroes_worlds WHERE id = ?', [worldId]).length) {
      throw httpError(404, 'Heroes world not found');
    }
    db.run(
      'INSERT INTO heroes_objects (id, world_id, name, kind, definition_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, worldId, name, kind, definitionJson, createdAt]
    );
    return { id, worldId, name, kind, definition: JSON.parse(definitionJson), createdAt };
  });
}
