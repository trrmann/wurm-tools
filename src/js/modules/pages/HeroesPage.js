import { BasePage } from './BasePage.js';
import * as heroesEditor from '../../tools/heroes/index.js';
import { renderShell, setHeader, initSidebar } from '../shell.js';
import { applyHeroesBranding } from './heroes-branding.js';
import {
  getHeroesPage,
  renderHeroesNavigation,
  heroesAccessRedirect,
} from './heroes-navigation.js';
import { mountHeroesPeople } from '../../tools/heroes/people.js';
import { mountHeroesAccounts } from '../../tools/heroes/accounts.js';
import { identityRequest } from '../../tools/heroes/session.js';

export class HeroesPage extends BasePage {
  static pageAppID = 'heroes-app';

  constructor() {
    const page = getHeroesPage(window.location.pathname);
    super({
      id: 'heroes',
      title: page.title,
      description:
        'Local HERO System workspace - signed-in accounts and server-enforced permissions',
      brand: 'Heros Tools',
    });
    this.page = page;
    this.teardownSidebar = null;
  }

  render() {
    if (!this.container) return;
    this.viewport = renderShell(this.container);
    applyHeroesBranding(this.container, { stage: 'checking' });
    setHeader(this.title, this.description);
    if (this.page.account === 'setup') {
      this.setAccess({ stage: 'setup' });
      this.teardownAccounts = mountHeroesAccounts(this.viewport, 'setup', {
        onAccessChange: (access) => this.setAccess(access),
      });
      return;
    }
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.textContent = 'Checking your HERO account...';
    this.viewport.append(status);
    this.checkAccess()
      .then((access) => {
        if (!this.isMounted) return;
        const redirect = heroesAccessRedirect(this.page, access);
        if (redirect) {
          window.location.replace(redirect);
          return;
        }
        this.setAccess(access);
        status.remove();
        if (this.page.account)
          this.teardownAccounts = mountHeroesAccounts(this.viewport, this.page.account, {
            onAccessChange: (access) => this.setAccess(access),
          });
        else this.renderWorkspace();
      })
      .catch(() => {
        if (!this.isMounted) return;
        window.location.replace('/site/heroes/setup/');
      });
  }

  async checkAccess() {
    const state = await identityRequest('status');
    if (state.setupRequired) return { stage: 'setup' };
    try {
      const result = await identityRequest('me');
      return {
        stage: result.mfaRequired || result.enrollmentRequired ? 'mfa' : 'ready',
        user: result.user,
      };
    } catch (error) {
      if (error.status === 401) return { stage: 'anonymous' };
      throw error;
    }
  }

  setAccess(access) {
    applyHeroesBranding(this.container, access);
    this.teardownSidebar?.();
    this.teardownSidebar = initSidebar({
      currentToolId: null,
      onSelectTool: () => {},
      renderList: (container, filter) => renderHeroesNavigation(container, filter, access),
      searchLabel: 'Search Heros pages',
    });
  }

  renderWorkspace() {
    if (this.page.editor) heroesEditor.mount(this.viewport, { page: this.page });
    if (this.page.section) {
      const management = document.createElement('div');
      this.viewport.append(management);
      this.teardownPeople = mountHeroesPeople(management, {
        section: this.page.section,
        role: this.page.role,
        title: this.page.title,
      });
    }
  }

  bindEvents() {}

  unbindEvents() {
    heroesEditor.unmount();
    this.teardownPeople?.();
    this.teardownAccounts?.();
    this.teardownSidebar?.();
    this.teardownSidebar = null;
  }
}
