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
