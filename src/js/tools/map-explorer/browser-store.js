// Browser-only copy of map baselines (IndexedDB) used when the local helper is unreachable.
// It never touches Wurm server files; it only holds baselines the user imported.
import { layerPixels, tileFromLayers } from '../../../../scripts/wurm-tile-decode.js';

export const EXPORT_FORMAT = 'wurm-tools-map-baseline';
export const EXPORT_VERSION = 1;
export const LAYER_NAMES = ['surface', 'rock', 'cave', 'resources', 'flags'];
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

export async function rasterLocal(id, layer) {
  const record = await getLocal(id);
  const sourceLayer = layer === 'water' || layer === 'topography' ? 'surface' : layer;
  if (!record.layers[sourceLayer]) throw new Error('Invalid map layer');
  return layerPixels(record.layers[sourceLayer], layer);
}

export async function tileLocal(id, x, y) {
  const record = await getLocal(id);
  return tileFromLayers(record.layers, record.bounds, x, y);
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
  };
  await run('readwrite', (store) => store.put({ ...snapshot, layers }));
  return snapshot;
}
