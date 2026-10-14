import template from '../../../../site/partials/tools/map-explorer.html?raw';
import tileTypes from '../../../../scripts/wurm-tiles.json';
import { MapTile } from '../../../../scripts/wurm-map-model.js';
import { fill, getShell } from '../../modules/template.js';

export const HELPER_URL = 'http://127.0.0.1:5180';
const HELPER_TOKEN_KEY = 'wurm-tools-helper-token-v1';
export const toolMetadata = {
  id: 'map-explorer',
  name: 'World Map Explorer',
  category: 'Navigation',
  icon: '🗺️',
  description:
    'Capture a character-centered local map baseline and inspect terrain, altitudes, caves and resources.',
};

let controller;
let pollTimer;

function colorForType(type, layer) {
  if (layer === 'resources') return type ? [178, 92, 222] : [31, 42, 58];
  if (layer === 'flags') {
    if (type & 0x80) return [224, 169, 67];
    if (type & 0x40) return [80, 190, 150];
    if (type & 0x20) return [90, 155, 220];
    return [31, 42, 58];
  }
  const terrain = tileTypes[type];
  const name = terrain?.name?.toLowerCase() || '';
  const tags = terrain?.tags || [];
  if (layer === 'rock' && name === 'rock') return [127, 132, 139];
  if (/water|ocean|river|lake/.test(name)) return [39, 102, 157];
  if (tags.includes('tree') || tags.includes('bush')) return [44, 104, 55];
  if (tags.includes('grass')) return [88, 145, 68];
  if (tags.includes('road')) return [150, 139, 111];
  if (/sand/.test(name)) return [190, 166, 105];
  if (/clay|dirt|peat|mud/.test(name)) return [133, 94, 66];
  if (/lava/.test(name)) return [206, 58, 30];
  if (/snow|ice/.test(name)) return [192, 215, 228];
  if (/mycelium|infected/.test(name)) return [130, 76, 125];
  if (/moss/.test(name)) return [71, 117, 77];
  const hue = (Number(type) * 47 + 19) % 360;
  return hslToRgb(hue, 0.28, 0.46);
}

function hslToRgb(hue, saturation, lightness) {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const section = hue / 60;
  const second = chroma * (1 - Math.abs((section % 2) - 1));
  const values =
    section < 1
      ? [chroma, second, 0]
      : section < 2
        ? [second, chroma, 0]
        : section < 3
          ? [0, chroma, second]
          : section < 4
            ? [0, second, chroma]
            : section < 5
              ? [second, 0, chroma]
              : [chroma, 0, second];
  const offset = lightness - chroma / 2;
  return values.map((value) => Math.round((value + offset) * 255));
}

export function unmount() {
  controller?.abort();
  controller = null;
  clearTimeout(pollTimer);
}

export function mount(container) {
  unmount();
  controller = new AbortController();
  const { signal } = controller;
  container.innerHTML = fill(getShell(template), {});

  const element = (selector) => container.querySelector(selector);
  const state = element('#map-state');
  const worldSelect = element('#map-world');
  const playerSelect = element('#map-player');
  const snapshotSelect = element('#map-snapshot');
  const layerSelect = element('#map-layer');
  const canvas = element('#map-canvas');
  const context = canvas.getContext('2d', { alpha: false });
  let bounds = null;
  let activeSnapshotId = null;
  let selectedTile = null;
  let raster = null;
  let rasterLayer = null;

  function authHeaders(headers = {}) {
    const token = localStorage.getItem(HELPER_TOKEN_KEY);
    return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
  }

  async function request(path, options = {}) {
    const response = await fetch(`${HELPER_URL}${path}`, {
      ...options,
      headers: authHeaders(options.headers),
      signal,
    });
    const body = response.headers.get('content-type')?.includes('application/json')
      ? await response.json()
      : null;
    if (!response.ok) throw new Error(body?.error || `Local helper returned ${response.status}`);
    return body ?? response.arrayBuffer();
  }

  function showError(error) {
    if (!signal.aborted) state.textContent = `Map unavailable: ${error.message}`;
  }

  function fillSelect(select, items, label) {
    select.replaceChildren();
    if (label) {
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = label;
      select.append(placeholder);
    }
    for (const item of items) {
      const option = document.createElement('option');
      option.value = item.value;
      option.textContent = item.label;
      select.append(option);
    }
  }

  async function loadSnapshots(world) {
    const result = await request(`/map/${encodeURIComponent(world)}/snapshots`);
    const snapshots = result.snapshots || [];
    fillSelect(
      snapshotSelect,
      snapshots.map((snapshot) => ({
        value: snapshot.id,
        label: `${snapshot.playerName} — tile ${snapshot.centerX}, ${snapshot.centerY} — ${new Date(snapshot.createdAt).toLocaleString()}`,
      })),
      'Choose a saved baseline'
    );
    snapshotSelect.disabled = snapshots.length === 0;
  }

  async function loadWorld(world) {
    if (!world) return;
    activeSnapshotId = null;
    bounds = null;
    selectedTile = null;
    raster = null;
    canvas.width = 0;
    canvas.height = 0;
    layerSelect.disabled = true;
    const result = await request(`/map/${encodeURIComponent(world)}/players`);
    const players = (result.rows || [])
      .filter(
        (player) => Number.isFinite(Number(player.POSX)) && Number.isFinite(Number(player.POSY))
      )
      .sort((a, b) => String(a.NAME).localeCompare(String(b.NAME)));
    fillSelect(
      playerSelect,
      players.map((player) => ({
        value: player.WURMID,
        label: `${player.NAME} — ${player.WURMID} (${Math.floor(player.POSX / 4)}, ${Math.floor(player.POSY / 4)})`,
      })),
      players.length ? 'Choose a character' : 'No positioned characters found'
    );
    playerSelect.disabled = players.length === 0;
    element('#map-create').disabled = players.length === 0;
    await loadSnapshots(world);
    state.textContent = `${players.length} positioned character(s) found in ${world}.`;
  }

  function drawRaster() {
    if (!raster || !bounds) return;
    const width = bounds.width;
    const height = bounds.height;
    canvas.width = width;
    canvas.height = height;
    const image = context.createImageData(width, height);
    const palette = Array.from({ length: 256 }, (_, type) => colorForType(type, rasterLayer));
    for (let i = 0; i < raster.length; i++) {
      const [red, green, blue] = palette[raster[i]];
      const pixel = i * 4;
      image.data[pixel] = red;
      image.data[pixel + 1] = green;
      image.data[pixel + 2] = blue;
      image.data[pixel + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    if (selectedTile) drawSelection();
    updateZoom();
  }

  function drawSelection() {
    if (!selectedTile || !bounds) return;
    const x = selectedTile.x - bounds.x0;
    const y = selectedTile.y - bounds.y0;
    if (x < 0 || y < 0 || x >= bounds.width || y >= bounds.height) return;
    context.save();
    context.strokeStyle = '#fff';
    context.lineWidth = 1;
    context.strokeRect(x + 0.5, y + 0.5, 1, 1);
    context.restore();
  }

  function updateZoom() {
    const zoom = Number(element('#map-zoom').value);
    canvas.style.width = `${canvas.width * zoom}px`;
    canvas.style.height = `${canvas.height * zoom}px`;
    element('#map-zoom-value').value = `${zoom.toFixed(1)}×`;
  }

  async function loadRaster(id, layer) {
    const response = await fetch(
      `${HELPER_URL}/map/snapshots/${encodeURIComponent(id)}/raster?layer=${encodeURIComponent(layer)}`,
      { headers: authHeaders(), signal }
    );
    if (!response.ok) {
      const body = await response.json();
      throw new Error(body.error || `Local helper returned ${response.status}`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length !== bounds.width * bounds.height) {
      throw new Error('Map image does not match the saved baseline dimensions');
    }
    raster = bytes;
    rasterLayer = layer;
    drawRaster();
  }

  async function activateSnapshot(id) {
    const snapshots = await request(`/map/${encodeURIComponent(worldSelect.value)}/snapshots`);
    const snapshot = snapshots.snapshots.find((item) => item.id === id);
    if (!snapshot) throw new Error('Saved map baseline was not found');
    activeSnapshotId = id;
    bounds = snapshot.bounds;
    selectedTile = { x: snapshot.centerX, y: snapshot.centerY };
    layerSelect.disabled = false;
    element('#map-progress-wrap').hidden = true;
    await loadRaster(id, layerSelect.value);
    state.textContent = `Loaded ${snapshot.playerName}'s ${bounds.width.toLocaleString()} × ${bounds.height.toLocaleString()} tile baseline.`;
    await loadTile(selectedTile.x, selectedTile.y);
    element('#map-create').disabled = !playerSelect.value;
  }

  function formatAltitude(value) {
    return value === null || value === undefined ? '—' : `${Number(value).toFixed(1)} m`;
  }

  function showCorners(corners) {
    const target = element('#map-corners');
    target.replaceChildren();
    for (const [layer, values] of Object.entries(corners)) {
      const heading = document.createElement('h5');
      heading.textContent = layer === 'surface' ? 'Surface' : 'Rock';
      const table = document.createElement('table');
      const head = document.createElement('thead');
      const header = document.createElement('tr');
      for (const text of ['', 'West', 'East']) {
        const cell = document.createElement('th');
        cell.textContent = text;
        header.append(cell);
      }
      head.append(header);
      const body = document.createElement('tbody');
      for (const [rowName, north, south] of [
        ['North', values.northWest, values.northEast],
        ['South', values.southWest, values.southEast],
      ]) {
        const row = document.createElement('tr');
        for (const text of [rowName, formatAltitude(north), formatAltitude(south)]) {
          const cell = document.createElement('td');
          cell.textContent = text;
          row.append(cell);
        }
        body.append(row);
      }
      table.append(head, body);
      target.append(heading, table);
    }
  }

  async function loadTile(x, y) {
    if (!activeSnapshotId) return;
    selectedTile = { x, y };
    drawRaster();
    try {
      const result = await request(
        `/map/snapshots/${encodeURIComponent(activeSnapshotId)}/tile?x=${x}&y=${y}`
      );
      const tile = new MapTile(result.tile);
      element('#map-tile-empty').hidden = true;
      element('#map-tile-data').hidden = false;
      element('#map-coordinates').textContent = `${tile.x}, ${tile.y}`;
      element('#map-surface').textContent =
        `${tile.surface.name || `Type ${tile.surface.type}`} — ${formatAltitude(tile.surface.height)}`;
      element('#map-rock').textContent =
        `${tile.rock.name || `Type ${tile.rock.type}`} — ${formatAltitude(tile.rock.height)}`;
      element('#map-cave').textContent =
        `${formatAltitude(tile.cave.height)} / ${formatAltitude(tile.cave.ceiling)}`;
      element('#map-resources').textContent =
        `${tile.resources.cave ?? 'none'} / ${tile.resources.world ?? 'none'}`;
      element('#map-flags').textContent =
        Object.entries(tile.flags)
          .filter(([key, value]) => key !== 'raw' && value)
          .map(([key]) => key)
          .join(', ') || 'none';
      showCorners(result.cornerAltitudes);
    } catch (error) {
      showError(error);
    }
  }

  async function pollSnapshot(id) {
    try {
      const job = await request(`/map/snapshots/${encodeURIComponent(id)}/status`);
      const progress = element('#map-progress');
      progress.max = job.total;
      progress.value = job.processed;
      element('#map-progress-label').textContent =
        `${job.processed.toLocaleString()} / ${job.total.toLocaleString()} tiles`;
      if (job.status === 'failed') throw new Error(job.error || 'Map baseline creation failed');
      if (job.status === 'completed') {
        await loadSnapshots(worldSelect.value);
        snapshotSelect.value = id;
        await activateSnapshot(id);
        return;
      }
      pollTimer = setTimeout(() => pollSnapshot(id), 1000);
    } catch (error) {
      showError(error);
      element('#map-create').disabled = false;
    }
  }

  async function createSnapshot() {
    const button = element('#map-create');
    button.disabled = true;
    element('#map-progress-wrap').hidden = false;
    element('#map-progress').value = 0;
    try {
      const job = await request(`/map/${encodeURIComponent(worldSelect.value)}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: playerSelect.value }),
      });
      activeSnapshotId = job.id;
      state.textContent =
        'Creating local SQLite map baseline. The game databases remain read-only.';
      await pollSnapshot(job.id);
    } catch (error) {
      showError(error);
      button.disabled = false;
    }
  }

  function onCanvasClick(event) {
    if (!bounds || !canvas.width) return;
    const rect = canvas.getBoundingClientRect();
    const x = bounds.x0 + Math.floor(((event.clientX - rect.left) * canvas.width) / rect.width);
    const y = bounds.y0 + Math.floor(((event.clientY - rect.top) * canvas.height) / rect.height);
    if (
      x >= bounds.x0 &&
      y >= bounds.y0 &&
      x < bounds.x0 + bounds.width &&
      y < bounds.y0 + bounds.height
    ) {
      void loadTile(x, y);
    }
  }

  worldSelect.addEventListener('change', () => loadWorld(worldSelect.value).catch(showError));
  element('#map-create').addEventListener('click', createSnapshot);
  snapshotSelect.addEventListener('change', () => {
    if (snapshotSelect.value) activateSnapshot(snapshotSelect.value).catch(showError);
  });
  layerSelect.addEventListener('change', () => {
    if (activeSnapshotId) loadRaster(activeSnapshotId, layerSelect.value).catch(showError);
  });
  element('#map-zoom').addEventListener('input', updateZoom);
  canvas.addEventListener('click', onCanvasClick);
  canvas.addEventListener('keydown', (event) => {
    if (!selectedTile) return;
    const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[
      event.key
    ];
    if (delta) {
      event.preventDefault();
      const x = Math.max(
        bounds.x0,
        Math.min(bounds.x0 + bounds.width - 1, selectedTile.x + delta[0])
      );
      const y = Math.max(
        bounds.y0,
        Math.min(bounds.y0 + bounds.height - 1, selectedTile.y + delta[1])
      );
      void loadTile(x, y);
    }
  });

  request('/db/worlds')
    .then(({ worlds }) => {
      fillSelect(
        worldSelect,
        worlds.map(({ world }) => ({ value: world, label: world })),
        'Choose a world'
      );
      if (!worlds.length) throw new Error('No local Wurm worlds were found');
      worldSelect.value = worlds[0].world;
      return loadWorld(worldSelect.value);
    })
    .catch(showError);
}
