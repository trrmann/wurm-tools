// Coordinate Distance & Travel Estimator
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

function getCompassHeading(dx, dy) {
  // In Wurm coordinates: X increases East, Y increases South (standard screen/tile coords)
  // Angle: 0 is North (dy < 0), 90 is East (dx > 0), 180 is South (dy > 0), 270 is West (dx < 0)
  let angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  if (angle < 0) angle += 360;
  const index = Math.round(angle / 22.5) % 16;
  return { angle: Math.round(angle), dir: COMPASS_DIRECTIONS[index] };
}

function formatDuration(seconds) {
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

export function mount(container) {
  container.innerHTML = `
    <div class="tool-card">
      <div class="tool-header-block">
        <div>
          <h2><span>🧭</span> Coordinate Distance & Travel Estimator</h2>
          <p>Measure distance between two Wurm map tile coordinates, compass bearing, and travel times across travel modes.</p>
        </div>
        <div>
          <span class="badge-tag">1 Tile = 4 Meters</span>
        </div>
      </div>

      <div class="form-grid">
        <div style="background: var(--bg-secondary); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <h4 style="color: var(--accent-gold); font-size: 0.9rem; margin-bottom: 0.75rem; text-transform: uppercase;">Origin / Start Point</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div class="input-group">
              <label class="input-label" for="start-x">X Coordinate</label>
              <input type="number" id="start-x" class="custom-input" value="1000">
            </div>
            <div class="input-group">
              <label class="input-label" for="start-y">Y Coordinate</label>
              <input type="number" id="start-y" class="custom-input" value="1000">
            </div>
          </div>
        </div>

        <div style="background: var(--bg-secondary); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <h4 style="color: var(--accent-blue); font-size: 0.9rem; margin-bottom: 0.75rem; text-transform: uppercase;">Destination Point</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div class="input-group">
              <label class="input-label" for="dest-x">X Coordinate</label>
              <input type="number" id="dest-x" class="custom-input" value="1450">
            </div>
            <div class="input-group">
              <label class="input-label" for="dest-y">Y Coordinate</label>
              <input type="number" id="dest-y" class="custom-input" value="1600">
            </div>
          </div>
        </div>
      </div>

      <div class="results-grid" style="margin-top: 1rem;">
        <div class="stat-card">
          <div class="stat-title">Straight-Line Tile Distance</div>
          <div class="stat-value" id="dist-tiles">0 tiles</div>
          <div class="stat-desc" id="dist-metric">0 km (0 m)</div>
        </div>

        <div class="stat-card">
          <div class="stat-title">Compass Heading</div>
          <div class="stat-value" id="dist-bearing" style="color: var(--accent-gold);">-</div>
          <div class="stat-desc" id="dist-bearing-text">-</div>
        </div>

        <div class="stat-card">
          <div class="stat-title">ΔX (East/West) & ΔY (North/South)</div>
          <div class="stat-value" id="dist-deltas" style="font-size: 1.15rem;">+0 X, +0 Y</div>
          <div class="stat-desc">Coordinate offset values</div>
        </div>
      </div>

      <div style="margin-top: 2rem;">
        <h3 style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
          <span>🐎</span> Estimated Travel Times by Transport Mode
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.85rem;" id="travel-modes-grid">
          <!-- Populated dynamically -->
        </div>
      </div>

      <!-- Waypoint Saver -->
      <div style="margin-top: 2.25rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
        <h3 style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 0.75rem;">
          <span>📍</span> Saved Waypoints
        </h3>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
          <input type="text" id="wp-name" placeholder="Waypoint Name (e.g. Home Mine)" class="custom-input" style="flex: 1; min-width: 180px;">
          <button id="save-dest-wp-btn" class="btn btn-secondary btn-sm">+ Save Current Destination</button>
        </div>
        <div id="waypoints-list" class="chips-group">
          <!-- Populated from localStorage -->
        </div>
      </div>
    </div>
  `;

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
        return `
        <div class="stat-card" style="padding: 0.9rem;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 0.8rem; color: var(--text-muted);">${mode.icon} ${mode.label}</span>
            <span style="font-size: 0.72rem; color: var(--text-dim);">${mode.speedKmh} km/h</span>
          </div>
          <div style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-top: 0.35rem;">
            ${formatDuration(durationSec)}
          </div>
        </div>
      `;
      })
      .join('');
  }

  function renderWaypoints() {
    const waypoints = JSON.parse(localStorage.getItem('wurm_waypoints') || '[]');
    if (waypoints.length === 0) {
      waypointsList.innerHTML = `<span style="font-size: 0.82rem; color: var(--text-dim);">No saved waypoints yet. Enter a name above to save coordinates.</span>`;
      return;
    }

    waypointsList.innerHTML = waypoints
      .map(
        (wp, idx) => `
      <div style="display: inline-flex; align-items: center; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 9999px; padding: 0.2rem 0.6rem; gap: 0.4rem; font-size: 0.78rem;">
        <span style="color: var(--accent-gold); font-weight: 600;">${wp.name}</span>
        <span style="color: var(--text-dim);">(${wp.x}, ${wp.y})</span>
        <button type="button" class="btn-load-wp" data-idx="${idx}" style="background: none; border: none; color: var(--accent-blue); cursor: pointer; font-size: 0.75rem;">Set Dest</button>
        <button type="button" class="btn-del-wp" data-idx="${idx}" style="background: none; border: none; color: var(--accent-red); cursor: pointer; font-size: 0.75rem;">✕</button>
      </div>
    `
      )
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
