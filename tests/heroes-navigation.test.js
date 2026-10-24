import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import config from '../vite.config.js';
import { getHerosObjectTypes } from '../src/js/modules/objects/heroes/object-generator.mjs';
import {
  HEROES_PAGES,
  getHeroesPage,
  getHeroesObjectPage,
  heroesPageHref,
  isObjectForHeroesPage,
  renderHeroesNavigation,
  updateHeroesContext,
  heroesAccessPages,
  heroesAccessRedirect,
  heroesWorkspaceRoutes,
  heroesNavigationLinks,
  heroesObjectEditorHref,
} from '../src/js/modules/pages/heroes-navigation.js';

describe('Heros contextual pages', () => {
  it('uses Heros login at the root and builds a separate Wurm home', () => {
    expect(getHeroesPage('/').account).toBe('login');
    expect(getHeroesPage('/index.html').account).toBe('login');
    const root = readFileSync(config.build.rollupOptions.input.login, 'utf8');
    const wurm = readFileSync(config.build.rollupOptions.input.dashboard, 'utf8');
    expect(root).toContain('<title>Login — Heros Tools</title>');
    const description = root.match(/name="description"\s+content="([^"]+)"/)?.[1];
    expect(description).toBeDefined();
    expect(description.length).toBeGreaterThanOrEqual(30);
    expect(root).toContain('id="heroes-app"');
    expect(root).not.toContain('dashboard-app');
    expect(wurm).toContain('id="dashboard-app"');
    expect(wurm).toContain('https://wurm-tools.onrender.com/site/wurm/');
    expect(config.build.rollupOptions.input.dashboard).toMatch(/site\/wurm\/index\.html$/);
  });

  it('hides every unauthorized workspace route from sidebars, grouped menus and direct URLs', () => {
    const access = { stage: 'ready', user: { roles: ['visitor'] }, routes: [] };
    expect(heroesAccessPages(access).map((page) => page.account)).toEqual([
      'public',
      'account',
      'logout',
    ]);
    expect(heroesNavigationLinks(access)).toEqual([
      ['Profile', '/site/heroes/account/'],
      ['Logout', '/site/heroes/logout/'],
    ]);
    for (const page of HEROES_PAGES.filter((page) => !page.account))
      expect(heroesAccessRedirect(page, access)).toBe('/site/heroes/account/?notice=route-denied');
    expect(heroesAccessRedirect(getHeroesPage('/site/heroes/people/admins/'), access)).toBe(
      '/site/heroes/account/?notice=route-denied'
    );
    access.routes = ['/site/heroes/player-characters/', '/site/heroes/people/players/'];
    expect(heroesNavigationLinks(access)).toContainEqual([
      'Worlds & objects',
      '/site/heroes/player-characters/',
    ]);
    expect(heroesNavigationLinks(access)).toContainEqual([
      'Game Masters & players',
      '/site/heroes/people/players/',
    ]);
    expect(
      heroesAccessRedirect(getHeroesPage('/site/heroes/player-characters/'), access)
    ).toBeNull();
    const links = [];
    vi.stubGlobal('window', {
      location: { pathname: '/site/heroes/player-characters/', search: '' },
    });
    vi.stubGlobal('document', { createElement: () => ({ setAttribute() {} }) });
    try {
      renderHeroesNavigation(
        {
          replaceChildren() {
            links.length = 0;
          },
          append(link) {
            links.push(link);
          },
        },
        '',
        access
      );
      expect(links.map((link) => link.href)).toEqual(['/site/heroes/player-characters/']);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('keeps role-authorized creation routes and derives read-only routes from permitted resource kinds', () => {
    const empty = { worlds: [], objects: [], records: [] };
    expect(heroesWorkspaceRoutes(['visitor'], empty, [])).toEqual([]);
    const player = heroesWorkspaceRoutes(['player'], empty, []);
    expect(player).toContain('/site/heroes/player-characters/');
    expect(player).toContain('/site/heroes/objects/');
    expect(player).not.toContain('/site/heroes/genres/');
    expect(player).not.toContain('/site/heroes/people/notes/');
    expect(heroesWorkspaceRoutes(['game-master'], empty, [])).toEqual(
      HEROES_PAGES.filter(
        (page) => !page.account && (!page.requiredRole || page.requiredRole === 'game-master')
      ).map((page) => page.href)
    );
    const resources = {
      worlds: [],
      objects: [{ kind: 'player-character' }],
      records: [
        { kind: 'profile', data: { roles: ['player'] } },
        { kind: 'note', data: {} },
      ],
    };
    expect(heroesWorkspaceRoutes(['visitor'], resources, [])).toEqual([
      '/site/heroes/player-characters/',
      '/site/heroes/player-characters/build/',
      '/site/heroes/people/players/',
    ]);
    expect(heroesWorkspaceRoutes(['visitor'], empty, [{}])).toEqual(['/site/heroes/library/']);
    expect(heroesWorkspaceRoutes(['admin'], empty, [])).toEqual(
      HEROES_PAGES.filter(
        (page) =>
          !page.account &&
          (page.sharing || page.section === 'profile' || page.requiredRole === 'admin')
      ).map((page) => page.href)
    );
  });

  it('denies administrator game-editor URLs and replaces impersonated logout with Profile release guidance', () => {
    const access = {
      stage: 'ready',
      user: { roles: ['admin'], assignedRoles: ['admin', 'game-master', 'player'] },
      routes: heroesWorkspaceRoutes(['admin'], { worlds: [], records: [], objects: [] }, []),
    };
    for (const route of ['/site/heroes/', '/site/heroes/campaigns/', '/site/heroes/objects/'])
      expect(heroesAccessRedirect(getHeroesPage(route), access)).toBe(
        '/site/heroes/account/?notice=route-denied'
      );
    access.user.impersonation = { actorId: 'original-admin', preview: true };
    expect(heroesAccessPages(access).some((page) => page.account === 'logout')).toBe(false);
    expect(heroesNavigationLinks(access).some(([label]) => label === 'Logout')).toBe(false);
    expect(heroesAccessRedirect(getHeroesPage('/site/heroes/logout/'), access)).toBe(
      '/site/heroes/account/?notice=release-required'
    );
  });

  it('offers only setup until the first administrator exists, even for direct URLs', () => {
    expect(heroesAccessPages({ stage: 'checking' })).toEqual([]);
    const access = { stage: 'setup' };
    expect(heroesAccessPages(access).map((page) => page.account)).toEqual(['setup']);
    for (const page of HEROES_PAGES)
      expect(heroesAccessRedirect(page, access)).toBe(
        page.account === 'setup' ? null : '/site/heroes/setup/'
      );
  });

  it('hides workspaces until sign-in and two-factor authentication are complete', () => {
    expect(heroesAccessPages({ stage: 'anonymous' }).map((page) => page.account)).toEqual([
      'login',
      'register',
    ]);
    expect(heroesAccessPages({ stage: 'mfa' }).map((page) => page.account)).toEqual([
      'account',
      'logout',
    ]);
    for (const page of HEROES_PAGES) {
      if (!['account', 'logout'].includes(page.account))
        expect(heroesAccessRedirect(page, { stage: 'mfa' })).toBe('/site/heroes/account/');
      if (!['login', 'register', 'logout-success', 'setup'].includes(page.account))
        expect(heroesAccessRedirect(page, { stage: 'anonymous' })).toBe('/site/heroes/login/');
    }
    const player = { stage: 'ready', user: { roles: ['player'] } };
    expect(heroesAccessPages(player).some((page) => page.account === 'admin')).toBe(false);
    expect(heroesAccessPages(player).some((page) => page.account === 'setup')).toBe(false);
    expect(
      heroesAccessPages({ stage: 'ready', user: { roles: ['admin'] } }).some(
        (page) => page.account === 'admin'
      )
    ).toBe(true);
  });
  it('builds a real HTML entry for every dedicated page and supports index URLs', () => {
    const inputs = Object.values(config.build.rollupOptions.input);
    expect(new Set(HEROES_PAGES.map((page) => page.href)).size).toBe(HEROES_PAGES.length);
    for (const page of HEROES_PAGES) {
      expect(getHeroesPage(`${page.href}index.html`)).toBe(page);
      expect(getHeroesPage(page.href.slice(0, -1))).toBe(page);
      const file = inputs.find((input) =>
        input.replaceAll('\\', '/').endsWith(`${page.href}index.html`)
      );
      expect(file, page.href).toBeDefined();
      expect(readFileSync(file, 'utf8')).toMatch(/id="heroes-(?:people-)?app"/);
    }
  });

  it('assigns every model-defined object kind to one collection and its separate builder', () => {
    const editors = HEROES_PAGES.filter(
      (page) => page.editor && !page.builder && !['worlds', 'library'].includes(page.editor)
    );
    for (const { type } of getHerosObjectTypes()) {
      const object = { kind: type };
      const matches = editors.filter((page) => isObjectForHeroesPage(object, page));
      expect(matches, type).toHaveLength(1);
      expect(matches[0]).toBe(getHeroesObjectPage(object));
      expect(matches[0].editor).toBe(
        ['player-character', 'non-player-character'].includes(type) ? type : 'objects'
      );
      const builder = HEROES_PAGES.find(
        (page) => page.builder && page.editor === matches[0].editor
      );
      expect(isObjectForHeroesPage(object, builder)).toBe(true);
      expect(builder.collectionHref).toBe(matches[0].href);
      expect(builder.navigation).toBe(false);
    }
    expect(
      getHeroesObjectPage({ kind: 'object', definition: { objectType: 'player-character' } }).editor
    ).toBe('player-character');
    expect(getHeroesObjectPage({ definition: { kind: 'non-player-character' } }).editor).toBe(
      'non-player-character'
    );
  });

  it('links create/edit/view to category builders without leaking unrelated query parameters', () => {
    for (const path of ['player-characters', 'non-player-characters', 'objects']) {
      const page = getHeroesPage(`/site/heroes/${path}/`);
      expect(heroesObjectEditorHref(page, '?world=w1&profile=p1&object=old&token=secret')).toBe(
        `/site/heroes/${path}/build/?world=w1&profile=p1`
      );
      expect(heroesObjectEditorHref(page, '?world=w1', 'object /?')).toBe(
        `/site/heroes/${path}/build/?world=w1&object=object+%2F%3F`
      );
      const access = { stage: 'ready', user: { roles: ['admin'] }, routes: [] };
      expect(heroesAccessRedirect(getHeroesPage(`/site/heroes/${path}/build/`), access)).toBe(
        '/site/heroes/account/?notice=route-denied'
      );
    }
  });

  it('carries only organizational context between pages, never an object selection or secret', () => {
    expect(
      heroesPageHref(
        getHeroesPage('/site/heroes/genres/'),
        '?world=w1&profile=p1&object=o1&token=secret'
      )
    ).toBe('/site/heroes/genres/?world=w1&profile=p1');
    expect(heroesPageHref({ href: '/' }, '?world=w1&profile=p1')).toBe('/');
    expect(heroesPageHref(getHeroesPage('/site/heroes/'))).toBe('/site/heroes/');
  });

  it.each([
    ['/site/heroes/player-characters/', 'worlds', 'Player characters'],
    ['/site/heroes/player-characters/build/', 'worlds', 'Player characters'],
    ['/site/heroes/non-player-characters/build/', 'worlds', 'Non-player characters'],
    ['/site/heroes/objects/build/', 'worlds', 'Objects'],
    ['/site/heroes/people/players/', 'people', 'Players'],
    ['/site/heroes/people/admins/index.html', 'people', 'System administrators'],
  ])('renders only contextual sidebar entries at %s', (pathname, group, activeTitle) => {
    const links = [];
    vi.stubGlobal('window', { location: { pathname, search: '?world=w1&profile=p1' } });
    vi.stubGlobal('document', {
      createElement: () => ({
        setAttribute(name, value) {
          this[name] = value;
        },
      }),
    });
    try {
      const container = {
        replaceChildren: () => links.splice(0),
        append: (link) => links.push(link),
      };
      renderHeroesNavigation(container);
      expect(links.map((link) => link.textContent)).toEqual(
        HEROES_PAGES.filter((page) => page.group === group && page.navigation !== false).map(
          (page) => page.title
        )
      );
      expect(
        links.filter((link) => link['aria-current'] === 'page').map((link) => link.textContent)
      ).toEqual([activeTitle]);
      expect(links.every((link) => link.href.includes('world=w1&profile=p1'))).toBe(true);
      renderHeroesNavigation(container, activeTitle.toUpperCase());
      expect(links.map((link) => link.textContent)).toEqual(
        HEROES_PAGES.filter(
          (page) =>
            page.group === group &&
            page.navigation !== false &&
            page.title.toLowerCase().includes(activeTitle.toLowerCase())
        ).map((page) => page.title)
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('updates existing navigation when the selected world or profile changes', () => {
    const links = [
      { href: 'http://localhost/site/heroes/player-characters/?world=old' },
      { href: 'http://localhost/site/heroes/people/' },
      { href: 'http://localhost/' },
    ];
    const replaceState = vi.fn();
    vi.stubGlobal('window', {
      location: { href: 'http://localhost/site/heroes/?world=old', origin: 'http://localhost' },
      history: { replaceState },
    });
    vi.stubGlobal('document', { querySelectorAll: () => links });
    try {
      updateHeroesContext({ world: 'new', profile: 'p1' });
      expect(String(replaceState.mock.calls[0][2])).toBe(
        'http://localhost/site/heroes/?world=new&profile=p1'
      );
      expect(links[0].href).toBe('/site/heroes/player-characters/?world=new&profile=p1');
      expect(links[1].href).toBe('/site/heroes/people/?world=new&profile=p1');
      expect(links[2].href).toBe('http://localhost/');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
