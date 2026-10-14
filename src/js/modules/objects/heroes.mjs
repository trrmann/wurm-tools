import { MixedNumber } from './mixed-numbers.mjs';
import { Points } from './points.mjs';
import { HerosValues } from './heros-values.mjs';
import {
  ActionNames,
  CategorizationName,
  CategorizationNames,
  ClassificationName,
  ClassificationNames,
  DescriptionName,
  DescriptionNames,
  SpecificationName,
  SpecificationNames,
  EventNames,
  ThingName,
  ThingNames,
} from './things.mjs';

export const HEROS_EDITIONS = Object.freeze({
  '4e': Object.freeze({ id: '4e', label: '4th Edition', disadvantageLabel: 'Disadvantages' }),
  '5e': Object.freeze({ id: '5e', label: '5th Edition', disadvantageLabel: 'Disadvantages' }),
  '6e': Object.freeze({ id: '6e', label: '6th Edition', disadvantageLabel: 'Complications' }),
});

export function normalizeHerosEdition(value = '5e') {
  const key = String(value)
    .toLowerCase()
    .replace(/[\s._-]/g, '');
  const aliases = {
    4: '4e',
    '4e': '4e',
    '4th': '4e',
    '4thedition': '4e',
    5: '5e',
    '5e': '5e',
    '5th': '5e',
    '5thedition': '5e',
    6: '6e',
    '6e': '6e',
    '6th': '6e',
    '6thedition': '6e',
  };
  const edition = aliases[key];
  if (!edition) throw new RangeError(`Unsupported HERO System edition: ${value}`);
  return HEROS_EDITIONS[edition];
}

function asHerosValue(value = 0) {
  if (value instanceof HerosValues) return value;
  const mixed = MixedNumber.from(value);
  return new HerosValues({
    BaseValue: mixed,
    ValueFunction: ({ BaseValue }) => BaseValue,
  });
}

function asPoints(values) {
  if (values instanceof Points) return values;
  if (values == null) return new Points();
  if (typeof values !== 'string' && typeof values[Symbol.iterator] === 'function') {
    return new Points(Array.from(values, (value) => MixedNumber.from(value)));
  }
  return new Points([MixedNumber.from(values)]);
}

function sumValues(values) {
  return values.reduce((sum, value) => sum.add(value.adjustedValue), MixedNumber.from(0));
}

function unique(values) {
  return [...new Set(values)];
}

/** An adjustable price modifier. Rate is a signed fraction of the base price. */
export class HerosModifier extends ThingName {
  constructor(options = {}) {
    const config = typeof options === 'string' ? { name: options } : options;
    super(config.name ?? config.label ?? '', config);
    this.rate = MixedNumber.from(config.rate ?? 0);
    this.kind = config.kind ?? 'modifier';
    this.applyPriceFunction = config.applyPrice;
  }

  applyTo(value, element) {
    const baseValue = MixedNumber.from(value);
    if (typeof this.applyPriceFunction === 'function') {
      return asHerosValue(this.applyPriceFunction(baseValue, element, this));
    }
    return asHerosValue(baseValue.multiply(MixedNumber.from(1).add(this.rate)));
  }
}

/** @extends {ThingNames<HerosModifier>} */
export class HerosModifiers extends ThingNames {
  static NameType = HerosModifier;
}

export class HerosAdvantageModifier extends HerosModifier {
  constructor(options = {}) {
    super(
      typeof options === 'string'
        ? { name: options, kind: 'advantage' }
        : { ...options, kind: 'advantage' }
    );
  }
}

/** @extends {HerosModifiers<HerosAdvantageModifier>} */
export class HerosAdvantageModifiers extends HerosModifiers {
  static NameType = HerosAdvantageModifier;
}

export class HerosLimitation extends HerosModifier {
  constructor(options = {}) {
    super(
      typeof options === 'string'
        ? { name: options, kind: 'limitation' }
        : { ...options, kind: 'limitation' }
    );
  }
}
/** @extends {HerosModifiers<HerosLimitation>} */
export class HerosLimitations extends HerosModifiers {
  static NameType = HerosLimitation;
}

export class HerosSpecialEffect extends DescriptionName {}
/** @extends {DescriptionNames<HerosSpecialEffect>} */
export class HerosSpecialEffects extends DescriptionNames {
  static NameType = HerosSpecialEffect;
}

/** Every priced character element has a ThingName identity and a HerosValues price. */
export class HerosEquationElement extends ThingName {
  constructor(options = {}) {
    const config = typeof options === 'string' ? { name: options } : options;
    super(config.name ?? config.label ?? '', config);
    this.value = asHerosValue(config.value ?? config.pointValue ?? 0);
    this.modifiers = new HerosModifiers(config.modifiers ?? []);
    this.description =
      config.description instanceof DescriptionName
        ? config.description
        : new DescriptionName(config.description ?? '');
    this.specialEffects = new HerosSpecialEffects(
      config.specialEffects ?? config.specialEffect ?? []
    );
  }

  get thingName() {
    return this;
  }

  get adjustedValue() {
    return asHerosValue(
      this.modifiers.reduce(
        (value, modifier) => MixedNumber.from(modifier.applyTo(value, this)),
        MixedNumber.from(this.value)
      )
    );
  }

  get pointValue() {
    return this.adjustedValue;
  }

  addModifier(modifier) {
    this.modifiers.add(modifier);
    return this;
  }
}

/** @extends {ThingNames<HerosEquationElement>} */
export class HerosEquationElements extends ThingNames {
  static NameType = HerosEquationElement;

  sumPointValues() {
    return asHerosValue(sumValues(this));
  }
}

export class HerosAdvantage extends HerosEquationElement {}
/** @extends {HerosEquationElements<HerosAdvantage>} */
export class HerosAdvantages extends HerosEquationElements {
  static NameType = HerosAdvantage;
}

export class HerosCharacteristic extends HerosAdvantage {}
/** @extends {HerosAdvantages<HerosCharacteristic>} */
export class HerosCharacteristics extends HerosAdvantages {
  static NameType = HerosCharacteristic;
}

export class HerosPrimaryCharacteristic extends HerosCharacteristic {
  constructor(options = {}) {
    const config = typeof options === 'string' ? { name: options } : options;
    super(config);
    this.baseValue = MixedNumber.from(config.baseValue ?? config.value ?? 0);
  }
}
/** @extends {HerosCharacteristics<HerosPrimaryCharacteristic>} */
export class HerosPrimaryCharacteristics extends HerosCharacteristics {
  static NameType = HerosPrimaryCharacteristic;
}

export class HerosFiguredCharacteristic extends HerosCharacteristic {
  constructor(options = {}) {
    const config = typeof options === 'string' ? { name: options } : options;
    if (typeof config.deriveValue !== 'function') {
      throw new TypeError('Figured characteristics require a deriveValue function');
    }
    const points = asPoints(config.points);
    const primaryCharacteristics = new HerosPrimaryCharacteristics(
      config.primaryCharacteristics ?? []
    );
    const calculated = config.deriveValue({
      points,
      primaryCharacteristics,
      options: config,
    });
    super({ ...config, value: calculated });
    this.points = points;
    this.primaryCharacteristics = primaryCharacteristics;
    this.deriveValue = config.deriveValue;
  }
}
/** @extends {HerosCharacteristics<HerosFiguredCharacteristic>} */
export class HerosFiguredCharacteristics extends HerosCharacteristics {
  static NameType = HerosFiguredCharacteristic;
}

export class HerosSkill extends HerosAdvantage {}
/** @extends {HerosAdvantages<HerosSkill>} */
export class HerosSkills extends HerosAdvantages {
  static NameType = HerosSkill;
}

export class HerosEverymanSkill extends HerosSkill {}
/** @extends {HerosSkills<HerosEverymanSkill>} */
export class HerosEverymanSkills extends HerosSkills {
  static NameType = HerosEverymanSkill;
}

export class HerosTalent extends HerosAdvantage {}
/** @extends {HerosAdvantages<HerosTalent>} */
export class HerosTalents extends HerosAdvantages {
  static NameType = HerosTalent;
}

export class HerosPerk extends HerosAdvantage {}
/** @extends {HerosAdvantages<HerosPerk>} */
export class HerosPerks extends HerosAdvantages {
  static NameType = HerosPerk;
}

export class HerosPower extends HerosAdvantage {}
/** @extends {HerosAdvantages<HerosPower>} */
export class HerosPowers extends HerosAdvantages {
  static NameType = HerosPower;
}

export class HerosPowerFramework extends HerosPower {
  constructor(options = {}) {
    const config = typeof options === 'string' ? { name: options } : options;
    super(config);
    this.powers = new HerosPowers(config.powers ?? []);
  }
}
/** @extends {HerosPowers<HerosPowerFramework>} */
export class HerosPowerFrameworks extends HerosPowers {
  static NameType = HerosPowerFramework;
}

export class HerosMultipower extends HerosPowerFramework {}
export class HerosElementalControl extends HerosPowerFramework {}
export class HerosVariablePowerPool extends HerosPowerFramework {
  constructor(options = {}) {
    const config = typeof options === 'string' ? { name: options } : options;
    super(config);
    this.poolPoints = MixedNumber.from(config.poolPoints ?? config.value ?? 0);
  }
}
/** @extends {HerosPowerFrameworks<HerosVariablePowerPool>} */
export class HerosVariablePowerPools extends HerosPowerFrameworks {
  static NameType = HerosVariablePowerPool;
}

export class HerosDisadvantage extends HerosEquationElement {}
/** @extends {HerosEquationElements<HerosDisadvantage>} */
export class HerosDisadvantages extends HerosEquationElements {
  static NameType = HerosDisadvantage;
}

export class HerosPhysicalDisadvantage extends HerosDisadvantage {}
/** @extends {HerosDisadvantages<HerosPhysicalDisadvantage>} */
export class HerosPhysicalDisadvantages extends HerosDisadvantages {
  static NameType = HerosPhysicalDisadvantage;
}

export class HerosMentalDisadvantage extends HerosDisadvantage {}
/** @extends {HerosDisadvantages<HerosMentalDisadvantage>} */
export class HerosMentalDisadvantages extends HerosDisadvantages {
  static NameType = HerosMentalDisadvantage;
}

export class HerosSocialDisadvantage extends HerosDisadvantage {}
/** @extends {HerosDisadvantages<HerosSocialDisadvantage>} */
export class HerosSocialDisadvantages extends HerosDisadvantages {
  static NameType = HerosSocialDisadvantage;
}

export class HerosPackageDeal extends ThingName {
  constructor(options = {}) {
    const config = typeof options === 'string' ? { name: options } : options;
    super(config.name ?? config.label ?? '', config);
    this.advantages = new HerosAdvantages(config.advantages ?? []);
    this.disadvantages = new HerosDisadvantages(config.disadvantages ?? []);
    this.skills = new HerosSkills(config.skills ?? []);
    this.talents = new HerosTalents(config.talents ?? []);
    this.perks = new HerosPerks(config.perks ?? []);
    this.powers = new HerosPowers(config.powers ?? []);
  }
}
/** @extends {ThingNames<HerosPackageDeal>} */
export class HerosPackageDeals extends ThingNames {
  static NameType = HerosPackageDeal;
}

export class HerosEquation extends ThingName {
  constructor(options = {}) {
    super(options.name ?? 'Character Point Equation', options);
    this.advantages = new HerosAdvantages(options.advantages ?? []);
    this.points = asPoints(options.points);
    this.disadvantages = new HerosDisadvantages(options.disadvantages ?? []);
  }

  get advantagesValue() {
    return this.advantages.sumPointValues();
  }

  get pointsValue() {
    return asHerosValue(this.points.sum());
  }

  get leftSideValue() {
    return asHerosValue(this.advantagesValue.add(this.pointsValue));
  }

  get disadvantagesValue() {
    return this.disadvantages.sumPointValues();
  }

  get rightSideValue() {
    return this.disadvantagesValue;
  }

  get difference() {
    return asHerosValue(this.leftSideValue.subtract(this.rightSideValue));
  }

  get isBalanced() {
    return this.difference.equals(0);
  }
}

export class HerosBodyShape extends SpecificationName {}
/** @extends {SpecificationNames<HerosBodyShape>} */
export class HerosBodyShapes extends SpecificationNames {
  static NameType = HerosBodyShape;
}

export class HerosPointLevelClassification extends ClassificationName {
  constructor(options = '') {
    const config = typeof options === 'string' ? { name: options } : options;
    super(config.name ?? config.label ?? '');
    this.points = config.points == null ? undefined : MixedNumber.from(config.points);
    this.edition = config.edition == null ? undefined : normalizeHerosEdition(config.edition);
  }
}
/** @extends {ClassificationNames<HerosPointLevelClassification>} */
export class HerosPointLevelClassifications extends ClassificationNames {
  static NameType = HerosPointLevelClassification;
}

export class HerosObjectModelType extends CategorizationName {}
/** @extends {CategorizationNames<HerosObjectModelType>} */
export class HerosObjectModelTypes extends CategorizationNames {
  static NameType = HerosObjectModelType;
}

export const HEROS_OBJECT_MODEL_TYPES = Object.freeze({
  physical: 'physical',
  nonPhysical: 'non-physical',
  sentient: 'sentient',
  nonSentient: 'non-sentient',
  mobile: 'mobile',
  nonMobile: 'non-mobile',
  playerCharacter: 'player-character',
  nonPlayerCharacter: 'non-player-character',
});

export const HEROS_TYPED_ELEMENT_GROUPS = Object.freeze({
  characteristic: 'characteristics',
  primaryCharacteristic: 'characteristics',
  figuredCharacteristic: 'characteristics',
  skill: 'advantages',
  everymanSkill: 'advantages',
  talent: 'advantages',
  perk: 'advantages',
  power: 'advantages',
  powerFramework: 'advantages',
  multipower: 'advantages',
  elementalControl: 'advantages',
  variablePowerPool: 'advantages',
  packageDeal: 'advantages',
  physicalDisadvantage: 'disadvantages',
  mentalDisadvantage: 'disadvantages',
  socialDisadvantage: 'disadvantages',
});

/** A non-Wurm world object with its own HERO point equation and child objects. */
export class HerosGameObject extends ThingName {
  constructor(options = {}) {
    const config = typeof options === 'string' ? { name: options } : options;
    super(config.name ?? config.label ?? '', config);
    this.bodyShapes = new HerosBodyShapes(config.bodyShapes ?? config.bodyShape ?? []);
    this.pointLevelClassifications = new HerosPointLevelClassifications(
      config.pointLevelClassifications ?? config.pointLevelClassification ?? []
    );
    this.objectModelTypes = new HerosObjectModelTypes(
      config.objectModelTypes ?? config.objectModelType ?? []
    );
    this.typedElements = (config.typedElements ?? []).map((element) => ({
      ...element,
      isBase: Boolean(element.isBase),
      modelTypes: new HerosObjectModelTypes(element.modelTypes ?? []),
    }));
    this.objects = new HerosGameObjects(config.objects ?? []);
    this.equation =
      config.equation instanceof HerosEquation
        ? config.equation
        : new HerosEquation({
            points: config.points,
            advantages: config.advantages,
            disadvantages: config.disadvantages,
          });
  }

  get equationElements() {
    return new HerosEquationElements([...this.equation.advantages, ...this.equation.disadvantages]);
  }

  elementsForModelType(modelType, { baseOnly = false } = {}) {
    const trait = String(modelType);
    const associated = this.typedElements.filter(
      (element) =>
        (!baseOnly || element.isBase) && element.modelTypes.some((type) => String(type) === trait)
    );
    const inGroup = (group) =>
      associated.filter((element) => HEROS_TYPED_ELEMENT_GROUPS[element.type] === group);
    return {
      characteristics: inGroup('characteristics'),
      advantages: inGroup('advantages'),
      disadvantages: inGroup('disadvantages'),
    };
  }

  get modelTraitElements() {
    return Object.fromEntries(
      [...this.objectModelTypes].map((modelType) => [
        String(modelType),
        this.elementsForModelType(modelType),
      ])
    );
  }

  get baseTraitSpecification() {
    return Object.fromEntries(
      [...this.objectModelTypes].map((modelType) => [
        String(modelType),
        this.elementsForModelType(modelType, { baseOnly: true }),
      ])
    );
  }

  removeNonBaseElements() {
    const removed = this.typedElements.filter((element) => !element.isBase);
    this.typedElements = this.typedElements.filter((element) => element.isBase);
    return removed;
  }

  addObject(object) {
    this.objects.add(object);
    return this;
  }
}

/** @extends {ThingNames<HerosGameObject>} */
export class HerosGameObjects extends ThingNames {
  static NameType = HerosGameObject;
}

export class HerosWorld extends ThingName {
  constructor(options = {}) {
    const config = typeof options === 'string' ? { name: options } : options;
    super(config.name ?? config.label ?? '', config);
    this.objects = new HerosGameObjects(config.objects ?? []);
  }

  addObject(object) {
    this.objects.add(object);
    return this;
  }
}
/** @extends {ThingNames<HerosWorld>} */
export class HerosWorlds extends ThingNames {
  static NameType = HerosWorld;
}

export class HerosPhysicalObject extends HerosGameObject {
  constructor(options = {}) {
    super(options);
    this.objectModelTypes.add(HEROS_OBJECT_MODEL_TYPES.physical);
  }
}

export class HerosNonSentientObject extends HerosPhysicalObject {
  constructor(options = {}) {
    super(options);
    this.objectModelTypes.add(HEROS_OBJECT_MODEL_TYPES.nonSentient);
  }
}

export class HerosSentientObject extends HerosPhysicalObject {
  constructor(options = {}) {
    super(options);
    this.objectModelTypes.add(HEROS_OBJECT_MODEL_TYPES.sentient);
  }
}

export class HerosMobileObject extends HerosGameObject {
  constructor(options = {}) {
    super(options);
    this.objectModelTypes.add(HEROS_OBJECT_MODEL_TYPES.mobile);
  }
}

export class HerosNonMobileObject extends HerosGameObject {
  constructor(options = {}) {
    super(options);
    this.objectModelTypes.add(HEROS_OBJECT_MODEL_TYPES.nonMobile);
  }
}

export class HerosBase extends HerosGameObject {}
export class HerosVehicle extends HerosPhysicalObject {
  constructor(options = {}) {
    super(options);
    this.objectModelTypes.add(HEROS_OBJECT_MODEL_TYPES.mobile);
  }
}
export class HerosEquipment extends HerosPhysicalObject {}

export class HerosCharacter extends HerosGameObject {
  constructor(options = {}) {
    const config = typeof options === 'string' ? { name: options } : options;
    super(config);
    this.objectModelTypes.add(HEROS_OBJECT_MODEL_TYPES.sentient, HEROS_OBJECT_MODEL_TYPES.mobile);
    this.edition = normalizeHerosEdition(config.edition);
    this.personName = config.personName;
    this.placeNames = config.placeNames;
    this.characteristics = new HerosCharacteristics(config.characteristics ?? []);
    this.primaryCharacteristics = new HerosPrimaryCharacteristics(
      config.primaryCharacteristics ?? []
    );
    this.figuredCharacteristics = new HerosFiguredCharacteristics(
      config.figuredCharacteristics ?? []
    );
    this.advantages = new HerosAdvantages(config.advantages ?? []);
    this.skills = new HerosSkills(config.skills ?? []);
    this.everymanSkills = new HerosEverymanSkills(config.everymanSkills ?? []);
    this.talents = new HerosTalents(config.talents ?? []);
    this.perks = new HerosPerks(config.perks ?? []);
    this.powers = new HerosPowers(config.powers ?? []);
    this.powerFrameworks = new HerosPowerFrameworks(config.powerFrameworks ?? []);
    this.variablePowerPools = new HerosVariablePowerPools(config.variablePowerPools ?? []);
    this.disadvantages = new HerosDisadvantages(config.disadvantages ?? []);
    this.physicalDisadvantages = new HerosPhysicalDisadvantages(config.physicalDisadvantages ?? []);
    this.mentalDisadvantages = new HerosMentalDisadvantages(config.mentalDisadvantages ?? []);
    this.socialDisadvantages = new HerosSocialDisadvantages(config.socialDisadvantages ?? []);
    this.packageDeals = new HerosPackageDeals(config.packageDeals ?? []);
    this.specialEffects = new HerosSpecialEffects(config.specialEffects ?? []);
    this.events = new EventNames(config.events ?? []);
    this.actions = new ActionNames(config.actions ?? []);
    this.descriptions = new DescriptionNames(config.descriptions ?? []);
    this.points = asPoints(config.points);

    this.equation =
      config.equation instanceof HerosEquation
        ? config.equation
        : new HerosEquation({
            points: this.points,
            advantages: unique([
              ...this.advantages,
              ...this.characteristics,
              ...this.primaryCharacteristics,
              ...this.figuredCharacteristics,
              ...this.skills,
              ...this.everymanSkills,
              ...this.talents,
              ...this.perks,
              ...this.powers,
              ...this.powerFrameworks,
              ...this.variablePowerPools,
              ...Array.from(this.packageDeals).flatMap((deal) => [
                ...deal.advantages,
                ...deal.skills,
                ...deal.talents,
                ...deal.perks,
                ...deal.powers,
              ]),
            ]),
            disadvantages: unique([
              ...this.disadvantages,
              ...this.physicalDisadvantages,
              ...this.mentalDisadvantages,
              ...this.socialDisadvantages,
              ...Array.from(this.packageDeals).flatMap((deal) => [...deal.disadvantages]),
            ]),
          });
  }
}

export class HerosPlayerCharacter extends HerosCharacter {
  constructor(options = {}) {
    super(options);
    this.objectModelTypes.add(HEROS_OBJECT_MODEL_TYPES.playerCharacter);
  }
}

export class HerosNonPlayerCharacter extends HerosCharacter {
  constructor(options = {}) {
    super(options);
    this.objectModelTypes.add(HEROS_OBJECT_MODEL_TYPES.nonPlayerCharacter);
  }
}

export {
  HerosCharacter as HeroesCharacter,
  HerosEquation as HeroesEquation,
  HerosEquationElement as HeroesEquationElement,
  HerosAdvantage as HeroesAdvantage,
  HerosDisadvantage as HeroesDisadvantage,
  HerosCharacteristic as HeroesCharacteristic,
  HerosPrimaryCharacteristic as HeroesPrimaryCharacteristic,
  HerosFiguredCharacteristic as HeroesFiguredCharacteristic,
  HerosSkill as HeroesSkill,
  HerosTalent as HeroesTalent,
  HerosPerk as HeroesPerk,
  HerosPower as HeroesPower,
  HerosSpecialEffect as HeroesSpecialEffect,
};
