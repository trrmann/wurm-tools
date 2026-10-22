import {
  HerosAdvantage,
  HerosAdvantageModifier,
  HerosCharacter,
  HerosCharacteristic,
  HerosDisadvantage,
  HerosElementalControl,
  HerosEverymanSkill,
  HerosFiguredCharacteristic,
  HerosLimitation,
  HerosMentalDisadvantage,
  HerosMultipower,
  HerosPackageDeal,
  HerosPerk,
  HerosPhysicalDisadvantage,
  HerosPlayerCharacter,
  HerosPower,
  HerosPowerFramework,
  HerosPrimaryCharacteristic,
  HerosSkill,
  HerosSocialDisadvantage,
  HerosSpecialEffect,
  HerosTalent,
  HerosVariablePowerPool,
  HerosNonPlayerCharacter,
  hasHerosFiguredCharacteristicFormula,
  normalizeHerosEdition,
  registerHerosFiguredCharacteristicFormula,
} from './heroes.mjs';
import { MixedNumber } from '../mixed-numbers.mjs';
import { HerosEquation } from './heroes.mjs';
import { ActionName, DescriptionName, EventName } from '../things.mjs';
import { CharacterElements } from './elements/character-elements.mjs';
import { HerosValue } from './heros-values.mjs';

const elementTypes = new Map();
const groups = new Set(['characteristics', 'advantages', 'disadvantages', 'body-shapes']);

function registerBuiltin(type, definition) {
  elementTypes.set(
    type,
    Object.freeze({
      ...definition,
      type,
      label: definition.label ?? type,
      group: definition.group ?? null,
      field: definition.field ?? null,
      priced: definition.priced ?? definition.group != null,
      nestedIn: Object.freeze([...(definition.nestedIn ?? [])]),
      detailLabel: definition.detailLabel ?? 'Description or detail',
      detailRequired: Boolean(definition.detailRequired),
      valueLabel: definition.valueLabel ?? 'Point value',
      isModifier: Boolean(definition.isModifier),
      isCharacterElement: Boolean(definition.isCharacterElement),
      isPrimaryCharacteristic: Boolean(definition.isPrimaryCharacteristic),
      defaultName: definition.defaultName,
      defaultDefinition: definition.defaultDefinition,
      elementClass: definition.elementClass,
      constructionPriority: definition.constructionPriority ?? 0,
    })
  );
}

/**
 * Register a typed element so the generator and editor can consume future domain classes.
 * Set `field` to the matching HerosCharacter collection and `group` for equation inclusion.
 */
export function registerHerosCharacterElementType(type, definition) {
  const key = String(type).trim();
  if (!key) throw new TypeError('Character element type is required');
  if (elementTypes.has(key))
    throw new RangeError(`Character element type "${key}" is already registered`);
  if (typeof definition?.create !== 'function') {
    throw new TypeError('Character element registration requires a create function');
  }
  if (definition.group != null && !groups.has(definition.group)) {
    throw new RangeError(`Unsupported character element group: ${definition.group}`);
  }
  if (definition.field != null && typeof definition.field !== 'string') {
    throw new TypeError('Character element field must be a string');
  }
  if (definition.nestedIn != null && !Array.isArray(definition.nestedIn)) {
    throw new TypeError('Character element nestedIn must be an array');
  }
  if ((definition.nestedIn ?? []).some((context) => !['framework', 'package'].includes(context))) {
    throw new RangeError('Character element nestedIn supports only framework and package');
  }
  const entry = Object.freeze({
    type: key,
    label: definition.label ?? key,
    group: definition.group ?? null,
    field: definition.field ?? null,
    create: definition.create,
    priced: definition.priced ?? definition.group != null,
    nestedIn: Object.freeze([...(definition.nestedIn ?? [])]),
    detailLabel: definition.detailLabel ?? 'Description or detail',
    detailRequired: Boolean(definition.detailRequired),
    valueLabel: definition.valueLabel ?? 'Point value',
    isModifier: Boolean(definition.isModifier),
    isCharacterElement: Boolean(definition.isCharacterElement),
    isPrimaryCharacteristic: Boolean(definition.isPrimaryCharacteristic),
    defaultName: definition.defaultName,
    defaultDefinition: definition.defaultDefinition,
    elementClass: definition.elementClass,
    constructionPriority: definition.constructionPriority ?? 0,
  });
  elementTypes.set(key, entry);
  return () => {
    if (elementTypes.get(key) === entry) elementTypes.delete(key);
  };
}

export function getHerosCharacterElementTypes() {
  return [...elementTypes.values()].map(({ create: _create, ...definition }) => definition);
}

function classFactory(Type, transform = (item) => item) {
  return (item, context) => new Type(transform(item, context));
}

const primaryCharacteristicAliases = Object.freeze({
  Strength: ['strength', 'str'],
  Dexterity: ['dexterity', 'dex'],
  Constitution: ['constitution', 'con'],
  Body: ['body'],
});

function canonicalPrimaryCharacteristicName(...values) {
  for (const [name, aliases] of Object.entries(primaryCharacteristicAliases)) {
    if (
      values.some((value) =>
        aliases.includes(
          String(value ?? '')
            .trim()
            .toLowerCase()
        )
      )
    ) {
      return name;
    }
  }
  return undefined;
}

function isPrimaryCharacteristicItem(item, definition) {
  return (
    definition?.isPrimaryCharacteristic ||
    Boolean(
      canonicalPrimaryCharacteristicName(
        item.name,
        item.shortName,
        definition?.label,
        item.type?.split('#').at(-1)
      )
    )
  );
}

function primaryCharacteristicValue(primaryCharacteristics, name) {
  const aliases = primaryCharacteristicAliases[name];
  const characteristic = [...primaryCharacteristics].find((item) =>
    [item.name, item.shortName, item.toString?.()].some((candidate) =>
      aliases.includes(
        String(candidate ?? '')
          .trim()
          .toLowerCase()
      )
    )
  );
  if (!characteristic) {
    const providedNames = [...primaryCharacteristics]
      .map((item) => item.name ?? item.toString?.() ?? '')
      .filter(Boolean)
      .join(', ');
    throw new RangeError(
      `5th Edition figured characteristic formula requires ${name}` +
        (providedNames ? `; provided: ${providedNames}` : '')
    );
  }
  const value =
    characteristic.baseValue ??
    characteristic.UnroundedValue ??
    characteristic.BaseValue ??
    characteristic.value ??
    (typeof characteristic.Value === 'function' ? characteristic.Value() : undefined);
  if (value == null) {
    throw new TypeError(`Primary characteristic ${name} does not have a value`);
  }
  return MixedNumber.from(value);
}

function figuredCharacteristicValue(baseValue, points, valueRate, roundingMode = 'nearest') {
  const exactValue = MixedNumber.from(baseValue).add(
    MixedNumber.from(points.sum() ?? 0).divide(valueRate)
  );
  return new HerosValue({
    BaseValue: exactValue,
    ValueFunction: ({ BaseValue }) => BaseValue,
    RoundingMode: roundingMode,
  });
}

function registerFifthEditionFiguredFormulas() {
  const register = (formulaId, deriveValue) =>
    registerHerosFiguredCharacteristicFormula(formulaId, '5e', deriveValue);
  register('physical-defense', ({ points, primaryCharacteristics }) =>
    figuredCharacteristicValue(
      primaryCharacteristicValue(primaryCharacteristics, 'Strength').divide(5),
      points,
      1
    )
  );
  register('energy-defense', ({ points, primaryCharacteristics }) =>
    figuredCharacteristicValue(
      primaryCharacteristicValue(primaryCharacteristics, 'Constitution').divide(5),
      points,
      1
    )
  );
  register('speed', ({ points, primaryCharacteristics }) =>
    figuredCharacteristicValue(
      MixedNumber.from(1).add(
        primaryCharacteristicValue(primaryCharacteristics, 'Dexterity').divide(10)
      ),
      points,
      10,
      'down'
    )
  );
  register('recovery', ({ points, primaryCharacteristics }) =>
    figuredCharacteristicValue(
      primaryCharacteristicValue(primaryCharacteristics, 'Strength')
        .add(primaryCharacteristicValue(primaryCharacteristics, 'Constitution'))
        .divide(5),
      points,
      2
    )
  );
  register('endurance', ({ points, primaryCharacteristics }) =>
    figuredCharacteristicValue(
      primaryCharacteristicValue(primaryCharacteristics, 'Constitution').multiply(2),
      points,
      '1/2'
    )
  );
  register('stun', ({ points, primaryCharacteristics }) =>
    figuredCharacteristicValue(
      primaryCharacteristicValue(primaryCharacteristics, 'Body')
        .add(primaryCharacteristicValue(primaryCharacteristics, 'Strength').divide(2))
        .add(primaryCharacteristicValue(primaryCharacteristics, 'Constitution').divide(2)),
      points,
      1
    )
  );
}

registerFifthEditionFiguredFormulas();

registerBuiltin('characteristic', {
  label: 'Characteristic',
  group: 'characteristics',
  field: 'characteristics',
  create: classFactory(HerosCharacteristic),
});
registerBuiltin('primaryCharacteristic', {
  label: 'Primary characteristic',
  group: 'characteristics',
  field: 'primaryCharacteristics',
  detailLabel: 'Base value',
  isPrimaryCharacteristic: true,
  create: classFactory(HerosPrimaryCharacteristic, (item) => ({
    ...item,
    baseValue: item.baseValue ?? item.detail ?? item.value ?? 0,
  })),
});
registerBuiltin('figuredCharacteristic', {
  label: 'Figured characteristic',
  group: 'characteristics',
  field: 'characteristics',
  detailLabel: 'Edition formula ID',
  detailRequired: true,
  create: (item, context) => {
    const formulaId = item.formulaId ?? item.detail;
    const options = {
      ...item,
      formulaId,
      edition: item.edition ?? context.edition.id,
      points: item.points ?? (item.value == null ? [] : [item.value]),
      primaryCharacteristics: item.primaryCharacteristics ?? context.primaryCharacteristics,
    };
    if (
      typeof item.deriveValue === 'function' ||
      hasHerosFiguredCharacteristicFormula(formulaId, options.edition)
    ) {
      return new HerosFiguredCharacteristic(options);
    }
    const pending = new HerosCharacteristic(item);
    pending.formulaId = formulaId;
    pending.edition = normalizeHerosEdition(options.edition);
    pending.calculationPending = true;
    return pending;
  },
});
registerBuiltin('advantage', {
  label: 'Advantage',
  group: 'advantages',
  field: 'advantages',
  nestedIn: ['package'],
  create: classFactory(HerosAdvantage),
});
registerBuiltin('skill', {
  label: 'Skill',
  group: 'advantages',
  field: 'skills',
  nestedIn: ['package'],
  create: classFactory(HerosSkill),
});
registerBuiltin('everymanSkill', {
  label: 'Everyman skill',
  group: 'advantages',
  field: 'everymanSkills',
  create: classFactory(HerosEverymanSkill),
});
registerBuiltin('talent', {
  label: 'Talent',
  group: 'advantages',
  field: 'talents',
  nestedIn: ['package'],
  create: classFactory(HerosTalent),
});
registerBuiltin('perk', {
  label: 'Perk',
  group: 'advantages',
  field: 'perks',
  nestedIn: ['package'],
  create: classFactory(HerosPerk),
});
registerBuiltin('power', {
  label: 'Power',
  group: 'advantages',
  field: 'powers',
  nestedIn: ['framework', 'package'],
  create: classFactory(HerosPower),
});
registerBuiltin('powerFramework', {
  label: 'Power framework',
  group: 'advantages',
  field: 'powerFrameworks',
  detailLabel: 'Included powers',
  create: classFactory(HerosPowerFramework),
});
registerBuiltin('multipower', {
  label: 'Multipower',
  group: 'advantages',
  field: 'powerFrameworks',
  detailLabel: 'Included slots',
  create: classFactory(HerosMultipower),
});
registerBuiltin('elementalControl', {
  label: 'Elemental control',
  group: 'advantages',
  field: 'powerFrameworks',
  detailLabel: 'Included powers',
  create: classFactory(HerosElementalControl),
});
registerBuiltin('variablePowerPool', {
  label: 'Variable power pool',
  group: 'advantages',
  field: 'variablePowerPools',
  detailLabel: 'Pool points',
  create: classFactory(HerosVariablePowerPool, (item) => ({
    ...item,
    poolPoints: item.poolPoints ?? item.detail ?? item.value ?? 0,
  })),
});
registerBuiltin('packageDeal', {
  label: 'Package deal',
  group: 'advantages',
  field: 'packageDeals',
  detailLabel: 'Included elements',
  priced: false,
  create: classFactory(HerosPackageDeal),
});
registerBuiltin('disadvantage', {
  label: 'Disadvantage',
  group: 'disadvantages',
  field: 'disadvantages',
  nestedIn: ['package'],
  create: classFactory(HerosDisadvantage),
});
registerBuiltin('physicalDisadvantage', {
  label: 'Physical disadvantage',
  group: 'disadvantages',
  field: 'physicalDisadvantages',
  nestedIn: ['package'],
  create: classFactory(HerosPhysicalDisadvantage),
});
registerBuiltin('mentalDisadvantage', {
  label: 'Mental disadvantage',
  group: 'disadvantages',
  field: 'mentalDisadvantages',
  nestedIn: ['package'],
  create: classFactory(HerosMentalDisadvantage),
});
registerBuiltin('socialDisadvantage', {
  label: 'Social disadvantage',
  group: 'disadvantages',
  field: 'socialDisadvantages',
  nestedIn: ['package'],
  create: classFactory(HerosSocialDisadvantage),
});
registerBuiltin('modifier', {
  label: 'Modifier',
  detailLabel: 'Signed price rate',
  detailRequired: true,
  valueLabel: 'Signed price rate',
  priced: false,
  isModifier: true,
  nestedIn: [],
  create: classFactory(HerosAdvantageModifier, (item) => ({
    ...item,
    rate: item.rate ?? item.detail ?? 0,
  })),
});
registerBuiltin('limitation', {
  label: 'Limitation',
  detailLabel: 'Signed price rate',
  detailRequired: true,
  valueLabel: 'Signed price rate',
  priced: false,
  isModifier: true,
  nestedIn: [],
  create: classFactory(HerosLimitation, (item) => ({
    ...item,
    rate: item.rate ?? item.detail ?? 0,
  })),
});
registerBuiltin('specialEffect', {
  label: 'Special effect',
  field: 'specialEffects',
  priced: false,
  create: (item) => new HerosSpecialEffect(item.detail || item.name || ''),
});
registerBuiltin('event', {
  label: 'Event',
  field: 'events',
  priced: false,
  create: (item) => new EventName(item.name || ''),
});
registerBuiltin('action', {
  label: 'Action',
  field: 'actions',
  priced: false,
  create: (item) => new ActionName(item.name || ''),
});
registerBuiltin('description', {
  label: 'Description',
  field: 'descriptions',
  priced: false,
  create: (item) => new DescriptionName(item.detail || item.name || ''),
});

function makeModifier(record, context) {
  const definition = elementTypes.get(record.type);
  const modifier = definition?.create(record, context);
  if (modifier) modifier.target = record.target;
  return modifier;
}

function createRegisteredItem(item, context) {
  const definition = elementTypes.get(item.type);
  if (!definition) return undefined;
  const instance = definition.isModifier
    ? makeModifier(item, context)
    : definition.create(item, context);
  if (instance == null || (typeof instance !== 'object' && typeof instance !== 'function')) {
    throw new TypeError(`Factory for character element "${item.type}" must return an object`);
  }
  if (item.bodyShapeChange) {
    instance.bodyShapeChange = Object.freeze({ ...item.bodyShapeChange });
  }
  return instance;
}

function attachModifiers(elements, modifiers) {
  for (const item of elements) {
    for (const modifier of modifiers) {
      if (modifier.target === item.name && typeof item.addModifier === 'function') {
        item.addModifier(modifier);
      }
    }
  }
}

function toEquationEntry(item, modifiers) {
  const copy = { ...item, value: MixedNumber.from(item.value ?? 0) };
  for (const modifier of modifiers) {
    if (modifier.target === item.name) {
      copy.value = copy.value.multiply(MixedNumber.from(1).add(modifier.rate));
    }
  }
  return { name: String(copy.name ?? ''), value: copy.value.toString() };
}

function toDefinitionList(value, label) {
  if (value == null) return [];
  if (typeof value === 'string' || typeof value[Symbol.iterator] !== 'function') {
    throw new TypeError(`${label} must be an iterable of objects`);
  }
  const items = Array.from(value);
  if (items.some((item) => item == null || typeof item !== 'object' || Array.isArray(item))) {
    throw new TypeError(`${label} must contain only objects`);
  }
  return items;
}

export function withHerosObjectBodyShape(elements, ObjectClass) {
  const typedElements = toDefinitionList(elements, 'typedElements');
  if (!typedElements.some((item) => elementTypes.get(item.type)?.group === 'body-shapes')) {
    const shape = ObjectClass.createDefaultBodyShape();
    const entry = [...elementTypes.values()].find(
      (entry) => entry.elementClass === shape.constructor
    );
    if (!entry) throw new RangeError(`Unregistered body-shape class: ${shape.constructor.name}`);
    typedElements.push({
      ...shape.toJSON(),
      type: entry.type,
      value: '0',
      isBase: true,
      isHierarchyDefault: true,
    });
  }
  return typedElements;
}

export function withHerosObjectElements(elements, ObjectClass) {
  const typedElements = withHerosObjectBodyShape(elements, ObjectClass);
  for (const { Type, options = {} } of ObjectClass.defaultElements) {
    const entry = [...elementTypes.values()].find((entry) => entry.elementClass === Type);
    if (!entry) throw new RangeError(`Unregistered inherited element class: ${Type.name}`);
    if (typedElements.some((item) => item.type === entry.type)) continue;
    typedElements.push({
      type: entry.type,
      name: entry.label,
      value: String(options.Points ?? 0),
      ...(options.BaseValue == null ? {} : { baseValue: options.BaseValue }),
      ...(options.Composition == null ? {} : { composition: options.Composition }),
      isBase: true,
      isHierarchyDefault: true,
    });
  }
  return typedElements;
}

/** Build a class-backed HERO character while retaining its serialized typed-element definitions. */
export function generateHerosCharacter(definition = {}) {
  if (definition == null || typeof definition !== 'object' || Array.isArray(definition)) {
    throw new TypeError('Character definition must be an object');
  }

  const edition = normalizeHerosEdition(definition.edition);
  const characterElements = new CharacterElements();
  const context = { edition, characterElements };
  const typedElements = withHerosObjectBodyShape(
    definition.typedElements,
    HerosCharacter.ObjectClass
  );
  if (
    typedElements.filter((item) => elementTypes.get(item.type)?.group === 'body-shapes').length > 1
  ) {
    throw new RangeError('An object must have exactly one body-shape element');
  }
  function validateNestedShapes(items) {
    for (const item of items) {
      const children = toDefinitionList(item.children, `Children for "${item.name}"`);
      if (children.some((child) => elementTypes.get(child.type)?.group === 'body-shapes')) {
        throw new TypeError(
          'Body-shape elements must belong directly to the object, not a package or framework'
        );
      }
      validateNestedShapes(children);
    }
  }
  validateNestedShapes(typedElements);
  const packageChildren = typedElements
    .filter((item) => item.type === 'packageDeal')
    .flatMap((item) => toDefinitionList(item.children, `Children for "${item.name}"`));
  const generatedElements = new Map();
  const modifiers = [];
  const rootGeneratedItems = [];
  const precreatedElements = new Map();
  const allTypedElements = [...typedElements, ...packageChildren];
  for (const priority of [0, 1]) {
    for (const item of allTypedElements) {
      const entry = elementTypes.get(item.type);
      if (
        !entry ||
        entry.constructionPriority !== priority ||
        (priority === 0 && !isPrimaryCharacteristicItem(item, entry)) ||
        (priority === 1 && !entry.isCharacterElement)
      ) {
        continue;
      }
      const instance = createRegisteredItem(item, context);
      precreatedElements.set(item, instance);
      if (entry.isCharacterElement) characterElements.add(instance);
    }
    if (priority === 0) {
      context.primaryCharacteristics = allTypedElements
        .filter((item) => isPrimaryCharacteristicItem(item, elementTypes.get(item.type)))
        .map((item) => {
          const instance = precreatedElements.get(item);
          const entry = elementTypes.get(item.type);
          const name =
            canonicalPrimaryCharacteristicName(
              item.name,
              item.shortName,
              entry?.label,
              item.type?.split('#').at(-1)
            ) ?? item.name;
          return {
            name: name ?? instance?.name ?? entry?.label,
            baseValue:
              instance?.baseValue ??
              instance?.UnroundedValue ??
              instance?.BaseValue ??
              instance?.value ??
              item.baseValue ??
              item.value ??
              0,
          };
        });
    }
  }
  const addGeneratedElement = (type, instance) => {
    const typeItems = generatedElements.get(type) ?? [];
    typeItems.push(instance);
    generatedElements.set(type, typeItems);
  };
  for (const item of typedElements) {
    const entry = elementTypes.get(item.type);
    if (!entry) continue;
    const instance = precreatedElements.get(item) ?? createRegisteredItem(item, context);
    if (entry.isCharacterElement && !precreatedElements.has(item)) {
      characterElements.add(instance);
    }
    addGeneratedElement(item.type, instance);
    rootGeneratedItems.push({ item, entry, instance });
    if (entry.isModifier) modifiers.push(instance);
  }
  const config = {
    ...definition,
    name: definition.name ?? '',
    edition: edition.id,
    points: definition.equation?.points ?? definition.points ?? [],
    typedElements,
    advantages: [],
    disadvantages: [],
  };

  for (const { entry, instance } of rootGeneratedItems) {
    if (!entry.field || entry.isModifier) continue;
    if (entry.field === 'bodyShapes') continue;
    const field =
      instance instanceof HerosFiguredCharacteristic ? 'figuredCharacteristics' : entry.field;
    (config[field] ??= []).push(instance);
  }
  const bodyShapeElements = rootGeneratedItems
    .filter(({ entry }) => entry.field === 'bodyShapes')
    .map(({ instance }) => instance);
  for (const shape of bodyShapeElements) {
    shape.bodyShapeBaseline = JSON.parse(JSON.stringify(shape));
  }
  for (const { entry, instance } of rootGeneratedItems) {
    const change = instance.bodyShapeChange;
    if (!change?.action || !change.shapeName) continue;
    if (
      (change.action === 'add' && (!change.componentId || !change.componentName)) ||
      (change.action !== 'add' && !change.componentId)
    ) {
      continue;
    }
    if (entry.group !== 'disadvantages' && !entry.nestedIn.includes('framework')) {
      throw new TypeError('Only powers and disadvantages can change body shapes');
    }
    const shape = bodyShapeElements.find(
      (bodyShape) => String(bodyShape.name) === change.shapeName
    );
    if (!shape) {
      throw new RangeError(`Unknown body shape for linked change: ${change.shapeName}`);
    }
    shape.applyChange(change);
  }
  config.elementObjects = characterElements;

  const characterType =
    definition.characterType === 'player'
      ? HerosPlayerCharacter
      : definition.characterType === 'nonPlayer'
        ? HerosNonPlayerCharacter
        : HerosCharacter;
  const character = new characterType(config);

  const modelElements = [
    ...character.characteristics,
    ...character.primaryCharacteristics,
    ...character.figuredCharacteristics,
    ...character.advantages,
    ...character.skills,
    ...character.everymanSkills,
    ...character.talents,
    ...character.perks,
    ...character.powers,
    ...character.powerFrameworks,
    ...character.variablePowerPools,
    ...character.disadvantages,
    ...character.physicalDisadvantages,
    ...character.mentalDisadvantages,
    ...character.socialDisadvantages,
    ...character.packageDeals,
  ];
  for (const deal of character.packageDeals) {
    modelElements.push(
      ...deal.advantages,
      ...deal.disadvantages,
      ...deal.physicalDisadvantages,
      ...deal.mentalDisadvantages,
      ...deal.socialDisadvantages,
      ...deal.skills,
      ...deal.talents,
      ...deal.perks,
      ...deal.powers
    );
  }
  attachModifiers(modelElements, modifiers);

  const hasPointValue = (item) => item.value != null && item.value !== '';
  const rawAdvantages = typedElements.filter(
    (item) =>
      ['advantages', 'characteristics'].includes(elementTypes.get(item.type)?.group) &&
      hasPointValue(item)
  );
  const rawDisadvantages = typedElements.filter(
    (item) => elementTypes.get(item.type)?.group === 'disadvantages' && hasPointValue(item)
  );
  const children = packageChildren.filter((item) =>
    ['advantages', 'characteristics'].includes(elementTypes.get(item.type)?.group)
  );
  const disadvantageChildren = packageChildren.filter(
    (item) => elementTypes.get(item.type)?.group === 'disadvantages'
  );
  character.equation = new HerosEquation({
    points: config.points,
    advantages: [...(definition.equation?.advantages ?? []), ...rawAdvantages, ...children]
      .filter(hasPointValue)
      .map((item) => toEquationEntry(item, modifiers)),
    disadvantages: [
      ...(definition.equation?.disadvantages ?? []),
      ...rawDisadvantages,
      ...disadvantageChildren,
    ]
      .filter(hasPointValue)
      .map((item) => toEquationEntry(item, modifiers)),
  });
  for (const item of packageChildren) {
    const instance = precreatedElements.get(item) ?? createRegisteredItem(item, context);
    if (!instance) continue;
    const entry = elementTypes.get(item.type);
    if (entry?.isCharacterElement && !precreatedElements.has(item)) {
      characterElements.add(instance);
    }
    addGeneratedElement(item.type, instance);
  }
  character.generatedElements = generatedElements;
  character.elementObjects = characterElements;
  return character;
}
