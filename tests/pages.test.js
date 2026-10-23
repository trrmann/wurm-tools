import { describe, it, expect, vi } from 'vitest';
import { BasePage } from '../src/js/modules/pages/BasePage.js';
import { ConceptsPage, ROADMAP_CATEGORIES } from '../src/js/modules/pages/ConceptsPage.js';
import { PRIMARY_NAVIGATION, TOOLS_LIST, getToolById } from '../src/js/tools/registry.js';
import { HEROES_NAVIGATION } from '../src/js/modules/pages/heroes-navigation.js';
import { identityRequest } from '../src/js/tools/heroes/session.js';

vi.mock('../src/js/tools/heroes/session.js', () => ({ identityRequest: vi.fn() }));

describe('Tool Registry Migration', () => {
  it('loads all registered tools from src/js/tools/registry.js', () => {
    expect(TOOLS_LIST).toHaveLength(4);
    const ids = TOOLS_LIST.map((t) => t.toolMetadata.id);
    expect(ids).toContain('deed-calculator');
    expect(ids).toContain('action-timers');
    expect(ids).toContain('distance-calc');
    expect(ids).toContain('player-notes');
    expect(ids).not.toContain('map-explorer');
    expect(PRIMARY_NAVIGATION).toContainEqual({
      id: 'map-explorer',
      name: 'World Map',
      href: '/site/map-explorer/',
    });
    expect(PRIMARY_NAVIGATION).toContainEqual({
      id: 'heroes',
      name: 'HERO Worlds',
      href: '/site/heroes/',
    });
  });

  it('retrieves tool metadata by id', () => {
    const deed = getToolById('deed-calculator');
    expect(deed).toBeDefined();
    expect(deed.toolMetadata.name).toBe('Deed & Upkeep Calculator');
  });
});

describe('Page Objects Model', () => {
  it('mounts no Wurm tools or events until authorized and gives explicit sign-in guidance on denial', async () => {
    const makeNode = () => ({
      children: [],
      setAttribute() {},
      append(node) {
        this.children.push(node);
      },
      replaceChildren(...nodes) {
        this.children = nodes;
      },
    });
    vi.stubGlobal('document', { title: '', createElement: makeNode });
    try {
      const page = new BasePage({ title: 'Restricted' });
      page.render = vi.fn();
      page.bindEvents = vi.fn();
      const container = makeNode();
      identityRequest.mockRejectedValueOnce(new Error('Access denied'));
      page.mount(container);
      expect(page.render).not.toHaveBeenCalled();
      await page.accessReady;
      expect(page.render).not.toHaveBeenCalled();
      expect(page.bindEvents).not.toHaveBeenCalled();
      expect(container.children[0].textContent).toContain('Access denied');
      expect(container.children.find((node) => node.textContent === 'Sign in').href).toBe(
        '/site/heroes/login/'
      );
      identityRequest.mockResolvedValueOnce({ allowed: true });
      page.mount(container);
      await page.accessReady;
      expect(identityRequest).toHaveBeenCalledWith('wurm/access');
      expect(page.render).toHaveBeenCalledOnce();
      expect(page.bindEvents).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('does not mount Wurm tools after unmount while authorization is pending', async () => {
    vi.stubGlobal('document', { title: '', createElement: () => ({ setAttribute() {} }) });
    try {
      let complete;
      identityRequest.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            complete = resolve;
          })
      );
      const page = new BasePage();
      page.render = vi.fn();
      page.mount({ replaceChildren() {} });
      page.unmount();
      complete({ allowed: true });
      await page.accessReady;
      expect(page.render).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it('keeps Wurm and Heros document branding separate', () => {
    vi.stubGlobal('document', { title: '' });
    try {
      new BasePage({ title: 'Dashboard' }).updateDocumentTitle();
      expect(document.title).toBe('Dashboard — Wurm Tools');
      new BasePage({ title: 'Game Masters & players', brand: 'Heros Tools' }).updateDocumentTitle();
      expect(document.title).toBe('Game Masters & players — Heros Tools');
      expect(HEROES_NAVIGATION).toContainEqual(['Game Masters & players', '/site/heroes/people/']);
      expect(HEROES_NAVIGATION).toContainEqual(['Wurm Tools', '/site/wurm/']);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it('initializes BasePage with default options', () => {
    const base = new BasePage();
    expect(base.id).toBe('base-page');
    expect(base.isMounted).toBe(false);
  });

  it('provides roadmap categories and concepts in ConceptsPage', () => {
    const page = new ConceptsPage();
    expect(page.id).toBe('concepts');
    expect(ROADMAP_CATEGORIES.length).toBeGreaterThan(0);

    const activeItems = ROADMAP_CATEGORIES.flatMap((c) => c.items).filter(
      (item) => item.status === 'Active'
    );
    expect(activeItems.length).toBeGreaterThan(0);
  });
});
