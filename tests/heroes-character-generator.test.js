import { describe, expect, it } from 'vitest';
import {
  generateHerosCharacter,
  getHerosCharacterElementTypes,
  HerosCharacter,
  HerosMultipower,
  HerosPlayerCharacter,
  HerosPrimaryCharacteristic,
  HerosSkill,
  HerosSpecialEffect,
  HerosPhysicalDisadvantage,
  HerosAdvantage,
  generateHerosObject,
  getHerosObjectTypes,
  registerHerosCharacterElementType,
} from '../src/js/modules/objects/heroes.mjs';
import { herosElementCatalogSize } from '../src/js/modules/objects/heroes/element-catalog.mjs';
import { Power } from '../src/js/modules/objects/heroes/elements/powers/powers.mjs';
import { Advantage } from '../src/js/modules/objects/heroes/elements/powers/power-modifiers/power-advantages/power-advantages.mjs';
import { Multipower } from '../src/js/modules/objects/heroes/elements/powers/power-modifiers/power-frameworks/multipower-frameworks.mjs';

describe('HERO character generator', () => {
  it('builds expanded character classes and applies modifiers to the equation', () => {
    const character = generateHerosCharacter({
      name: 'Aster',
      characterType: 'player',
      edition: '6e',
      equation: {
        advantages: [{ name: 'Manual advantage', value: 1 }],
        points: [1],
      },
      typedElements: [
        { type: 'primaryCharacteristic', name: 'Strength', value: '10', detail: '10' },
        { type: 'skill', name: 'Stealth', value: '4' },
        { type: 'multipower', name: 'Energy array', value: '5', children: [] },
        { type: 'physicalDisadvantage', name: 'Code', value: '3' },
        { type: 'limitation', name: 'Half cost', target: 'Stealth', detail: '-1/4' },
      ],
    });

    expect(character).toBeInstanceOf(HerosCharacter);
    expect(character).toBeInstanceOf(HerosPlayerCharacter);
    expect(character.edition.id).toBe('6e');
    expect(character.primaryCharacteristics.first).toBeInstanceOf(HerosPrimaryCharacteristic);
    expect(character.skills.first).toBeInstanceOf(HerosSkill);
    expect(character.powerFrameworks.first).toBeInstanceOf(HerosMultipower);
    expect(character.physicalDisadvantages.first).toBeInstanceOf(HerosPhysicalDisadvantage);
    expect(character.equation.advantagesValue.toString()).toBe('19');
    expect(character.equation.pointsValue.toString()).toBe('1');
    expect(character.equation.disadvantagesValue.toString()).toBe('3');
  });

  it('includes package deal child classes and values in the generated character', () => {
    const character = generateHerosCharacter({
      name: 'Scout',
      typedElements: [
        {
          type: 'packageDeal',
          name: 'Scout training',
          children: [
            { type: 'skill', name: 'Tracking', value: '2' },
            { type: 'physicalDisadvantage', name: 'Duty', value: '3' },
          ],
        },
      ],
    });

    expect(character.packageDeals.first.skills.first).toBeInstanceOf(HerosSkill);
    expect(character.packageDeals.first.physicalDisadvantages.first).toBeInstanceOf(
      HerosPhysicalDisadvantage
    );
    expect(character.equation.advantagesValue.toString()).toBe('2');
    expect(character.equation.disadvantagesValue.toString()).toBe('3');
  });

  it('derives skill base rolls from the characteristic class of each skill category', () => {
    const types = getHerosCharacterElementTypes();
    const typeFor = (name) =>
      types.find((definition) => definition.type.endsWith(`#${name}`))?.type;
    const dexterity = typeFor('Dexterity');
    const presence = typeFor('Presence');
    const intelligence = typeFor('Intelligence');
    const acrobatics = typeFor('AcrobaticsSkill');
    const acting = typeFor('ActingSkill');
    const analyze = typeFor('AnalyzeSkill');
    const knowledge = typeFor('KnowledgeSkill');
    const martialArts = typeFor('MartialArtsSkill');
    expect([
      dexterity,
      presence,
      intelligence,
      acrobatics,
      acting,
      analyze,
      knowledge,
      martialArts,
    ]).not.toContain(undefined);

    const character = generateHerosCharacter({
      typedElements: [
        { type: dexterity, name: 'Dexterity', value: '15' },
        { type: presence, name: 'Presence', value: '5' },
        { type: intelligence, name: 'Intelligence', value: '10' },
        { type: acrobatics, name: 'Acrobatics', value: '0' },
        { type: acting, name: 'Acting', value: '0' },
        { type: analyze, name: 'Analyze', value: '0' },
        { type: knowledge, name: 'Knowledge', value: '0' },
        { type: martialArts, name: 'Martial Arts', value: '0' },
      ],
    });

    expect(character.generatedElements.get(acrobatics)[0].BaseValue.toString()).toBe('12');
    expect(character.generatedElements.get(acting)[0].BaseValue.toString()).toBe('12');
    expect(character.generatedElements.get(analyze)[0].BaseValue.toString()).toBe('13');
    expect(character.generatedElements.get(knowledge)[0].BaseValue.toString()).toBe('0');
    expect(character.generatedElements.get(martialArts)[0].BaseValue.toString()).toBe('0');
  });

  it('requires the category characteristic when generating an agility skill', () => {
    const acrobatics = getHerosCharacterElementTypes().find((definition) =>
      definition.type.endsWith('#AcrobaticsSkill')
    );
    expect(() =>
      generateHerosCharacter({
        typedElements: [{ type: acrobatics.type, name: 'Acrobatics', value: '0' }],
      })
    ).toThrow('AcrobaticsSkill Base Value requires a valid Dexterity object');
  });

  it('uses the named non-priced classes and retains unresolved figured formulas', () => {
    const character = generateHerosCharacter({
      typedElements: [
        {
          type: 'figuredCharacteristic',
          name: 'Body',
          value: '5',
          detail: 'future-body-formula',
        },
        { type: 'specialEffect', name: 'Flame', detail: 'Blue fire' },
        { type: 'event', name: 'Origin' },
        { type: 'action', name: 'Patrol' },
        { type: 'description', name: 'Notes', detail: 'Keeps a journal' },
      ],
    });

    expect(character.characteristics.first.calculationPending).toBe(true);
    expect(character.characteristics.first.formulaId).toBe('future-body-formula');
    expect(character.specialEffects.first).toBeInstanceOf(HerosSpecialEffect);
    expect(character.events.first.toString()).toBe('Origin');
    expect(character.actions.first.toString()).toBe('Patrol');
    expect(character.descriptions.first.toString()).toBe('Keeps a journal');
    expect(character.equation.advantagesValue.toString()).toBe('5');
  });

  it('resolves rulebook-sourced figured formulas for 5th Edition only', () => {
    const character = generateHerosCharacter({
      edition: '5e',
      typedElements: [
        { type: 'primaryCharacteristic', name: 'Strength', value: '11' },
        { type: 'primaryCharacteristic', name: 'Dexterity', value: '15' },
        { type: 'primaryCharacteristic', name: 'Constitution', value: '12' },
        { type: 'primaryCharacteristic', name: 'Body', value: '10' },
        {
          type: 'figuredCharacteristic',
          name: 'Physical Defense',
          formulaId: 'physical-defense',
          value: '1',
        },
        {
          type: 'figuredCharacteristic',
          name: 'Energy Defense',
          formulaId: 'energy-defense',
          value: '0',
        },
        { type: 'figuredCharacteristic', name: 'Speed', formulaId: 'speed', value: '0' },
        { type: 'figuredCharacteristic', name: 'Recovery', formulaId: 'recovery', value: '0' },
        { type: 'figuredCharacteristic', name: 'Endurance', formulaId: 'endurance', value: '1' },
        { type: 'figuredCharacteristic', name: 'Stun', formulaId: 'stun', value: '1' },
      ],
    });
    const figures = new Map(
      [...character.figuredCharacteristics].map((item) => [item.toString(), item.value])
    );

    expect(figures.get('Physical Defense').toString()).toBe('3');
    expect(figures.get('Physical Defense').UnroundedValue.toString()).toBe('3 1/5');
    expect(figures.get('Energy Defense').toString()).toBe('2');
    expect(figures.get('Speed').toString()).toBe('2');
    expect(figures.get('Speed').UnroundedValue.toString()).toBe('2 1/2');
    expect(figures.get('Recovery').toString()).toBe('5');
    expect(figures.get('Endurance').toString()).toBe('26');
    expect(figures.get('Stun').toString()).toBe('23');
    expect(figures.get('Stun').UnroundedValue.toString()).toBe('22 1/2');

    const sixthEdition = generateHerosCharacter({
      edition: '6e',
      typedElements: [
        { type: 'primaryCharacteristic', name: 'Strength', value: '10' },
        {
          type: 'figuredCharacteristic',
          name: 'Physical Defense',
          formulaId: 'physical-defense',
          value: '0',
        },
      ],
    });
    expect(sixthEdition.characteristics.first.calculationPending).toBe(true);

    const elementType = (name) =>
      getHerosCharacterElementTypes().find((item) => item.type.endsWith(`#${name}`)).type;
    const concreteElements = generateHerosCharacter({
      edition: '5e',
      typedElements: [
        { type: elementType('Strength'), name: 'Strength', value: '5' },
        {
          type: 'figuredCharacteristic',
          name: 'Physical Defense',
          formulaId: 'physical-defense',
          value: '0',
        },
      ],
    });
    expect(concreteElements.figuredCharacteristics.first.value.toString()).toBe('3');
  });

  it('lets future classes register their factory, group, and editor metadata', () => {
    const dispose = registerHerosCharacterElementType('futureAdvantage', {
      label: 'Future advantage',
      group: 'advantages',
      field: 'advantages',
      nestedIn: ['package'],
      create: (item) => new HerosAdvantage(item),
    });
    try {
      expect(getHerosCharacterElementTypes()).toContainEqual(
        expect.objectContaining({
          type: 'futureAdvantage',
          label: 'Future advantage',
          group: 'advantages',
          nestedIn: ['package'],
        })
      );
      const character = generateHerosCharacter({
        typedElements: [{ type: 'futureAdvantage', name: 'Future', value: '7' }],
      });

      expect(character.advantages.first).toBeInstanceOf(HerosAdvantage);
      expect(character.equation.advantagesValue.toString()).toBe('7');
    } finally {
      dispose();
    }
  });

  it('registers and generates the concrete HERO element classes', () => {
    const types = getHerosCharacterElementTypes().filter((definition) =>
      definition.type.startsWith('element:')
    );
    expect(herosElementCatalogSize).toBeGreaterThan(200);
    expect(types).toHaveLength(herosElementCatalogSize);

    const strengthType = types.find((definition) => definition.type.endsWith('#Strength'));
    const stunType = types.find((definition) => definition.type.endsWith('#Stun'));
    expect(strengthType).toBeDefined();
    expect(stunType).toBeDefined();

    const character = generateHerosCharacter({
      typedElements: [
        { type: strengthType.type, name: 'Strength', value: '10' },
        { type: stunType.type, name: 'Stun', value: '0' },
      ],
    });

    expect(character.generatedElements.get(strengthType.type)[0].Value()).toBe(20);
    expect(character.generatedElements.get(strengthType.type)[0].UnroundedValue.toString()).toBe(
      '20'
    );
    expect(character.generatedElements.get(stunType.type)[0].Value()).toBe(10);
    expect(character.elementObjects).toHaveLength(2);
    expect(character.equation.advantagesValue.toString()).toBe('10');
  });

  it('constructs figured defenses with their dependencies regardless of editor order', () => {
    const types = getHerosCharacterElementTypes().filter((definition) =>
      definition.type.startsWith('element:')
    );
    const byName = (name) => types.find((definition) => definition.type.endsWith(`#${name}`));
    const defense = byName('Defense');
    const physicalDefense = byName('PhysicalDefense');
    const energyDefense = byName('EnergyDefense');
    const strength = byName('Strength');
    const constitution = byName('Constitution');

    const character = generateHerosCharacter({
      typedElements: [
        { type: defense.type, name: 'Defense', value: '0' },
        { type: physicalDefense.type, name: 'Physical defense', value: '0' },
        { type: energyDefense.type, name: 'Energy defense', value: '0' },
        { type: strength.type, name: 'Strength', value: '10' },
        { type: constitution.type, name: 'Constitution', value: '10' },
      ],
    });

    expect(character.generatedElements.get(defense.type)[0].Value()).toBe(4);
  });

  it('constructs the full registered element catalog with available dependencies', () => {
    const types = getHerosCharacterElementTypes().filter((definition) =>
      definition.type.startsWith('element:')
    );
    const character = generateHerosCharacter({
      typedElements: types.map((definition) => ({
        type: definition.type,
        name: definition.label,
        value: '0',
        detail: definition.type.endsWith('#Defense') ? '0' : undefined,
      })),
    });
    const generated = [...character.generatedElements.values()].flat();

    expect(generated).toHaveLength(herosElementCatalogSize);
    expect(character.elementObjects).toHaveLength(herosElementCatalogSize);
  });

  it('exposes modifier collections consistently on powers and frameworks', () => {
    for (const object of [new Power(), new Multipower()]) {
      object.AddModifier(new Advantage());

      expect(object.ModifierNames).toHaveLength(1);
      expect(object.PowerAdvantages).toHaveLength(1);
      expect(object.PowerLimitations).toHaveLength(0);
    }
  });

  it('constructs every selectable object kind with shared HERO elements and explicit traits', () => {
    for (const { type } of getHerosObjectTypes()) {
      const object = generateHerosObject({
        name: `Test ${type}`,
        objectType: type,
        edition: '5e',
        objectModelTypes: ['mobile'],
        typedElements: [{ type: 'skill', name: 'Tracking', value: '3' }],
        acquisition: { amount: '12', notes: 'Entered by user' },
      });

      expect(object.objectType).toBe(type);
      expect(object.kind).toBe(type);
      expect(object.objectModelTypes.map(String)).toEqual(['mobile']);
      expect(object.generatedElements.get('skill')).toHaveLength(1);
      expect(object.equation.advantagesValue.toString()).toBe('3');
      expect(object.acquisition).toEqual({ amount: '12', notes: 'Entered by user' });
    }
  });

  it('rejects unknown object kinds and contradictory character traits', () => {
    expect(() => generateHerosObject({ objectType: 'future-kind' })).toThrow(
      'Unsupported HERO object type'
    );
    expect(() =>
      generateHerosObject({
        objectType: 'character',
        objectModelTypes: ['player-character', 'non-player-character'],
      })
    ).toThrow('cannot be both');
    expect(() =>
      generateHerosObject({
        objectType: 'vehicle',
        objectModelTypes: ['player-character'],
      })
    ).toThrow('require a character object kind');
    expect(() =>
      generateHerosObject({
        objectType: 'player-character',
        objectModelTypes: ['non-player-character'],
      })
    ).toThrow('conflicts with its character traits');
  });
});
