import { Collection } from '../../../../collection.mjs';
import { CharacterElement, CharacterElements } from '../../character-element.mjs';
import { SkillModifiers } from './skill-modifiers/skill-modifiers.mjs';
import { MixedNumber } from '../../../mixed-numbers.mjs';
export class Skill extends CharacterElement {
  static BaseCharacteristicType = null;

  static baseValueFunctionFor(characterElements) {
    const CharacteristicType = this.BaseCharacteristicType;
    if (!CharacteristicType) return undefined;
    return () => {
      if (characterElements instanceof CharacterElements) {
        const characteristic = CharacteristicType.Filter(characterElements)[0] ?? null;
        if (characteristic instanceof CharacteristicType) {
          return MixedNumber.from(characteristic.CharacteristicRoll());
        }
      }
      throw new Error(`${this.name} Base Value requires a valid ${CharacteristicType.name} object`);
    };
  }

  #modifiers;
  #description() {
    switch (this.SkillRoll()) {
      case (0, 1, 2, 3, 4, 5, 6, 7):
        return 'Untrained';
      case 8:
        return 'Familiarity';
      case (9, 10):
        return 'Awareness';
      case 11:
        return 'Competent';
      case (12, 13):
        return 'Skilled';
      case (14, 15):
        return 'Very Skilled';
      case (16, 17):
        return 'Highly Skilled';
      case (18, 19):
        return 'Extremely Skilled';
      default: //20+
        return 'Incredibly Skilled';
    }
  }
  static Filter(characterElements) {
    if (characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter((element) => element instanceof Skill);
  }
  constructor({
    Points = 0,
    AbsoluteMinValue,
    AbsoluteMaxValue,
    MinValue,
    UnderMinValueRate,
    MaxValue,
    OverMaxValueRate,
    ValueRate,
    BaseValue,
    BaseValueFunction,
    OptionFlagCollection,
    ValueFunction,
    characterElements,
  } = {}) {
    super({
      Points: Points,
      AbsoluteMinValue: AbsoluteMinValue,
      AbsoluteMaxValue: AbsoluteMaxValue,
      MinValue: MinValue,
      UnderMinValueRate: UnderMinValueRate,
      MaxValue: MaxValue,
      OverMaxValueRate: OverMaxValueRate,
      ValueRate: ValueRate,
      BaseValue: BaseValue,
      BaseValueFunction: BaseValueFunction,
      OptionFlagCollection: OptionFlagCollection,
      ValueFunction: ValueFunction,
      characterElements,
    });
    this.#modifiers = new SkillModifiers();
  }
  get Description() {
    return this.#description();
  }
  get Modifiers() {
    return this.#modifiers;
  }
}
/** @extends {Collection<Skill>} */
export class Skills extends Collection {}
