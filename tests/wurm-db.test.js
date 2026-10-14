import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import os from 'node:os';
import path from 'node:path';
import initSqlJs from 'sql.js';
import {
  listWorlds,
  openDb,
  listTables,
  listPlayers,
  listSkills,
  listInventory,
  listCreatures,
  listCreatureSkills,
  listVillages,
  listStructurePieces,
  listGroundItems,
  browseTable,
  clampLimit,
  safeName,
} from '../scripts/wurm-db.js';
import { handleDb } from '../scripts/wurm-local.js';

let dir;
beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wurmdb-'));
  fs.mkdirSync(path.join(dir, 'Creative', 'sqlite'), { recursive: true });
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run('CREATE TABLE PLAYERS (WURMID INTEGER, NAME TEXT, POWER INTEGER, POSX REAL, POSY REAL)');
  db.run("INSERT INTO PLAYERS VALUES (1,'Alice',0,10.5,20.5),(2,'Bob',5,1,2)");
  fs.writeFileSync(
    path.join(dir, 'Creative', 'sqlite', 'wurmplayers.db'),
    Buffer.from(db.export())
  );
});
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('wurm-db', () => {
  it('lists worlds and tables', async () => {
    expect(listWorlds(dir)).toEqual([{ world: 'Creative', databases: ['wurmplayers.db'] }]);
    const db = await openDb(dir, 'Creative', 'wurmplayers.db');
    expect(listTables(db)[0].name).toBe('PLAYERS');
    db.close();
  });

  it('lists players and browses with search and paging', async () => {
    const db = await openDb(dir, 'Creative', 'wurmplayers.db');
    expect(listPlayers(db).rows).toHaveLength(2);
    const hit = browseTable(db, 'PLAYERS', { search: 'bob', limit: 1 });
    expect(hit.total).toBe(1);
    expect(hit.rows[0].NAME).toBe('Bob');
    expect(() => browseTable(db, 'X"; DROP TABLE PLAYERS;--')).toThrow(/Unknown table/);
    db.close();
  });

  it('joins live positions from a POSITION table when PLAYERS lacks them', async () => {
    const SQL = await initSqlJs();
    const mem = new SQL.Database();
    mem.run('CREATE TABLE PLAYERS (WURMID INTEGER, NAME TEXT)');
    mem.run('CREATE TABLE POSITION (WURMID INTEGER, POSX REAL, POSY REAL, POSZ REAL, LAYER INT)');
    mem.run("INSERT INTO PLAYERS VALUES (1,'Alice'),(2,'Bob')");
    mem.run('INSERT INTO POSITION VALUES (1, 3.5, 4.5, 1.25, 0)');
    const file = path.join(dir, 'Creative', 'sqlite', 'positions.db');
    fs.writeFileSync(file, Buffer.from(mem.export()));
    const db = await openDb(dir, 'Creative', 'positions.db');
    const result = listPlayers(db);
    expect(result.columns).toEqual(['WURMID', 'NAME', 'POSX', 'POSY', 'POSZ', 'LAYER']);
    expect(result.rows[0]).toMatchObject({ NAME: 'Alice', POSX: 3.5, LAYER: 0 });
    expect(result.rows[1].POSX).toBeNull();
    db.close();
  });

  it('joins skills and inventory by verified identifiers', async () => {
    const SQL = await initSqlJs();
    const m = new SQL.Database();
    m.run('CREATE TABLE SKILLS (OWNER INT, NUMBER INT, VALUE REAL, MINVALUE REAL, LASTUSED INT)');
    m.run('INSERT INTO SKILLS VALUES (1,2,30.5,1,0),(1,1,10,1,0),(2,1,99,1,0)');
    m.run(
      'CREATE TABLE ITEMS (WURMID INT, TEMPLATEID INT, NAME TEXT, QUALITYLEVEL REAL, PLACE INT, PARENTID INT)'
    );
    m.run("INSERT INTO ITEMS VALUES (5,1,'axe',50,0,77),(6,1,'pick',40,0,78)");
    const file = path.join(dir, 'Creative', 'sqlite', 'joined.db');
    fs.writeFileSync(file, Buffer.from(m.export()));
    const db = await openDb(dir, 'Creative', 'joined.db');
    expect(listSkills(db, '1').rows.map((r) => r.NUMBER)).toEqual([1, 2]);
    expect(listInventory(db, 77).rows).toHaveLength(1);
    expect(() => listSkills(db, 'x')).toThrow();
    db.close();
  });

  it('lists creatures and ground items by tile region', async () => {
    const SQL = await initSqlJs();
    const m = new SQL.Database();
    m.run(
      'CREATE TABLE CREATURES (WURMID INT, NAME TEXT, TEMPLATENAME TEXT, TEMPLATEID INT, SEX INT, KINGDOM INT, DEAD INT)'
    );
    m.run('CREATE TABLE POSITION (WURMID INT, POSX REAL, POSY REAL, POSZ REAL, LAYER INT)');
    m.run("INSERT INTO CREATURES VALUES (1,'a','Horse',64,0,0,0),(2,'b','Deer',10,0,0,0)");
    m.run('INSERT INTO POSITION VALUES (1,9.5,13,1,0),(2,400,400,1,-1)');
    m.run(
      'CREATE TABLE ITEMS (WURMID INT, TEMPLATEID INT, NAME TEXT, QUALITYLEVEL REAL, PARENTID INT, POSX REAL, POSY REAL, POSZ REAL)'
    );
    m.run("INSERT INTO ITEMS VALUES (5,1,'axe',50,-10,9.5,13,1),(6,1,'pick',40,77,9.5,13,1)");
    fs.writeFileSync(path.join(dir, 'Creative', 'sqlite', 'objs.db'), Buffer.from(m.export()));
    const db = await openDb(dir, 'Creative', 'objs.db');
    const near = listCreatures(db, { x: 2, y: 3, w: 1, h: 1 });
    expect(near.rows).toHaveLength(1);
    expect(near.rows[0]).toMatchObject({ TEMPLATENAME: 'Horse', TILEX: 2, TILEY: 3 });
    expect(listCreatures(db, {}).rows).toHaveLength(2);
    expect(listGroundItems(db, { x: 2, y: 3, w: 1, h: 1 }).rows.map((r) => r.NAME)).toEqual([
      'axe',
    ]);
    expect(() => listCreatures(db, { x: -1 })).toThrow();
    db.close();
  });

  it('lists creature skills, villages and structure pieces', async () => {
    const SQL = await initSqlJs();
    const m = new SQL.Database();
    m.run('CREATE TABLE SKILLS (OWNER INT, NUMBER INT, VALUE REAL, MINVALUE REAL, LASTUSED INT)');
    m.run('INSERT INTO SKILLS VALUES (1,2,5,1,0),(2,1,9,1,0)');
    m.run(
      'CREATE TABLE VILLAGES (ID INT, NAME TEXT, MAYOR TEXT, KINGDOM INT, STARTX INT, STARTY INT, ENDX INT, ENDY INT, SURFACED INT, PERIMETER INT, DISBANDED INT, TWITKEY TEXT)'
    );
    m.run("INSERT INTO VILLAGES VALUES (1,'V','m',1,5,5,9,9,1,5,0,'secret')");
    m.run(
      'CREATE TABLE WALLS (ID INT, STRUCTURE INT, TYPE INT, TILEX INT, TILEY INT, LAYER INT, WALLORIENTATION INT, CURRENTQL REAL)'
    );
    m.run('INSERT INTO WALLS VALUES (1,1,1,10,10,0,0,50),(2,1,1,500,500,1,0,50)');
    fs.writeFileSync(path.join(dir, 'Creative', 'sqlite', 'zones.db'), Buffer.from(m.export()));
    const db = await openDb(dir, 'Creative', 'zones.db');
    expect(listCreatureSkills(db, 1).rows).toHaveLength(1);
    const v = listVillages(db);
    expect(v.rows[0].NAME).toBe('V');
    expect(v.columns).not.toContain('TWITKEY');
    expect(listStructurePieces(db, 'walls', { x: 0, y: 0, w: 100, h: 100 }).rows).toHaveLength(1);
    expect(listStructurePieces(db, 'walls').rows).toHaveLength(2);
    expect(() => listStructurePieces(db, 'bogus')).toThrow();
    db.close();
  });

  it('writes a local SQLite file and reads the data back after reopening it', async () => {
    const file = path.join(dir, 'Creative', 'sqlite', 'roundtrip.db');
    const SQL = await initSqlJs();
    const created = new SQL.Database();
    created.run('CREATE TABLE roundtrip (id INTEGER PRIMARY KEY, value TEXT NOT NULL)');
    created.run('INSERT INTO roundtrip (value) VALUES (?)', ['fedora-sqlite-ok']);
    fs.writeFileSync(file, Buffer.from(created.export()));
    created.close();

    const reopened = await openDb(dir, 'Creative', 'roundtrip.db');
    try {
      const result = browseTable(reopened, 'roundtrip');
      expect(result.rows).toEqual([{ id: 1, value: 'fedora-sqlite-ok' }]);
    } finally {
      reopened.close();
    }
  });

  it('rejects unsafe names and clamps limits', async () => {
    expect(safeName('../x')).toBe(false);
    await expect(openDb(dir, '..', 'a.db')).rejects.toThrow(/Invalid/);
    expect(clampLimit('99999')).toBe(500);
    expect(clampLimit('abc')).toBe(50);
  });

  it('reports a clear 404 when no server is installed', async () => {
    const prev = process.env.WURM_SERVER_DIR;
    process.env.WURM_SERVER_DIR = path.join(dir, 'missing');
    await expect(handleDb(new URL('http://x/db/worlds'))).rejects.toMatchObject({ status: 404 });
    process.env.WURM_SERVER_DIR = dir;
    expect((await handleDb(new URL('http://x/db/worlds'))).worlds).toHaveLength(1);
    if (prev === undefined) delete process.env.WURM_SERVER_DIR;
    else process.env.WURM_SERVER_DIR = prev;
  });
});
