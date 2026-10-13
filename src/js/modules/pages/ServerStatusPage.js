// Local Wurm Server Status Page Object: talks to the local helper (scripts/wurm-local.js)
import { BasePage } from './BasePage.js';
import statusTemplate from '../../../../site/partials/server-status.html?raw';
import { fill, getShell, getTemplate } from '../template.js';
import { renderShell, setHeader, initSidebar } from '../shell.js';

export const HELPER_URL = 'http://127.0.0.1:5180';

// Turns the helper's /status payload into card view-models.
export function describeTarget(key, info) {
  if (!info.installed) {
    return {
      key,
      label: info.label,
      state: 'planned',
      badgeClass: 'badge-planned',
      badge: 'Not installed',
      detail: 'No install found. Set WURM_SERVER_DIR / WURM_CLIENT_DIR if it lives elsewhere.',
      disabled: 'disabled',
    };
  }
  return {
    key,
    label: info.label,
    state: info.running ? 'active' : 'planned',
    badgeClass: info.running ? 'badge-active' : 'badge-planned',
    badge: info.running ? '✓ Running' : 'Stopped',
    detail: info.path,
    disabled: info.running ? 'disabled' : '',
  };
}

export class ServerStatusPage extends BasePage {
  static pageAppID = 'status-app';
  constructor() {
    super({
      id: 'server-status',
      title: 'Local Server Status',
      description: 'Detect, monitor and start a local Wurm Unlimited server and client',
    });
    this.teardownSidebar = null;
  }

  render() {
    if (!this.container) return;
    this.viewport = renderShell(this.container);
    setHeader('Local Server Status', 'Is a local Wurm server installed and running?');
    this.viewport.innerHTML = fill(getShell(statusTemplate), { cards: '' });
    this.refresh();
    this.loadWorlds();
  }

  async refresh() {
    const state = this.viewport.querySelector('#helper-state');
    const cards = this.viewport.querySelector('#server-cards');
    try {
      const res = await fetch(`${HELPER_URL}/status`);
      const status = await res.json();
      const tpl = getTemplate(statusTemplate, 'server-card-template');
      cards.innerHTML = ['server', 'client']
        .map((key) => fill(tpl, describeTarget(key, status[key])))
        .join('');
      state.textContent = `Helper connected (${status.platform}) — checked ${new Date(
        status.checkedAt
      ).toLocaleTimeString()}`;
    } catch {
      cards.innerHTML = '';
      state.textContent = 'Helper not reachable. Run "npm run helper" on this machine.';
    }
  }

  async db(pathPart) {
    const res = await fetch(`${HELPER_URL}/db/${pathPart}`);
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || String(res.status));
    return body;
  }

  fillSelect(id, values) {
    const sel = this.viewport.querySelector(id);
    sel.replaceChildren(
      ...values.map((v) => {
        const o = document.createElement('option');
        o.value = o.textContent = v;
        return o;
      })
    );
    return sel;
  }

  async loadWorlds() {
    const state = this.viewport.querySelector('#db-state');
    try {
      this.worlds = (await this.db('worlds')).worlds;
      if (!this.worlds.length) {
        state.textContent = 'Server found, but no world with a sqlite folder yet.';
        return;
      }
      this.fillSelect(
        '#db-world',
        this.worlds.map((w) => w.world)
      );
      await this.onWorldChange();
      state.textContent = `${this.worlds.length} world(s) found.`;
    } catch (err) {
      this.worlds = [];
      state.textContent = `Database explorer unavailable: ${err.message}`;
    }
  }

  async onWorldChange() {
    const world = this.worlds.find(
      (w) => w.world === this.viewport.querySelector('#db-world').value
    );
    this.fillSelect('#db-file', world ? world.databases : []);
    await this.onFileChange();
  }

  async onFileChange() {
    const world = this.viewport.querySelector('#db-world').value;
    const file = this.viewport.querySelector('#db-file').value;
    if (!world || !file) return this.fillSelect('#db-table', []);
    const { tables } = await this.db(
      `${encodeURIComponent(world)}/${encodeURIComponent(file)}/tables`
    );
    this.fillSelect(
      '#db-table',
      tables.map((t) => t.name)
    );
  }

  showGrid(columns, data) {
    const grid = this.viewport.querySelector('#db-grid');
    const head = document.createElement('tr');
    columns.forEach((c) => {
      const th = document.createElement('th');
      th.textContent = c;
      head.append(th);
    });
    const body = data.map((row) => {
      const tr = document.createElement('tr');
      columns.forEach((c) => {
        const td = document.createElement('td');
        td.textContent = row[c] ?? '';
        tr.append(td);
      });
      return tr;
    });
    grid.replaceChildren(head, ...body);
  }

  async runDb(kind) {
    const state = this.viewport.querySelector('#db-state');
    const q = (id) => this.viewport.querySelector(id).value;
    const base = `${encodeURIComponent(q('#db-world'))}/${encodeURIComponent(q('#db-file'))}`;
    try {
      const search = encodeURIComponent(q('#db-search'));
      const result =
        kind === 'players'
          ? await this.db(`${base}/players`)
          : await this.db(
              `${base}/table/${encodeURIComponent(q('#db-table'))}?limit=100&search=${search}`
            );
      this.showGrid(result.columns, result.rows);
      state.textContent = `${result.rows.length} row(s) shown${result.total ? ` of ${result.total}` : ''}.`;
    } catch (err) {
      state.textContent = `Query failed: ${err.message}`;
    }
  }

  async start(key) {
    try {
      const res = await fetch(`${HELPER_URL}/start/${key}`, { method: 'POST' });
      if (!res.ok) throw new Error(String(res.status));
      setTimeout(() => this.refresh(), 5000);
    } catch {
      this.viewport.querySelector('#helper-state').textContent = `Could not start ${key}.`;
    }
  }

  bindEvents() {
    this.teardownSidebar = initSidebar({
      searchLabel: 'Search...',
      renderList: (nav) => {
        nav.innerHTML = '<div class="nav-empty-state">Local server tools</div>';
      },
      onSelectTool: () => {},
    });
    this.onClick = (e) => {
      if (e.target.closest('#status-refresh')) this.refresh();
      if (e.target.closest('#db-load')) this.runDb('table');
      if (e.target.closest('#db-players')) this.runDb('players');
      const btn = e.target.closest('.start-btn');
      if (btn) this.start(btn.dataset.target);
    };
    this.onChange = (e) => {
      if (e.target.id === 'db-world') this.onWorldChange();
      if (e.target.id === 'db-file') this.onFileChange();
    };
    this.viewport.addEventListener('click', this.onClick);
    this.viewport.addEventListener('change', this.onChange);
  }

  unbindEvents() {
    this.viewport?.removeEventListener('click', this.onClick);
    this.viewport?.removeEventListener('change', this.onChange);
    this.teardownSidebar?.();
    this.teardownSidebar = null;
  }
}
