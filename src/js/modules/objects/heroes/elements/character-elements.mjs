import { HerosValue } from '../heros-value.mjs';
import { Collection } from '../../../../collection.mjs';
export class CharacterElement extends HerosValue {
  #points;
  #name;
  #shortName;
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
    Name='Character Element',
    ShortName='CELE',
  } = {}) {
    super({
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
    this.#points = Points;
    this.#name = Name;
    this.#shortName = ShortName;
  }
  get points() {
    return this.#points;
  }
  get name() {
    return this.#name;
  }
  get shortName() {
    return this.#shortName;
  }
}
/** @extends {Collection<CharacterElement>} */
export class CharacterElements extends Collection {
  Get(elementName) {
      return this.filter(element => (element.name === elementName)||(element.shortName === elementName));
  }
}