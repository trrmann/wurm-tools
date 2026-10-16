import { Collection } from '../../../collection.mjs'
import { CharacterElement, CharacterElements } from '../../character-element.mjs';
// TODO - add characteristic rolls based on the rules
export class Characteristic extends CharacterElement {
  static Filter(characterElements) {
    if(characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter(element => element instanceof Characteristic);
  }
  #adjustment;
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
    });
  }
  get Effective() {
    return (this.Value() + this.#adjustment);
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
export class Characteristics extends Collection {

}