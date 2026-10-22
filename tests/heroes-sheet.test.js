import { describe, expect, it } from 'vitest';
import {
  generateHerosObject,
  getHerosObjectTypes,
  getHerosCharacterElementTypes,
} from '../src/js/modules/objects/heroes.mjs';
import {
  getHerosSheetEntries,
  getHerosSheetLayout,
  getHerosSheetSection,
} from '../src/js/modules/objects/heroes/sheet-layout.mjs';
import { GameObject } from '../src/js/modules/objects/heroes/objects/game-objects.mjs';
import { Strength } from '../src/js/modules/objects/heroes/elements/characteristics/primary-characteristcs/strength-characteristics.mjs';

const catalog = getHerosCharacterElementTypes();
const typeFor = (name) => catalog.find((entry) => entry.type.endsWith(`#${name}`)).type;
const names = (object) =>
  getHerosSheetEntries(object, catalog)
    .filter((entry) => entry.definition.group === 'characteristics')
    .map((entry) => entry.generatedElement.shortName);

describe('HERO object-driven sheet', () => {
  it('displays all inherited classes for every kind, except DEF when both PD and ED are present', () => {
    for (const { type } of getHerosObjectTypes()) {
      const object = generateHerosObject({ objectType: type });
      const entries = getHerosSheetEntries(object, catalog);
      const suppressed = names(object).includes('PD') && names(object).includes('ED') ? 1 : 0;
      expect(entries).toHaveLength(object.typedElements.length - 1 - suppressed);
      for (const entry of entries) {
        expect(object.typedElements[entry.index]).toBe(entry.item);
        expect(object.elementObjects).toContain(entry.generatedElement);
      }
    }
  });

  it('uses the class-owned declarations, not a generator default-element table', () => {
    const descriptor = Object.getOwnPropertyDescriptor(GameObject, 'defaultElements');
    Object.defineProperty(GameObject, 'defaultElements', {
      configurable: true,
      get: () => [{ Type: Strength }],
    });
    try {
      expect(names(generateHerosObject({ objectType: 'object' }))).toEqual(['STR']);
    } finally {
      Object.defineProperty(GameObject, 'defaultElements', descriptor);
    }
  });

  it('orders character and animal characteristics from the referenced sheets without inventing STUN', () => {
    const character = generateHerosObject({ objectType: 'character' });
    expect(names(character)).toEqual([
      'STR',
      'DEX',
      'CON',
      'BODY',
      'INT',
      'EGO',
      'PRE',
      'COM',
      'PD',
      'ED',
      'SPD',
      'REC',
      'END',
      'OCV',
      'DCV',
      'ECV',
      'MD',
    ]);
    const withStun = generateHerosObject({
      objectType: 'character',
      typedElements: [{ type: typeFor('Stun'), name: 'Stun', value: '0' }],
    });
    expect(names(withStun).slice(0, 14)).toEqual([
      'STR',
      'DEX',
      'CON',
      'BODY',
      'INT',
      'EGO',
      'PRE',
      'COM',
      'PD',
      'ED',
      'SPD',
      'REC',
      'END',
      'STUN',
    ]);
    expect(names(generateHerosObject({ objectType: 'animal' }))).not.toContain('INT');
    expect(names(generateHerosObject({ objectType: 'object' }))).not.toEqual(names(character));
  });

  it('uses base and vehicle order rather than character order and flags missing equipment references', () => {
    expect(names(generateHerosObject({ objectType: 'base' })).slice(0, 2)).toEqual(['BODY', 'DEF']);
    expect(names(generateHerosObject({ objectType: 'vehicle' })).slice(0, 5)).toEqual([
      'STR',
      'DEX',
      'BODY',
      'DEF',
      'SPD',
    ]);
    expect(getHerosSheetLayout('base').sections.map(([id]) => id)).toEqual([
      'description',
      'characteristics',
      'abilities',
      'costs',
      'other',
    ]);
    expect(getHerosSheetLayout('equipment').reference).toMatch(/No type-specific sheet reference/);
    expect(getHerosSheetLayout('vehicle').reference).toContain('462');
  });

  it('separates primary and figured character entries by class while retaining combat information', () => {
    for (const objectType of ['character', 'player-character', 'non-player-character']) {
      const object = generateHerosObject({ objectType });
      const grouped = new Map();
      for (const { item, definition, generatedElement } of getHerosSheetEntries(object, catalog)) {
        const section = getHerosSheetSection(item, objectType, definition, generatedElement);
        grouped.set(section, [...(grouped.get(section) ?? []), generatedElement.shortName]);
      }
      expect(grouped.get('primary-characteristics')).toEqual([
        'STR',
        'DEX',
        'CON',
        'BODY',
        'INT',
        'EGO',
        'PRE',
        'COM',
      ]);
      expect(grouped.get('figured-characteristics')).toEqual([
        'PD',
        'ED',
        'SPD',
        'REC',
        'END',
        'MD',
      ]);
      expect(grouped.get('combat')).toEqual(['OCV', 'DCV', 'ECV']);
      expect(grouped.get('powers')).toEqual(['Running', 'Swimming', 'Leaping']);
      expect(
        getHerosSheetLayout(objectType)
          .sections.slice(1, 4)
          .map(([id]) => id)
      ).toEqual(['primary-characteristics', 'figured-characteristics', 'combat']);
    }
    for (const objectType of ['base', 'vehicle', 'equipment']) {
      const object = generateHerosObject({ objectType });
      const entry = getHerosSheetEntries(object, catalog).find(
        ({ item }) => item.type === typeFor('Body')
      );
      expect(
        getHerosSheetSection(entry.item, objectType, entry.definition, entry.generatedElement)
      ).toBe('characteristics');
    }
  });

  it('uses researched movement defaults, costs and names through direct and generated construction', () => {
    for (const objectType of ['character', 'vehicle', 'animal']) {
      const object = generateHerosObject({ objectType });
      const direct = new object.constructor.ObjectClass();
      for (const [name, baseValue, rate] of [
        ['Running', 6, 2],
        ['Swimming', 2, 1],
        ['Leaping', 2, 1],
      ]) {
        const power = object.generatedElements.get(typeFor(name))[0];
        const directPower = [...direct.characterElements].find(
          (entry) => entry instanceof power.constructor
        );
        for (const instance of [power, directPower]) {
          expect(instance.Value()).toBe(baseValue);
          expect(instance.BaseValue.toNumber()).toBe(baseValue);
          expect(instance.ValueRate.toNumber()).toBe(rate);
          expect(instance.name).toBe(name);
          expect(instance.shortName).toBe(name);
          expect(instance.valueUnit).toBe('"');
        }
      }
    }
    const invested = generateHerosObject({
      objectType: 'character',
      typedElements: [
        { type: typeFor('Strength'), name: 'Strength', value: '10' },
        { type: typeFor('Running'), name: 'Sprint', shortName: 'Run', value: '4' },
        { type: typeFor('Swimming'), name: 'Swimming', value: '3' },
        { type: typeFor('Leaping'), name: 'Leaping', value: '3' },
      ],
    });
    for (const object of [
      invested,
      generateHerosObject({
        objectType: 'character',
        typedElements: JSON.parse(JSON.stringify(invested.typedElements)),
      }),
    ]) {
      expect(object.generatedElements.get(typeFor('Running'))[0].Value()).toBe(8);
      expect(object.generatedElements.get(typeFor('Running'))[0].shortName).toBe('Run');
      expect(object.generatedElements.get(typeFor('Running'))[0].name).toBe('Sprint');
      expect(object.generatedElements.get(typeFor('Swimming'))[0].Value()).toBe(5);
      expect(object.generatedElements.get(typeFor('Leaping'))[0].Value()).toBe(7);
    }
    expect(() =>
      generateHerosObject({
        objectType: 'object',
        typedElements: [{ type: typeFor('Leaping'), name: 'Leaping' }],
      })
    ).toThrow(/Strength/);
    expect(
      generateHerosObject({
        objectType: 'object',
        typedElements: [{ type: typeFor('Leaping'), name: 'Leaping', baseValue: 0, value: '3' }],
      })
        .generatedElements.get(typeFor('Leaping'))[0]
        .Value()
    ).toBe(3);
  });

  it('suppresses DEF only with both distinct defenses and retains it in the object', () => {
    for (const additions of [
      [],
      ['PhysicalDefense'],
      ['EnergyDefense'],
      ['PhysicalDefense', 'EnergyDefense'],
    ]) {
      const object = generateHerosObject({
        objectType: 'base',
        typedElements: [
          { type: typeFor('Strength'), name: 'Strength', value: '0' },
          { type: typeFor('Constitution'), name: 'Constitution', value: '0' },
          ...additions.map((name) => ({ type: typeFor(name), name, value: '0' })),
        ],
      });
      expect(names(object).includes('DEF')).toBe(additions.length !== 2);
      expect(object.generatedElements.get(typeFor('Defense'))).toHaveLength(1);
    }
  });

  it('retains invested inherited elements and extra entries across JSON reload without duplication', () => {
    const object = generateHerosObject({
      objectType: 'character',
      typedElements: [
        { type: typeFor('Strength'), name: 'Strength', value: '10' },
        { type: 'skill', name: 'Tracking', value: '3' },
      ],
    });
    const restored = generateHerosObject({
      objectType: 'character',
      typedElements: JSON.parse(JSON.stringify(object.typedElements)),
    });
    expect(restored.generatedElements.get(typeFor('Strength'))).toHaveLength(1);
    expect(restored.generatedElements.get(typeFor('Strength'))[0].Value()).toBe(20);
    expect(restored.generatedElements.get(typeFor('PhysicalDefense'))[0].Value()).toBe(4);
    expect(restored.typedElements).toEqual(object.typedElements);
    expect(getHerosSheetEntries(restored, catalog).map(({ item }) => item.name)).toContain(
      'Tracking'
    );
  });

  it('uses explicit model defaults for nonliving END and otherwise reports missing inputs', () => {
    const vehicle = generateHerosObject({ objectType: 'vehicle' });
    expect(vehicle.generatedElements.get(typeFor('Endurance'))[0].Value()).toBe(0);
    const character = generateHerosObject({ objectType: 'character' });
    expect(character.generatedElements.get(typeFor('Endurance'))[0].Value()).toBe(20);
    expect(() =>
      generateHerosObject({
        objectType: 'object',
        typedElements: [{ type: typeFor('Endurance'), name: 'Endurance' }],
      })
    ).toThrow(/Constitution/);
  });
});
