import { registerHerosCharacterElementType } from './character-generator.mjs';
import { CharacterElement } from './elements/character-elements.mjs';
import { Characteristic } from './elements/characteristics/characteristics.mjs';
import { FiguredCharacteristic } from './elements/characteristics/figured-characteristics/figured-characteristics.mjs';
import { PrimaryCharacteristic } from './elements/characteristics/primary-characteristcs/primary-characteristics.mjs';
import { Disadvantage } from './elements/disadvantages/disadvantages.mjs';
import { Perk } from './elements/perks/perks.mjs';
import { Power } from './elements/powers/powers.mjs';
import { PowerModifier } from './elements/powers/power-modifiers/power-modifiers.mjs';
import { Advantage } from './elements/powers/power-modifiers/power-advantages/power-advantages.mjs';
import { Skill } from './elements/skills/skills.mjs';
import { Talent } from './elements/talents/talents.mjs';

const moduleCatalog =
  typeof import.meta.glob === 'function'
    ? import.meta.glob('./elements/**/*.mjs', { eager: true })
    : {};
const baseClasses = new Set([
  CharacterElement,
  Characteristic,
  FiguredCharacteristic,
  PrimaryCharacteristic,
  Disadvantage,
  Perk,
  Power,
  PowerModifier,
  Advantage,
  Skill,
  Talent,
]);
const registeredClasses = new Set();

function inheritsFrom(Type, Base) {
  return Type === Base || Type.prototype instanceof Base;
}

function labelFor(Type) {
  return Type.name.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

function groupFor(Type) {
  if (inheritsFrom(Type, Disadvantage)) return 'disadvantages';
  if (inheritsFrom(Type, Characteristic)) return 'characteristics';
  if (
    inheritsFrom(Type, Power) ||
    inheritsFrom(Type, PowerModifier) ||
    inheritsFrom(Type, Perk) ||
    inheritsFrom(Type, Skill) ||
    inheritsFrom(Type, Talent) ||
    inheritsFrom(Type, Advantage)
  ) {
    return 'advantages';
  }
  return null;
}

function makeTypeId(modulePath, exportName) {
  return `element:${modulePath.slice('./elements/'.length, -'.mjs'.length)}#${exportName}`;
}

function createElementFactory(Type) {
  return (item, context) => {
    const composition = item.composition ?? item.detail;
    const numericComposition =
      composition == null || composition === '' || !Number.isFinite(Number(composition))
        ? null
        : Number(composition);
    const baseValueFunction =
      typeof Type.baseValueFunctionFor === 'function'
        ? Type.baseValueFunctionFor(context.characterElements)
        : undefined;
    return new Type({
      Points: item.value ?? 0,
      BaseValue: item.baseValue ?? 0,
      BaseValueFunction: baseValueFunction,
      ValueRate: item.valueRate,
      Name: item.name,
      ShortName: item.shortName,
      characterElements: context.characterElements,
      Composition: numericComposition,
    });
  };
}

for (const [modulePath, exports] of Object.entries(moduleCatalog)) {
  for (const [exportName, Type] of Object.entries(exports)) {
    if (
      typeof Type !== 'function' ||
      !Type.prototype ||
      Type === CharacterElement ||
      !(Type.prototype instanceof CharacterElement) ||
      baseClasses.has(Type) ||
      registeredClasses.has(Type)
    ) {
      continue;
    }

    const group = groupFor(Type);
    const isPower = inheritsFrom(Type, Power);
    const type = makeTypeId(modulePath, exportName);
    registerHerosCharacterElementType(type, {
      label: labelFor(Type),
      group,
      priced: group !== null,
      nestedIn: [...(group === 'advantages' ? ['package'] : []), ...(isPower ? ['framework'] : [])],
      detailLabel: 'Base value or rule detail',
      valueLabel: 'Point value',
      create: createElementFactory(Type),
      isCharacterElement: true,
      isPrimaryCharacteristic: inheritsFrom(Type, PrimaryCharacteristic),
      constructionPriority: ['PhysicalDefense', 'EnergyDefense'].includes(Type.name) ? 1 : 0,
    });
    registeredClasses.add(Type);
  }
}

export const herosElementCatalogSize = registeredClasses.size;
