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
  HerosBodyShape,
  BodyShape,
  HerosBodyShapeComponent,
  HerosBodyShapeLimitation,
  HerosCalledShot,
  HerosEquation,
  HerosEverymanSkills,
  HerosExtraLimb,
  HerosGameObject,
  HerosGameObjects,
  HerosHitLocation,
  HerosWorld,
  HerosWorlds,
  HerosVehicle,
  HerosEquipment,
  HerosPlayerCharacter,
  HerosNonPlayerCharacter,
  HerosPointLevelClassification,
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
  HEROS_BODY_SHAPE_TYPES,
  HEROS_OBJECT_MODEL_TYPES,
  HEROS_TYPED_ELEMENT_GROUPS,
  registerHerosFiguredCharacteristicFormula,
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

  it('locks HERO edition metadata to 5th Edition', () => {
    expect(normalizeHerosEdition()).toBe(HEROS_EDITIONS['5e']);
    expect(new HerosCharacter('Default edition').edition).toBe(HEROS_EDITIONS['5e']);
    expect(normalizeHerosEdition(5)).toBe(HEROS_EDITIONS['5e']);
    expect(normalizeHerosEdition('5th Edition')).toBe(HEROS_EDITIONS['5e']);
    expect(() => normalizeHerosEdition('4e')).toThrow(RangeError);
    expect(() => normalizeHerosEdition('6e')).toThrow(RangeError);
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

  it('resolves 5th-edition figured-characteristic formulas with exact inputs', () => {
    const disposeFifth = registerHerosFiguredCharacteristicFormula(
      'test-body',
      '5e',
      ({ points, primaryCharacteristics, edition }) => {
        expect(edition).toBe(HEROS_EDITIONS['5e']);
        return primaryCharacteristics.first.baseValue.add(points.sum());
      }
    );
    try {
      const inputs = {
        name: 'Body',
        formulaId: 'test-body',
        primaryCharacteristics: [{ name: 'Strength', baseValue: 10 }],
        points: [2],
      };
      const fifth = new HerosFiguredCharacteristic({ ...inputs, edition: '5e' });

      expect(fifth.value.toString()).toBe('12');
      expect(() => new HerosFiguredCharacteristic({ ...inputs, edition: '6e' })).toThrow(
        /Only HERO System 5th Edition/
      );
    } finally {
      disposeFifth();
    }
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

  it('keeps rational equation values exact and updates balance when points change', () => {
    const equation = new HerosEquation({
      advantages: [{ name: 'Fractional advantage', value: '1/3' }],
      points: ['1/6'],
      disadvantages: [{ name: 'Complication', value: '1/2' }],
    });

    expect(equation.isBalanced).toBe(true);
    equation.points.add(new Point('1/3'));
    expect(equation.leftSideValue.toString()).toBe('5/6');
    expect(equation.difference.toString()).toBe('1/3');
    expect(equation.isBalanced).toBe(false);
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
      children: [{ type: 'power', name: 'Night vision', value: 2 }],
    });
    const character = new HerosCharacter({
      name: 'Trailblazer',
      edition: '5e',
      advantages: [{ name: 'Contact', value: 2 }],
      skills: [{ name: 'Tracking', value: 4 }],
      everymanSkills: [{ name: 'Conversation', value: 1 }],
      talents: [{ name: 'Eidetic memory', value: 3 }],
      perks: [{ name: 'Fringe benefit', value: 2 }],
      powers: [{ name: 'Enhanced senses', value: 5 }],
      powerFrameworks: [
        {
          name: 'Multipower',
          value: 10,
          children: [{ type: 'power', name: 'Energy blast', value: 5 }],
        },
      ],
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

    expect(character.edition).toBe(HEROS_EDITIONS['5e']);
    expect(character.everymanSkills).toBeInstanceOf(HerosEverymanSkills);
    expect(character.packageDeals.first).toBe(packageDeal);
    expect(packageDeal.powers.first.toString()).toBe('Night vision');
    expect(character.powerFrameworks).toBeInstanceOf(HerosPowerFrameworks);
    expect(character.powerFrameworks.first.powers.first.toString()).toBe('Energy blast');
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
    expect(character.equation.advantagesValue.toString()).toBe('47');
    expect(character.equation.pointsValue.toString()).toBe('0');
    expect(character.equation.disadvantagesValue.toString()).toBe('30');
    expect(character.equation.difference.toString()).toBe('17');
  });

  it('models non-character objects, object traits, point levels, and worlds', () => {
    const vehicle = new HerosVehicle({
      name: 'Skimmer',
      elementObjects: [new BodyShape({ name: 'hovercraft' })],
      objectModelTypes: ['physical', 'mobile'],
      pointLevelClassifications: [{ name: 'Standard', points: 150, edition: '5e' }],
      advantages: [{ name: 'Flight', value: 20 }],
    });
    const equipment = new HerosEquipment('Field kit');
    const world = new HerosWorld({ name: 'Asterion', objects: [vehicle] });

    expect(vehicle).toBeInstanceOf(HerosGameObject);
    expect(vehicle.bodyShape.name).toBe('hovercraft');
    expect(vehicle.elementObjects.first).toBe(vehicle.bodyShape);
    expect(vehicle.pointLevelClassifications.first).toBeInstanceOf(HerosPointLevelClassification);
    expect(vehicle.pointLevelClassifications.first.points.toString()).toBe('150');
    expect(vehicle.objectModelTypes.map(String)).toContain(HEROS_OBJECT_MODEL_TYPES.mobile);
    expect(vehicle.objectModelTypes.map(String)).toContain(HEROS_OBJECT_MODEL_TYPES.physical);
    expect(vehicle.equation.advantagesValue.toString()).toBe('20');
    expect(vehicle.equationElements.size).toBe(1);
    expect(world.objects).toBeInstanceOf(HerosGameObjects);
    expect(world.addObject(equipment)).toBe(world);
    expect(world.objects.last).toBe(equipment);
    expect(new HerosWorlds([world]).first).toBe(world);
  });

  it('models body-shape components, hit locations, called shots, damage, and extra limbs', () => {
    const vehicle = new HerosVehicle({
      name: 'Adaptive form',
      elementObjects: [
        new BodyShape({
          name: 'Humanoid',
          generalShape: 'Bipedal',
          shapeTypes: [HEROS_BODY_SHAPE_TYPES.humanoid, HEROS_BODY_SHAPE_TYPES.bipedal],
          components: [
            {
              id: 'left-arm',
              name: 'Left arm',
              components: [{ id: 'left-hand', name: 'Left hand' }],
            },
            { name: 'Torso', components: ['Heart'] },
          ],
          hitLocations: [{ name: 'Head', damage: '1/2' }],
          calledShots: [{ name: 'Target the head', targetLocation: 'Head' }],
          extraLimbs: [{ name: 'Tail', count: 1 }],
          physicalLimitations: [
            {
              name: 'Missing left arm',
              detail: 'The limb is absent',
              removedComponentIds: ['left-arm'],
            },
          ],
        }),
      ],
    });
    const shape = vehicle.bodyShape;
    const head = shape.getHitLocation('Head');
    const leftArm = shape.getComponent('left-arm');
    const leftHand = shape.getComponent('left-hand');

    expect(shape).toBeInstanceOf(BodyShape);
    expect(shape.shape).toBeInstanceOf(HerosBodyShape);
    expect(shape.generalShape).toBe('Bipedal');
    expect(shape.shapeTypes.map(String)).toEqual(['humanoid', 'bipedal']);
    expect(shape.components.first).toBeInstanceOf(HerosBodyShapeComponent);
    expect(shape.isComponentPresent(leftArm)).toBe(false);
    expect(shape.isComponentPresent(leftHand)).toBe(false);
    expect(shape.isComponentPresent('Torso')).toBe(true);
    expect(shape.getComponent('Heart').toString()).toBe('Heart');
    expect(head).toBeInstanceOf(HerosHitLocation);
    expect(shape.calledShots.first).toBeInstanceOf(HerosCalledShot);
    expect(shape.calledShots.first.target).toBe(head);
    expect(shape.physicalLimitations.first).toBeInstanceOf(HerosBodyShapeLimitation);
    expect(shape.extraLimbs.first).toBeInstanceOf(HerosExtraLimb);
    expect(shape.recordLocationDamage('Head', '1/3').damage.toString()).toBe('5/6');
    expect(head.disable('Temporarily disabled').disabled).toBe(true);
    expect(head.enable().disabilityDescription).toBe('');

    const restored = new HerosVehicle({
      elementObjects: [new BodyShape(JSON.parse(JSON.stringify(vehicle.bodyShape)))],
    });
    const restoredShape = restored.bodyShape;
    expect(restoredShape.getHitLocation('Head').damage.toString()).toBe('5/6');
    expect(restoredShape.calledShots.first.target).toBe(restoredShape.getHitLocation('Head'));
    expect(restoredShape.physicalLimitations.first.removedComponents.first).toBe(
      restoredShape.getComponent('left-arm')
    );
    expect(restoredShape.isComponentPresent('left-hand')).toBe(false);
    const addedComponent = restoredShape.addComponent({ name: 'Tail fin' }, 'Tail');
    expect(restoredShape.getComponent(addedComponent.id)).toBe(addedComponent);
    expect(restoredShape.removeExtraLimb('Tail')).toBe(true);
    expect(restoredShape.getComponent('Tail')).toBeUndefined();
    expect(restoredShape.removeHitLocation('Head')).toBe(true);
    expect(restoredShape.calledShots.isEmpty).toBe(true);
    expect(
      () =>
        new HerosBodyShape({
          name: 'Invalid',
          calledShots: [{ name: 'Invalid shot', targetLocation: 'Missing' }],
        })
    ).toThrow(/not a hit location/);
  });

  it('groups base characteristics, advantages, and disadvantages by model trait', () => {
    const object = new HerosCharacter({
      name: 'Sentinel',
      objectModelTypes: ['physical', 'sentient', 'mobile'],
      typedElements: [
        {
          type: 'primaryCharacteristic',
          name: 'BODY',
          value: 10,
          isBase: true,
          modelTypes: ['physical'],
        },
        {
          type: 'skill',
          name: 'Systems Operation',
          value: 3,
          isBase: true,
          modelTypes: ['sentient'],
        },
        { type: 'power', name: 'Flight', value: 20, isBase: false, modelTypes: ['mobile'] },
        {
          type: 'mentalDisadvantage',
          name: 'Protective directive',
          value: 10,
          isBase: true,
          modelTypes: ['sentient'],
        },
      ],
    });

    expect(HEROS_TYPED_ELEMENT_GROUPS.primaryCharacteristic).toBe('characteristics');
    expect(object.modelTraitElements.physical.characteristics.map((item) => item.name)).toEqual([
      'BODY',
    ]);
    expect(object.modelTraitElements.sentient.advantages.map((item) => item.name)).toEqual([
      'Systems Operation',
    ]);
    expect(object.modelTraitElements.sentient.disadvantages.map((item) => item.name)).toEqual([
      'Protective directive',
    ]);
    expect(object.baseTraitSpecification.mobile.advantages).toEqual([]);
    expect(object.removeNonBaseElements().map((item) => item.name)).toEqual(['Flight']);
    expect(object.typedElements.map((item) => item.name)).toEqual([
      'BODY',
      'Systems Operation',
      'Protective directive',
    ]);
  });

  it('distinguishes player and non-player sentient mobile characters', () => {
    const player = new HerosPlayerCharacter({
      name: 'Player',
      objectModelTypes: ['player-character', 'sentient', 'mobile'],
    });
    const nonPlayer = new HerosNonPlayerCharacter({
      name: 'Non-player',
      objectModelTypes: ['non-player-character', 'sentient', 'mobile'],
    });

    expect(player.objectModelTypes.map(String)).toContain(HEROS_OBJECT_MODEL_TYPES.playerCharacter);
    expect(nonPlayer.objectModelTypes.map(String)).toContain(
      HEROS_OBJECT_MODEL_TYPES.nonPlayerCharacter
    );
    for (const character of [player, nonPlayer]) {
      expect(character.objectModelTypes.map(String)).toContain(HEROS_OBJECT_MODEL_TYPES.sentient);
      expect(character.objectModelTypes.map(String)).toContain(HEROS_OBJECT_MODEL_TYPES.mobile);
    }
  });

  it('derives immutable model traits from concrete object kinds', () => {
    const vehicle = new HerosVehicle({ name: 'Vehicle', objectModelTypes: ['sentient'] });
    const character = new HerosPlayerCharacter({ name: 'Player', objectModelTypes: [] });

    expect(vehicle.objectModelTypes.map(String)).toEqual(['physical', 'non-sentient', 'mobile']);
    expect(character.objectModelTypes.map(String)).toEqual([
      'physical',
      'sentient',
      'mobile',
      'player-character',
    ]);
    expect(() => vehicle.objectModelTypes.add('sentient')).toThrow(TypeError);
    expect(vehicle.objectModelTypes.map(String)).toEqual(['physical', 'non-sentient', 'mobile']);
  });

  it('provides point-level presets whose values match the model classifications', () => {
    const preset = HerosPointLevelClassification.fromPreset('heroic-standard');

    expect(String(preset)).toBe('Standard Heroic');
    expect(preset.points.toString()).toBe('75');
    expect(preset.edition).toBe(HEROS_EDITIONS['5e']);
    expect(() => HerosPointLevelClassification.fromPreset('unknown')).toThrow(RangeError);
  });
});
