// Deed Cost & Upkeep Calculator Module
import template from '../../../../site/partials/tools/deed-calculator.html?raw';
import coinTemplate from '../../../../site/partials/tools/deed-calculator-coin.html?raw';
import { fill, getShell } from '../../modules/template.js';
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

const coin = (type, amount, unit) => fill(coinTemplate.trim(), { type, amount, unit });

// Currency conversion helper: 1G = 100S = 10,000C = 1,000,000I
export function ironToCoins(totalIron) {
  if (totalIron <= 0) {
    return {
      gold: 0,
      silver: 0,
      copper: 0,
      iron: 0,
      formatted: '0i',
      html: coin('iron', 0, 'i'),
    };
  }
  const gold = Math.floor(totalIron / 1000000);
  let rem = totalIron % 1000000;
  const silver = Math.floor(rem / 10000);
  rem = rem % 10000;
  const copper = Math.floor(rem / 100);
  const iron = Math.floor(rem % 100);

  const parts = [];
  if (gold > 0) parts.push(coin('gold', gold, 'g'));
  if (silver > 0) parts.push(coin('silver', silver, 's'));
  if (copper > 0) parts.push(coin('copper', copper, 'c'));
  if (iron > 0 || parts.length === 0) parts.push(coin('iron', iron, 'i'));

  return { gold, silver, copper, iron, html: parts.join(' ') };
}

export function calculateDeedMetrics({
  width = 11,
  height = 11,
  perimeter = 5,
  guards = 1,
  currentBankSilver = 0,
  serverMultiplier = 1.0,
}) {
  const w = Math.max(5, parseInt(width) || 5);
  const h = Math.max(5, parseInt(height) || 5);
  const p = Math.max(0, parseInt(perimeter) || 0);
  const g = Math.max(0, parseInt(guards) || 0);
  const bankSilver = Math.max(0, parseFloat(currentBankSilver) || 0);
  const rate = parseFloat(serverMultiplier) || 0;

  const deedTiles = w * h;
  const totalWithPerim = (w + 2 * p) * (h + 2 * p);
  const perimTiles = totalWithPerim - deedTiles;

  const extraDeedTiles = Math.max(0, deedTiles - 25);
  const deedTileCostIron = extraDeedTiles * 10;
  const perimTileCostIron = perimTiles * 2;

  const extraGuards = Math.max(0, g - 1);
  const guardCostIron = extraGuards * 10000;
  const baseSettlementIron = 20000;

  const totalMonthlyIron = Math.round(
    (baseSettlementIron + deedTileCostIron + perimTileCostIron + guardCostIron) * rate
  );
  const setupCostIron = 100000 + Math.round(deedTiles * 5);

  const currentBankIron = bankSilver * 10000;
  let runwayDays = 0;
  if (totalMonthlyIron > 0) {
    runwayDays = Math.floor((currentBankIron / totalMonthlyIron) * 30);
  }

  return {
    width: w,
    height: h,
    perimeter: p,
    guards: g,
    deedTiles,
    totalWithPerim,
    perimTiles,
    extraGuards,
    setupCostIron,
    totalMonthlyIron,
    runwayDays,
    rate,
  };
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

  container.innerHTML = fill(getShell(template), {
    width,
    height,
    perimeter,
    guards,
    currentBankSilver,
    sel1_0: serverMultiplier === 1.0 ? 'selected' : '',
    sel0_5: serverMultiplier === 0.5 ? 'selected' : '',
    sel0_25: serverMultiplier === 0.25 ? 'selected' : '',
    sel0_0: serverMultiplier === 0.0 ? 'selected' : '',
  });

  // Bind calculation events
  const form = container.querySelector('#deed-form');
  const widthInput = container.querySelector('#deed-width');
  const heightInput = container.querySelector('#deed-height');
  const perimeterInput = container.querySelector('#deed-perimeter');
  const guardsInput = container.querySelector('#deed-guards');
  const bankInput = container.querySelector('#current-bank');
  const rateSelect = container.querySelector('#server-rate');

  function calculate() {
    const metrics = calculateDeedMetrics({
      width: widthInput.value,
      height: heightInput.value,
      perimeter: perimeterInput.value,
      guards: guardsInput.value,
      currentBankSilver: bankInput.value,
      serverMultiplier: rateSelect.value,
    });

    // Save state
    localStorage.setItem(
      'wurm_deed_calc_state',
      JSON.stringify({
        width: metrics.width,
        height: metrics.height,
        perimeter: metrics.perimeter,
        guards: metrics.guards,
        currentBankSilver: parseFloat(bankInput.value) || 0,
        serverMultiplier: metrics.rate,
      })
    );

    // Update DOM
    container.querySelector('#res-total-tiles').textContent =
      `${metrics.totalWithPerim.toLocaleString()} tiles`;
    container.querySelector('#res-tile-details').textContent =
      `${metrics.deedTiles.toLocaleString()} deed + ${metrics.perimTiles.toLocaleString()} perimeter`;

    container.querySelector('#res-setup-cost').innerHTML = ironToCoins(metrics.setupCostIron).html;
    container.querySelector('#res-monthly-upkeep').innerHTML = ironToCoins(
      metrics.totalMonthlyIron
    ).html;
    container.querySelector('#res-upkeep-breakdown').textContent =
      `Guards: ${metrics.extraGuards} extra`;

    const runwayEl = container.querySelector('#res-runway-days');
    const runwayTextEl = container.querySelector('#res-runway-text');
    if (metrics.rate === 0) {
      runwayEl.textContent = 'Infinite (Free)';
      runwayEl.style.color = 'var(--accent-green)';
      runwayTextEl.textContent = 'Server upkeep is disabled';
    } else if (metrics.totalMonthlyIron === 0) {
      runwayEl.textContent = '0 days';
      runwayTextEl.textContent = 'No upkeep required';
    } else {
      runwayEl.textContent = `${metrics.runwayDays} days`;
      if (metrics.runwayDays < 15) {
        runwayEl.style.color = 'var(--accent-red)';
        runwayTextEl.textContent = '⚠️ Danger: Upkeep balance low!';
      } else if (metrics.runwayDays < 45) {
        runwayEl.style.color = 'var(--accent-gold)';
        runwayTextEl.textContent =
          'Moderate balance (~' + (metrics.runwayDays / 30).toFixed(1) + ' months)';
      } else {
        runwayEl.style.color = 'var(--accent-green)';
        runwayTextEl.textContent = `Safe runway (~${(metrics.runwayDays / 30).toFixed(1)} months remaining)`;
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
