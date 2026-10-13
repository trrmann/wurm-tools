import { describe, it, expect } from 'vitest';
import { BasePage } from '../src/js/modules/pages/BasePage.js';
import { ConceptsPage, ROADMAP_CATEGORIES } from '../src/js/modules/pages/ConceptsPage.js';
import { TOOLS_LIST, getToolById } from '../src/js/tools/registry.js';

describe('Tool Registry Migration', () => {
  it('loads all 4 starter tools from src/js/tools/registry.js', () => {
    expect(TOOLS_LIST).toHaveLength(4);
    const ids = TOOLS_LIST.map((t) => t.toolMetadata.id);
    expect(ids).toContain('deed-calculator');
    expect(ids).toContain('action-timers');
    expect(ids).toContain('distance-calc');
    expect(ids).toContain('player-notes');
  });

  it('retrieves tool metadata by id', () => {
    const deed = getToolById('deed-calculator');
    expect(deed).toBeDefined();
    expect(deed.toolMetadata.name).toBe('Deed & Upkeep Calculator');
  });
});

describe('Page Objects Model', () => {
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
