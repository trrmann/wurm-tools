import { Collection } from '../../../../../collection.mjs';
import { PowerModifier } from '../modifiers.mjs';
import { PowerModifiers } from '../power-modifiers.mjs';
export class Limitation extends PowerModifier {
  static Filter(characterElements) {
    if (characterElements instanceof PowerModifiers === false) {
      throw new Error('Filter expects a PowerModifiers object');
    }
    return characterElements.filter((element) => element instanceof Limitation);
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
    this.kind = 'limitation';
  }
}
/** @extends {Collection<Limitation>} */
export class Limitations extends Collection {}
