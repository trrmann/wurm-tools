import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import initSqlJs from 'sql.js';
import { httpError } from './wurm-db.js';
import {
  resolveLibraryReferences,
  copyLibraryDefinition,
  detachLibraryReference,
} from '../src/js/modules/objects/heroes/definition-library.mjs';

const OBJECT_KINDS = new Set([
  'object',
  'character',
  'player-character',
  'non-player-character',
  'base',
  'vehicle',
  'equipment',
  'animal',
  'plant',
  'automaton',
  'computer',
  'ai',
]);
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
        CREATE TABLE IF NOT EXISTS heroes_library (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          kind TEXT NOT NULL,
          definition_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
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

function libraryRows(db) {
  return queryRows(db, 'SELECT * FROM heroes_library ORDER BY name COLLATE NOCASE').map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind,
    definition: JSON.parse(row.definition_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

function validateReferences(value, entries) {
  try {
    const resolved = resolveLibraryReferences(value, entries);
    if (Buffer.byteLength(JSON.stringify(resolved), 'utf8') > 256 * 1024) {
      throw httpError(413, 'Resolved definition is too large');
    }
  } catch (error) {
    if (error.status) throw error;
    throw httpError(400, error.message);
  }
}

export function listHeroesLibrary(filePath = heroesDatabasePath()) {
  return withDatabase(filePath, false, libraryRows);
}

export function saveHeroesLibrary(data, id = null, filePath = heroesDatabasePath()) {
  const name = requireName(data?.name, 'saved definition name');
  if (!['shape', 'part', 'object'].includes(data?.kind))
    throw httpError(400, 'Invalid saved definition kind');
  if (!data.definition || typeof data.definition !== 'object' || Array.isArray(data.definition)) {
    throw httpError(400, 'Invalid saved definition');
  }
  const definition = { ...data.definition, name };
  if (data.kind === 'object') normalizeDefinition(definition);
  else if (typeof definition.anatomyType !== 'string')
    throw httpError(400, 'Anatomy type is required');
  return withDatabase(filePath, true, (db) => {
    const entries = libraryRows(db);
    const previous = id ? entries.find((entry) => entry.id === id) : null;
    if (id && !previous) throw httpError(404, 'Saved definition not found');
    if (previous && previous.kind !== data.kind)
      throw httpError(400, 'Cannot change saved definition kind');
    const now = new Date().toISOString();
    const entry = {
      id: id ?? randomUUID(),
      name,
      kind: data.kind,
      definition,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    };
    const next = [...entries.filter((item) => item.id !== entry.id), entry];
    for (const item of next) validateReferences(item.definition, next);
    for (const row of queryRows(db, 'SELECT definition_json FROM heroes_objects')) {
      validateReferences(JSON.parse(row.definition_json), next);
    }
    db.run(
      `INSERT OR REPLACE INTO heroes_library
      (id, name, kind, definition_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [entry.id, name, entry.kind, JSON.stringify(definition), entry.createdAt, now]
    );
    return entry;
  });
}

export function deleteHeroesLibrary(id, filePath = heroesDatabasePath()) {
  return withDatabase(filePath, true, (db) => {
    const entries = libraryRows(db);
    if (!entries.some((entry) => entry.id === id))
      throw httpError(404, 'Saved definition not found');
    for (const entry of entries.filter((entry) => entry.id !== id)) {
      const definition = detachLibraryReference(entry.definition, id, entries);
      db.run('UPDATE heroes_library SET definition_json = ?, updated_at = ? WHERE id = ?', [
        JSON.stringify(definition),
        new Date().toISOString(),
        entry.id,
      ]);
    }
    for (const row of queryRows(db, 'SELECT id, definition_json FROM heroes_objects')) {
      const definition = detachLibraryReference(JSON.parse(row.definition_json), id, entries);
      db.run('UPDATE heroes_objects SET definition_json = ? WHERE id = ?', [
        JSON.stringify(definition),
        row.id,
      ]);
    }
    db.run('DELETE FROM heroes_library WHERE id = ?', [id]);
    return { deleted: 1 };
  });
}

export function exportHeroesLibrary(filePath = heroesDatabasePath()) {
  return withDatabase(filePath, false, (db) => {
    const entries = libraryRows(db);
    return {
      format: 'wurm-tools-heroes-library',
      version: 1,
      entries: entries.map((entry) => ({
        ...entry,
        definition: copyLibraryDefinition(entry.definition, entries),
      })),
    };
  });
}

export function importHeroesLibrary(data, filePath = heroesDatabasePath()) {
  if (
    data?.format !== 'wurm-tools-heroes-library' ||
    data.version !== 1 ||
    !Array.isArray(data.entries) ||
    data.entries.length > MAX_IMPORTED_OBJECTS
  ) {
    throw httpError(400, 'Invalid saved-definition library export');
  }
  const now = new Date().toISOString();
  const entries = data.entries.map((item) => {
    if (!item || typeof item !== 'object') throw httpError(400, 'Invalid saved definition entry');
    const name = requireName(item.name, 'saved definition name');
    if (!['shape', 'part', 'object'].includes(item.kind))
      throw httpError(400, 'Invalid saved definition kind');
    validateReferences(item.definition, []);
    const definition = copyLibraryDefinition(item.definition);
    if (!definition || typeof definition !== 'object' || Array.isArray(definition))
      throw httpError(400, 'Invalid saved definition');
    if (item.kind === 'object') normalizeDefinition(definition);
    else if (typeof definition.anatomyType !== 'string')
      throw httpError(400, 'Anatomy type is required');
    validateReferences(definition, []);
    return {
      id: randomUUID(),
      name,
      kind: item.kind,
      definition: { ...definition, name },
      createdAt: now,
      updatedAt: now,
    };
  });
  return withDatabase(filePath, true, (db) => {
    for (const entry of entries) {
      db.run(
        'INSERT INTO heroes_library (id, name, kind, definition_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [entry.id, entry.name, entry.kind, JSON.stringify(entry.definition), now, now]
      );
    }
    return { imported: entries.length };
  });
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
    )
      .map(objectFromRow)
      .map((object) => ({
        ...object,
        definition: copyLibraryDefinition(object.definition, libraryRows(db)),
      }));
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
    for (const object of objects)
      validateReferences(JSON.parse(object.definitionJson), libraryRows(db));
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
    validateReferences(definition, libraryRows(db));
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
    validateReferences(definition, libraryRows(db));
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
      object: {
        name: object.name,
        kind: object.kind,
        definition: copyLibraryDefinition(object.definition, libraryRows(db)),
      },
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
    validateReferences(JSON.parse(definitionJson), libraryRows(db));
    db.run(
      'INSERT INTO heroes_objects (id, world_id, name, kind, definition_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, worldId, name, kind, definitionJson, createdAt]
    );
    return { id, worldId, name, kind, definition: JSON.parse(definitionJson), createdAt };
  });
}
