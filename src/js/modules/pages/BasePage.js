// Base Page Object Model for Wurm Tools
export class BasePage {
  constructor({ id, title, description } = {}) {
    this.id = id || 'base-page';
    this.title = title || 'Wurm Tools';
    this.description = description || '';
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
      document.title = `${this.title} — Wurm Tools`;
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
