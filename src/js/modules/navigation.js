// Navigation & Sidebar Module
import { TOOLS_LIST } from '../tools/registry.js';
import navTemplate from '../../../site/partials/sidebar-nav.html?raw';
import { fill, getShell, getTemplate } from './template.js';

export function renderSidebarNavigation({
  container,
  currentToolId,
  searchFilter = '',
  onSelectTool,
}) {
  if (!container) return;

  const query = searchFilter.trim().toLowerCase();

  const filteredTools = TOOLS_LIST.filter((tool) => {
    const meta = tool.toolMetadata;
    return (
      meta.name.toLowerCase().includes(query) ||
      meta.description.toLowerCase().includes(query) ||
      meta.category.toLowerCase().includes(query)
    );
  });

  if (filteredTools.length === 0) {
    container.innerHTML = fill(getShell(navTemplate), { query: searchFilter });
    return;
  }

  const groupTpl = getTemplate(navTemplate, 'nav-group-template');
  const itemTpl = getTemplate(navTemplate, 'nav-item-template');

  const grouped = {};
  filteredTools.forEach((tool) => {
    const cat = tool.toolMetadata.category || 'General';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(tool);
  });

  const html = Object.entries(grouped)
    .map(([category, tools]) =>
      fill(groupTpl, {
        category,
        items: tools
          .map(({ toolMetadata: meta }) =>
            fill(itemTpl, {
              id: meta.id,
              icon: meta.icon,
              name: meta.name,
              active: meta.id === currentToolId ? 'active' : '',
            })
          )
          .join(''),
      })
    )
    .join('');
  container.innerHTML = html;

  if (typeof onSelectTool === 'function') {
    container.querySelectorAll('.nav-item-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const toolId = btn.getAttribute('data-tool-id');
        onSelectTool(toolId);
      });
    });
  }
}
