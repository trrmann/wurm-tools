import {
  baselineFilePath,
  LAYER_NAMES,
  openBaseline,
  persistBaseline,
  readRows,
} from './wurm-map-baseline.js';
import { httpError } from './wurm-db.js';
import { tileTypeName } from './wurm-tile-decode.js';
import { dmToPiles, materialFor, normalizeRates } from './wurm-piles.js';

const MAX_EDIT_TILES = 250_000;
const TERRAIN_LAYERS = ['surface', 'rock', 'cave'];
const DEFAULT_REPORT_LIMIT = 5000;

const int = (value, label) => {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (!Number.isSafeInteger(n)) throw httpError(400, `Invalid ${label}`);
  return n;
};

const optionalByte = (value, label) => {
  if (value === undefined || value === null) return undefined;
  const n = int(value, label);
  if (n < 0 || n > 255) throw httpError(400, `Invalid ${label}`);
  return n;
};

export function describeWord(layer, word) {
  const bytes = Buffer.from(word);
  if (TERRAIN_LAYERS.includes(layer)) {
    return {
      type: bytes[0],
      typeName: tileTypeName(bytes[0]),
      data: bytes[1],
      heightDm: bytes.readInt16BE(2),
    };
  }
  return { value: bytes.readInt32BE(0) };
}

function buildWord(layer, current, set) {
  const word = Buffer.from(current);
  if (TERRAIN_LAYERS.includes(layer)) {
    const type = optionalByte(set.type, 'type');
    const data = optionalByte(set.data, 'data');
    if (type !== undefined) word[0] = type;
    if (data !== undefined) word[1] = data;
    if (set.heightDm !== undefined && set.heightDm !== null) {
      const height = int(set.heightDm, 'height');
      if (height < -32768 || height > 32767) throw httpError(400, 'Invalid height');
      word.writeInt16BE(height, 2);
    }
    if (set.deltaDm !== undefined && set.deltaDm !== null) {
      const height = word.readInt16BE(2) + int(set.deltaDm, 'height change');
      if (height < -32768 || height > 32767) throw httpError(400, 'Invalid height');
      word.writeInt16BE(height, 2);
    }
  } else if (set.value !== undefined && set.value !== null) {
    const value = int(set.value, 'value');
    if (value < -2147483648 || value > 2147483647) throw httpError(400, 'Invalid value');
    word.writeInt32BE(value, 0);
  }
  return word;
}

async function loadSnapshot(db, id) {
  const snapshot = readRows(
    db,
    'SELECT x0, y0, width, height, world, created_at AS createdAt FROM map_snapshots WHERE id = ?',
    [id]
  )[0];
  if (!snapshot) throw httpError(404, 'Map baseline not found');
  return snapshot;
}

// Edits are stored apart from the baseline layers, which are never modified.
export async function applyMapEdits(id, request, file = baselineFilePath()) {
  const { layer, set } = request ?? {};
  if (!LAYER_NAMES.includes(layer)) throw httpError(400, 'Invalid map layer');
  if (!set || typeof set !== 'object') throw httpError(400, 'Nothing to change');
  const x0 = int(request.x0, 'x0');
  const y0 = int(request.y0, 'y0');
  const x1 = int(request.x1 ?? request.x0, 'x1');
  const y1 = int(request.y1 ?? request.y0, 'y1');
  const left = Math.min(x0, x1);
  const right = Math.max(x0, x1);
  const top = Math.min(y0, y1);
  const bottom = Math.max(y0, y1);
  const db = await openBaseline(file);
  try {
    const snapshot = await loadSnapshot(db, id);
    const minX = Math.max(left, snapshot.x0);
    const minY = Math.max(top, snapshot.y0);
    const maxX = Math.min(right, snapshot.x0 + snapshot.width - 1);
    const maxY = Math.min(bottom, snapshot.y0 + snapshot.height - 1);
    if (minX > maxX || minY > maxY) throw httpError(400, 'Edit area is outside this baseline');
    if ((maxX - minX + 1) * (maxY - minY + 1) > MAX_EDIT_TILES) {
      throw httpError(400, 'Edit area is too large');
    }
    const base = Buffer.from(
      readRows(db, `SELECT ${layer} AS bytes FROM map_snapshot_layers WHERE snapshot_id = ?`, [
        id,
      ])[0].bytes
    );
    const existing = new Map(
      readRows(db, 'SELECT x, y, word FROM map_edits WHERE snapshot_id = ? AND layer = ?', [
        id,
        layer,
      ]).map((row) => [`${row.x},${row.y}`, Buffer.from(row.word)])
    );
    let changed = 0;
    let reverted = 0;
    db.run('BEGIN');
    try {
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const offset = ((y - snapshot.y0) * snapshot.width + (x - snapshot.x0)) * 4;
          const original = base.subarray(offset, offset + 4);
          const key = `${x},${y}`;
          const word = buildWord(layer, existing.get(key) ?? original, set);
          if (word.equals(original)) {
            if (existing.has(key)) {
              db.run(
                'DELETE FROM map_edits WHERE snapshot_id = ? AND layer = ? AND x = ? AND y = ?',
                [id, layer, x, y]
              );
              reverted++;
            }
          } else if (!existing.get(key)?.equals(word)) {
            db.run('INSERT OR REPLACE INTO map_edits VALUES (?, ?, ?, ?, ?)', [
              id,
              layer,
              x,
              y,
              word,
            ]);
            changed++;
          }
        }
      }
      db.run('COMMIT');
    } catch (err) {
      db.run('ROLLBACK');
      throw err;
    }
    await persistBaseline(db, file);
    return { changed, reverted, area: { x0: minX, y0: minY, x1: maxX, y1: maxY } };
  } finally {
    db.close();
  }
}

export async function resetMapEdits(id, { layer } = {}, file = baselineFilePath()) {
  if (layer && !LAYER_NAMES.includes(layer)) throw httpError(400, 'Invalid map layer');
  const db = await openBaseline(file);
  try {
    await loadSnapshot(db, id);
    const where = layer ? 'AND layer = ?' : '';
    const params = layer ? [id, layer] : [id];
    const removed = readRows(
      db,
      `SELECT COUNT(*) AS n FROM map_edits WHERE snapshot_id = ? ${where}`,
      params
    )[0].n;
    db.run(`DELETE FROM map_edits WHERE snapshot_id = ? ${where}`, params);
    await persistBaseline(db, file);
    return { removed };
  } finally {
    db.close();
  }
}

function changeFor(layer, x, y, before, after) {
  const from = describeWord(layer, before);
  const to = describeWord(layer, after);
  const fields = Object.keys(from).filter((key) => from[key] !== to[key] && key !== 'typeName');
  return { layer, x, y, fields, before: from, after: to };
}

// The work report is the difference between the untouched baseline and the stored edits.
export async function getMapEditReport(id, { limit, rates } = {}, file = baselineFilePath()) {
  const max = limit === undefined || limit === null ? DEFAULT_REPORT_LIMIT : int(limit, 'limit');
  const pileRates = normalizeRates(rates);
  const materials = {};
  const db = await openBaseline(file);
  try {
    const snapshot = await loadSnapshot(db, id);
    const layers = {};
    for (const name of LAYER_NAMES) {
      layers[name] = Buffer.from(
        readRows(db, `SELECT ${name} AS bytes FROM map_snapshot_layers WHERE snapshot_id = ?`, [
          id,
        ])[0].bytes
      );
    }
    const rows = readRows(
      db,
      'SELECT layer, x, y, word FROM map_edits WHERE snapshot_id = ? ORDER BY layer, y, x',
      [id]
    );
    const changes = [];
    const byLayer = {};
    const transitions = new Map();
    for (const row of rows) {
      const offset = ((row.y - snapshot.y0) * snapshot.width + (row.x - snapshot.x0)) * 4;
      const change = changeFor(
        row.layer,
        row.x,
        row.y,
        layers[row.layer].subarray(offset, offset + 4),
        Buffer.from(row.word)
      );
      if (TERRAIN_LAYERS.includes(row.layer) && change.fields.includes('heightDm')) {
        const material = materialFor(row.layer, change.after.typeName ?? change.before.typeName);
        const deltaDm = change.after.heightDm - change.before.heightDm;
        const piles = dmToPiles(deltaDm, material, pileRates);
        change.material = material;
        change.deltaDm = deltaDm;
        change.piles = piles;
        const total = (materials[material] ??= {
          material,
          raisedPiles: 0,
          dugPiles: 0,
          points: 0,
        });
        total.points++;
        if (piles > 0) total.raisedPiles += piles;
        else total.dugPiles -= piles;
      }
      changes.push(change);
      const entry = (byLayer[row.layer] ??= {
        tiles: 0,
        minX: row.x,
        maxX: row.x,
        minY: row.y,
        maxY: row.y,
      });
      entry.tiles++;
      entry.minX = Math.min(entry.minX, row.x);
      entry.maxX = Math.max(entry.maxX, row.x);
      entry.minY = Math.min(entry.minY, row.y);
      entry.maxY = Math.max(entry.maxY, row.y);
      if (change.fields.includes('type')) {
        const key = `${row.layer}:${change.before.type}:${change.after.type}`;
        const t = transitions.get(key) ?? {
          layer: row.layer,
          from: change.before.typeName ?? String(change.before.type),
          to: change.after.typeName ?? String(change.after.type),
          tiles: 0,
        };
        t.tiles++;
        transitions.set(key, t);
      }
    }
    return {
      snapshotId: id,
      world: snapshot.world,
      baselineCreatedAt: snapshot.createdAt,
      generatedAt: new Date().toISOString(),
      totalChanges: changes.length,
      byLayer,
      pileRates,
      materials: Object.values(materials).map((m) => ({
        ...m,
        netPiles: m.raisedPiles - m.dugPiles,
      })),
      typeChanges: [...transitions.values()].sort((a, b) => b.tiles - a.tiles),
      changes: changes.slice(0, max),
      truncated: changes.length > max,
    };
  } finally {
    db.close();
  }
}

const csvCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export async function getMapEditReportCsv(id, file = baselineFilePath(), rates) {
  const report = await getMapEditReport(id, { limit: Number.MAX_SAFE_INTEGER, rates }, file);
  const lines = [
    'layer,x,y,fields,before_type,before_data,before_height_dm,before_value,after_type,after_data,after_height_dm,after_value,material,delta_dm,piles',
  ];
  for (const c of report.changes) {
    lines.push(
      [
        c.layer,
        c.x,
        c.y,
        c.fields.join('|'),
        c.before.typeName ?? c.before.type,
        c.before.data,
        c.before.heightDm,
        c.before.value,
        c.after.typeName ?? c.after.type,
        c.after.data,
        c.after.heightDm,
        c.after.value,
        c.material,
        c.deltaDm,
        c.piles,
      ]
        .map(csvCell)
        .join(',')
    );
  }
  return `${lines.join('\n')}\n`;
}
