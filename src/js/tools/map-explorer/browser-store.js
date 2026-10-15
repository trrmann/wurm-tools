// Browser-only copy of map baselines (IndexedDB) used when the local helper is unreachable.
// It never touches Wurm server files; it only holds baselines the user imported.
import { layerPixels, tileFromLayers, tileTypeName } from '../../../../scripts/wurm-tile-decode.js';
import { oreKind, summarizeOres, oreTiles, tileOre } from '../../../../scripts/wurm-ore.js';
import { dmToPiles, materialFor, normalizeRates } from '../../../../scripts/wurm-piles.js';

export const EXPORT_FORMAT = 'wurm-tools-map-baseline';
export const EXPORT_VERSION = 1;
export const LAYER_NAMES = ['surface', 'rock', 'cave', 'resources', 'flags'];
const TERRAIN_LAYERS = ['surface', 'rock', 'cave'];
const MAX_EDIT_TILES = 250_000;
const DB_NAME = 'wurm-tools-map-baselines';
const STORE = 'snapshots';

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run(mode, action) {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const result = action(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(result.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

const meta = ({ layers, ...snapshot }) => snapshot; // eslint-disable-line no-unused-vars

export async function listLocal(world) {
  const all = await run('readonly', (store) => store.getAll());
  return all
    .filter((record) => !world || record.world === world)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .map(meta);
}

export async function getLocal(id) {
  const record = await run('readonly', (store) => store.get(id));
  if (!record) throw new Error('Map baseline not found');
  return record;
}

export async function rasterLocal(id, layer, edited = false) {
  const record = await getLocal(id);
  const sourceLayer =
    layer === 'water' || layer === 'topography' ? 'surface' : layer === 'ores' ? 'cave' : layer;
  const source = edited ? editedLayerBytes(record, sourceLayer) : record.layers[sourceLayer];
  if (!source) throw new Error('Invalid map layer');
  if (layer === 'ores') {
    return layerPixels(source, 'cave').map((type) => (oreKind(type) ? type : 0));
  }
  return layerPixels(source, layer);
}

export async function tileLocal(id, x, y, edited = false) {
  const record = await getLocal(id);
  const layers = edited
    ? Object.fromEntries(LAYER_NAMES.map((layer) => [layer, editedLayerBytes(record, layer)]))
    : record.layers;
  const result = tileFromLayers(layers, record.bounds, x, y);
  const { x0, y0, width } = record.bounds;
  const offset = ((y - y0) * width + (x - x0)) * 4;
  const raw = new DataView(
    layers.resources.buffer,
    layers.resources.byteOffset + offset,
    4
  ).getInt32(0);
  const ore = tileOre(result.tile.cave.type, raw, x, y, record.worldSize);
  return { ...result, ore };
}

function integer(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error(`Invalid ${label}`);
  return number;
}

function editKey(layer, x, y) {
  return `${layer}:${x},${y}`;
}

function wordAt(bytes, offset) {
  return bytes.slice(offset, offset + 4);
}

function sameWord(left, right) {
  return left.every((value, index) => value === right[index]);
}

function buildEditedWord(layer, current, set) {
  const word = Uint8Array.from(current);
  const view = new DataView(word.buffer, word.byteOffset, word.byteLength);
  if (TERRAIN_LAYERS.includes(layer)) {
    if (set.type !== undefined && set.type !== null) {
      const type = integer(set.type, 'tile type');
      if (type < 0 || type > 255) throw new Error('Invalid tile type');
      word[0] = type;
    }
    if (set.data !== undefined && set.data !== null) {
      const data = integer(set.data, 'tile data');
      if (data < 0 || data > 255) throw new Error('Invalid tile data');
      word[1] = data;
    }
    if (set.heightDm !== undefined && set.heightDm !== null) {
      const height = integer(set.heightDm, 'height');
      if (height < -32768 || height > 32767) throw new Error('Invalid height');
      view.setInt16(2, height, false);
    }
    if (set.deltaDm !== undefined && set.deltaDm !== null) {
      const height = view.getInt16(2, false) + integer(set.deltaDm, 'height change');
      if (height < -32768 || height > 32767) throw new Error('Invalid height');
      view.setInt16(2, height, false);
    }
  } else if (set.value !== undefined && set.value !== null) {
    const value = integer(set.value, 'value');
    if (value < -2147483648 || value > 2147483647) throw new Error('Invalid value');
    view.setInt32(0, value, false);
  }
  return word;
}

export function editedLayerBytes(record, layer) {
  const source = record.layers[layer];
  if (!source) throw new Error('Invalid map layer');
  const bytes = Uint8Array.from(source);
  for (const edit of Object.values(record.edits || {})) {
    if (edit.layer !== layer) continue;
    const offset =
      ((edit.y - record.bounds.y0) * record.bounds.width + (edit.x - record.bounds.x0)) * 4;
    bytes.set(edit.bytes, offset);
  }
  return bytes;
}

export function applyEditsToLocalRecord(record, request) {
  const { layer, set } = request ?? {};
  if (!LAYER_NAMES.includes(layer)) throw new Error('Invalid map layer');
  if (!set || typeof set !== 'object') throw new Error('Nothing to change');
  const { x0, y0, width, height } = record.bounds;
  const left = Math.min(integer(request.x0, 'x0'), integer(request.x1 ?? request.x0, 'x1'));
  const right = Math.max(integer(request.x0, 'x0'), integer(request.x1 ?? request.x0, 'x1'));
  const top = Math.min(integer(request.y0, 'y0'), integer(request.y1 ?? request.y0, 'y1'));
  const bottom = Math.max(integer(request.y0, 'y0'), integer(request.y1 ?? request.y0, 'y1'));
  const minX = Math.max(left, x0);
  const minY = Math.max(top, y0);
  const maxX = Math.min(right, x0 + width - 1);
  const maxY = Math.min(bottom, y0 + height - 1);
  if (minX > maxX || minY > maxY) throw new Error('Edit area is outside this baseline');
  if ((maxX - minX + 1) * (maxY - minY + 1) > MAX_EDIT_TILES) {
    throw new Error('Edit area is too large');
  }

  const base = record.layers[layer];
  const currentLayer = editedLayerBytes(record, layer);
  record.edits ||= {};
  let changed = 0;
  let reverted = 0;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const offset = ((y - y0) * width + (x - x0)) * 4;
      const original = wordAt(base, offset);
      const current = wordAt(currentLayer, offset);
      const next = buildEditedWord(layer, current, set);
      const key = editKey(layer, x, y);
      if (sameWord(next, original)) {
        if (record.edits[key]) {
          delete record.edits[key];
          reverted++;
        }
      } else if (!sameWord(next, current)) {
        record.edits[key] = { layer, x, y, bytes: Array.from(next) };
        changed++;
      }
    }
  }
  return { changed, reverted, area: { x0: minX, y0: minY, x1: maxX, y1: maxY } };
}

export async function applyEditsLocal(id, request) {
  const record = await getLocal(id);
  const result = applyEditsToLocalRecord(record, request);
  await run('readwrite', (store) => store.put(record));
  return result;
}

export async function resetEditsLocal(id, layer) {
  const record = await getLocal(id);
  const result = resetEditsFromLocalRecord(record, layer);
  await run('readwrite', (store) => store.put(record));
  return result;
}

export function resetEditsFromLocalRecord(record, layer) {
  if (layer && !LAYER_NAMES.includes(layer)) throw new Error('Invalid map layer');
  const edits = Object.values(record.edits || {});
  const remaining = Object.fromEntries(
    edits
      .filter((edit) => layer && edit.layer !== layer)
      .map((edit) => [editKey(edit.layer, edit.x, edit.y), edit])
  );
  const removed = edits.length - Object.keys(remaining).length;
  record.edits = remaining;
  return { removed };
}

function describedWord(layer, bytes) {
  if (TERRAIN_LAYERS.includes(layer)) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return {
      type: bytes[0],
      typeName: tileTypeName(bytes[0]),
      data: bytes[1],
      heightDm: view.getInt16(2, false),
    };
  }
  return {
    value: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getInt32(0, false),
  };
}

export function localEditReport(record, { limit = 5000, rates } = {}) {
  const pileRates = normalizeRates(rates);
  const changes = [];
  const byLayer = {};
  const materials = {};
  const transitions = new Map();
  for (const edit of Object.values(record.edits || {})) {
    const offset =
      ((edit.y - record.bounds.y0) * record.bounds.width + (edit.x - record.bounds.x0)) * 4;
    const before = describedWord(edit.layer, wordAt(record.layers[edit.layer], offset));
    const after = describedWord(edit.layer, Uint8Array.from(edit.bytes));
    const fields = Object.keys(before).filter(
      (key) => before[key] !== after[key] && key !== 'typeName'
    );
    const change = { layer: edit.layer, x: edit.x, y: edit.y, fields, before, after };
    if (TERRAIN_LAYERS.includes(edit.layer) && fields.includes('heightDm')) {
      const material = materialFor(edit.layer, after.typeName ?? before.typeName);
      const deltaDm = after.heightDm - before.heightDm;
      const piles = dmToPiles(deltaDm, material, pileRates);
      change.material = material;
      change.deltaDm = deltaDm;
      change.piles = piles;
      const total = (materials[material] ||= { material, raisedPiles: 0, dugPiles: 0, points: 0 });
      total.points++;
      if (piles > 0) total.raisedPiles += piles;
      else total.dugPiles -= piles;
    }
    changes.push(change);
    const layerSummary = (byLayer[edit.layer] ||= {
      tiles: 0,
      minX: edit.x,
      maxX: edit.x,
      minY: edit.y,
      maxY: edit.y,
    });
    layerSummary.tiles++;
    layerSummary.minX = Math.min(layerSummary.minX, edit.x);
    layerSummary.maxX = Math.max(layerSummary.maxX, edit.x);
    layerSummary.minY = Math.min(layerSummary.minY, edit.y);
    layerSummary.maxY = Math.max(layerSummary.maxY, edit.y);
    if (fields.includes('type')) {
      const key = `${edit.layer}:${before.type}:${after.type}`;
      const transition = transitions.get(key) || {
        layer: edit.layer,
        from: before.typeName ?? String(before.type),
        to: after.typeName ?? String(after.type),
        tiles: 0,
      };
      transition.tiles++;
      transitions.set(key, transition);
    }
  }
  const totalChanges = changes.length;
  return {
    snapshotId: record.id,
    world: record.world,
    baselineCreatedAt: record.createdAt,
    generatedAt: new Date().toISOString(),
    totalChanges,
    byLayer,
    pileRates,
    materials: Object.values(materials).map((entry) => ({
      ...entry,
      netPiles: entry.raisedPiles - entry.dugPiles,
    })),
    typeChanges: [...transitions.values()].sort((a, b) => b.tiles - a.tiles),
    changes: changes.slice(0, limit),
    truncated: totalChanges > limit,
  };
}

export async function editReportLocal(id, options) {
  return localEditReport(await getLocal(id), options);
}

export async function editReportCsvLocal(id, rates) {
  const report = await editReportLocal(id, { limit: Number.MAX_SAFE_INTEGER, rates });
  const csvCell = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const lines = [
    'layer,x,y,fields,before_type,before_data,before_height_dm,before_value,after_type,after_data,after_height_dm,after_value,material,delta_dm,piles',
  ];
  for (const change of report.changes) {
    lines.push(
      [
        change.layer,
        change.x,
        change.y,
        change.fields.join('|'),
        change.before.typeName ?? change.before.type,
        change.before.data,
        change.before.heightDm,
        change.before.value,
        change.after.typeName ?? change.after.type,
        change.after.data,
        change.after.heightDm,
        change.after.value,
        change.material,
        change.deltaDm,
        change.piles,
      ]
        .map(csvCell)
        .join(',')
    );
  }
  return `${lines.join('\n')}\n`;
}

export async function oresLocal(id, { type, limit } = {}) {
  const record = await getLocal(id);
  const { cave, resources } = record.layers;
  const ores = summarizeOres(cave, resources, record.bounds, record.worldSize).map(
    ({ qualitySum, ...ore }) => ({
      ...ore,
      qualityAvg: ore.qualityMin === null ? null : Math.round((qualitySum / ore.count) * 10) / 10,
    })
  );
  const result = { snapshotId: id, bounds: record.bounds, worldSize: record.worldSize, ores };
  if (type !== undefined && type !== null && type !== '') {
    result.tiles = oreTiles(
      cave,
      resources,
      record.bounds,
      Number(type),
      Math.min(Number(limit) || 1000, 10_000),
      record.worldSize
    );
  }
  return result;
}

export async function deleteLocal({ id, world }) {
  if (id) return run('readwrite', (store) => store.delete(id));
  const ids = (await listLocal(world)).map((snapshot) => snapshot.id);
  return run('readwrite', (store) => {
    for (const key of ids) store.delete(key);
    return store.count();
  });
}

async function transform(bytes, stream) {
  const piped = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(piped).arrayBuffer());
}

function toBase64(bytes) {
  let text = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(text);
}

const fromBase64 = (text) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
const isInt = (value) => Number.isSafeInteger(value);

export async function exportLocal(id) {
  const record = await getLocal(id);
  const layers = {};
  for (const name of LAYER_NAMES) {
    layers[name] = toBase64(await transform(record.layers[name], new CompressionStream('deflate')));
  }
  return new Blob(
    [
      JSON.stringify({
        format: EXPORT_FORMAT,
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        snapshot: meta(record),
        layers,
      }),
    ],
    { type: 'application/json' }
  );
}

export async function importLocal(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON');
  }
  if (data?.format !== EXPORT_FORMAT) throw new Error('Not a Wurm Tools map baseline export');
  if (data.version !== EXPORT_VERSION) throw new Error('Unsupported export version');
  const source = data.snapshot ?? {};
  const bounds = source.bounds ?? {};
  if (
    typeof source.world !== 'string' ||
    !source.world ||
    typeof source.playerName !== 'string' ||
    ![source.playerId, source.centerX, source.centerY, bounds.x0, bounds.y0].every(isInt) ||
    !isInt(bounds.width) ||
    !isInt(bounds.height) ||
    bounds.width < 1 ||
    bounds.height < 1 ||
    bounds.x0 < 0 ||
    bounds.y0 < 0
  ) {
    throw new Error('Invalid baseline metadata');
  }
  const expected = bounds.width * bounds.height * 4;
  const layers = {};
  for (const name of LAYER_NAMES) {
    if (typeof data.layers?.[name] !== 'string') throw new Error(`Missing ${name} layer`);
    try {
      layers[name] = await transform(
        fromBase64(data.layers[name]),
        new DecompressionStream('deflate')
      );
    } catch {
      throw new Error(`Corrupt ${name} layer`);
    }
    if (layers[name].length !== expected) throw new Error(`Wrong size for ${name} layer`);
  }
  const snapshot = {
    id: crypto.randomUUID(),
    world: source.world,
    playerId: source.playerId,
    playerName: source.playerName,
    centerX: source.centerX,
    centerY: source.centerY,
    radius: isInt(source.radius) ? source.radius : 0,
    bounds: { x0: bounds.x0, y0: bounds.y0, width: bounds.width, height: bounds.height },
    createdAt: typeof source.createdAt === 'string' ? source.createdAt : new Date().toISOString(),
    worldSize: isInt(source.worldSize) && source.worldSize > 0 ? source.worldSize : null,
  };
  if (
    snapshot.worldSize === null &&
    bounds.x0 === 0 &&
    bounds.y0 === 0 &&
    bounds.width === bounds.height
  ) {
    snapshot.worldSize = bounds.width;
  }
  await run('readwrite', (store) => store.put({ ...snapshot, layers }));
  return snapshot;
}
