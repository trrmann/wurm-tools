// Coordinate Distance & Travel Estimator
import template from './template.html?raw';
import { fill, getShell, getTemplate } from '../../modules/template.js';
export const toolMetadata = {
  id: 'distance-calc',
  name: 'Distance & Travel Estimator',
  category: 'Navigation',
  icon: '🧭',
  description:
    'Compute tile distance, real-world metric conversion, compass heading, and travel time by mount, cart, or foot.',
};

export function unmount() {
  // Cleanup if needed
}

const COMPASS_DIRECTIONS = [
  'North (N)',
  'North-Northeast (NNE)',
  'Northeast (NE)',
  'East-Northeast (ENE)',
  'East (E)',
  'East-Southeast (ESE)',
  'Southeast (SE)',
  'South-Southeast (SSE)',
  'South (S)',
  'South-Southwest (SSW)',
  'Southwest (SW)',
  'West-Southwest (WSW)',
  'West (W)',
  'West-Northwest (WNW)',
  'Northwest (NW)',
  'North-Northwest (NNW)',
];

export function getCompassHeading(dx, dy) {
  // In Wurm coordinates: X increases East, Y increases South (standard screen/tile coords)
  // Angle: 0 is North (dy < 0), 90 is East (dx > 0), 180 is South (dy > 0), 270 is West (dx < 0)
  let angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  if (angle < 0) angle += 360;
  const index = Math.round(angle / 22.5) % 16;
  return { angle: Math.round(angle), dir: COMPASS_DIRECTIONS[index] };
}

export function formatDuration(seconds) {
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

export function calculateDistanceMetrics(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const tiles = Math.sqrt(dx * dx + dy * dy);
  const meters = tiles * 4;
  const km = meters / 1000;
  const heading = getCompassHeading(dx, dy);

  return { dx, dy, tiles, meters, km, heading };
}

export function mount(container) {
  container.innerHTML = fill(getShell(template), {});
  const modeTpl = getTemplate(template, 'travel-mode-template');
  const wpTpl = getTemplate(template, 'waypoint-template');
  const wpEmptyTpl = getTemplate(template, 'waypoint-empty-template');

  const startX = container.querySelector('#start-x');
  const startY = container.querySelector('#start-y');
  const destX = container.querySelector('#dest-x');
  const destY = container.querySelector('#dest-y');
  const modesGrid = container.querySelector('#travel-modes-grid');
  const waypointsList = container.querySelector('#waypoints-list');

  const speeds = [
    { label: 'Walking on Foot', speedKmh: 9.5, icon: '🚶' },
    { label: 'Running on Road', speedKmh: 16.0, icon: '🏃' },
    { label: 'Ridden Horse', speedKmh: 24.0, icon: '🐎' },
    { label: 'Bred / Fast Mount', speedKmh: 35.0, icon: '⚡' },
    { label: 'Cart / Wagon', speedKmh: 12.0, icon: '🛒' },
    { label: 'Sailing Ship', speedKmh: 20.0, icon: '⛵' },
  ];

  function update() {
    const x1 = parseFloat(startX.value) || 0;
    const y1 = parseFloat(startY.value) || 0;
    const x2 = parseFloat(destX.value) || 0;
    const y2 = parseFloat(destY.value) || 0;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const tiles = Math.sqrt(dx * dx + dy * dy);
    const meters = tiles * 4;
    const km = meters / 1000;

    const heading = getCompassHeading(dx, dy);

    container.querySelector('#dist-tiles').textContent =
      `${Math.round(tiles).toLocaleString()} tiles`;
    container.querySelector('#dist-metric').textContent =
      `${km.toFixed(2)} km (${Math.round(meters).toLocaleString()} meters)`;

    container.querySelector('#dist-bearing').textContent = `${heading.angle}°`;
    container.querySelector('#dist-bearing-text').textContent = heading.dir;

    const signX = dx >= 0 ? `+${Math.round(dx)} East` : `${Math.round(dx)} West`;
    const signY = dy >= 0 ? `+${Math.round(dy)} South` : `${Math.round(dy)} North`;
    container.querySelector('#dist-deltas').textContent = `${signX}, ${signY}`;

    // Travel times
    modesGrid.innerHTML = speeds
      .map((mode) => {
        // Speed in tiles/sec: (speedKmh * 1000 / 3600) / 4 meters per tile
        const tilesPerSec = (mode.speedKmh * 1000) / 3600 / 4;
        const durationSec = tilesPerSec > 0 ? tiles / tilesPerSec : 0;
        return fill(modeTpl, {
          label: `${mode.icon} ${mode.label}`,
          speed: `${mode.speedKmh} km/h`,
          time: formatDuration(durationSec),
        });
      })
      .join('');
  }

  function renderWaypoints() {
    const waypoints = JSON.parse(localStorage.getItem('wurm_waypoints') || '[]');
    if (waypoints.length === 0) {
      waypointsList.innerHTML = wpEmptyTpl;
      return;
    }

    waypointsList.innerHTML = waypoints
      .map((wp, idx) => fill(wpTpl, { name: wp.name, x: wp.x, y: wp.y, idx }))
      .join('');

    waypointsList.querySelectorAll('.btn-load-wp').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'));
        const wp = waypoints[idx];
        if (wp) {
          destX.value = wp.x;
          destY.value = wp.y;
          update();
        }
      });
    });

    waypointsList.querySelectorAll('.btn-del-wp').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'));
        waypoints.splice(idx, 1);
        localStorage.setItem('wurm_waypoints', JSON.stringify(waypoints));
        renderWaypoints();
      });
    });
  }

  container.querySelector('#save-dest-wp-btn').addEventListener('click', () => {
    const nameInput = container.querySelector('#wp-name');
    const name = nameInput.value.trim() || `Waypoint (${destX.value}, ${destY.value})`;
    const waypoints = JSON.parse(localStorage.getItem('wurm_waypoints') || '[]');
    waypoints.push({
      name,
      x: parseInt(destX.value) || 0,
      y: parseInt(destY.value) || 0,
    });
    localStorage.setItem('wurm_waypoints', JSON.stringify(waypoints));
    nameInput.value = '';
    renderWaypoints();
  });

  [startX, startY, destX, destY].forEach((input) => {
    input.addEventListener('input', update);
  });

  update();
  renderWaypoints();
}
