// Dashboard Page Object
import { BasePage } from './BasePage.js';
import { TOOLS_LIST, getToolById } from '../../tools/registry.js';
import { renderSidebarNavigation } from '../navigation.js';
import { Modal } from '../modal.js';
import { renderShell } from '../shell.js';

export class DashboardPage extends BasePage {
  static pageId = 'dashboard';
  static pageAppID = 'dashboard-app';
  static sidebarNavigationID = 'sidebar-navigation';
  static sidebarID = 'sidebar';
  static toolSearchInputID = 'tool-search-input';
  static toolViewportID = 'tool-viewport';
  static mobileMenuToggleID = 'mobile-menu-toggle';
  static conceptsModalID = 'concepts-modal';
  static openConceptsModalBtnID = 'open-concepts-modal-btn';
  static closeConceptsModalBtnID = 'close-concepts-modal';
  static headerToolTitleID = 'header-tool-title';
  static headerToolDescID = 'header-tool-desc';
  static navItemBtnClass = '.nav-item-btn';
  static navItemActiveClass = 'active';
  static navItemDataToolId = 'data-tool-id';
  static activeToolKey = 'wurm_active_tool';
  static defaultToolId = 'deed-calculator';
  static toolSearchFunction = 'function';
  static sidebarOpenClass = 'open';
  static toolSearchInputEvent = 'input';
  static mobileMenuToggleEvent = 'click';
  static emptyString = '';
  static modalDisplayBlock = 'block';
  static modalDisplayNone = 'none';
  #dashboardViewport() {
    return document.getElementById(DashboardPage.toolViewportID);
  }
  #conceptsModal() {
    return document.getElementById(DashboardPage.conceptsModalID);
  }
  #sidebarNavigation() {
    return document.getElementById(DashboardPage.sidebarNavigationID);
  }
  #headerToolTitle() {
    return document.getElementById(DashboardPage.headerToolTitleID);
  }
  #headerToolDesc() {
    return document.getElementById(DashboardPage.headerToolDescID);
  }
  #navItemBtns() {
    return document.querySelectorAll(DashboardPage.navItemBtnClass);
  }
  #toolSearchInput() {
    return document.getElementById(DashboardPage.toolSearchInputID);
  }
  #mobileMenuToggle() {
    return document.getElementById(DashboardPage.mobileMenuToggleID);
  }
  #sidebar() {
    return document.getElementById(DashboardPage.sidebarID);
  }

  constructor() {
    super({
      id: DashboardPage.pageId,
      title: 'Companion Suite Dashboard',
      description: 'Modular toolkit and calculators for Wurm Online and Wurm Unlimited',
    });
    this.currentToolId =
      localStorage.getItem(DashboardPage.activeToolKey) || DashboardPage.defaultToolId;
    this.currentMountedTool = null;
    this.modalController = null;
    this.handleSearchInput = this.handleSearchInput.bind(this);
    this.handleMobileToggle = this.handleMobileToggle.bind(this);
    this.handleOpenConceptsModal = this.handleOpenConceptsModal.bind(this);
    this.handleCloseConceptsModal = this.handleCloseConceptsModal.bind(this);
  }

  handleOpenConceptsModal() {
    const modal = this.#conceptsModal();
    if (modal) modal.style.display = DashboardPage.modalDisplayBlock;
  }

  handleCloseConceptsModal() {
    const modal = this.#conceptsModal();
    if (modal) modal.style.display = DashboardPage.modalDisplayNone;
  }
  mount(container = document.getElementById(DashboardPage.pageAppID)) {
    super.mount(container);
  }

  render() {
    renderShell(this.container);
    this.renderNavigation();
    this.switchTool(this.currentToolId);
  }

  renderNavigation(searchFilter = DashboardPage.emptyString) {
    const navContainer = this.#sidebarNavigation();
    if (!navContainer) return;

    renderSidebarNavigation({
      container: navContainer,
      currentToolId: this.currentToolId,
      searchFilter,
      onSelectTool: (toolId) => {
        this.switchTool(toolId);
        this.#sidebar()?.classList.remove(DashboardPage.sidebarOpenClass);
      },
    });
  }

  switchTool(toolId) {
    const tool = getToolById(toolId) || TOOLS_LIST[0];
    if (!tool) return;

    this.currentToolId = tool.toolMetadata.id;
    localStorage.setItem(DashboardPage.activeToolKey, this.currentToolId);

    // Unmount previous tool
    if (
      this.currentMountedTool &&
      typeof this.currentMountedTool.unmount === DashboardPage.toolSearchFunction
    ) {
      this.currentMountedTool.unmount();
    }

    // Update header info
    const headerTitle = this.#headerToolTitle();
    const headerDesc = this.#headerToolDesc();
    if (headerTitle) headerTitle.textContent = tool.toolMetadata.name;
    if (headerDesc) headerDesc.textContent = tool.toolMetadata.description;

    // Update sidebar navigation buttons
    this.#navItemBtns().forEach((btn) => {
      btn.classList.toggle(
        DashboardPage.navItemActiveClass,
        btn.getAttribute(DashboardPage.navItemDataToolId) === this.currentToolId
      );
    });

    // Mount active tool into viewport
    const viewport = this.#dashboardViewport();
    if (viewport) {
      viewport.innerHTML = DashboardPage.emptyString;
      tool.mount(viewport);
      this.currentMountedTool = tool;
    }
  }

  bindEvents() {
    const searchInput = this.#toolSearchInput();
    if (searchInput) {
      searchInput.addEventListener(DashboardPage.toolSearchInputEvent, this.handleSearchInput);
    }
    const mobileToggle = this.#mobileMenuToggle();
    if (mobileToggle) {
      mobileToggle.addEventListener(DashboardPage.mobileMenuToggleEvent, this.handleMobileToggle);
    }
    this.modalController = new Modal(
      DashboardPage.conceptsModalID,
      DashboardPage.openConceptsModalBtnID,
      DashboardPage.closeConceptsModalBtnID
    );
  }

  unbindEvents() {
    const searchInput = this.#toolSearchInput();
    if (searchInput) {
      searchInput.removeEventListener(DashboardPage.toolSearchInputEvent, this.handleSearchInput);
    }
    const mobileToggle = this.#mobileMenuToggle();
    if (mobileToggle) {
      mobileToggle.removeEventListener(
        DashboardPage.mobileMenuToggleEvent,
        this.handleMobileToggle
      );
    }

    if (
      this.currentMountedTool &&
      typeof this.currentMountedTool.unmount === DashboardPage.toolSearchFunction
    ) {
      this.currentMountedTool.unmount();
      this.currentMountedTool = null;
    }
  }

  handleSearchInput(e) {
    this.renderNavigation(e.target.value);
  }

  handleMobileToggle() {
    const sidebar = this.#sidebar();
    if (sidebar) {
      sidebar.classList.toggle(DashboardPage.sidebarOpenClass);
    }
  }
}
