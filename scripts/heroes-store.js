import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import initSqlJs from 'sql.js';
import {
  normalizeManagementRecord,
  validateManagementRelations,
} from '../src/js/modules/objects/heroes/campaign-management.mjs';
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

async function replaceDatabaseFile(temporary, destination) {
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.promises.rename(temporary, destination);
      return;
    } catch (error) {
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || attempt >= 6) throw error;
      await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
    }
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
        CREATE TABLE IF NOT EXISTS heroes_management (
          id TEXT PRIMARY KEY,
          kind TEXT NOT NULL,
          data_json TEXT NOT NULL
        );
      `);
      const result = await action(db);
      if (write) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        const temp = `${filePath}.${process.pid}.tmp`;
        try {
          fs.writeFileSync(temp, Buffer.from(db.export()));
          await replaceDatabaseFile(temp, filePath);
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
    const objectIds = new Set(
      queryRows(db, 'SELECT id FROM heroes_objects WHERE world_id = ?', [id]).map((row) => row.id)
    );
    for (const record of managementRows(db)) {
      if (record.data.worldId === id || objectIds.has(record.data.objectId)) {
        db.run('DELETE FROM heroes_management WHERE id = ?', [record.id]);
      }
    }
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
    validateManagementState(managementState(db));
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
    const deleted = db.getRowsModified();
    for (const record of managementRows(db).filter((item) => item.data.objectId === id)) {
      if (record.kind === 'note' && record.data.playerId) {
        record.data.objectId = '';
        writeManagementRecord(db, record);
      } else {
        db.run('DELETE FROM heroes_management WHERE id = ?', [record.id]);
      }
    }
    return { deleted };
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

function managementRows(db) {
  return queryRows(db, 'SELECT * FROM heroes_management ORDER BY rowid').map((row) => ({
    id: row.id,
    kind: row.kind,
    data: JSON.parse(row.data_json),
  }));
}

function managementState(db) {
  return {
    records: managementRows(db),
    worlds: queryRows(db, 'SELECT * FROM heroes_worlds ORDER BY name COLLATE NOCASE').map(
      worldFromRow
    ),
    objects: queryRows(db, 'SELECT * FROM heroes_objects ORDER BY name COLLATE NOCASE').map(
      objectFromRow
    ),
  };
}

function validateManagementState(state) {
  try {
    for (const record of state.records) normalizeManagementRecord(record.kind, record.data);
    validateManagementRelations(state.records, state.worlds, state.objects);
  } catch (error) {
    if (!(error instanceof TypeError || error instanceof RangeError)) throw error;
    throw httpError(400, error.message);
  }
}

function writeManagementRecord(db, record) {
  db.run('INSERT OR REPLACE INTO heroes_management (id, kind, data_json) VALUES (?, ?, ?)', [
    record.id,
    record.kind,
    JSON.stringify(record.data),
  ]);
}

export function listHeroesManagement(filePath = heroesDatabasePath()) {
  return withDatabase(filePath, false, managementState);
}

export function saveHeroesManagement(source, id = null, filePath = heroesDatabasePath()) {
  let data;
  try {
    data = normalizeManagementRecord(source?.kind, source?.data);
  } catch (error) {
    if (!(error instanceof TypeError || error instanceof RangeError)) throw error;
    throw httpError(400, error.message);
  }
  return withDatabase(filePath, true, (db) => {
    const state = managementState(db);
    const previous = state.records.find((record) => record.id === id);
    if (id && !previous) throw httpError(404, 'Management record not found');
    if (previous && previous.kind !== source.kind)
      throw httpError(400, 'Cannot change record kind');
    const record = { id: id ?? randomUUID(), kind: source.kind, data };
    state.records = [...state.records.filter((item) => item.id !== record.id), record];
    validateManagementState(state);
    writeManagementRecord(db, record);
    return record;
  });
}

export function deleteHeroesManagement(id, filePath = heroesDatabasePath()) {
  return withDatabase(filePath, true, (db) => {
    const state = managementState(db);
    if (!state.records.some((record) => record.id === id))
      throw httpError(404, 'Management record not found');
    state.records = state.records.filter((record) => record.id !== id);
    validateManagementState(state);
    db.run('DELETE FROM heroes_management WHERE id = ?', [id]);
    return { deleted: 1 };
  });
}

export function exportHeroesManagement(scope = {}, filePath = heroesDatabasePath()) {
  return withDatabase(filePath, false, (db) => {
    const state = managementState(db);
    validateManagementState(state);
    const { type = 'all', id = '' } = scope;
    if (!['all', 'profile', 'world', 'campaign', 'genre', 'record'].includes(type))
      throw httpError(400, 'Invalid collection scope');
    const profile = state.records.find((record) => record.kind === 'profile' && record.id === id);
    const campaign = state.records.find((record) => record.kind === 'campaign' && record.id === id);
    const selectedRecord = state.records.find((record) => record.id === id);
    if (
      (type === 'profile' && !profile) ||
      (type === 'campaign' && !campaign) ||
      (type === 'record' && !selectedRecord) ||
      (type === 'world' && !state.worlds.some((world) => world.id === id))
    ) {
      throw httpError(404, 'Collection not found');
    }
    if (type === 'genre' && !id.trim()) throw httpError(400, 'Select a genre');
    if (
      type === 'genre' &&
      !state.records.some((record) => record.data.genre === id || record.data.genres?.includes(id))
    ) {
      throw httpError(404, 'Genre collection not found');
    }
    const worldIds = new Set();
    const contextWorldIds = new Set();
    const objectIds = new Set();
    const campaignIds = new Set();
    const recordIds = new Set();
    for (const record of state.records) {
      const data = record.data;
      if (
        (type === 'profile' && record.kind === 'world' && data.gameMasterId === id) ||
        (type === 'genre' && record.kind === 'world' && data.genres.includes(id))
      )
        worldIds.add(data.worldId);
      if (type === 'profile' && record.kind === 'world' && data.playerIds.includes(id))
        contextWorldIds.add(data.worldId);
      if (
        (type === 'campaign' && record.id === id) ||
        (type === 'genre' && record.kind === 'campaign' && data.genre === id)
      )
        campaignIds.add(record.id);
      if (type === 'profile' && record.kind === 'character' && data.playerId === id)
        objectIds.add(data.objectId);
    }
    if (type === 'all') state.worlds.forEach((world) => worldIds.add(world.id));
    if (type === 'world') worldIds.add(id);
    if (type === 'record') {
      recordIds.add(id);
      if (selectedRecord.data.worldId) worldIds.add(selectedRecord.data.worldId);
      if (selectedRecord.data.objectId) objectIds.add(selectedRecord.data.objectId);
    }
    const objects = state.objects.filter(
      (object) =>
        worldIds.has(object.worldId) ||
        objectIds.has(object.id) ||
        state.records.some(
          (record) =>
            record.kind === 'character' &&
            record.data.objectId === object.id &&
            campaignIds.has(record.data.campaignId)
        )
    );
    objects.forEach((object) => objectIds.add(object.id));
    const includedWorlds = new Set([
      ...worldIds,
      ...contextWorldIds,
      ...objects.map((object) => object.worldId),
      ...state.records
        .filter((record) => campaignIds.has(record.id))
        .map((record) => record.data.worldId),
    ]);
    const records = state.records.filter(
      (record) =>
        type === 'all' ||
        recordIds.has(record.id) ||
        (record.kind === 'world' && includedWorlds.has(record.data.worldId)) ||
        (record.kind === 'campaign' &&
          (worldIds.has(record.data.worldId) || campaignIds.has(record.id))) ||
        (record.kind === 'character' && objectIds.has(record.data.objectId)) ||
        (record.kind === 'note' &&
          includedWorlds.has(record.data.worldId) &&
          (type !== 'profile' ||
            worldIds.has(record.data.worldId) ||
            record.data.playerId === id ||
            objectIds.has(record.data.objectId)) &&
          (!record.data.objectId || objectIds.has(record.data.objectId)))
    );
    const profileIds = new Set(type === 'profile' ? [id] : []);
    for (const { data } of records) {
      for (const key of ['gameMasterId', 'playerId']) if (data[key]) profileIds.add(data[key]);
      data.playerIds?.forEach((value) => profileIds.add(value));
    }
    state.records
      .filter(
        (record) =>
          record.kind === 'profile' && profileIds.has(record.id) && !records.includes(record)
      )
      .forEach((record) => records.push(record));
    // A character's campaign is a required dependency, even in a player-only collection.
    const requiredCampaigns = new Set(
      records
        .filter((record) => record.kind === 'character')
        .map((record) => record.data.campaignId)
    );
    state.records
      .filter((record) => requiredCampaigns.has(record.id) && !records.includes(record))
      .forEach((record) => records.push(record));
    const result = {
      format: 'heros-tools-management',
      version: 1,
      exportedAt: new Date().toISOString(),
      records,
      worlds: state.worlds.filter((world) => includedWorlds.has(world.id)),
      objects: objects.map((object) => ({
        ...object,
        definition: copyLibraryDefinition(object.definition, libraryRows(db)),
      })),
    };
    validateManagementState(result);
    if (['records', 'worlds', 'objects'].some((key) => result[key].length > MAX_IMPORTED_OBJECTS)) {
      throw httpError(
        413,
        'Collection exceeds 1000 records, worlds, or objects; export smaller scopes'
      );
    }
    if (Buffer.byteLength(JSON.stringify(result), 'utf8') > 64 * 1024 * 1024) {
      throw httpError(413, 'Collection exceeds 64 MB; export smaller scopes');
    }
    return result;
  });
}

export function importHeroesManagement(source, filePath = heroesDatabasePath()) {
  return withDatabase(filePath, true, (db) => {
    if (
      source?.format !== 'heros-tools-management' ||
      source.version !== 1 ||
      !['records', 'worlds', 'objects'].every(
        (key) => Array.isArray(source[key]) && source[key].length <= MAX_IMPORTED_OBJECTS
      )
    ) {
      throw httpError(400, 'Invalid Heros Tools management collection');
    }
    const ids = new Map();
    for (const item of [...source.worlds, ...source.objects, ...source.records]) {
      if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id))
        throw httpError(400, 'Missing or duplicate collection ID');
      ids.set(item.id, randomUUID());
    }
    const mapId = (id) => {
      if (!id) return '';
      if (!ids.has(id)) throw httpError(400, 'Collection contains a missing reference');
      return ids.get(id);
    };
    const now = new Date().toISOString();
    const worlds = source.worlds.map((world) => ({
      id: mapId(world.id),
      name: requireName(world.name, 'world name'),
      createdAt: now,
    }));
    const objects = source.objects.map((object) => {
      const normalized = normalizeDefinition(object.definition);
      if (normalized.name !== object.name || normalized.kind !== object.kind)
        throw httpError(400, 'Object metadata does not match definition');
      validateReferences(object.definition, []);
      return {
        id: mapId(object.id),
        worldId: mapId(object.worldId),
        name: normalized.name,
        kind: normalized.kind,
        definition: JSON.parse(normalized.definitionJson),
        createdAt: now,
      };
    });
    if (objects.some((object) => !worlds.some((world) => world.id === object.worldId)))
      throw httpError(400, 'Object world is missing');
    const records = source.records.map((record) => {
      let data;
      try {
        data = normalizeManagementRecord(record.kind, record.data);
      } catch (error) {
        if (!(error instanceof TypeError || error instanceof RangeError)) throw error;
        throw httpError(400, error.message);
      }
      for (const key of ['worldId', 'gameMasterId', 'playerId', 'objectId', 'campaignId'])
        if (key in data) data[key] = mapId(data[key]);
      if (data.playerIds) data.playerIds = data.playerIds.map(mapId);
      return { id: mapId(record.id), kind: record.kind, data };
    });
    validateManagementState({ records, worlds, objects });
    for (const world of worlds)
      db.run('INSERT INTO heroes_worlds (id, name, created_at) VALUES (?, ?, ?)', [
        world.id,
        world.name,
        now,
      ]);
    for (const object of objects)
      db.run(
        'INSERT INTO heroes_objects (id, world_id, name, kind, definition_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [
          object.id,
          object.worldId,
          object.name,
          object.kind,
          JSON.stringify(object.definition),
          now,
        ]
      );
    for (const record of records) writeManagementRecord(db, record);
    return { imported: records.length, worlds: worlds.length, objects: objects.length };
  });
}
