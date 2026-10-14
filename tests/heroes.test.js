import { describe, expect, it } from 'vitest';
import { MixedNumber } from '../src/js/modules/objects/mixed-numbers.mjs';
import { HerosValues } from '../src/js/modules/objects/heros-values.mjs';
import { Point, Points } from '../src/js/modules/objects/points.mjs';
import { ActionNames, DescriptionNames, ThingName } from '../src/js/modules/objects/things.mjs';
import { PersonName } from '../src/js/modules/objects/person-names.mjs';
import { PlaceName } from '../src/js/modules/objects/place-names.mjs';
import {
  HEROS_EDITIONS,
  HerosAdvantages,
  HerosCharacter,
  HerosEquation,
  HerosEverymanSkills,
  HerosFiguredCharacteristic,
  HerosLimitation,
  HerosMentalDisadvantage,
  HerosModifiers,
  HerosPackageDeal,
  HerosPerks,
  HerosPhysicalDisadvantage,
  HerosPowerFrameworks,
  HerosPrimaryCharacteristic,
  HerosSkills,
  HerosSocialDisadvantage,
  HerosSpecialEffect,
  HerosVariablePowerPools,
  HerosAdvantageModifier,
  HerosAdvantageModifiers,
  normalizeHerosEdition,
} from '../src/js/modules/objects/heroes.mjs';

describe('Heroes domain model', () => {
  it('uses ThingName as the shared parent for named people, places, and classifications', () => {
    expect(new PersonName('Aster')).toBeInstanceOf(ThingName);
    expect(new PlaceName('Mount Rushmore')).toBeInstanceOf(ThingName);

    const character = new HerosCharacter({
      name: 'Aster',
      classifications: ['hero', 'mutant'],
      specifications: ['team leader'],
      categorizations: ['player character'],
    });
    expect(character.classificationNames.toArray().map(String)).toEqual(['hero', 'mutant']);
    expect(character.specificationNames.first.toString()).toBe('team leader');
    expect(character.categorizationNames.first.toString()).toBe('player character');
  });

  it('normalizes 4th, 5th, and 6th edition identifiers and terminology', () => {
    expect(normalizeHerosEdition(4)).toBe(HEROS_EDITIONS['4e']);
    expect(normalizeHerosEdition('5th Edition')).toBe(HEROS_EDITIONS['5e']);
    expect(normalizeHerosEdition('6e').disadvantageLabel).toBe('Complications');
    expect(HEROS_EDITIONS['4e'].disadvantageLabel).toBe('Disadvantages');
    expect(() => normalizeHerosEdition('7e')).toThrow(RangeError);
  });

  it('stores every equation element as a ThingName with a HerosValues point value', () => {
    const skill = new HerosSkills([
      { name: 'Stealth', value: '3/2', description: 'Move without being noticed' },
    ]).first;

    expect(skill).toBeInstanceOf(ThingName);
    expect(skill.value).toBeInstanceOf(HerosValues);
    expect(skill.value.toString()).toBe('1 1/2');
    expect(skill.description.toString()).toBe('Move without being noticed');
  });

  it('models characteristics as advantages with static and derived forms', () => {
    const strength = new HerosPrimaryCharacteristic({
      name: 'Strength',
      baseValue: 10,
      value: 15,
    });
    const body = new HerosFiguredCharacteristic({
      name: 'Body',
      points: [new Point(2)],
      primaryCharacteristics: [strength],
      deriveValue: ({ points, primaryCharacteristics }) =>
        primaryCharacteristics.first.baseValue.add(points.sum()),
    });

    expect(strength.value).toBeInstanceOf(HerosValues);
    expect(strength.baseValue.toString()).toBe('10');
    expect(body.value.toString()).toBe('12');
    expect(body.primaryCharacteristics.first).toBe(strength);
  });

  it('calculates the requested advantages plus points equals disadvantages equation', () => {
    const equation = new HerosEquation({
      advantages: [{ name: 'Skill', value: 8 }],
      points: [new Point(2)],
      disadvantages: [{ name: 'Complication', value: 10 }],
    });

    expect(equation.leftSideValue.toString()).toBe('10');
    expect(equation.leftSideValue).toBeInstanceOf(MixedNumber);
    expect(equation.points).toBeInstanceOf(Points);
    expect(equation.advantages).toBeInstanceOf(HerosAdvantages);
    expect(equation.rightSideValue.toString()).toBe('10');
    expect(equation.difference.toString()).toBe('0');
    expect(equation.isBalanced).toBe(true);
  });

  it('applies modifiers to equation-element price and keeps limitations distinct', () => {
    const advantageModifier = new HerosAdvantageModifier({ name: 'Advantage', rate: '1/2' });
    const limitation = new HerosLimitation({ name: 'Limitation', rate: '-1/3' });
    const perks = new HerosPerks([
      { name: 'Modified perk', value: 6, modifiers: [advantageModifier, limitation] },
    ]);

    expect(advantageModifier).toBeInstanceOf(ThingName);
    expect(perks.first.adjustedValue.toString()).toBe('6');
    expect(perks.first.modifiers).toBeInstanceOf(HerosModifiers);
    expect(new HerosAdvantageModifiers([advantageModifier]).first).toBe(advantageModifier);
  });

  it('composes everyman skills, packages, powers, frameworks, special effects, events, and actions', () => {
    const packageDeal = new HerosPackageDeal({
      name: 'Field Operative',
      skills: [{ name: 'Survival', value: 3 }],
      disadvantages: [{ name: 'Code of honor', value: 5 }],
    });
    const character = new HerosCharacter({
      name: 'Trailblazer',
      edition: '4e',
      advantages: [{ name: 'Contact', value: 2 }],
      skills: [{ name: 'Tracking', value: 4 }],
      everymanSkills: [{ name: 'Conversation', value: 1 }],
      talents: [{ name: 'Eidetic memory', value: 3 }],
      perks: [{ name: 'Fringe benefit', value: 2 }],
      powers: [{ name: 'Enhanced senses', value: 5 }],
      powerFrameworks: [{ name: 'Multipower', value: 10 }],
      variablePowerPools: [{ name: 'VPP', value: 15, poolPoints: 30 }],
      physicalDisadvantages: [{ name: 'Vulnerable skin', value: 10 }],
      mentalDisadvantages: [{ name: 'Phobia', value: 5 }],
      socialDisadvantages: [{ name: 'Public identity', value: 10 }],
      packageDeals: [packageDeal],
      specialEffects: ['Electric arcs'],
      events: ['Origin'],
      actions: ['Activate power'],
      descriptions: ['A field-trained hero'],
    });

    expect(character.edition).toBe(HEROS_EDITIONS['4e']);
    expect(character.everymanSkills).toBeInstanceOf(HerosEverymanSkills);
    expect(character.packageDeals.first).toBe(packageDeal);
    expect(character.powerFrameworks).toBeInstanceOf(HerosPowerFrameworks);
    expect(character.variablePowerPools).toBeInstanceOf(HerosVariablePowerPools);
    expect(character.physicalDisadvantages.first).toBeInstanceOf(HerosPhysicalDisadvantage);
    expect(character.mentalDisadvantages.first).toBeInstanceOf(HerosMentalDisadvantage);
    expect(character.socialDisadvantages.first).toBeInstanceOf(HerosSocialDisadvantage);
    expect(character.specialEffects.first).toBeInstanceOf(HerosSpecialEffect);
    expect(character.events.first.toString()).toBe('Origin');
    expect(character.actions).toBeInstanceOf(ActionNames);
    expect(character.descriptions).toBeInstanceOf(DescriptionNames);
    expect(character.actions.first.toString()).toBe('Activate power');
    expect(character.descriptions.first.toString()).toBe('A field-trained hero');
    expect(character.equation.advantages.size).toBeGreaterThan(0);
    expect(character.equation.disadvantages.size).toBeGreaterThan(0);
    expect(character.equation.advantagesValue.toString()).toBe('45');
    expect(character.equation.pointsValue.toString()).toBe('0');
    expect(character.equation.disadvantagesValue.toString()).toBe('30');
    expect(character.equation.difference.toString()).toBe('15');
  });
});
