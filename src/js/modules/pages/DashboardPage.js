// Dashboard Page Object
import { BasePage } from './BasePage.js';
import { TOOLS_LIST, getToolById } from '../../tools/registry.js';
import { renderSidebarNavigation } from '../navigation.js';
import { setupModal } from '../modal.js';

export class DashboardPage extends BasePage {
  static pageAppID = 'dashboard-app';
  constructor() {
    super({
      id: 'dashboard',
      title: 'Companion Suite Dashboard',
      description: 'Modular toolkit and calculators for Wurm Online and Wurm Unlimited',
    });

    this.currentToolId = localStorage.getItem('wurm_active_tool') || 'deed-calculator';
    this.currentMountedTool = null;
    this.modalController = null;
    this.handleSearchInput = this.handleSearchInput.bind(this);
    this.handleMobileToggle = this.handleMobileToggle.bind(this);
  }

  mount(container = document.getElementById('app')) {
    super.mount(container);
  }

  render() {
    // If container already contains the HTML shell (from static HTML), wire it; otherwise generate it
    if (!this.container.querySelector('#tool-viewport')) {
      this.container.innerHTML = this.template();
    }

    this.renderNavigation();
    this.switchTool(this.currentToolId);
  }

  template() {
    return `
      <!-- Sidebar Navigation -->
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <div class="logo-badge">
            <img src="/images/logo.svg" alt="Wurm Tools" width="24" height="24" />
          </div>
          <div>
            <div class="sidebar-title">Wurm Tools</div>
            <div class="sidebar-subtitle">Companion Suite</div>
          </div>
        </div>

        <div class="sidebar-search">
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              id="tool-search-input"
              class="search-input"
              placeholder="Search tools..."
              aria-label="Search tools"
            />
          </div>
        </div>

        <nav class="sidebar-nav" id="sidebar-navigation">
          <!-- Dynamically rendered tool list -->
        </nav>

        <div class="sidebar-footer">
          <button id="open-concepts-modal-btn" class="concepts-btn" type="button">
            <span>📜</span> View Suite Concepts & Roadmap
          </button>
          <div class="render-badge">Ready for Render Static Hosting</div>
        </div>
      </aside>

      <!-- Main Workspace -->
      <div class="main-wrapper">
        <header class="top-header">
          <div class="header-left">
            <button id="mobile-menu-toggle" class="mobile-menu-toggle" aria-label="Toggle Menu">
              ☰
            </button>
            <div class="header-title-container">
              <h1 id="header-tool-title">Deed & Upkeep Calculator</h1>
              <p id="header-tool-desc">
                Calculate deed dimensions, creation fees, monthly upkeep costs, and deed bank runway.
              </p>
            </div>
          </div>

          <div class="header-actions">
            <span class="badge-tag">Offline-Ready Client</span>
          </div>
        </header>

        <main class="tool-viewport" id="tool-viewport">
          <!-- Active Tool is mounted here -->
        </main>
      </div>
    `;
  }

  renderNavigation(searchFilter = '') {
    const navContainer = document.getElementById('sidebar-navigation');
    if (!navContainer) return;

    renderSidebarNavigation({
      container: navContainer,
      currentToolId: this.currentToolId,
      searchFilter,
      onSelectTool: (toolId) => {
        this.switchTool(toolId);
        document.getElementById('sidebar')?.classList.remove('open');
      },
    });
  }

  switchTool(toolId) {
    const tool = getToolById(toolId) || TOOLS_LIST[0];
    if (!tool) return;

    this.currentToolId = tool.toolMetadata.id;
    localStorage.setItem('wurm_active_tool', this.currentToolId);

    // Unmount previous tool
    if (this.currentMountedTool && typeof this.currentMountedTool.unmount === 'function') {
      this.currentMountedTool.unmount();
    }

    // Update header info
    const headerTitle = document.getElementById('header-tool-title');
    const headerDesc = document.getElementById('header-tool-desc');
    if (headerTitle) headerTitle.textContent = tool.toolMetadata.name;
    if (headerDesc) headerDesc.textContent = tool.toolMetadata.description;

    // Update sidebar navigation buttons
    document.querySelectorAll('.nav-item-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-tool-id') === this.currentToolId);
    });

    // Mount active tool into viewport
    const viewport = document.getElementById('tool-viewport');
    if (viewport) {
      viewport.innerHTML = '';
      tool.mount(viewport);
      this.currentMountedTool = tool;
    }
  }

  bindEvents() {
    const searchInput = document.getElementById('tool-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', this.handleSearchInput);
    }

    const mobileToggle = document.getElementById('mobile-menu-toggle');
    if (mobileToggle) {
      mobileToggle.addEventListener('click', this.handleMobileToggle);
    }

    const modalBackdrop = document.getElementById('concepts-modal');
    const openConceptsBtn = document.getElementById('open-concepts-modal-btn');
    const closeConceptsBtn = document.getElementById('close-concepts-modal');
    if (modalBackdrop && openConceptsBtn && closeConceptsBtn) {
      this.modalController = setupModal(modalBackdrop, openConceptsBtn, closeConceptsBtn);
    }
  }

  unbindEvents() {
    const searchInput = document.getElementById('tool-search-input');
    if (searchInput) {
      searchInput.removeEventListener('input', this.handleSearchInput);
    }

    const mobileToggle = document.getElementById('mobile-menu-toggle');
    if (mobileToggle) {
      mobileToggle.removeEventListener('click', this.handleMobileToggle);
    }

    if (this.currentMountedTool && typeof this.currentMountedTool.unmount === 'function') {
      this.currentMountedTool.unmount();
      this.currentMountedTool = null;
    }
  }

  handleSearchInput(e) {
    this.renderNavigation(e.target.value);
  }

  handleMobileToggle() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.toggle('open');
    }
  }
}
