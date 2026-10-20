import { Collection } from '../../../../collection.mjs';
import { SkillModifier, SkillModifiers } from './skill-modifiers.mjs';
export class ExtraTimeModifier extends SkillModifier {
  static Filter(characterElements) {
    if (characterElements instanceof SkillModifiers === false) {
      throw new Error('Filter expects a SkillModifiers object');
    }
    return characterElements.filter((element) => element instanceof ExtraTimeModifier);
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
/** @extends {Collection<ExtraTimeModifier>} */
export class ExtraTimeModifiers extends Collection {}
