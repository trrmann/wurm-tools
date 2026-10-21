import { Collection } from '../../../../collection.mjs';
import { SkillModifier, SkillModifiers } from './skill-modifiers.mjs';
export class SheerFollyModifier extends SkillModifier {
  static Filter(characterElements) {
    if (characterElements instanceof SkillModifiers === false) {
      throw new Error('Filter expects a SkillModifiers object');
    }
    return characterElements.filter((element) => element instanceof SheerFollyModifier);
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
/** @extends {Collection<SheerFollyModifier>} */
export class SheerFollyModifiers extends Collection {}
