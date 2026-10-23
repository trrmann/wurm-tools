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
import { identityRequest, heroesSessionToken } from '../../tools/heroes/session.js';
import { createHeroesClient } from '../../tools/heroes/helper-client.js';
import { mountHeroesDirectory } from '../../tools/heroes/directory.js';
import { mountHeroesSharing } from '../../tools/heroes/sharing.js';
import { mountHeroesImpersonation } from '../../tools/heroes/impersonation.js';
import { mountHeroesSubscriptions } from '../../tools/heroes/subscriptions.js';
import { mountHeroesCopies } from '../../tools/heroes/copies.js';

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
    if (this.page.public) {
      document.documentElement.dataset.game = 'heroes';
      this.teardownSharing = mountHeroesSharing(this.container, { publicOnly: true });
      if (heroesSessionToken()) this.renderPublicAccount();
      return;
    }
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
        if (access.stage === 'ready') {
          const controls = document.createElement('div');
          this.viewport.before(controls);
          this.teardownImpersonation = mountHeroesImpersonation(controls, { user: access.user });
          if (
            !access.user.impersonation &&
            (!this.page.account ||
              this.page.account === 'account' ||
              this.page.account.startsWith('admin'))
          ) {
            identityRequest('preferences/save', {
              location: window.location.pathname + window.location.search,
            }).catch((error) => {
              if (!this.isMounted) return;
              const warning = document.createElement('p');
              warning.setAttribute('role', 'status');
              warning.textContent = `Unable to remember this location: ${error.message}`;
              this.viewport.prepend(warning);
            });
          }
        }
        status.remove();
        if (this.page.account) {
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
          if (this.page.account === 'admin') {
            const directory = document.createElement('div');
            this.viewport.prepend(directory);
            this.teardownDirectory = mountHeroesDirectory(directory, { user: access.user });
            const subscriptions = document.createElement('div');
            directory.after(subscriptions);
            this.teardownSubscriptions = mountHeroesSubscriptions(subscriptions, {
              user: access.user,
              role: 'admin',
            });
          }
        } else this.renderWorkspace(access);
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
        writable: permissions.writable,
        deletable: permissions.deletable,
        owned: permissions.owned,
      };
    } catch (error) {
      if (error.status === 401) return { stage: 'anonymous' };
      throw error;
    }
  }

  async renderPublicAccount() {
    try {
      const result = await identityRequest('me');
      if (!this.isMounted || result.mfaRequired || result.enrollmentRequired) return;
      const toolbar = document.createElement('header');
      toolbar.className = 'top-header heroes-public-toolbar';
      const title = document.createElement('div');
      title.className = 'header-title-container';
      const identity = document.createElement('p');
      identity.className = 'sidebar-subtitle';
      title.append(identity);
      toolbar.append(title);
      this.container.prepend(toolbar);
      applyHeroesBranding(this.container, { stage: 'ready', user: result.user });
      const approvals = document.createElement('div');
      toolbar.after(approvals);
      this.teardownImpersonation = mountHeroesImpersonation(approvals, { user: result.user });
      if (!result.user.impersonation)
        await identityRequest('preferences/save', {
          location: window.location.pathname + window.location.search,
        });
    } catch (error) {
      if (!this.isMounted) return;
      const status = document.createElement('p');
      status.setAttribute('role', 'status');
      status.textContent =
        error.status === 401
          ? 'Your account session ended. Public content remains available; use Profile to sign in.'
          : `Unable to load account controls: ${error.message}. Public content remains available.`;
      this.container.prepend(status);
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
    const sidebar = this.container.querySelector('#sidebar');
    const sidebarList = this.container.querySelector('#sidebar-navigation');
    if (sidebar && sidebarList) {
      const empty = sidebarList.children.length === 0;
      sidebar.hidden = empty;
      this.container.classList.toggle('heroes-no-sidebar', empty);
      const toggle = this.container.querySelector('#mobile-menu-toggle');
      if (toggle) toggle.hidden = empty;
    }
  }

  renderWorkspace(access) {
    if (this.page.sharing) {
      const sharing = document.createElement('div');
      const copies = document.createElement('div');
      copies.id = 'copies';
      this.viewport.append(sharing, copies);
      this.teardownSharing = mountHeroesSharing(sharing);
      this.teardownCopies = mountHeroesCopies(copies);
    }
    if (this.page.editor)
      heroesEditor.mount(this.viewport, {
        page: this.page,
        accountRoles: access.user.roles,
        writable: access.writable,
        deletable: access.deletable,
        owned: access.owned,
      });
    if (this.page.section) {
      if (this.page.section === 'profile') {
        const directory = document.createElement('div');
        this.viewport.append(directory);
        this.teardownDirectory = mountHeroesDirectory(directory, {
          user: access.user,
          role: this.page.role,
        });
        if (access.user.roles.some((role) => ['player', 'game-master', 'admin'].includes(role))) {
          const subscriptions = document.createElement('div');
          this.viewport.append(subscriptions);
          this.teardownSubscriptions = mountHeroesSubscriptions(subscriptions, {
            user: access.user,
          });
        }
      }
      const management = document.createElement('div');
      this.viewport.append(management);
      this.teardownPeople = mountHeroesPeople(management, {
        section: this.page.section,
        role: this.page.role,
        title: this.page.title,
        accountRoles: access.user.roles,
        routes: access.routes,
        writable: access.writable,
      });
    }
  }

  bindEvents() {}

  unbindEvents() {
    heroesEditor.unmount();
    this.teardownPeople?.();
    this.teardownDirectory?.();
    this.teardownSharing?.();
    this.teardownImpersonation?.();
    this.teardownSubscriptions?.();
    this.teardownCopies?.destroy();
    this.teardownAccounts?.();
    this.teardownSidebar?.();
    this.teardownSidebar = null;
  }
}
