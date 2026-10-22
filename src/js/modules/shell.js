// Shared page shell: sidebar + header (with nav) + viewport + footer, assembled from partials.
import shellHtml from '../../../site/partials/shell.html?raw';
import modalHtml from '../../../site/partials/modal.html?raw';
import { loadSidebarHtml } from './partials/sidebar.js';
import { loadHeaderHtml } from './partials/header.js';
import { loadFooterHtml } from './partials/footer.js';
import { loadNavHtml } from './partials/nav.js';
import { fill } from './template.js';
import { renderSidebarNavigation } from './navigation.js';
import { PRIMARY_NAVIGATION } from '../tools/registry.js';
import { Modal } from './modal.js';

export const ACTIVE_TOOL_KEY = 'wurm_active_tool';

export function renderShell(container) {
  delete document.documentElement.dataset.game;
  container.innerHTML = fill(shellHtml, {
    sidebar: loadSidebarHtml(),
    header: loadHeaderHtml(),
    footer: loadFooterHtml(),
    modal: modalHtml,
  });
  const slot = container.querySelector('#nav-slot');
  if (slot) {
    slot.innerHTML = loadNavHtml();
    const toggle = slot.querySelector('#nav-toggle');
    const menu = slot.querySelector('#nav-menu');
    for (const item of PRIMARY_NAVIGATION) {
      const listItem = document.createElement('li');
      const link = document.createElement('a');
      link.className = 'nav-link';
      link.href = item.href;
      link.textContent = item.name;
      listItem.append(link);
      menu?.append(listItem);
    }
    toggle?.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    const here = window.location.pathname.replace(/index\.html$/, '');
    slot.querySelectorAll('a.nav-link').forEach((a) => {
      if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page');
    });
  }
  return container.querySelector('#tool-viewport');
}

export function setHeader(title, description) {
  const t = document.getElementById('header-tool-title');
  const d = document.getElementById('header-tool-desc');
  if (t) t.textContent = title;
  if (d) d.textContent = description;
}

// Wires sidebar search, tool list, mobile toggle and the concepts modal. Returns a teardown.
export function initSidebar({ currentToolId, onSelectTool, renderList, searchLabel }) {
  const nav = document.getElementById('sidebar-navigation');
  const sidebar = document.getElementById('sidebar');
  const search = document.getElementById('tool-search-input');
  const toggle = document.getElementById('mobile-menu-toggle');

  if (searchLabel) {
    search?.setAttribute('placeholder', searchLabel);
    search?.setAttribute('aria-label', searchLabel);
  }

  const draw = (filter = '') =>
    renderList
      ? renderList(nav, filter)
      : renderSidebarNavigation({
          container: nav,
          currentToolId,
          searchFilter: filter,
          onSelectTool: (id) => {
            sidebar?.classList.remove('open');
            onSelectTool(id);
          },
        });
  const onSearch = (e) => draw(e.target.value);
  const onToggle = () => sidebar?.classList.toggle('open');

  draw();
  search?.addEventListener('input', onSearch);
  toggle?.addEventListener('click', onToggle);
  new Modal('concepts-modal', 'open-concepts-modal-btn', 'close-concepts-modal');

  return () => {
    search?.removeEventListener('input', onSearch);
    toggle?.removeEventListener('click', onToggle);
  };
}
