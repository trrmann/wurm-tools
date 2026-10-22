import { BasePage } from './BasePage.js';
import * as heroesEditor from '../../tools/heroes/index.js';
import { renderShell, setHeader, initSidebar } from '../shell.js';
import { applyHeroesBranding } from './heroes-branding.js';
import { getHeroesPage, renderHeroesNavigation } from './heroes-navigation.js';
import { mountHeroesPeople } from '../../tools/heroes/people.js';

export class HeroesPage extends BasePage {
  static pageAppID = 'heroes-app';

  constructor() {
    const page = getHeroesPage(window.location.pathname);
    super({
      id: 'heroes',
      title: page.title,
      description: 'Local HERO System workspace - access is shared by all paired clients',
      brand: 'Heros Tools',
    });
    this.page = page;
    this.teardownSidebar = null;
  }

  render() {
    if (!this.container) return;
    this.viewport = renderShell(this.container);
    applyHeroesBranding(this.container);
    setHeader(this.title, this.description);
    if (this.page.admin) {
      const notice = document.createElement('section');
      notice.className = 'heroes-workspace heroes-management-notice';
      const heading = document.createElement('h2');
      heading.textContent = 'Administrator accounts and ACLs are deferred';
      const detail = document.createElement('p');
      detail.textContent =
        'There are no administrator accounts or per-record permissions in this local workspace. All paired clients can read and change all records and GM notes. Profile roles and sidebar filters are organizational only. Do not store passwords or confidential notes here.';
      notice.append(heading, detail);
      this.viewport.append(notice);
      return;
    }
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

  bindEvents() {
    this.teardownSidebar = initSidebar({
      currentToolId: null,
      onSelectTool: () => {},
      renderList: renderHeroesNavigation,
      searchLabel: 'Search Heros pages',
    });
  }

  unbindEvents() {
    heroesEditor.unmount();
    this.teardownPeople?.();
    this.teardownSidebar?.();
    this.teardownSidebar = null;
  }
}
