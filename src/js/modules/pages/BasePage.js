// Base Page Object Model for Wurm Tools
export class BasePage {
  static pageAppID = 'page-app'; // Override in derived page classes
  static initPage() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', this.initThisPage);
    } else {
      this.initThisPage();
    }
  }
  static initThisPage() {
    const container = document.getElementById(this.pageAppID);
    if (container) {
      const page = new this();
      page.mount(container);
    }
  }
  constructor({ id, title, description, brand = 'Wurm Tools' } = {}) {
    this.id = id || 'base-page';
    this.title = title || 'Wurm Tools';
    this.description = description || '';
    this.brand = brand;
    this.container = null;
    this.isMounted = false;
  }

  mount(container) {
    this.container = container;
    this.isMounted = true;
    this.updateDocumentTitle();
    this.render();
    this.bindEvents();
  }

  unmount() {
    this.unbindEvents();
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.isMounted = false;
  }

  updateDocumentTitle() {
    if (this.title) {
      document.title = `${this.title} — ${this.brand}`;
    }
  }

  render() {
    // Override in derived page classes
  }

  bindEvents() {
    // Override in derived page classes
  }

  unbindEvents() {
    // Override in derived page classes
  }
}
