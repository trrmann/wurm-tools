import template from '../../../../site/partials/tools/map-explorer.html?raw';
import tileTypes from '../../../../scripts/wurm-tiles.json';
import {
  DEFAULT_PILE_DM,
  dmToPiles,
  materialFor,
  normalizeRates,
  pilesToDm,
} from '../../../../scripts/wurm-piles.js';
import { MapTile } from '../../../../scripts/wurm-map-model.js';
import { fill, getShell } from '../../modules/template.js';
import {
  applyEditsLocal,
  deleteLocal,
  editReportCsvLocal,
  editReportLocal,
  exportLocal,
  importLocal,
  listLocal,
  oresLocal,
  rasterLocal,
  resetEditsLocal,
  tileLocal,
} from './browser-store.js';

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

export function playerPositionToTile(player) {
  const posX = Number(player?.POSX);
  const posY = Number(player?.POSY);
  if (!Number.isFinite(posX) || !Number.isFinite(posY)) return null;
  return { x: Math.floor(posX / 4), y: Math.floor(posY / 4) };
}

export function zoomByStep(value, direction, min = 0.25, max = 16, step = 0.25) {
  const current = Number(value);
  if (!Number.isFinite(current) || !Number.isFinite(direction)) return min;
  const next = current + Math.sign(direction) * step;
  return Math.max(min, Math.min(max, Math.round(next / step) * step));
}

let controller;
let pollTimer;

const ORE_COLORS = {
  220: [255, 215, 0],
  221: [220, 224, 230],
  222: [168, 96, 74],
  223: [214, 122, 52],
  224: [120, 128, 150],
  225: [150, 196, 210],
  226: [200, 200, 170],
  227: [255, 70, 160],
  228: [90, 230, 200],
  205: [110, 90, 140],
  206: [240, 240, 240],
  229: [235, 205, 215],
  230: [214, 176, 120],
};

function colorForType(type, layer) {
  if (layer === 'resources') return type ? ORE_COLORS[type] || [178, 92, 222] : [31, 42, 58];
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

export function mixWaterColor(terrainColor, waterDepth) {
  const depth = Number(waterDepth);
  if (!Number.isFinite(depth) || depth <= 0) return terrainColor;

  const depthRatio = Math.min(1, Math.log1p(depth) / Math.log1p(255));
  const shallowBlue = [65, 105, 225];
  const deepNavy = [4, 16, 52];
  const waterColor = shallowBlue.map((channel, index) =>
    Math.round(channel + (deepNavy[index] - channel) * depthRatio)
  );
  const alpha = 0.68 + depthRatio * 0.22;
  return terrainColor.map((channel, index) =>
    Math.round(channel * (1 - alpha) + waterColor[index] * alpha)
  );
}

export function topographyColor(level) {
  const code = Math.max(0, Math.min(255, Math.round(Number(level) || 0)));
  if (code < 64) {
    const depthRatio = (code - 1) / 62;
    const shallowWater = [65, 105, 225];
    const deepWater = [4, 16, 52];
    return shallowWater.map((channel, index) =>
      Math.round(channel + (deepWater[index] - channel) * depthRatio)
    );
  }

  const stops = [
    [56, 120, 72],
    [133, 160, 82],
    [190, 170, 105],
    [137, 124, 112],
    [239, 239, 230],
  ];
  const ratio = (code - 64) / 191;
  const position = ratio * (stops.length - 1);
  const start = Math.floor(position);
  const end = Math.min(stops.length - 1, start + 1);
  const blend = position - start;
  return stops[start].map((channel, index) =>
    Math.round(channel + (stops[end][index] - channel) * blend)
  );
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
  const pairingPanel = element('#map-pair-panel');
  const pairingForm = element('#map-pair-form');
  const worldSelect = element('#map-world');
  const playerSelect = element('#map-player');
  const snapshotSelect = element('#map-snapshot');
  const layerSelect = element('#map-layer');
  const canvas = element('#map-canvas');
  const viewport = element('#map-viewport');
  const goToCharacterButton = element('#map-go-to-character');
  const context = canvas.getContext('2d', { alpha: false });
  let bounds = null;
  let activeSnapshotId = null;
  let activeSnapshot = null;
  let selectedTile = null;
  let selectedTileData = null;
  let raster = null;
  let rasterLayer = null;
  let waterDepthRaster = null;
  let playersById = new Map();
  const editBox = element('#map-edit');
  const showEdited = element('#map-show-edited');
  const editLayer = element('#map-edit-layer');
  // true when the helper is unreachable: baselines then live only in this browser
  let offline = false;

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
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem(HELPER_TOKEN_KEY);
        offline = true;
        editBox.disabled = true;
        pairingPanel.hidden = false;
      }
      throw new Error(body?.error || `Local helper returned ${response.status}`);
    }
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

  const listSnapshots = async (world) =>
    offline
      ? { snapshots: await listLocal(world) }
      : request(`/map/${encodeURIComponent(world)}/snapshots`);

  async function loadSnapshots(world) {
    const result = await listSnapshots(world);
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
    updateButtons();
  }

  async function loadWorld(world) {
    if (!world) return;
    activeSnapshotId = null;
    activeSnapshot = null;
    bounds = null;
    selectedTile = null;
    raster = null;
    waterDepthRaster = null;
    playersById = new Map();
    canvas.width = 0;
    canvas.height = 0;
    layerSelect.disabled = true;
    const result = offline
      ? { rows: [] }
      : await request(`/map/${encodeURIComponent(world)}/players`);
    const players = (result.rows || [])
      .filter(
        (player) => Number.isFinite(Number(player.POSX)) && Number.isFinite(Number(player.POSY))
      )
      .sort((a, b) => String(a.NAME).localeCompare(String(b.NAME)));
    playersById = new Map(players.map((player) => [String(player.WURMID), player]));
    fillSelect(
      playerSelect,
      players.map((player) => ({
        value: player.WURMID,
        label: `${player.NAME} — ${player.WURMID} (${Math.floor(player.POSX / 4)}, ${Math.floor(player.POSY / 4)})`,
      })),
      players.length ? 'Choose a character' : 'No positioned characters found'
    );
    playerSelect.disabled = players.length === 0;
    element('#map-create').disabled = offline;
    await loadSnapshots(world);
    state.textContent = offline
      ? `Local helper not found. Showing baselines stored in this browser for ${world}.`
      : `${players.length} positioned character(s) found in ${world}.`;
  }

  function drawRaster() {
    if (!raster || !bounds) return;
    const width = bounds.width;
    const height = bounds.height;
    canvas.width = width;
    canvas.height = height;
    const image = context.createImageData(width, height);
    const palette = Array.from({ length: 256 }, (_, type) =>
      rasterLayer === 'topography' ? topographyColor(type) : colorForType(type, rasterLayer)
    );
    for (let i = 0; i < raster.length; i++) {
      const terrainColor = palette[raster[i]];
      const [red, green, blue] =
        rasterLayer === 'surface'
          ? mixWaterColor(terrainColor, waterDepthRaster?.[i] ?? 0)
          : terrainColor;
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

  async function fetchRaster(id, requestedLayer) {
    const layer = requestedLayer === 'resources' ? 'ores' : requestedLayer;
    if (offline) return rasterLocal(id, layer, showEdited.checked);
    const edited = showEdited.checked ? '&edited=1' : '';
    const response = await fetch(
      `${HELPER_URL}/map/snapshots/${encodeURIComponent(id)}/raster?layer=${encodeURIComponent(layer)}${edited}`,
      { headers: authHeaders(), signal }
    );
    if (!response.ok) {
      const body = await response.json();
      throw new Error(body.error || `Local helper returned ${response.status}`);
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  async function loadRaster(id, layer) {
    const [bytes, waterDepth] =
      layer === 'surface'
        ? await Promise.all([fetchRaster(id, layer), fetchRaster(id, 'water')])
        : [await fetchRaster(id, layer), null];
    if (bytes.length !== bounds.width * bounds.height) {
      throw new Error('Map image does not match the saved baseline dimensions');
    }
    if (waterDepth && waterDepth.length !== bytes.length) {
      throw new Error('Water depth image does not match the saved baseline dimensions');
    }
    raster = bytes;
    rasterLayer = layer;
    waterDepthRaster = waterDepth;
    const legend = element('#map-legend');
    if (legend) {
      const legendByLayer = {
        surface:
          'Blue tint marks submerged terrain while preserving its soil or sand color. Deeper water receives a stronger tint. Exact terrain, water depth, and layer values appear in tile details.',
        topography:
          'Topography colors show relative surface elevation within this baseline: navy water, green lowlands, earth-tone hills, pale peaks. Click a tile for exact meters.',
        rock: 'Rock colors show tile types. Select a tile to inspect its rock type and altitude.',
        cave: 'Cave colors show floor tile types. Select a tile to inspect floor and ceiling altitude.',
        resources:
          'Ore walls colored by ore type. Select a tile for its quantity (unrolled until first mined) and derived quality ceiling.',
        flags:
          'Flag colors show surface flag states. Select a tile to inspect the individual flags.',
      };
      legend.textContent = legendByLayer[layer] || '';
    }
    drawRaster();
    await renderOres(id, layer);
  }

  async function renderOres(id, layer) {
    const target = element('#map-ores');
    if (!target) return;
    target.replaceChildren();
    if (layer !== 'resources') return;
    try {
      const result = offline
        ? await oresLocal(id)
        : await request(`/map/snapshots/${encodeURIComponent(id)}/ores`);
      if (!result.ores.length) {
        target.textContent = 'No ore found in this baseline.';
        return;
      }
      const table = document.createElement('table');
      const head = table.createTHead().insertRow();
      for (const label of ['Ore', 'Tiles', 'Unrolled', 'Rolled qty', 'Quality cap (derived)']) {
        head.insertCell().textContent = label;
      }
      const body = table.createTBody();
      for (const ore of result.ores) {
        const row = body.insertRow();
        const swatch = document.createElement('span');
        swatch.className = 'map-swatch';
        swatch.style.background = `rgb(${(ORE_COLORS[ore.tileType] || [178, 92, 222]).join(',')})`;
        row.insertCell().append(swatch, ` ${ore.name}`);
        row.insertCell().textContent = ore.count.toLocaleString();
        row.insertCell().textContent = (ore.count - ore.rolled).toLocaleString();
        row.insertCell().textContent = ore.rolled ? ore.quantity.toLocaleString() : '—';
        row.insertCell().textContent =
          ore.qualityMin === null
            ? 'unknown (world size not recorded)'
            : `${ore.qualityMin}–${ore.qualityMax} (avg ${ore.qualityAvg})`;
      }
      target.append(table);
    } catch (error) {
      showError(error);
    }
  }

  async function activateSnapshot(id) {
    const snapshots = await listSnapshots(worldSelect.value);
    const snapshot = snapshots.snapshots.find((item) => item.id === id);
    if (!snapshot) throw new Error('Saved map baseline was not found');
    activeSnapshotId = id;
    activeSnapshot = snapshot;
    bounds = snapshot.bounds;
    selectedTile = { x: snapshot.centerX, y: snapshot.centerY };
    layerSelect.disabled = false;
    element('#map-progress-wrap').hidden = true;
    await loadRaster(id, layerSelect.value);
    state.textContent = `Loaded ${snapshot.playerName}'s ${bounds.width.toLocaleString()} × ${bounds.height.toLocaleString()} tile baseline.`;
    await loadTile(selectedTile.x, selectedTile.y);
    element('#map-create').disabled = offline;
    updateButtons();
  }

  function formatAltitude(value) {
    return value === null || value === undefined ? '—' : `${Number(value).toFixed(1)} m`;
  }

  const RATES_KEY = 'wurm-tools-pile-rates-v1';
  const TILE_LENGTH_M = 4;
  const CORNER_NAMES = ['northWest', 'northEast', 'southWest', 'southEast'];
  let pileRates = normalizeRates(JSON.parse(localStorage.getItem(RATES_KEY) || '{}'));

  const materialOf = (layer, tile) => materialFor(layer, tile?.[layer]?.name);

  function renderRates() {
    const box = element('#map-rates');
    box.replaceChildren();
    for (const material of Object.keys(DEFAULT_PILE_DM)) {
      const label = document.createElement('label');
      label.append(`${material}: dm per pile `);
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0.01';
      input.step = 'any';
      input.value = pileRates[material];
      input.addEventListener('change', () => {
        pileRates = normalizeRates({ ...pileRates, [material]: input.value });
        input.value = pileRates[material];
        localStorage.setItem(RATES_KEY, JSON.stringify(pileRates));
        updateEditFields();
        if (selectedTile) void loadTile(selectedTile.x, selectedTile.y);
      });
      label.append(input);
      box.append(label);
    }
  }

  const toDm = (meters) =>
    meters === null || meters === undefined ? null : Math.round(meters * 10);

  function slopeText(from, to) {
    if (from === null || to === null) return '—';
    const diff = to - from;
    const percent = (diff / 10 / TILE_LENGTH_M) * 100;
    const degrees = (Math.atan(diff / 10 / TILE_LENGTH_M) * 180) / Math.PI;
    return `${diff > 0 ? '+' : ''}${diff} dm (${percent.toFixed(0)}%, ${degrees.toFixed(1)}°)`;
  }

  const LAYER_TITLES = { surface: 'Surface', rock: 'Rock', cave: 'Cave floor' };

  function showCorners(corners, tile) {
    const target = element('#map-corners');
    target.replaceChildren();
    const add = (tag, text, parent) => {
      const node = document.createElement(tag);
      node.textContent = text;
      parent.append(node);
      return node;
    };
    for (const [layer, values] of Object.entries(corners)) {
      add('h5', LAYER_TITLES[layer] ?? layer, target);
      const material = materialOf(layer, tile);
      const dm = Object.fromEntries(CORNER_NAMES.map((name) => [name, toDm(values[name])]));
      const base = layer === 'surface' ? corners.rock : layer === 'cave' ? corners.rock : null;
      const depthLabel =
        layer === 'surface'
          ? `Piles of ${material} above rock`
          : layer === 'cave'
            ? 'Piles of rock shards up to rock layer'
            : 'Height in piles of rock shards';
      const table = document.createElement('table');
      const head = document.createElement('tr');
      for (const text of ['Corner', 'Elevation', 'Height (dm)', depthLabel]) add('th', text, head);
      table.append(head);
      for (const name of CORNER_NAMES) {
        const row = document.createElement('tr');
        add('td', name.replace(/([A-Z])/g, ' $1').toLowerCase(), row);
        add('td', formatAltitude(values[name]), row);
        add('td', dm[name] === null ? '—' : String(dm[name]), row);
        const rockDm = base ? toDm(base[name]) : null;
        const amount = base
          ? dm[name] === null || rockDm === null
            ? null
            : layer === 'surface'
              ? dm[name] - rockDm
              : rockDm - dm[name]
          : dm[name];
        add(
          'td',
          amount === null
            ? '—'
            : dmToPiles(amount, layer === 'surface' ? material : 'rock shards', pileRates)
                .toFixed(2)
                .replace(/\.?0+$/, ''),
          row
        );
        table.append(row);
      }
      target.append(table);
      const slopes = document.createElement('table');
      const slopeHead = document.createElement('tr');
      add('th', 'Edge', slopeHead);
      add('th', 'Slope (A → B)', slopeHead);
      slopes.append(slopeHead);
      for (const [label, from, to] of [
        ['North (NW → NE)', 'northWest', 'northEast'],
        ['East (NE → SE)', 'northEast', 'southEast'],
        ['South (SW → SE)', 'southWest', 'southEast'],
        ['West (NW → SW)', 'northWest', 'southWest'],
      ]) {
        const row = document.createElement('tr');
        add('td', label, row);
        add('td', slopeText(dm[from], dm[to]), row);
        slopes.append(row);
      }
      target.append(slopes);
    }
  }

  async function loadTile(x, y) {
    if (!activeSnapshotId) return;
    selectedTile = { x, y };
    drawRaster();
    try {
      const result = offline
        ? await tileLocal(activeSnapshotId, x, y, showEdited.checked)
        : await request(
            `/map/snapshots/${encodeURIComponent(activeSnapshotId)}/tile?x=${x}&y=${y}${showEdited.checked ? '&edited=1' : ''}`
          );
      const tile = new MapTile(result.tile);
      selectedTileData = tile;
      updateEditFields();
      element('#map-tile-empty').hidden = true;
      element('#map-tile-data').hidden = false;
      element('#map-coordinates').textContent = `${tile.x}, ${tile.y}`;
      element('#map-surface').textContent =
        `${tile.surface.name || `Type ${tile.surface.type}`} — ${formatAltitude(tile.surface.height)}`;
      const waterDepth = Math.max(0, -tile.surface.height);
      element('#map-water-depth').textContent = waterDepth > 0 ? formatAltitude(waterDepth) : 'Dry';
      element('#map-rock').textContent =
        `${tile.rock.name || `Type ${tile.rock.type}`} — ${formatAltitude(tile.rock.height)}`;
      element('#map-cave').textContent =
        `${formatAltitude(tile.cave.height)} / ${formatAltitude(tile.cave.ceiling)}`;
      element('#map-resources').textContent =
        `${tile.resources.cave ?? 'none'} / ${tile.resources.world ?? 'none'}`;
      const ore = result.ore;
      element('#map-ore').textContent = ore
        ? `${ore.name} — ${
            ore.unrolled ? 'unrolled (quantity rolled on first mining)' : `quantity ${ore.quantity}`
          }; quality cap ${ore.qualityCap ?? 'unknown'} (derived)`
        : 'none';
      element('#map-flags').textContent =
        Object.entries(tile.flags)
          .filter(([key, value]) => key !== 'raw' && value)
          .map(([key]) => key)
          .join(', ') || 'none';
      showCorners(result.cornerAltitudes, tile);
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

  function creationOptions() {
    if (element('#map-area').value === 'whole') {
      return { whole: true, playerId: playerSelect.value || undefined };
    }
    return {
      playerId: playerSelect.value,
      width: Number(element('#map-width').value),
      height: Number(element('#map-height').value),
    };
  }

  function updateButtons() {
    const hasSnapshot = Boolean(snapshotSelect.value);
    element('#map-export').disabled = !hasSnapshot;
    element('#map-delete').disabled = !hasSnapshot;
    const custom = element('#map-area').value === 'custom';
    element('#map-width').disabled = !custom;
    element('#map-height').disabled = !custom;
    editBox.disabled = !activeSnapshotId;
    goToCharacterButton.disabled =
      !bounds || (!activeSnapshot && !playersById.has(String(playerSelect.value)));
  }

  async function centerOnCharacter() {
    if (!bounds) return;
    const player = playersById.get(String(playerSelect.value));
    const target = player ? playerPositionToTile(player) : activeSnapshot;
    if (!target || !Number.isFinite(Number(target.x ?? target.centerX))) {
      state.textContent = 'Select a positioned character or load a saved character baseline.';
      return;
    }

    const x = Number(target.x ?? target.centerX);
    const y = Number(target.y ?? target.centerY);
    if (
      x < bounds.x0 ||
      y < bounds.y0 ||
      x >= bounds.x0 + bounds.width ||
      y >= bounds.y0 + bounds.height
    ) {
      state.textContent = `Character location ${x}, ${y} is outside this saved baseline.`;
      return;
    }

    const zoomInput = element('#map-zoom');
    zoomInput.value = String(Math.max(Number(zoomInput.value), 4));
    updateZoom();
    await loadTile(x, y);
    const zoom = Number(zoomInput.value);
    viewport.scrollTo({
      left: Math.max(0, (x - bounds.x0 + 0.5) * zoom - viewport.clientWidth / 2),
      top: Math.max(0, (y - bounds.y0 + 0.5) * zoom - viewport.clientHeight / 2),
      behavior: 'smooth',
    });
  }

  async function exportSnapshot() {
    const id = snapshotSelect.value;
    if (!id) return;
    state.textContent = 'Exporting baseline...';
    let blob;
    if (offline) {
      blob = await exportLocal(id);
    } else {
      const response = await fetch(`${HELPER_URL}/map/snapshots/${encodeURIComponent(id)}/export`, {
        headers: authHeaders(),
        signal,
      });
      if (!response.ok) {
        throw new Error(
          (await response.json()).error || `Local helper returned ${response.status}`
        );
      }
      blob = await response.blob();
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wurm-map-baseline-${id.slice(0, 8)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    state.textContent = 'Baseline exported.';
  }

  async function importSnapshot(file) {
    state.textContent = `Importing ${file.name}...`;
    const result = offline
      ? { snapshot: await importLocal(await file.text()) }
      : await request('/map/snapshots/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: file,
        });
    const worlds = new Set([...worldSelect.options].map((option) => option.value).filter(Boolean));
    if (!worlds.has(result.snapshot.world)) {
      worlds.add(result.snapshot.world);
      fillSelect(
        worldSelect,
        [...worlds].map((value) => ({ value, label: value })),
        'Choose a world'
      );
    }
    worldSelect.value = result.snapshot.world;
    await loadWorld(result.snapshot.world);
    snapshotSelect.value = result.snapshot.id;
    await activateSnapshot(result.snapshot.id);
    updateButtons();
  }

  async function deleteBaselines(all) {
    const id = snapshotSelect.value;
    const message = all
      ? `Delete ALL saved baselines for ${worldSelect.value}? Wurm server files are not affected.`
      : 'Delete the selected baseline? Wurm server files are not affected.';
    if (!window.confirm(message)) return;
    if (offline) {
      await deleteLocal(all ? { world: worldSelect.value } : { id });
    } else {
      await request(
        all
          ? `/map/${encodeURIComponent(worldSelect.value)}/snapshots`
          : `/map/snapshots/${encodeURIComponent(id)}`,
        { method: 'DELETE' }
      );
    }
    await loadWorld(worldSelect.value);
    state.textContent = offline
      ? 'Deleted from this browser. Wurm server files are not affected.'
      : 'Deleted from the local map baseline database.';
    updateButtons();
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
        body: JSON.stringify(creationOptions()),
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

  const editPath = (suffix = '') =>
    `/map/snapshots/${encodeURIComponent(activeSnapshotId)}/${suffix || 'edits'}`;

  function updateEditFields() {
    element('#map-edit-piles-note').textContent =
      `Material: ${materialOf(editLayer.value, selectedTileData)}; 1 pile = ${
        pileRates[materialOf(editLayer.value, selectedTileData)]
      } dm`;
    const terrain = ['surface', 'rock', 'cave'].includes(editLayer.value);
    element('#map-edit-terrain').hidden = !terrain;
    element('#map-edit-raw').hidden = terrain;
  }

  async function refreshAfterEdit() {
    await loadRaster(activeSnapshotId, layerSelect.value);
    if (selectedTile) await loadTile(selectedTile.x, selectedTile.y);
    if (element('#map-report-view').textContent) await showReport();
  }

  async function applyEdit() {
    if (!activeSnapshotId || !selectedTile) throw new Error('Select a tile first');
    const set = {};
    const read = (selector) => element(selector).value.trim();
    if (['surface', 'rock', 'cave'].includes(editLayer.value)) {
      if (read('#map-edit-type') !== '') set.type = Number(read('#map-edit-type'));
      if (read('#map-edit-data') !== '') set.data = Number(read('#map-edit-data'));
      if (read('#map-edit-height') !== '') set.heightDm = Number(read('#map-edit-height'));
      if (read('#map-edit-piles') !== '') {
        set.deltaDm = pilesToDm(
          Number(read('#map-edit-piles')),
          materialOf(editLayer.value, selectedTileData),
          pileRates
        );
      }
    } else if (read('#map-edit-value') !== '') {
      set.value = Number(read('#map-edit-value'));
    }
    if (!Object.keys(set).length) throw new Error('Enter at least one value to change');
    const radius = Number(element('#map-edit-brush').value);
    const edit = {
      layer: editLayer.value,
      x0: selectedTile.x - radius,
      y0: selectedTile.y - radius,
      x1: selectedTile.x + radius,
      y1: selectedTile.y + radius,
      set,
    };
    const result = offline
      ? await applyEditsLocal(activeSnapshotId, edit)
      : await request(editPath(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(edit),
        });
    state.textContent = `Edit applied: ${result.changed} changed, ${result.reverted} back to baseline.`;
    await refreshAfterEdit();
  }

  async function resetEdits(layer) {
    const query = layer ? `?layer=${encodeURIComponent(layer)}` : '';
    const label = layer ? `${layer} layer edits` : 'all edits';
    if (!window.confirm(`Discard ${label} for this baseline? The baseline itself is unchanged.`)) {
      return;
    }
    const result = offline
      ? await resetEditsLocal(activeSnapshotId, layer)
      : await request(`${editPath()}${query}`, { method: 'DELETE' });
    state.textContent = `Discarded ${result.removed} edited tile records.`;
    await refreshAfterEdit();
  }

  const ratesQuery = () => encodeURIComponent(JSON.stringify(pileRates));

  async function showReport() {
    const report = offline
      ? await editReportLocal(activeSnapshotId, { limit: 200, rates: pileRates })
      : await request(`${editPath()}?limit=200&rates=${ratesQuery()}`);
    const view = element('#map-report-view');
    view.replaceChildren();
    const heading = document.createElement('h4');
    heading.textContent = `Work to be done: ${report.totalChanges.toLocaleString()} tile changes`;
    view.append(heading);
    if (!report.totalChanges) {
      view.append('No edits compared with the baseline.');
      return;
    }
    const list = document.createElement('ul');
    for (const [layer, info] of Object.entries(report.byLayer)) {
      const item = document.createElement('li');
      item.textContent = `${layer}: ${info.tiles.toLocaleString()} tiles within (${info.minX}, ${info.minY}) – (${info.maxX}, ${info.maxY})`;
      list.append(item);
    }
    for (const m of report.materials) {
      const item = document.createElement('li');
      item.textContent = `${m.material}: dig ${+m.dugPiles.toFixed(2)} piles, add ${+m.raisedPiles.toFixed(2)} piles (net ${+m.netPiles.toFixed(2)}) over ${m.points.toLocaleString()} corner points`;
      list.append(item);
    }
    for (const change of report.typeChanges) {
      const item = document.createElement('li');
      item.textContent = `${change.layer}: ${change.from} → ${change.to} × ${change.tiles.toLocaleString()}`;
      list.append(item);
    }
    view.append(list);
    if (report.truncated) {
      view.append(
        `Showing the first ${report.changes.length} summaries; download the full report.`
      );
    }
  }

  async function downloadReport(kind) {
    let blob;
    let name;
    if (kind === 'csv') {
      const csv = offline
        ? await editReportCsvLocal(activeSnapshotId, pileRates)
        : (await request(`${editPath('report-csv')}?rates=${ratesQuery()}`)).csv;
      blob = new Blob([csv], { type: 'text/csv' });
      name = 'csv';
    } else {
      const report = offline
        ? await editReportLocal(activeSnapshotId, {
            limit: Number.MAX_SAFE_INTEGER,
            rates: pileRates,
          })
        : await request(`${editPath()}?limit=1000000000&rates=${ratesQuery()}`);
      blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      name = 'json';
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wurm-map-work-report-${activeSnapshotId.slice(0, 8)}.${name}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  const typeSelect = element('#map-edit-type');
  for (const [id, info] of Object.entries(tileTypes)) {
    typeSelect.append(new Option(`${info.name} (${id})`, id));
  }
  renderRates();
  updateEditFields();
  editLayer.addEventListener('change', updateEditFields);
  showEdited.addEventListener('change', () => refreshAfterEdit().catch(showError));
  element('#map-edit-apply').addEventListener('click', () => applyEdit().catch(showError));
  element('#map-edit-reset').addEventListener('click', () =>
    resetEdits(editLayer.value).catch(showError)
  );
  element('#map-edit-reset-all').addEventListener('click', () => resetEdits().catch(showError));
  element('#map-report').addEventListener('click', () => showReport().catch(showError));
  element('#map-report-csv').addEventListener('click', () =>
    downloadReport('csv').catch(showError)
  );
  element('#map-report-json').addEventListener('click', () =>
    downloadReport('json').catch(showError)
  );

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
  element('#map-area').addEventListener('change', updateButtons);
  snapshotSelect.addEventListener('change', updateButtons);
  element('#map-export').addEventListener('click', () => exportSnapshot().catch(showError));
  element('#map-delete').addEventListener('click', () => deleteBaselines(false).catch(showError));
  element('#map-delete-all').addEventListener('click', () =>
    deleteBaselines(true).catch(showError)
  );
  element('#map-import').addEventListener('change', (event) => {
    const [file] = event.target.files;
    event.target.value = '';
    if (file) importSnapshot(file).catch(showError);
  });
  element('#map-zoom').addEventListener('input', updateZoom);
  element('#map-zoom-in').addEventListener('click', () => {
    const zoom = element('#map-zoom');
    zoom.value = String(
      zoomByStep(zoom.value, 1, Number(zoom.min), Number(zoom.max), Number(zoom.step))
    );
    updateZoom();
  });
  element('#map-zoom-out').addEventListener('click', () => {
    const zoom = element('#map-zoom');
    zoom.value = String(
      zoomByStep(zoom.value, -1, Number(zoom.min), Number(zoom.max), Number(zoom.step))
    );
    updateZoom();
  });
  element('#map-zoom-reset').addEventListener('click', () => {
    element('#map-zoom').value = '1';
    updateZoom();
  });
  goToCharacterButton.addEventListener('click', () => centerOnCharacter().catch(showError));
  playerSelect.addEventListener('change', updateButtons);
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

  function startOffline(reason, showPairing = true) {
    offline = true;
    pairingPanel.hidden = !showPairing;
    return listLocal().then((snapshots) => {
      const worlds = [...new Set(snapshots.map((snapshot) => snapshot.world))];
      fillSelect(
        worldSelect,
        worlds.map((world) => ({ value: world, label: world })),
        'Choose a world'
      );
      element('#map-create').disabled = true;
      state.textContent = `${reason} You can still import a baseline JSON file; it is kept in this browser only.`;
      if (worlds.length) {
        worldSelect.value = worlds[0];
        return loadWorld(worlds[0]);
      }
    });
  }

  async function loadHelperWorlds() {
    const { worlds } = await request('/db/worlds');
    if (!worlds.length) {
      pairingPanel.hidden = true;
      return startOffline('No local Wurm worlds were found.', false);
    }
    offline = false;
    pairingPanel.hidden = true;
    fillSelect(
      worldSelect,
      worlds.map(({ world }) => ({ value: world, label: world })),
      'Choose a world'
    );
    worldSelect.value = worlds[0].world;
    return loadWorld(worldSelect.value);
  }

  pairingForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const code = new FormData(pairingForm).get('code').trim();
    const button = pairingForm.querySelector('button[type="submit"]');
    button.disabled = true;
    localStorage.removeItem(HELPER_TOKEN_KEY);
    try {
      const { token } = await request('/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      localStorage.setItem(HELPER_TOKEN_KEY, token);
      offline = false;
      await loadHelperWorlds();
      pairingForm.reset();
      state.textContent = 'Browser paired with the local helper.';
    } catch (error) {
      pairingPanel.hidden = false;
      state.textContent = `Pairing failed: ${error.message}`;
    } finally {
      button.disabled = false;
    }
  });

  loadHelperWorlds().catch((error) => {
    if (!signal.aborted) startOffline(`Local helper unavailable (${error.message}).`);
  });
}
