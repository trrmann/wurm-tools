import { Collection } from '../../../collection.mjs'
import { CharacterElement } from '../../character-element.mjs';
import { CharacterElements } from '../../character-element.mjs';
import { PowerModifiers } from './power-modifiers.mjs';
export class Power extends CharacterElement {
  static Filter(characterElements) {
    if(characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter(element => element instanceof Power);
  }
  #modifiers;
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
    this.#modifiers = new PowerModifiers();
  }
  get Modifiers() {
    return this.#modifiers;
  }
  get ModifierNames() {
    return this.#modifiers.Names();
  }
  get PowerAdvantages() {
    return this.#modifiers.PowerAdvantages();
  }
  get PowerAdvantageNames() {
    return this.#modifiers.PowerAdvantageNames();
  }
  get PowerLimitations() {
    return this.#modifiers.PowerLimitations();
  }
  get PowerLimitationNames() {
    return this.#modifiers.PowerLimitationNames();
  }
  AddModifier(modifier) {
    this.#modifiers.Add(modifier);
  }
  RemoveModifier(modifierName) {
    this.#modifiers.Remove(modifierName);
  }
}
/** @extends {Collection<Power>} */
export class Powers extends Collection {

}