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
} from '../src/js/modules/pages/heroes-navigation.js';

describe('Heros contextual pages', () => {
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

  it('assigns every model-defined object kind to exactly one object editor', () => {
    const editors = HEROES_PAGES.filter(
      (page) => page.editor && !['worlds', 'library'].includes(page.editor)
    );
    for (const { type } of getHerosObjectTypes()) {
      const object = { kind: type };
      const matches = editors.filter((page) => isObjectForHeroesPage(object, page));
      expect(matches, type).toHaveLength(1);
      expect(matches[0]).toBe(getHeroesObjectPage(object));
      expect(matches[0].editor).toBe(
        ['player-character', 'non-player-character'].includes(type) ? type : 'objects'
      );
    }
    expect(
      getHeroesObjectPage({ kind: 'object', definition: { objectType: 'player-character' } }).editor
    ).toBe('player-character');
    expect(getHeroesObjectPage({ definition: { kind: 'non-player-character' } }).editor).toBe(
      'non-player-character'
    );
  });

  it('carries only organizational context between pages, never an object selection or secret', () => {
    expect(heroesPageHref(HEROES_PAGES[1], '?world=w1&profile=p1&object=o1&token=secret')).toBe(
      '/site/heroes/genres/?world=w1&profile=p1'
    );
    expect(heroesPageHref({ href: '/' }, '?world=w1&profile=p1')).toBe('/');
    expect(heroesPageHref(HEROES_PAGES[0])).toBe('/site/heroes/');
  });

  it.each([
    ['/site/heroes/player-characters/', 'worlds', 'Player characters'],
    ['/site/heroes/people/players/', 'people', 'Players'],
    ['/site/heroes/people/admins/index.html', 'people', 'Admins'],
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
        HEROES_PAGES.filter((page) => page.group === group).map((page) => page.title)
      );
      expect(
        links.filter((link) => link['aria-current'] === 'page').map((link) => link.textContent)
      ).toEqual([activeTitle]);
      expect(links.every((link) => link.href.includes('world=w1&profile=p1'))).toBe(true);
      renderHeroesNavigation(container, activeTitle.toUpperCase());
      expect(links.map((link) => link.textContent)).toEqual(
        HEROES_PAGES.filter(
          (page) =>
            page.group === group && page.title.toLowerCase().includes(activeTitle.toLowerCase())
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
