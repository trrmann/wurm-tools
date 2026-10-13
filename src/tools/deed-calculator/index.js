// Deed Cost & Upkeep Calculator Module
export const toolMetadata = {
  id: 'deed-calculator',
  name: 'Deed & Upkeep Calculator',
  category: 'Settlement',
  icon: '🏰',
  description:
    'Calculate deed dimensions, creation fees, monthly upkeep costs, and deed bank runway.',
};

export function unmount() {
  // Cleanup if needed
}

// Currency conversion helper: 1G = 100S = 10,000C = 1,000,000I
function ironToCoins(totalIron) {
  if (totalIron <= 0) {
    return { gold: 0, silver: 0, copper: 0, iron: 0, formatted: '0i' };
  }
  const gold = Math.floor(totalIron / 1000000);
  let rem = totalIron % 1000000;
  const silver = Math.floor(rem / 10000);
  rem = rem % 10000;
  const copper = Math.floor(rem / 100);
  const iron = Math.floor(rem % 100);

  const parts = [];
  if (gold > 0) parts.push(`<span class="coin-pill coin-gold">${gold}g</span>`);
  if (silver > 0) parts.push(`<span class="coin-pill coin-silver">${silver}s</span>`);
  if (copper > 0) parts.push(`<span class="coin-pill coin-copper">${copper}c</span>`);
  if (iron > 0 || parts.length === 0)
    parts.push(`<span class="coin-pill coin-iron">${iron}i</span>`);

  return { gold, silver, copper, iron, html: parts.join(' ') };
}

export function mount(container) {
  // Restore saved state or defaults
  const savedState = JSON.parse(localStorage.getItem('wurm_deed_calc_state') || '{}');
  const width = savedState.width || 11;
  const height = savedState.height || 11;
  const perimeter = savedState.perimeter !== undefined ? savedState.perimeter : 5;
  const guards = savedState.guards !== undefined ? savedState.guards : 1;
  const currentBankSilver = savedState.currentBankSilver || 5;
  const serverMultiplier = savedState.serverMultiplier || 1.0;

  container.innerHTML = `
    <div class="tool-card">
      <div class="tool-header-block">
        <div>
          <h2><span>🏰</span> Deed Cost & Upkeep Calculator</h2>
          <p>Plan settlement dimensions, calculate monthly upkeep in Gold/Silver/Copper/Iron, and estimate deed bank lifetime.</p>
        </div>
        <div>
          <span class="badge-tag">Wurm Online & Unlimited</span>
        </div>
      </div>

      <div class="chips-group" style="margin-bottom: 1.5rem;">
        <span style="font-size: 0.8rem; color: var(--text-dim); align-self: center;">Quick Presets:</span>
        <button type="button" class="chip-btn" data-preset="5,5,5,1">5x5 Homestead</button>
        <button type="button" class="chip-btn" data-preset="11,11,5,1">11x11 Farmstead</button>
        <button type="button" class="chip-btn" data-preset="21,21,5,2">21x21 Village</button>
        <button type="button" class="chip-btn" data-preset="31,31,10,3">31x31 Township</button>
        <button type="button" class="chip-btn" data-preset="51,51,15,5">51x51 Fortress</button>
      </div>

      <form id="deed-form">
        <div class="form-grid">
          <div class="input-group">
            <label class="input-label" for="deed-width">
              Width (East-West Tiles)
              <span class="input-hint">Min: 5</span>
            </label>
            <input type="number" id="deed-width" class="custom-input" min="5" max="500" value="${width}">
          </div>

          <div class="input-group">
            <label class="input-label" for="deed-height">
              Height (North-South Tiles)
              <span class="input-hint">Min: 5</span>
            </label>
            <input type="number" id="deed-height" class="custom-input" min="5" max="500" value="${height}">
          </div>

          <div class="input-group">
            <label class="input-label" for="deed-perimeter">
              Perimeter Buffer (Tiles)
              <span class="input-hint">Min: 0</span>
            </label>
            <input type="number" id="deed-perimeter" class="custom-input" min="0" max="100" value="${perimeter}">
          </div>

          <div class="input-group">
            <label class="input-label" for="deed-guards">
              Spirit Guards
              <span class="input-hint">Included: 1</span>
            </label>
            <input type="number" id="deed-guards" class="custom-input" min="0" max="50" value="${guards}">
          </div>

          <div class="input-group">
            <label class="input-label" for="current-bank">
              Current Deed Bank (Silver)
              <span class="input-hint">For runway estimate</span>
            </label>
            <input type="number" id="current-bank" class="custom-input" min="0" step="0.5" value="${currentBankSilver}">
          </div>

          <div class="input-group">
            <label class="input-label" for="server-rate">
              Server Upkeep Rate
              <span class="input-hint">1.0 = Default</span>
            </label>
            <select id="server-rate" class="custom-select">
              <option value="1.0" ${serverMultiplier === 1.0 ? 'selected' : ''}>Wurm Online (1.0x Official)</option>
              <option value="0.5" ${serverMultiplier === 0.5 ? 'selected' : ''}>Wurm Unlimited (0.5x Half)</option>
              <option value="0.25" ${serverMultiplier === 0.25 ? 'selected' : ''}>Wurm Unlimited (0.25x Quarter)</option>
              <option value="0.0" ${serverMultiplier === 0.0 ? 'selected' : ''}>Free Upkeep (0.0x)</option>
            </select>
          </div>
        </div>
      </form>

      <div class="results-grid">
        <div class="stat-card">
          <div class="stat-title">Total Settlement Area</div>
          <div class="stat-value" id="res-total-tiles">0 tiles</div>
          <div class="stat-desc" id="res-tile-details">0 deed + 0 perimeter</div>
        </div>

        <div class="stat-card">
          <div class="stat-title">Founding / Setup Fee</div>
          <div class="stat-value" id="res-setup-cost">-</div>
          <div class="stat-desc">One-time initial deed founding payment</div>
        </div>

        <div class="stat-card">
          <div class="stat-title">Monthly Upkeep Cost</div>
          <div class="stat-value" id="res-monthly-upkeep">-</div>
          <div class="stat-desc" id="res-upkeep-breakdown">Per 30 real days</div>
        </div>

        <div class="stat-card">
          <div class="stat-title">Deed Bank Remaining Runway</div>
          <div class="stat-value" id="res-runway-days" style="color: var(--accent-green);">-</div>
          <div class="stat-desc" id="res-runway-text">Based on current silver balance</div>
        </div>
      </div>
    </div>
  `;

  // Bind calculation events
  const form = container.querySelector('#deed-form');
  const widthInput = container.querySelector('#deed-width');
  const heightInput = container.querySelector('#deed-height');
  const perimeterInput = container.querySelector('#deed-perimeter');
  const guardsInput = container.querySelector('#deed-guards');
  const bankInput = container.querySelector('#current-bank');
  const rateSelect = container.querySelector('#server-rate');

  function calculate() {
    const w = Math.max(5, parseInt(widthInput.value) || 5);
    const h = Math.max(5, parseInt(heightInput.value) || 5);
    const p = Math.max(0, parseInt(perimeterInput.value) || 0);
    const g = Math.max(0, parseInt(guardsInput.value) || 0);
    const bankSilver = Math.max(0, parseFloat(bankInput.value) || 0);
    const rate = parseFloat(rateSelect.value) || 0;

    // Save state
    localStorage.setItem(
      'wurm_deed_calc_state',
      JSON.stringify({
        width: w,
        height: h,
        perimeter: p,
        guards: g,
        currentBankSilver: bankSilver,
        serverMultiplier: rate,
      })
    );

    // Deed tiles
    const deedTiles = w * h;
    const totalWithPerim = (w + 2 * p) * (h + 2 * p);
    const perimTiles = totalWithPerim - deedTiles;

    // Upkeep calculation (Wurm Online rules):
    // Minimum deed 5x5: Base includes 5x5 tiles.
    // Each additional deed tile: 10 iron per month (30 days)
    // Extra perimeter tiles: 2 iron per month
    // Base 5 perimeter tiles free per side if included, but standard formula: 2 iron / perimeter tile beyond 5-tile baseline.
    const extraDeedTiles = Math.max(0, deedTiles - 25);
    const deedTileCostIron = extraDeedTiles * 10;
    const perimTileCostIron = perimTiles * 2;

    // Guard costs: First guard is base upkeep, additional guards cost 1 Silver (10,000 iron) per month
    const extraGuards = Math.max(0, g - 1);
    const guardCostIron = extraGuards * 10000;

    // Base settlement upkeep = 2 silver (20,000 iron)
    const baseSettlementIron = 20000;

    const totalMonthlyIron = Math.round(
      (baseSettlementIron + deedTileCostIron + perimTileCostIron + guardCostIron) * rate
    );

    // Setup cost: 10 silver base + tile fees
    const setupCostIron = 100000 + Math.round(deedTiles * 5);

    // Bank Runway calculation
    const currentBankIron = bankSilver * 10000;
    let runwayDays = 0;
    if (totalMonthlyIron > 0) {
      runwayDays = Math.floor((currentBankIron / totalMonthlyIron) * 30);
    }

    // Update DOM
    container.querySelector('#res-total-tiles').textContent =
      `${totalWithPerim.toLocaleString()} tiles`;
    container.querySelector('#res-tile-details').textContent =
      `${deedTiles.toLocaleString()} deed + ${perimTiles.toLocaleString()} perimeter`;

    container.querySelector('#res-setup-cost').innerHTML = ironToCoins(setupCostIron).html;
    container.querySelector('#res-monthly-upkeep').innerHTML = ironToCoins(totalMonthlyIron).html;
    container.querySelector('#res-upkeep-breakdown').textContent =
      `Tiles: ${ironToCoins(Math.round((deedTileCostIron + perimTileCostIron) * rate)).formatted || ''} | Guards: ${extraGuards} extra`;

    const runwayEl = container.querySelector('#res-runway-days');
    const runwayTextEl = container.querySelector('#res-runway-text');
    if (rate === 0) {
      runwayEl.textContent = 'Infinite (Free)';
      runwayEl.style.color = 'var(--accent-green)';
      runwayTextEl.textContent = 'Server upkeep is disabled';
    } else if (totalMonthlyIron === 0) {
      runwayEl.textContent = '0 days';
      runwayTextEl.textContent = 'No upkeep required';
    } else {
      runwayEl.textContent = `${runwayDays} days`;
      if (runwayDays < 15) {
        runwayEl.style.color = 'var(--accent-red)';
        runwayTextEl.textContent = '⚠️ Danger: Upkeep balance low!';
      } else if (runwayDays < 45) {
        runwayEl.style.color = 'var(--accent-gold)';
        runwayTextEl.textContent =
          'Moderate balance (~' + (runwayDays / 30).toFixed(1) + ' months)';
      } else {
        runwayEl.style.color = 'var(--accent-green)';
        runwayTextEl.textContent = `Safe runway (~${(runwayDays / 30).toFixed(1)} months remaining)`;
      }
    }
  }

  // Quick preset chips
  container.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [w, h, p, g] = btn.getAttribute('data-preset').split(',').map(Number);
      widthInput.value = w;
      heightInput.value = h;
      perimeterInput.value = p;
      guardsInput.value = g;
      calculate();
    });
  });

  form.addEventListener('input', calculate);
  rateSelect.addEventListener('change', calculate);

  // Initial calculation
  calculate();
}
