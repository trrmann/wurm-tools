import { Collection } from '../../../../../collection.mjs';
import { PowerModifiers } from '../power-modifiers.mjs';
import { Advantage } from './power-advantages.mjs';
export class TimeDelay extends Advantage {
  static Filter(characterElements) {
    if (characterElements instanceof PowerModifiers === false) {
      throw new Error('Filter expects a PowerModifiers object');
    }
    return characterElements.filter((element) => element instanceof TimeDelay);
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
/** @extends {Collection<TimeDelay>} */
export class TimeDelayAdvantages extends Collection {}
