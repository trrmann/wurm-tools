import { HerosValue } from '../heros-values.mjs';
import { Collection } from '../../../../collection.mjs';
import { MixedNumber } from '../../mixed-numbers.mjs';
export class CharacterElement extends HerosValue {
  #points;
  #name;
  #shortName;
  constructor({
    Points = 0,
    RoundingMode,
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
    Name = 'Character Element',
    ShortName = 'CELE',
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
      RoundingMode: RoundingMode,
      characterElements,
      Composition,
    });
    this.#points = MixedNumber.from(Points);
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
  Value() {
    return this.toNumber();
  }
}
/** @extends {Collection<CharacterElement>} */
export class CharacterElements extends Collection {
  Get(elementName) {
    return this.filter(
      (element) => element.name === elementName || element.shortName === elementName
    );
  }
}
