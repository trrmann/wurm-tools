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
import { createHeroesClient } from '../../tools/heroes/helper-client.js';

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
    if (['/', '/index.html'].includes(window.location.pathname)) {
      document.documentElement.dataset.game = 'heroes';
      this.container.classList.add('heroes-login-entry');
      this.teardownAccounts = mountHeroesAccounts(this.container, 'login');
      return;
    }
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
            onAccessChange: (next) => {
              if (next.stage !== 'ready') return this.setAccess(next);
              this.checkAccess()
                .then((updated) => {
                  if (this.isMounted) this.setAccess(updated);
                })
                .catch((error) => {
                  if (!this.isMounted) return;
                  this.setAccess({ stage: 'checking' });
                  status.textContent = `Unable to refresh HERO access: ${error.message}`;
                  this.viewport.prepend(status);
                });
            },
            accessDenied:
              new URLSearchParams(window.location.search).get('notice') === 'route-denied',
          });
        else this.renderWorkspace(access);
      })
      .catch((error) => {
        if (!this.isMounted) return;
        status.textContent = `Unable to check HERO access: ${error.message}`;
      });
  }

  async checkAccess() {
    const state = await identityRequest('status');
    if (state.setupRequired) return { stage: 'setup' };
    try {
      const result = await identityRequest('me');
      const pending = result.mfaRequired || result.enrollmentRequired;
      const permissions = pending ? { routes: [] } : await createHeroesClient()('/heroes/access');
      if (
        !Array.isArray(permissions.routes) ||
        permissions.routes.some((route) => typeof route !== 'string')
      )
        throw new Error(
          'The helper did not provide a valid HERO route list. Update and restart the helper.'
        );
      return {
        stage: pending ? 'mfa' : 'ready',
        user: result.user,
        routes: permissions.routes,
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

  renderWorkspace(access) {
    if (this.page.editor) heroesEditor.mount(this.viewport, { page: this.page });
    if (this.page.section) {
      const management = document.createElement('div');
      this.viewport.append(management);
      this.teardownPeople = mountHeroesPeople(management, {
        section: this.page.section,
        role: this.page.role,
        title: this.page.title,
        accountRoles: access.user.roles,
        routes: access.routes,
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
