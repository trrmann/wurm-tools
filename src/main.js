// Wurm Tools - Main Application Controller
import { TOOLS_LIST, getToolById } from './tools/registry.js';
import './style.css';

let currentMountedTool = null;
let currentToolId = localStorage.getItem('wurm_active_tool') || 'deed-calculator';

// Toast system
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'warn' ? '⚠️' : 'ℹ️'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Render navigation links in the sidebar
function renderSidebar(searchFilter = '') {
  const navContainer = document.getElementById('sidebar-navigation');
  if (!navContainer) return;

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
    navContainer.innerHTML = `
      <div style="padding: 1rem; color: var(--text-dim); font-size: 0.85rem; text-align: center;">
        No tools matched "${searchFilter}"
      </div>
    `;
    return;
  }

  // Group by category
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

  navContainer.innerHTML = html;

  // Bind click handlers to tool switch buttons
  navContainer.querySelectorAll('.nav-item-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const toolId = btn.getAttribute('data-tool-id');
      switchTool(toolId);
      // Close mobile sidebar if open
      document.getElementById('sidebar')?.classList.remove('open');
    });
  });
}

// Switch and mount tool
function switchTool(toolId) {
  const tool = getToolById(toolId) || TOOLS_LIST[0];
  if (!tool) return;

  currentToolId = tool.toolMetadata.id;
  localStorage.setItem('wurm_active_tool', currentToolId);

  // Unmount prior tool
  if (currentMountedTool && typeof currentMountedTool.unmount === 'function') {
    currentMountedTool.unmount();
  }

  // Update header text
  const headerTitle = document.getElementById('header-tool-title');
  const headerDesc = document.getElementById('header-tool-desc');
  if (headerTitle) headerTitle.textContent = tool.toolMetadata.name;
  if (headerDesc) headerDesc.textContent = tool.toolMetadata.description;

  // Update sidebar active status
  document.querySelectorAll('.nav-item-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-tool-id') === currentToolId);
  });

  // Mount tool into main viewport
  const viewport = document.getElementById('tool-viewport');
  if (viewport) {
    viewport.innerHTML = '';
    tool.mount(viewport);
    currentMountedTool = tool;
  }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  renderSidebar();
  switchTool(currentToolId);

  // Search filter
  const searchInput = document.getElementById('tool-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderSidebar(e.target.value);
    });
  }

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Modal: View Suite Concepts
  const openConceptsBtn = document.getElementById('open-concepts-modal-btn');
  const modalBackdrop = document.getElementById('concepts-modal');
  const closeModalBtn = document.getElementById('close-concepts-modal');

  if (openConceptsBtn && modalBackdrop && closeModalBtn) {
    openConceptsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      modalBackdrop.style.display = 'flex';
    });

    closeModalBtn.addEventListener('click', () => {
      modalBackdrop.style.display = 'none';
    });

    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) {
        modalBackdrop.style.display = 'none';
      }
    });
  }
});
