import { Collection } from '../../../collection.mjs';
import { CharacterElement, CharacterElements } from '../../character-element.mjs';
// TODO - add characteristic rolls based on the rules
export class Characteristic extends CharacterElement {
  static Filter(characterElements) {
    if (characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter((element) => element instanceof Characteristic);
  }
  #adjustment = 0;
  constructor({
    Points = 0,
    RoundingMode = 'nearest',
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
    Composition,
    Name,
    ShortName,
  } = {}) {
    super({
      Points: Points,
      RoundingMode: RoundingMode,
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
      Composition,
      Name,
      ShortName,
    });
  }
  get Effective() {
    return this.toNumber() + this.#adjustment;
  }
  get Adjustment() {
    return this.#adjustment;
  }
  set Adjustment(value) {
    this.#adjustment = value;
  }
  Add(value) {
    this.#adjustment += value;
  }
  Subtract(value) {
    this.#adjustment -= value;
  }
}
/** @extends {Collection<Characteristic>} */
export class Characteristics extends Collection {}
