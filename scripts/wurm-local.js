// Local helper for the Server Status page: detects a Wurm Unlimited dedicated server / client
// installed through Steam, reports whether each is running, and can launch them.
// Binds to 127.0.0.1 only and accepts requests only from allowed origins.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile, fork, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  authFilePath,
  ensurePairingCode,
  isPairedToken,
  pairBrowser,
  revokeAllPairedTokens,
  revokePairedToken,
  rotatePairingCode,
} from './wurm-helper-auth.js';

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
  httpError,
} from './wurm-db.js';
import {
  deleteMapSnapshots,
  exportMapSnapshot,
  getMapJob,
  getMapRaster,
  getMapTile,
  getMapOres,
  importMapSnapshot,
  listMapSnapshots,
  startMapSnapshot,
  worldMapInfo,
} from './wurm-map-baseline.js';
import {
  applyMapEdits,
  getMapEditReport,
  getMapEditReportCsv,
  resetMapEdits,
} from './wurm-map-edits.js';
import {
  createHeroesObject,
  createHeroesWorld,
  deleteHeroesWorld,
  deleteHeroesObject,
  exportHeroesWorld,
  exportHeroesObject,
  importHeroesWorld,
  importHeroesObject,
  heroesDatabasePath,
  listHeroesObjects,
  listHeroesWorlds,
  updateHeroesObject,
} from './heroes-store.js';

export const PORT = Number(process.env.WURM_HELPER_PORT || 5180);
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), '..');
export const DEFAULT_SEMAPHORE_PATH = path.join(PROJECT_ROOT, '.wurm-helper.semaphore');

export const TARGETS = {
  server: {
    label: 'Wurm Unlimited Dedicated Server',
    appId: '402370',
    folder: 'Wurm Unlimited Dedicated Server',
    envDir: 'WURM_SERVER_DIR',
    processPattern: /WurmServerLauncher|com\.wurmonline\.server|wurmserver/i,
  },
  client: {
    label: 'Wurm Unlimited Client',
    appId: '366220',
    folder: 'Wurm Unlimited',
    envDir: 'WURM_CLIENT_DIR',
    processPattern: /WurmLauncher|com\.wurmonline\.client|Wurm Unlimited[\\/]/i,
  },
};

const DEFAULT_ORIGINS = [
  'https://wurm-tools.onrender.com',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:4173',
];

export function allowedOrigins(env = process.env) {
  const extra = (env.WURM_ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter((origin) => {
      if (!origin || origin === '*') return false;
      try {
        const parsed = new URL(origin);
        return parsed.origin === origin && ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    });
  return [...new Set([...DEFAULT_ORIGINS, ...extra])];
}

// Extracts every "path" value from a Steam libraryfolders.vdf document.
export function parseLibraryPaths(vdf) {
  const paths = [];
  const re = /"path"\s+"([^"]+)"/g;
  let m;
  while ((m = re.exec(vdf)) !== null) paths.push(m[1].replace(/\\\\/g, '\\'));
  return paths;
}

function steamRoots() {
  if (process.platform === 'win32') {
    return [
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Steam'),
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Steam'),
    ];
  }
  const home = os.homedir();
  return [
    path.join(home, '.local', 'share', 'Steam'),
    path.join(home, '.steam', 'steam'),
    path.join(home, '.var', 'app', 'com.valvesoftware.Steam', '.local', 'share', 'Steam'),
  ];
}

export function steamLibraries() {
  const libs = new Set();
  for (const root of steamRoots()) {
    if (!fs.existsSync(root)) continue;
    libs.add(root);
    const vdf = path.join(root, 'steamapps', 'libraryfolders.vdf');
    try {
      parseLibraryPaths(fs.readFileSync(vdf, 'utf8')).forEach((p) => libs.add(p));
    } catch {
      // no library file; the default root is still checked
    }
  }
  return [...libs];
}

// Non-Steam locations where a dedicated server is commonly unpacked.
function extraRoots() {
  const home = os.homedir();
  if (process.platform === 'win32') {
    return ['C:\\', 'D:\\', home, path.join(home, 'Documents')];
  }
  return [
    home,
    path.join(home, 'Games'),
    path.join(home, 'Downloads'),
    '/opt',
    '/srv',
    '/usr/local',
  ];
}

export function installCandidates(target, env = process.env) {
  const override = env[target.envDir];
  if (override) return [override];
  const dirs = steamLibraries().map((lib) => path.join(lib, 'steamapps', 'common', target.folder));
  const names = [target.folder, target.folder.replace(/ /g, ''), target.folder.replace(/ /g, '-')];
  if (target.folder === TARGETS.server.folder) names.push('WurmServer', 'wurm-server', 'wurm');
  for (const root of extraRoots()) for (const name of names) dirs.push(path.join(root, name));
  return dirs;
}

export function findInstall(target, env = process.env) {
  return installCandidates(target, env).find((dir) => fs.existsSync(dir)) || null;
}

function listProcesses() {
  return new Promise((resolve) => {
    const done = (err, stdout) => resolve(err ? '' : String(stdout));
    if (process.platform === 'win32') {
      execFile(
        'powershell',
        [
          '-NoProfile',
          '-Command',
          'Get-CimInstance Win32_Process | ForEach-Object { "$($_.ProcessId) $($_.CommandLine)" }',
        ],
        { maxBuffer: 16 * 1024 * 1024 },
        done
      );
    } else {
      execFile('ps', ['-eo', 'pid,args'], { maxBuffer: 16 * 1024 * 1024 }, done);
    }
  });
}

export function matchProcess(listing, pattern) {
  for (const line of listing.split(/\r?\n/)) {
    if (pattern.test(line) && !/wurm-local\.js/.test(line)) {
      const pid = Number.parseInt(line.trim(), 10);
      return Number.isNaN(pid) ? true : pid;
    }
  }
  return false;
}

export async function getStatus() {
  const listing = await listProcesses();
  const status = { platform: process.platform, checkedAt: new Date().toISOString() };
  for (const [key, target] of Object.entries(TARGETS)) {
    const dir = findInstall(target);
    const pid = matchProcess(listing, target.processPattern);
    status[key] = {
      label: target.label,
      installed: Boolean(dir),
      path: dir,
      searched: dir ? undefined : installCandidates(target).slice(0, 6),
      running: pid !== false,
      pid: typeof pid === 'number' ? pid : null,
    };
  }
  return status;
}

export function startTarget(key) {
  const target = TARGETS[key];
  if (!target) throw new Error(`Unknown target: ${key}`);
  const uri = `steam://rungameid/${target.appId}`;
  const [cmd, args] =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', uri]]
      : process.platform === 'darwin'
        ? ['open', [uri]]
        : ['xdg-open', [uri]];
  spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref();
  return { started: key, via: uri };
}

// Read-only database routes:
//   /db/worlds
//   /db/<world>/<db>/tables
//   /db/<world>/<db>/players
//   /db/<world>/wurmplayers.db/skills/<wurmId>
//   /db/<world>/wurmitems.db/inventory/<inventoryId>
//   /db/<world>/wurmcreatures.db/creatures?x=&y=&w=&h=   (tile region)
//   /db/<world>/wurmcreatures.db/skills/<wurmId>
//   /db/<world>/wurmzones.db/villages
//   /db/<world>/wurmzones.db/walls|fences|floors|buildtiles?x=&y=&w=&h=
//   /db/<world>/wurmitems.db/ground?x=&y=&w=&h=   (items on the ground)
//   /db/<world>/<db>/table/<name>?limit=&offset=&search=
// Map baseline routes write only to the separate local map-baseline.db:
//   /map/<world>/players
//   /map/<world>/snapshots (POST { playerId }, or GET to list)
//   /map/snapshots/<id>/status|raster?layer=surface|rock|resources|ores|tile?x=&y=
//   (raster and tile accept edited=1)
//   /map/snapshots/<id>/edits (GET report, POST edit, DELETE reset) and report-csv
export async function handleDb(url) {
  const dir = findInstall(TARGETS.server);
  if (!dir) throw httpError(404, 'Wurm server is not installed on this machine');
  const parts = url.pathname.split('/').filter(Boolean).slice(1).map(decodeURIComponent);
  if (parts[0] === 'worlds' && parts.length === 1) return { worlds: listWorlds(dir) };
  const [world, dbFile, kind, name] = parts;
  if (!world || !dbFile || !kind) throw httpError(404, 'Not found');
  const db = await openDb(dir, world, dbFile);
  try {
    if (kind === 'tables') return { tables: listTables(db) };
    if (kind === 'players') return listPlayers(db);
    if (kind === 'skills' && name) {
      return dbFile === 'wurmcreatures.db' ? listCreatureSkills(db, name) : listSkills(db, name);
    }
    if (kind === 'villages') return listVillages(db);
    if (kind in { walls: 1, fences: 1, floors: 1, buildtiles: 1 }) {
      return listStructurePieces(db, kind, Object.fromEntries(url.searchParams));
    }
    if (kind === 'inventory' && name) return listInventory(db, name);
    if (kind === 'creatures') return listCreatures(db, Object.fromEntries(url.searchParams));
    if (kind === 'ground') return listGroundItems(db, Object.fromEntries(url.searchParams));
    if (kind === 'table' && name) {
      return browseTable(db, name, {
        limit: url.searchParams.get('limit'),
        offset: url.searchParams.get('offset'),
        search: url.searchParams.get('search'),
      });
    }
    throw httpError(404, 'Not found');
  } finally {
    db.close();
  }
}

const MAX_IMPORT_BYTES = 600 * 1024 * 1024;
const MAX_HEROES_IMPORT_BYTES = 64 * 1024 * 1024;

async function readJsonBody(req, maxBytes = 4096) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw httpError(413, 'Request body too large');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw httpError(400, 'Invalid JSON body');
  }
}

function parseRates(text) {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw httpError(400, 'Invalid pile rates');
  }
}

export async function handleMap(req, url, serverDir = findInstall(TARGETS.server)) {
  const parts = url.pathname.split('/').filter(Boolean).slice(1).map(decodeURIComponent);
  // These routes only touch the site's own baseline database, not the Wurm server files.
  if (parts[0] === 'snapshots') {
    if (parts.length === 2 && parts[1] === 'import' && req.method === 'POST') {
      return {
        statusCode: 201,
        body: await importMapSnapshot(await readJsonBody(req, MAX_IMPORT_BYTES)),
      };
    }
    if (parts.length === 3 && parts[2] === 'ores' && req.method === 'GET') {
      return getMapOres(parts[1], {
        type: url.searchParams.get('type'),
        limit: url.searchParams.get('limit'),
      });
    }
    if (parts.length === 3 && parts[2] === 'export' && req.method === 'GET') {
      return exportMapSnapshot(parts[1]);
    }
    if (parts.length === 3 && parts[2] === 'edits') {
      if (req.method === 'GET') {
        return getMapEditReport(parts[1], {
          limit: url.searchParams.get('limit') ?? undefined,
          rates: parseRates(url.searchParams.get('rates')),
        });
      }
      if (req.method === 'POST') {
        return applyMapEdits(parts[1], await readJsonBody(req, 16_384));
      }
      if (req.method === 'DELETE') {
        return resetMapEdits(parts[1], { layer: url.searchParams.get('layer') ?? undefined });
      }
    }
    if (parts.length === 3 && parts[2] === 'report-csv' && req.method === 'GET') {
      return {
        csv: await getMapEditReportCsv(
          parts[1],
          undefined,
          parseRates(url.searchParams.get('rates'))
        ),
      };
    }
    if (parts.length === 2 && req.method === 'DELETE') {
      return deleteMapSnapshots({ id: parts[1] });
    }
    if (parts.length === 1 && req.method === 'DELETE') return deleteMapSnapshots();
  }
  if (parts.length === 2 && parts[1] === 'snapshots' && req.method === 'DELETE') {
    return deleteMapSnapshots({ world: parts[0] });
  }
  if (!serverDir) throw httpError(404, 'Wurm server is not installed on this machine');
  if (parts.length === 2 && parts[1] === 'info' && req.method === 'GET') {
    return worldMapInfo(serverDir, parts[0]);
  }
  if (parts.length === 2 && parts[1] === 'players' && req.method === 'GET') {
    const db = await openDb(serverDir, parts[0], 'wurmplayers.db');
    try {
      return listPlayers(db, 10_000);
    } finally {
      db.close();
    }
  }
  if (parts.length === 2 && parts[1] === 'snapshots') {
    if (req.method === 'GET') return { snapshots: await listMapSnapshots(parts[0]) };
    if (req.method === 'POST') {
      const body = await readJsonBody(req, 16_384);
      const { playerId, whole, width, height } = body;
      return {
        statusCode: 202,
        body: await startMapSnapshot(serverDir, parts[0], playerId, {
          ...(whole ? { whole: true } : {}),
          ...(width !== undefined || height !== undefined ? { width, height } : {}),
        }),
      };
    }
  }
  if (parts[0] === 'snapshots' && parts.length === 3) {
    if (parts[2] === 'status' && req.method === 'GET') return getMapJob(parts[1]);
    if (parts[2] === 'raster' && req.method === 'GET') {
      return getMapRaster(parts[1], url.searchParams.get('layer'), undefined, {
        edited: url.searchParams.get('edited') === '1',
      });
    }
    if (parts[2] === 'tile' && req.method === 'GET') {
      return getMapTile(parts[1], url.searchParams.get('x'), url.searchParams.get('y'), undefined, {
        edited: url.searchParams.get('edited') === '1',
      });
    }
  }
  throw httpError(404, 'Not found');
}

export async function handleHeroes(req, url, filePath = heroesDatabasePath()) {
  const parts = url.pathname.split('/').filter(Boolean).slice(1).map(decodeURIComponent);
  if (
    parts.length === 2 &&
    parts[0] === 'worlds' &&
    parts[1] === 'import' &&
    req.method === 'POST'
  ) {
    return {
      statusCode: 201,
      body: await importHeroesWorld(await readJsonBody(req, MAX_HEROES_IMPORT_BYTES), filePath),
    };
  }
  if (parts.length === 1 && parts[0] === 'worlds' && req.method === 'GET') {
    return { worlds: await listHeroesWorlds(filePath) };
  }
  if (parts.length === 1 && parts[0] === 'worlds' && req.method === 'POST') {
    const world = await createHeroesWorld((await readJsonBody(req, 4096)).name, filePath);
    return { statusCode: 201, body: { world } };
  }
  if (parts.length === 2 && parts[0] === 'worlds' && req.method === 'DELETE') {
    return deleteHeroesWorld(parts[1], filePath);
  }
  if (
    parts.length === 4 &&
    parts[0] === 'worlds' &&
    parts[2] === 'objects' &&
    parts[3] === 'import' &&
    req.method === 'POST'
  ) {
    return {
      statusCode: 201,
      body: {
        object: await importHeroesObject(parts[1], await readJsonBody(req, 300 * 1024), filePath),
      },
    };
  }
  if (
    parts.length === 3 &&
    parts[0] === 'worlds' &&
    parts[2] === 'export' &&
    req.method === 'GET'
  ) {
    return exportHeroesWorld(parts[1], filePath);
  }
  if (
    parts.length === 3 &&
    parts[0] === 'objects' &&
    parts[2] === 'export' &&
    req.method === 'GET'
  ) {
    return exportHeroesObject(parts[1], filePath);
  }
  if (parts.length === 3 && parts[0] === 'worlds' && parts[2] === 'objects') {
    if (req.method === 'GET') {
      return { objects: await listHeroesObjects(parts[1], filePath) };
    }
    if (req.method === 'POST') {
      const object = await createHeroesObject(
        parts[1],
        await readJsonBody(req, 256 * 1024),
        filePath
      );
      return { statusCode: 201, body: { object } };
    }
  }
  if (parts.length === 2 && parts[0] === 'objects' && req.method === 'DELETE') {
    return deleteHeroesObject(parts[1], filePath);
  }
  if (parts.length === 2 && parts[0] === 'objects' && req.method === 'PUT') {
    return {
      object: await updateHeroesObject(parts[1], await readJsonBody(req, 256 * 1024), filePath),
    };
  }
  throw httpError(404, 'Not found');
}

export function createServer({ env = process.env } = {}) {
  const origins = allowedOrigins(env);
  const authFile = authFilePath(env);
  const pairingAttempts = new Map();
  return http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    const originOk = !origin || origins.includes(origin);
    const send = (code, body) => {
      const binary = body instanceof Uint8Array;
      res.writeHead(code, {
        'Content-Type': binary ? 'application/octet-stream' : 'application/json',
        ...(origin && originOk
          ? {
              'Access-Control-Allow-Origin': origin,
              'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Authorization, Content-Type',
              'Access-Control-Allow-Private-Network': 'true',
              'Access-Control-Max-Age': '600',
              Vary: 'Origin',
            }
          : {}),
        'Cache-Control': 'no-store',
      });
      if (code === 204) res.end();
      else if (binary) res.end(body);
      else res.end(JSON.stringify(body));
    };

    if (!originOk) return send(403, { error: 'Origin not allowed' });
    if (req.method === 'OPTIONS') {
      if (!origin) return send(403, { error: 'Origin required' });
      return send(204, {});
    }

    const requireAuth = () => {
      const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization || '');
      if (match && isPairedToken(match[1], authFile)) return match[1];
      send(401, { error: 'Pair this browser with the local helper first' });
      return null;
    };

    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    try {
      if (req.method === 'GET' && url.pathname === '/health') {
        return send(200, { ok: true, platform: process.platform });
      }
      if (req.method === 'POST' && url.pathname === '/pair') {
        if (!origin || !originOk) return send(403, { error: 'An approved app origin is required' });
        const attemptKey = req.socket.remoteAddress || 'local';
        const attempt = pairingAttempts.get(attemptKey);
        if (attempt?.lockedUntil > Date.now()) {
          return send(429, { error: 'Too many pairing attempts. Try again in 15 minutes.' });
        }
        const body = await readJsonBody(req);
        const token = pairBrowser(body.code, authFile);
        if (!token) {
          const withinWindow = attempt?.windowStarted > Date.now() - 15 * 60 * 1000;
          const failures = withinWindow ? attempt.failures : 0;
          pairingAttempts.set(attemptKey, {
            failures: failures + 1,
            windowStarted: withinWindow ? attempt.windowStarted : Date.now(),
            lockedUntil: failures + 1 >= 5 ? Date.now() + 15 * 60 * 1000 : 0,
          });
          return send(401, { error: 'Pairing code is invalid or expired' });
        }
        pairingAttempts.delete(attemptKey);
        return send(200, { token });
      }
      if (req.method === 'GET' && url.pathname === '/status') {
        if (!requireAuth()) return;
        return send(200, await getStatus());
      }
      if (req.method === 'GET' && url.pathname.startsWith('/db/')) {
        if (!requireAuth()) return;
        return send(200, await handleDb(url));
      }
      if (url.pathname.startsWith('/map/')) {
        if (!requireAuth()) return;
        const result = await handleMap(req, url);
        if (result?.statusCode) return send(result.statusCode, result.body);
        return send(200, result?.pixels || result);
      }
      if (url.pathname.startsWith('/heroes/')) {
        if (!requireAuth()) return;
        const result = await handleHeroes(req, url, heroesDatabasePath(env));
        if (result?.statusCode) return send(result.statusCode, result.body);
        return send(200, result);
      }
      const start = url.pathname.match(/^\/start\/(server|client)$/);
      if (req.method === 'POST' && start) {
        if (!requireAuth()) return;
        const status = await getStatus();
        if (!status[start[1]].installed) throw httpError(404, 'Target is not installed');
        if (status[start[1]].running) throw httpError(409, 'Target is already running');
        return send(200, startTarget(start[1]));
      }
      if (req.method === 'POST' && url.pathname === '/unpair') {
        const token = requireAuth();
        if (!token) return;
        revokePairedToken(token, authFile);
        return send(200, { unpaired: true });
      }
      return send(404, { error: 'Not found' });
    } catch (err) {
      return send(err.status || 500, { error: err.message });
    }
  });
}

function semaphorePath() {
  return process.env.WURM_HELPER_SEMAPHORE_PATH || DEFAULT_SEMAPHORE_PATH;
}

function readSemaphore(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function ownsSemaphore(file, token) {
  return readSemaphore(file)?.token === token;
}

function updateSemaphore(file, token, pid, port) {
  let fd;
  try {
    fd = fs.openSync(file, 'r+');
    if (JSON.parse(fs.readFileSync(fd, 'utf8')).token !== token) return false;
    fs.ftruncateSync(fd, 0);
    fs.writeSync(
      fd,
      JSON.stringify({ token, pid, ...(port === undefined ? {} : { port }) }),
      0,
      'utf8'
    );
    return true;
  } catch {
    return false;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function removeSemaphore(file, token) {
  if (!ownsSemaphore(file, token)) return;
  try {
    fs.unlinkSync(file);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid < 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

async function waitForProcessExit(pid, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (processIsAlive(pid) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return !processIsAlive(pid);
}

async function helperAlreadyServing() {
  if (PORT === 0) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 500);
  try {
    const response = await fetch(`http://127.0.0.1:${PORT}/health`, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function startDetachedHelper() {
  const file = semaphorePath();
  const current = readSemaphore(file);
  if (current && processIsAlive(current.pid)) {
    console.info(`Wurm local helper is already running (PID ${current.pid}).`);
    return;
  }
  if (await helperAlreadyServing()) {
    console.info('Wurm local helper is already running (managed by login startup).');
    return;
  }
  if (fs.existsSync(file)) fs.unlinkSync(file);

  const token = randomUUID();
  try {
    fs.writeFileSync(file, JSON.stringify({ token, pid: process.pid }), { flag: 'wx' });
  } catch (err) {
    if (err.code === 'EEXIST') {
      console.info('Wurm local helper is already starting.');
      return;
    }
    throw err;
  }

  let child;
  try {
    child = fork(SCRIPT_PATH, ['--worker'], {
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        WURM_HELPER_SEMAPHORE_PATH: file,
        WURM_HELPER_TOKEN: token,
      },
    });
    child.disconnect();
    child.unref();
    if (!updateSemaphore(file, token, child.pid)) {
      child.kill();
      return;
    }
    console.info(`Wurm local helper started in the background (PID ${child.pid}).`);
    console.info(`Listening on http://127.0.0.1:${PORT}`);
    for (let i = 0; i < 10 && !(await helperAlreadyServing()); i++) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    if (!(await helperAlreadyServing())) {
      console.warn(`Warning: helper is not answering on port ${PORT}; check for a port conflict.`);
    }
    console.info(`Stop with "npm run helper:stop" or delete ${file}.`);
  } catch (err) {
    removeSemaphore(file, token);
    throw err;
  }
}

export async function stopDetachedHelper() {
  const file = semaphorePath();
  const current = readSemaphore(file);
  if (!current) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
    console.info('Wurm local helper is not running (semaphore not found).');
    return;
  }

  try {
    fs.unlinkSync(file);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  if (await waitForProcessExit(current.pid)) {
    console.info('Wurm local helper stopped gracefully.');
  } else {
    console.info('Helper shutdown requested; it is still closing active connections.');
  }
}

function runHelperServer({ foreground = false } = {}) {
  const file = semaphorePath();
  ensurePairingCode();
  const token = process.env.WURM_HELPER_TOKEN;
  const server = createServer();
  let shuttingDown = false;
  let monitor;

  const shutdown = (removeMarker = false) => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (monitor) clearInterval(monitor);
    if (removeMarker && token) removeSemaphore(file, token);

    if (!server.listening) {
      process.exit();
      return;
    }
    const forceClose = setTimeout(() => server.closeAllConnections(), 5000);
    forceClose.unref();
    server.close(() => {
      clearTimeout(forceClose);
      process.exit();
    });
  };

  process.once('SIGINT', () => shutdown(true));
  process.once('SIGTERM', () => shutdown(true));
  server.once('error', (err) => {
    console.error(`Wurm local helper failed: ${err.message}`);
    process.exitCode = 1;
    shutdown(true);
  });

  if (!foreground) {
    if (!token || !ownsSemaphore(file, token)) return shutdown();
    monitor = setInterval(() => {
      if (!ownsSemaphore(file, token)) shutdown();
    }, 500);
  }

  server.listen(PORT, '127.0.0.1', () => {
    if (!foreground && !updateSemaphore(file, token, process.pid, server.address().port)) {
      return shutdown();
    }
    console.log(`Wurm local helper listening on http://127.0.0.1:${PORT}`);
    console.log(`Allowed origins: ${allowedOrigins().join(', ')}`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  if (process.argv.includes('--stop')) {
    await stopDetachedHelper();
  } else if (process.argv.includes('--pairing-code')) {
    console.log(`Pairing code (expires in 10 minutes): ${rotatePairingCode()}`);
  } else if (process.argv.includes('--unpair-all')) {
    revokeAllPairedTokens();
    console.log('All paired browsers have been revoked.');
  } else if (process.argv.includes('--worker')) {
    runHelperServer();
  } else if (process.argv.includes('--foreground')) {
    runHelperServer({ foreground: true });
  } else {
    await startDetachedHelper();
  }
}
