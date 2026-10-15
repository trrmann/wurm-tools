import { Collection } from '../collection.mjs';
import { MixedNumber } from '../mixed-numbers.mjs';
import { Value } from '../values.mjs';

function optionalMixedNumber(value) {
  return value === undefined || value === null ? undefined : MixedNumber.from(value);
}

/** @extends {Value} */
export class HerosValues extends Value {
  /**
   * @param {object} options
   * @param {number | bigint | Number | MixedNumber} [options.absoluteMinValue]
   * @param {number | bigint | Number | MixedNumber} [options.absoluteMaxValue]
   * @param {number | bigint | Number | MixedNumber} [options.MinValue]
   * @param {number | bigint | Number | MixedNumber} [options.UnderMinValueRate]
   * @param {number | bigint | Number | MixedNumber} [options.OverMaxValueRate]
   * @param {number | bigint | Number | MixedNumber} [options.ValueRate]
   * @param {number | bigint | Number | MixedNumber} [options.BaseValue]
   * @param {(parameters: object) => number | bigint | Number | MixedNumber} [options.BaseValueFunction]
   * @param {Collection | Iterable<*>} [options.OptionFlagCollection]
   * @param {(parameters: object) => number | bigint | Number | MixedNumber} options.ValueFunction
   */
  constructor({
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
    if (typeof ValueFunction !== 'function') {
      throw new TypeError('ValueFunction must be a function');
    }
    if (BaseValueFunction !== undefined && typeof BaseValueFunction !== 'function') {
      throw new TypeError('BaseValueFunction must be a function');
    }

    const flags =
      OptionFlagCollection == null
        ? new Collection()
        : OptionFlagCollection instanceof Collection
          ? OptionFlagCollection
          : new Collection(OptionFlagCollection);
    const parameters = {
      absoluteMinValue: optionalMixedNumber(AbsoluteMinValue),
      absoluteMaxValue: optionalMixedNumber(AbsoluteMaxValue),
      MinValue: optionalMixedNumber(MinValue),
      MaxValue: optionalMixedNumber(MaxValue),
      UnderMinValueRate: optionalMixedNumber(UnderMinValueRate),
      OverMaxValueRate: optionalMixedNumber(OverMaxValueRate),
      ValueRate: optionalMixedNumber(ValueRate),
      BaseValue: optionalMixedNumber(BaseValue) ?? MixedNumber.from(0),
      BaseValueFunction,
      OptionFlagCollection: flags,
    };

    if (BaseValueFunction) {
      parameters.BaseValue = MixedNumber.from(BaseValueFunction(Object.freeze({ ...parameters })));
    }

    const result = MixedNumber.from(ValueFunction(Object.freeze({ ...parameters })));
    super(result);

    Object.assign(this, parameters, { ValueFunction });
  }
}
