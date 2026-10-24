import { describe, expect, it } from 'vitest';
import template from '../site/partials/tools/heroes.html?raw';

describe('HERO object and character editor guidance', () => {
  it('puts name and type before optional saved-definition and manual-equation controls', () => {
    const name = template.indexOf('id="heroes-object-name"');
    const kind = template.indexOf('id="heroes-object-kind"');
    const saved = template.indexOf('id="heroes-saved-tools"');
    const equation = template.indexOf('class="heroes-equation-builder"');
    expect(name).toBeGreaterThan(0);
    expect(kind).toBeGreaterThan(name);
    expect(saved).toBeGreaterThan(kind);
    expect(equation).toBeGreaterThan(saved);
    expect(template).toMatch(/<details id="heroes-saved-tools" class="heroes-optional-tools">/);
    expect(template).toMatch(
      /<details class="heroes-optional-tools">\s*<summary>Manual point equation/
    );
  });

  it('provides a create action, labelled search, count, empty-search guidance and scope guidance', () => {
    expect(template).toMatch(/id="heroes-create-object"[^>]*type="button"/);
    expect(template).toContain('for="heroes-object-search"');
    expect(template).toMatch(/id="heroes-object-search" type="search"/);
    expect(template).toContain('aria-label="Saved entry count"');
    expect(template).toMatch(/id="heroes-object-search-empty"[^>]*hidden/);
    expect(template).toContain('id="heroes-editor-scope"');
  });

  it('links directly to the real name, sheet and save controls without duplicating submit buttons', () => {
    for (const target of ['heroes-object-name', 'heroes-object-sheet', 'heroes-editor-save']) {
      expect(template).toContain(`href="#${target}"`);
      expect(template).toContain(`id="${target}"`);
    }
    expect(template.match(/class="btn btn-primary heroes-save-object"/g)).toHaveLength(1);
    expect(template).toContain('id="heroes-sheet-sections"');
    expect(template).toContain('id="heroes-contained-objects"');
    expect(template).toContain('id="heroes-equation-elements"');
  });

  it('uses labelled registered-account selectors for Game Master and Player', () => {
    for (const id of ['heroes-object-gm', 'heroes-object-player']) {
      expect(template).toContain(`for="${id}"`);
      expect(template).toContain(`<select id="${id}"`);
    }
    expect(template).toContain('id="heroes-object-player-field"');
  });
});
