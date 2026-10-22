import { describe, it, expect, vi } from 'vitest';
import { BasePage } from '../src/js/modules/pages/BasePage.js';
import { ConceptsPage, ROADMAP_CATEGORIES } from '../src/js/modules/pages/ConceptsPage.js';
import { PRIMARY_NAVIGATION, TOOLS_LIST, getToolById } from '../src/js/tools/registry.js';
import { HEROES_NAVIGATION } from '../src/js/modules/pages/heroes-navigation.js';

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
  it('keeps Wurm and Heros document branding separate', () => {
    vi.stubGlobal('document', { title: '' });
    try {
      new BasePage({ title: 'Dashboard' }).updateDocumentTitle();
      expect(document.title).toBe('Dashboard — Wurm Tools');
      new BasePage({ title: 'Game Masters & players', brand: 'Heros Tools' }).updateDocumentTitle();
      expect(document.title).toBe('Game Masters & players — Heros Tools');
      expect(HEROES_NAVIGATION).toContainEqual(['Game Masters & players', '/site/heroes/people/']);
      expect(HEROES_NAVIGATION).toContainEqual(['Wurm Tools', '/']);
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
