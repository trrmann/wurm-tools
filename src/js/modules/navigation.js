// Navigation & Sidebar Module
import { TOOLS_LIST } from '../tools/registry.js';

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
    container.innerHTML = `
      <div class="nav-empty-state">
        No tools matched "${searchFilter}"
      </div>
    `;
    return;
  }

  // Group tools by category
  const grouped = {};
  filteredTools.forEach((tool) => {
    const cat = tool.toolMetadata.category || 'General';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(tool);
  });

  let html = '';
  for (const [category, tools] of Object.entries(grouped)) {
    html += `
      <div class="nav-group">
        <div class="nav-group-title">${category}</div>
        <ul class="nav-list">
          ${tools
            .map((tool) => {
              const meta = tool.toolMetadata;
              const isActive = meta.id === currentToolId;
              return `
              <li>
                <button class="nav-item-btn ${isActive ? 'active' : ''}" data-tool-id="${meta.id}">
                  <span class="nav-item-icon">${meta.icon}</span>
                  <span>${meta.name}</span>
                </button>
              </li>
            `;
            })
            .join('')}
        </ul>
      </div>
    `;
  }

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
