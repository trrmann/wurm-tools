// Base Page Object Model for Wurm Tools
import { identityRequest } from '../../tools/heroes/session.js';

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
    if (this.brand === 'Wurm Tools') {
      const status = document.createElement('p');
      status.setAttribute('role', 'status');
      status.textContent = 'Checking your account access to Wurm tools...';
      container.replaceChildren(status);
      this.accessReady = identityRequest('wurm/access')
        .then((access) => {
          if (access.allowed !== true) throw new Error('The helper did not confirm Wurm access');
          if (!this.isMounted) return;
          this.render();
          this.bindEvents();
        })
        .catch((error) => {
          if (!this.isMounted) return;
          status.textContent = `${error.message}. Wurm tools require an authorized account; local helper features also require browser pairing.`;
          for (const [label, href] of [
            ['Sign in', '/site/heroes/login/'],
            ['Account & security', '/site/heroes/account/'],
            ['First-time helper setup', '/site/heroes/setup/'],
          ]) {
            const link = document.createElement('a');
            link.textContent = label;
            link.href = href;
            container.append(link);
          }
        });
      return;
    }
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
