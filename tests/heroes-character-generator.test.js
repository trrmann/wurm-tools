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
  replaceHerosObjectBodyShape,
  BodyShape,
} from '../src/js/modules/objects/heroes.mjs';
import { Avian } from '../src/js/modules/objects/heroes/elements/body-shapes/avian-shapes.mjs';
import { Humanoid } from '../src/js/modules/objects/heroes/elements/body-shapes/humanoid-shapes.mjs';
import { Head } from '../src/js/modules/objects/heroes/elements/body-shapes/body-parts.mjs/head-parts.mjs';
import { Wings } from '../src/js/modules/objects/heroes/elements/body-shapes/body-parts.mjs/wings-parts.mjs';
import { BodyChestRibs } from '../src/js/modules/objects/heroes/elements/body-shapes/body-parts.mjs/body-chest-ribs-parts.mjs';
import { Stomach } from '../src/js/modules/objects/heroes/elements/body-shapes/body-parts.mjs/stomach-parts.mjs';
import { Vitals } from '../src/js/modules/objects/heroes/elements/body-shapes/body-parts.mjs/vitals-parts.mjs';
import { Legs } from '../src/js/modules/objects/heroes/elements/body-shapes/body-parts.mjs/legs-parts.mjs';
import { Tail } from '../src/js/modules/objects/heroes/elements/body-shapes/body-parts.mjs/tail-parts.mjs';
import { GameObject } from '../src/js/modules/objects/heroes/objects/game-objects.mjs';
import { herosElementCatalogSize } from '../src/js/modules/objects/heroes/element-catalog.mjs';
import { Cone } from '../src/js/modules/objects/heroes/elements/body-shapes/cone-shapes.mjs';
import { Arachnid } from '../src/js/modules/objects/heroes/elements/body-shapes/arachnid-shapes.mjs';
import { Insectoid } from '../src/js/modules/objects/heroes/elements/body-shapes/insectoid-shapes.mjs';
import { Power } from '../src/js/modules/objects/heroes/elements/powers/powers.mjs';
import { Advantage } from '../src/js/modules/objects/heroes/elements/powers/power-modifiers/power-advantages/power-advantages.mjs';
import { Multipower } from '../src/js/modules/objects/heroes/elements/powers/power-modifiers/power-frameworks/multipower-frameworks.mjs';

describe('HERO character generator', () => {
  it('builds expanded character classes and applies modifiers to the equation', () => {
    const character = generateHerosCharacter({
      name: 'Aster',
      characterType: 'player',
      edition: '5e',
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
    expect(character.edition.id).toBe('5e');
    expect(character.primaryCharacteristics.first).toBeInstanceOf(HerosPrimaryCharacteristic);
    expect(character.skills.first).toBeInstanceOf(HerosSkill);
    expect(character.powerFrameworks.first).toBeInstanceOf(HerosMultipower);
    expect(character.physicalDisadvantages.first).toBeInstanceOf(HerosPhysicalDisadvantage);
    expect(character.equation.advantagesValue.toString()).toBe('19');
    expect(character.equation.pointsValue.toString()).toBe('1');
    expect(character.equation.disadvantagesValue.toString()).toBe('3');
  });

  it('uses object-type body-shape defaults without injecting character elements', () => {
    const characteristicTypes = getHerosCharacterElementTypes().filter(
      (definition) => definition.isCharacterElement && definition.group === 'characteristics'
    );
    const strengthType = characteristicTypes.find((definition) =>
      definition.type.endsWith('#Strength')
    );

    expect(characteristicTypes.length).toBeGreaterThan(8);
    expect(strengthType).toBeDefined();
    const expectedShapes = {
      object: 'Ellipsoid',
      character: 'Humanoid',
      'player-character': 'Humanoid',
      'non-player-character': 'Humanoid',
      base: 'RectangularParallelepiped',
      vehicle: 'RectangularParallelepiped',
      equipment: 'RectangularParallelepiped',
      animal: 'Quadruped',
      plant: 'RectangularParallelepiped',
      automaton: 'RectangularParallelepiped',
      computer: 'RectangularParallelepiped',
      ai: 'Ellipsoid',
    };
    for (const { type: objectType } of getHerosObjectTypes()) {
      const object = generateHerosObject({ objectType });
      expect(
        object.typedElements.filter((item) =>
          characteristicTypes.some((definition) => definition.type === item.type)
        )
      ).toHaveLength(0);
      expect(object.generatedElements.has(strengthType.type)).toBe(false);
      const shapes = object.elementObjects.filter((element) => element instanceof BodyShape);
      expect(shapes).toHaveLength(1);
      expect(object.bodyShape).toBe(shapes[0]);
      expect(object.bodyShape.constructor.name).toBe(expectedShapes[objectType]);
      const bodyShapeDefinitions = object.typedElements.filter((item) =>
        getHerosCharacterElementTypes().some(
          (entry) => entry.type === item.type && entry.group === 'body-shapes'
        )
      );
      expect(bodyShapeDefinitions).toHaveLength(1);
      expect(object.generatedElements.get(bodyShapeDefinitions[0].type)[0]).toBe(object.bodyShape);
      expect(bodyShapeDefinitions[0]).toMatchObject({
        isBase: true,
        isHierarchyDefault: true,
      });
      expect(object.bodyShape.parts.length).toBeGreaterThan(0);
      const restored = generateHerosObject({
        objectType,
        typedElements: JSON.parse(JSON.stringify(object.typedElements)),
      });
      expect(restored.bodyShape.constructor).toBe(object.bodyShape.constructor);
      expect(restored.bodyShape.toJSON()).toEqual(object.bodyShape.toJSON());
      expect(
        restored.elementObjects.filter((element) => element instanceof BodyShape)
      ).toHaveLength(1);
    }
  });

  it('replaces the inherited body-shape instance in the actual object element list', () => {
    const object = new GameObject();
    const inherited = object.bodyShape;
    const replacement = new Humanoid();
    object.Add(replacement);
    object.Add(replacement);

    expect(object.bodyShape).toBe(replacement);
    expect(object.GetBodyShapes()).toHaveLength(1);
    expect(object.characterElements).not.toContain(inherited);
    expect(object.characterElements).toContain(replacement);
  });

  it('uses object class factories rather than a competing default-shape table', () => {
    const original = HerosCharacter.ObjectClass.createDefaultBodyShape;
    HerosCharacter.ObjectClass.createDefaultBodyShape = () => new Avian();
    try {
      expect(generateHerosObject({ objectType: 'character' }).bodyShape).toBeInstanceOf(Avian);
    } finally {
      HerosCharacter.ObjectClass.createDefaultBodyShape = original;
    }
  });

  it('replaces concrete shapes without retaining or resurrecting the previous shape', () => {
    const original = generateHerosObject({ objectType: 'character' });
    const replacement = replaceHerosObjectBodyShape(
      { objectType: 'character', typedElements: original.typedElements },
      { type: 'element:body-shapes/avian-shapes#Avian', name: 'Avian' }
    );
    for (const objectType of ['character', 'vehicle']) {
      const restored = generateHerosObject({
        objectType,
        typedElements: JSON.parse(JSON.stringify(replacement.typedElements)),
      });
      expect(restored.bodyShape).toBeInstanceOf(Avian);
      expect(restored.elementObjects.filter((element) => element instanceof BodyShape)).toEqual([
        restored.bodyShape,
      ]);
      expect(restored.generatedElements.has('element:body-shapes/humanoid-shapes#Humanoid')).toBe(
        false
      );
      expect(
        restored.typedElements.filter((item) => item.type.includes('body-shapes/'))
      ).toHaveLength(1);
      expect(restored.bodyShape.parts.map((part) => part.name)).toEqual(
        replacement.bodyShape.parts.map((part) => part.name)
      );
    }
  });

  it('rejects duplicate shapes and obsolete parallel body-shape inputs', () => {
    const typedElements = ['Humanoid', 'Avian'].map((name) => ({
      type: `element:body-shapes/${name.toLowerCase()}-shapes#${name}`,
      name,
    }));
    expect(() => generateHerosObject({ typedElements })).toThrow(/exactly one/);
    expect(() => generateHerosCharacter({ typedElements })).toThrow(/exactly one/);
    for (const obsolete of [{ bodyShape: 'Humanoid' }, { bodyShapes: ['Humanoid'] }]) {
      expect(() => generateHerosObject(obsolete)).toThrow(/typedElements/);
    }
    expect(() => replaceHerosObjectBodyShape({}, { type: 'skill' })).toThrow(/body-shape/);
    for (const type of ['packageDeal', 'multipower']) {
      expect(() =>
        generateHerosObject({
          typedElements: [{ type, name: 'Nested shape', children: [typedElements[0]] }],
        })
      ).toThrow(/directly to the object/);
    }
  });

  it('gives standalone generated characters one class-owned body-shape element', () => {
    const character = generateHerosCharacter();
    expect(character.bodyShape).toBeInstanceOf(Humanoid);
    expect(character.elementObjects.filter((element) => element instanceof BodyShape)).toEqual([
      character.bodyShape,
    ]);
    expect(character.generatedElements.get(character.typedElements[0].type)).toEqual([
      character.bodyShape,
    ]);
    expect(() => new HerosCharacter({ elementObjects: [] })).toThrow(/exactly one/);
  });

  it('preserves concrete avian anatomy and replays part changes from an unchanged baseline', () => {
    const shapeType = 'element:body-shapes/avian-shapes#Avian';
    const disadvantageType = getHerosCharacterElementTypes().find((entry) =>
      entry.type.endsWith('#PhysicalLimitation')
    ).type;
    const parts = [Head, Wings, BodyChestRibs, Stomach, Vitals, Legs, Tail];
    const baseline = generateHerosObject({ typedElements: [{ type: shapeType, name: 'Avian' }] });
    expect(baseline.bodyShape.parts.map((part) => part.constructor)).toEqual(parts);

    for (const action of ['set-present', 'remove']) {
      const changed = generateHerosObject({
        typedElements: [
          ...baseline.typedElements,
          {
            type: disadvantageType,
            name: 'Wing injury',
            value: '0',
            bodyShapeChange: {
              shapeName: 'Avian',
              action,
              componentId: 'body-part-Wings',
              isPresent: false,
            },
          },
        ],
      });
      const restored = generateHerosObject({
        typedElements: JSON.parse(JSON.stringify(changed.typedElements)),
      });
      if (action === 'remove') {
        expect(restored.bodyShape.getComponent('body-part-Wings')).toBeUndefined();
      } else {
        expect(restored.bodyShape.getComponent('body-part-Wings')).toBeInstanceOf(Wings);
        expect(restored.bodyShape.isComponentPresent('body-part-Wings')).toBe(false);
      }
      expect(restored.bodyShape.parts.every((part) => parts.includes(part.constructor))).toBe(true);
      const healed = generateHerosObject({
        typedElements: restored.typedElements.filter((item) => item.type === shapeType),
      });
      expect(healed.bodyShape.parts.map((part) => part.constructor)).toEqual(parts);
      expect(healed.bodyShape.isComponentPresent('body-part-Wings')).toBe(true);
    }
  });

  it('generates character elements only from each object typed-element list', () => {
    const strengthType = getHerosCharacterElementTypes().find((definition) =>
      definition.type.endsWith('#Strength')
    );
    expect(strengthType).toBeDefined();

    for (const { type } of getHerosObjectTypes()) {
      const object = generateHerosObject({
        objectType: type,
        typedElements: [{ type: strengthType.type, name: 'Strength', value: '0' }],
      });
      const element = object.typedElements.find((item) => item.type === strengthType.type);

      expect(element).toMatchObject({
        name: 'Strength',
        value: '0',
      });
      expect(element.isHierarchyDefault).toBeUndefined();
      expect(object.generatedElements.get(strengthType.type)).toHaveLength(1);
      expect(() => object.generatedElements.get(strengthType.type)[0].Value()).not.toThrow();
    }
  });

  it('preserves body-shape inheritance in the element catalog and object definitions', () => {
    const bodyShapeTypes = getHerosCharacterElementTypes().filter((definition) =>
      definition.type.startsWith('element:body-shapes/')
    );
    const coneType = bodyShapeTypes.find(
      (definition) => definition.type === 'element:body-shapes/cone-shapes#Cone'
    );
    const arachnidType = bodyShapeTypes.find((definition) => definition.type.endsWith('#Arachnid'));
    const bodyShapeType = bodyShapeTypes.find((definition) =>
      definition.type.endsWith('#BodyShape')
    );

    expect(bodyShapeTypes.length).toBeGreaterThan(5);
    expect(
      bodyShapeTypes.every(
        (definition) =>
          definition.group === 'body-shapes' &&
          definition.field === 'bodyShapes' &&
          !definition.priced &&
          !definition.type.includes(' copy')
      )
    ).toBe(true);
    expect(coneType).toMatchObject({
      group: 'body-shapes',
      field: 'bodyShapes',
      priced: false,
    });
    expect(arachnidType).toMatchObject({
      group: 'body-shapes',
      field: 'bodyShapes',
      priced: false,
    });
    expect(bodyShapeType).toBeDefined();
    const object = generateHerosObject({
      objectType: 'character',
      typedElements: [
        {
          type: coneType.type,
          name: 'Conical shell',
          generalShape: 'Cone',
          shapeTypes: ['cone'],
          components: [{ id: 'tip', name: 'Tip' }],
        },
      ],
    });

    const generatedCone = object.generatedElements.get(coneType.type)[0];
    const serializedCone = object.typedElements.find((item) => item.type === coneType.type);

    expect(generatedCone).toBeInstanceOf(Cone);
    expect(generatedCone.generalShape).toBe('Cone');
    expect(String(generatedCone.components.first)).toBe('Tip');
    expect(serializedCone).toMatchObject({
      name: 'Conical shell',
      generalShape: 'Cone',
      shapeTypes: ['cone'],
      components: [{ id: 'tip' }],
    });
    expect(object.typedElements.filter((item) => item.type === bodyShapeType.type)).toHaveLength(0);
    expect(object.bodyShape).toBe(generatedCone);
    expect(object.elementObjects.filter((item) => item instanceof BodyShape)).toHaveLength(1);

    const generatedArachnid = generateHerosObject({
      objectType: 'character',
      typedElements: [{ type: arachnidType.type, name: 'Arachnid' }],
    }).generatedElements.get(arachnidType.type)[0];
    expect(generatedArachnid).toBeInstanceOf(Arachnid);
    expect(generatedArachnid).toBeInstanceOf(Insectoid);
  });

  it('applies power and disadvantage body-shape changes to the object body-shape element', () => {
    const types = getHerosCharacterElementTypes();
    const bodyShapeType = types.find((definition) => definition.type.endsWith('#Humanoid'));
    const powerType = types.find((definition) => definition.type.endsWith('#BodyAffectingPower'));
    const disadvantageType = types.find((definition) =>
      definition.type.endsWith('#PhysicalLimitation')
    );
    const componentId = 'cybernetic-arm';

    const object = generateHerosObject({
      objectType: 'character',
      typedElements: [
        {
          type: powerType.type,
          name: 'Cybernetic replacement',
          value: '10',
          bodyShapeChange: {
            shapeName: 'Humanoid',
            action: 'add',
            componentType: 'component',
            componentId,
            componentName: 'Cybernetic arm',
          },
        },
        {
          type: disadvantageType.type,
          name: 'Damaged replacement',
          value: '5',
          bodyShapeChange: {
            shapeName: 'Humanoid',
            action: 'set-present',
            componentId,
            isPresent: false,
          },
        },
      ],
    });
    const bodyShapeDefinition = object.typedElements.find(
      (item) => item.type === bodyShapeType.type
    );
    const bodyShape = object.bodyShape;

    expect(bodyShapeDefinition.components[0].id).toBe(componentId);
    expect(String(bodyShapeDefinition.components[0])).toBe('Cybernetic arm');
    expect(bodyShape.getComponent(componentId)).toBeDefined();
    expect(bodyShape.isComponentPresent(componentId)).toBe(false);
    expect(bodyShapeDefinition.baseBodyShape.components).toEqual([]);

    const restored = generateHerosObject({
      objectType: 'character',
      typedElements: object.typedElements,
    });
    expect(restored.bodyShape.getComponent(componentId)).toBeDefined();
    expect(restored.bodyShape.isComponentPresent(componentId)).toBe(false);
    const noChanges = generateHerosObject({
      objectType: 'character',
      typedElements: restored.typedElements.filter((item) => item.type === bodyShapeType.type),
    });
    expect(noChanges.bodyShape.getComponent(componentId)).toBeUndefined();
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

    expect(() => generateHerosCharacter({ edition: '6e' })).toThrow(/Only HERO System 5th Edition/);

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
    expect(character.elementObjects).toHaveLength(3);
    expect(character.bodyShape).toBeInstanceOf(Humanoid);
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
    const nonShapes = types.filter((definition) => definition.group !== 'body-shapes');
    const character = generateHerosCharacter({
      typedElements: nonShapes.map((definition) => ({
        type: definition.type,
        name: definition.label,
        value: '0',
        detail: definition.type.endsWith('#Defense') ? '0' : undefined,
      })),
    });
    const generated = [...character.generatedElements.values()].flat();

    expect(generated).toHaveLength(nonShapes.length + 1);
    expect(character.elementObjects).toHaveLength(nonShapes.length + 1);
    for (const entry of types.filter((definition) => definition.group === 'body-shapes')) {
      const object = generateHerosObject({
        typedElements: [{ type: entry.type, name: entry.defaultName }],
      });
      expect(object.bodyShape).toBeInstanceOf(entry.elementClass);
      expect(object.elementObjects).toHaveLength(1);
    }
  });

  it('exposes modifier collections consistently on powers and frameworks', () => {
    for (const object of [new Power(), new Multipower()]) {
      object.AddModifier(new Advantage());

      expect(object.ModifierNames).toHaveLength(1);
      expect(object.PowerAdvantages).toHaveLength(1);
      expect(object.PowerLimitations).toHaveLength(0);
    }
  });

  it('constructs every selectable object kind with shared HERO elements and kind-derived traits', () => {
    for (const { type, modelTypes } of getHerosObjectTypes()) {
      const object = generateHerosObject({
        name: `Test ${type}`,
        objectType: type,
        edition: '5e',
        objectModelTypes: ['sentient'],
        typedElements: [{ type: 'skill', name: 'Tracking', value: '3' }],
        acquisition: { amount: '12', notes: 'Entered by user' },
      });

      expect(object.objectType).toBe(type);
      expect(object.kind).toBe(type);
      expect(object.objectModelTypes.map(String)).toEqual(modelTypes);
      expect(object.generatedElements.get('skill')).toHaveLength(1);
      expect(object.equation.advantagesValue.toString()).toBe('3');
      expect(object.acquisition).toEqual({ amount: '12', notes: 'Entered by user' });
    }
  });

  it('rejects unknown object kinds and ignores serialized model traits', () => {
    expect(() => generateHerosObject({ objectType: 'future-kind' })).toThrow(
      'Unsupported HERO object type'
    );
    expect(
      generateHerosObject({
        objectType: 'vehicle',
        objectModelTypes: ['player-character', 'sentient'],
      }).objectModelTypes.map(String)
    ).toEqual(['physical', 'non-sentient', 'mobile']);
  });
});
