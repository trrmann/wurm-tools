#!/usr/bin/env node
// Local helper for the Server Status page: detects a Wurm Unlimited dedicated server / client
// installed through Steam, reports whether each is running, and can launch them.
// Binds to 127.0.0.1 only and accepts requests only from allowed origins.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  listWorlds,
  openDb,
  listTables,
  listPlayers,
  listSkills,
  listInventory,
  browseTable,
  httpError,
} from './wurm-db.js';

export const PORT = Number(process.env.WURM_HELPER_PORT || 5180);

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
  'http://localhost:3000',
  'http://localhost:4173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:4173',
];

export function allowedOrigins(env = process.env) {
  const extra = (env.WURM_ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...DEFAULT_ORIGINS, ...extra];
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

export function findInstall(target, env = process.env) {
  const override = env[target.envDir];
  if (override) return fs.existsSync(override) ? override : null;
  for (const lib of steamLibraries()) {
    const dir = path.join(lib, 'steamapps', 'common', target.folder);
    if (fs.existsSync(dir)) return dir;
  }
  return null;
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
//   /db/<world>/<db>/table/<name>?limit=&offset=&search=
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
    if (kind === 'skills' && name) return listSkills(db, name);
    if (kind === 'inventory' && name) return listInventory(db, name);
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

export function createServer() {
  const origins = allowedOrigins();
  return http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    const originOk = !origin || origins.includes(origin);
    const send = (code, body) => {
      res.writeHead(code, {
        'Content-Type': 'application/json',
        ...(origin && originOk
          ? {
              'Access-Control-Allow-Origin': origin,
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Private-Network': 'true',
              Vary: 'Origin',
            }
          : {}),
      });
      res.end(JSON.stringify(body));
    };

    if (!originOk) return send(403, { error: 'Origin not allowed' });
    if (req.method === 'OPTIONS') return send(204, {});

    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    try {
      if (req.method === 'GET' && url.pathname === '/status') {
        return send(200, await getStatus());
      }
      if (req.method === 'GET' && url.pathname.startsWith('/db/')) {
        return send(200, await handleDb(url));
      }
      const start = url.pathname.match(/^\/start\/(server|client)$/);
      if (req.method === 'POST' && start) return send(200, startTarget(start[1]));
      return send(404, { error: 'Not found' });
    } catch (err) {
      return send(err.status || 500, { error: err.message });
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createServer().listen(PORT, '127.0.0.1', () => {
    console.log(`Wurm local helper listening on http://127.0.0.1:${PORT}`);
    console.log(`Allowed origins: ${allowedOrigins().join(', ')}`);
  });
}
