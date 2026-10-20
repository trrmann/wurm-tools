import { Collection } from '../collection.mjs';
import { MixedNumber } from '../mixed-numbers.mjs';
import { Value } from '../values.mjs';

function optionalMixedNumber(value) {
  return value === undefined || value === null ? undefined : MixedNumber.from(value);
}

function roundValue(value, mode) {
  if (mode == null || mode === 'none') return value;

  const [numerator, denominator] = value.toImproperString().split('/');
  const top = BigInt(numerator);
  const bottom = BigInt(denominator);
  const quotient = top / bottom;
  const remainder = top % bottom;

  if (mode === 'toward-zero') return MixedNumber.fromImproper(quotient);

  const floor = top < 0n && remainder !== 0n ? quotient - 1n : quotient;
  if (mode === 'down') return MixedNumber.fromImproper(floor);
  if (mode === 'up') {
    return MixedNumber.fromImproper(top > 0n && remainder !== 0n ? quotient + 1n : quotient);
  }
  if (mode !== 'nearest') throw new RangeError(`Unsupported rounding mode: ${mode}`);

  const fractionalNumerator = top - floor * bottom;
  return MixedNumber.fromImproper(fractionalNumerator * 2n >= bottom ? floor + 1n : floor);
}

/** @extends {Value} */
export class HerosValue extends Value {
  /**
   * @param {object} options
   * @param {number | bigint | Number | MixedNumber} [options.absoluteMinValue]
   * @param {number | bigint | Number | MixedNumber} [options.absoluteMaxValue]
   * @param {number | bigint | Number | MixedNumber} [options.MinValue]
   * @param {number | bigint | Number | MixedNumber} [options.UnderMinValueRate]
   * @param {number | bigint | Number | MixedNumber} [options.OverMaxValueRate]
   * @param {number | bigint | Number | MixedNumber} [options.ValueRate]
   * @param {number | bigint | Number | MixedNumber} [options.BaseValue]
   * @param {number | bigint | Number | MixedNumber} [options.Points]
   * @param {(parameters: object) => number | bigint | Number | MixedNumber} [options.BaseValueFunction]
   * @param {Collection | Iterable<*>} [options.OptionFlagCollection]
   * @param {(parameters: object) => number | bigint | Number | MixedNumber} [options.ValueFunction]
   * @param {'nearest' | 'down' | 'up' | 'toward-zero' | 'none'} [options.RoundingMode]
   */
  constructor({
    AbsoluteMinValue,
    AbsoluteMaxValue,
    absoluteMinValue,
    absoluteMaxValue,
    MinValue,
    UnderMinValueRate,
    MaxValue,
    OverMaxValueRate,
    ValueRate,
    BaseValue,
    Points = 0,
    BaseValueFunction,
    OptionFlagCollection,
    ValueFunction,
    RoundingMode,
    characterElements,
    Composition,
  } = {}) {
    const calculateValue =
      ValueFunction === undefined
        ? ({ BaseValue: baseValue, Points: points, ValueRate: valueRate }) =>
            valueRate == null ? baseValue : baseValue.add(points.divide(valueRate))
        : ValueFunction;
    if (typeof calculateValue !== 'function') {
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
      absoluteMinValue: optionalMixedNumber(AbsoluteMinValue ?? absoluteMinValue),
      absoluteMaxValue: optionalMixedNumber(AbsoluteMaxValue ?? absoluteMaxValue),
      MinValue: optionalMixedNumber(MinValue),
      MaxValue: optionalMixedNumber(MaxValue),
      UnderMinValueRate: optionalMixedNumber(UnderMinValueRate),
      OverMaxValueRate: optionalMixedNumber(OverMaxValueRate),
      ValueRate: optionalMixedNumber(ValueRate),
      BaseValue: optionalMixedNumber(BaseValue) ?? MixedNumber.from(0),
      Points: MixedNumber.from(Points),
      BaseValueFunction,
      OptionFlagCollection: flags,
      characterElements,
      Composition,
    };

    if (BaseValueFunction) {
      parameters.BaseValue = MixedNumber.from(BaseValueFunction(Object.freeze({ ...parameters })));
    }

    const result = MixedNumber.from(calculateValue(Object.freeze({ ...parameters })));
    const unroundedValue = result;
    super(roundValue(result, RoundingMode));

    Object.assign(this, parameters, {
      ValueFunction: calculateValue,
      UnroundedValue: unroundedValue,
      RoundingMode,
    });
  }
}
