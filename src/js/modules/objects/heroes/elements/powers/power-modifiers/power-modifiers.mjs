import { Collection } from '../../../../collection.mjs'
import { Power } from '../powers.mjs';
import { PowerAdvantage } from './power-advantages.mjs';
import { PowerLimitation } from './power-limitations.mjs';
import { CharacterElements } from '../../../character-element.mjs';
export class PowerModifier extends Power {
  static Filter(characterElements) {
    if(characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter(element => element instanceof PowerModifier);
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
}
/** @extends {Collection<PowerModifier>} */
export class PowerModifiers extends Collection {
  get Names() {
    return this.map(modifier => modifier.Name);
  }
  get PowerAdvantages() {
    return PowerAdvantage.Filter(this);
  }
  get PowerAdvantageNames() {
    return this.PowerAdvantages.map(modifier => modifier.Name);
  }
  get PowerLimitations() {
    return PowerLimitation.Filter(this);
  }
  get PowerLimitationNames() {
    return this.PowerLimitations.map(modifier => modifier.Name);
  }
  Add(modifier) {
    super.Add(modifier);
  }
  Get(modifierName) {
    return super.Get(modifierName);
  }
  Remove(modifierName) {
    super.Remove(this.Get(modifierName));
  }
}