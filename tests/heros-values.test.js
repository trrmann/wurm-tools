import { describe, expect, it } from 'vitest';
import { MixedNumber } from '../src/js/modules/objects/mixed-numbers.mjs';
import { Value } from '../src/js/modules/objects/values.mjs';
import { HerosValues } from '../src/js/modules/objects/heros-values.mjs';

describe('HerosValues', () => {
  it('uses configured base and value functions to create a Value', () => {
    const value = new HerosValues({
      absoluteMinValue: 0,
      absoluteMaxValue: 20,
      MinValue: 2,
      UnderMinValueRate: 0.5,
      OverMaxValueRate: 1.25,
      ValueRate: 2,
      BaseValue: '1 1/2',
      BaseValueFunction: ({ BaseValue, OptionFlagCollection }) =>
        OptionFlagCollection.contains('bonus') ? BaseValue.add('1/2') : BaseValue,
      OptionFlagCollection: ['bonus'],
      ValueFunction: ({ BaseValue, ValueRate, absoluteMaxValue, OverMaxValueRate }) => {
        const scaled = BaseValue.multiply(ValueRate);
        return scaled.compare(absoluteMaxValue) > 0
          ? absoluteMaxValue.add(scaled.subtract(absoluteMaxValue).multiply(OverMaxValueRate))
          : scaled;
      },
    });

    expect(value).toBeInstanceOf(HerosValues);
    expect(value).toBeInstanceOf(Value);
    expect(value).toBeInstanceOf(MixedNumber);
    expect(value.BaseValue.toString()).toBe('2');
    expect(value.ValueRate.toString()).toBe('2');
    expect(value.OptionFlagCollection.contains('bonus')).toBe(true);
    expect(value.toString()).toBe('4');
  });

  it('supports optional parameters and mixed-number results', () => {
    const value = new HerosValues({
      ValueFunction: ({ BaseValue }) => BaseValue.add('1/3'),
    });

    expect(value.BaseValue.toString()).toBe('0');
    expect(value.absoluteMinValue).toBeUndefined();
    expect(value.absoluteMaxValue).toBeUndefined();
    expect(value.toString()).toBe('1/3');
  });

  it('accepts finite numeric result types and rejects non-finite results', () => {
    const results = [
      [0, '0'],
      [-2.75, '-2 3/4'],
      [1e-7, '1/10000000'],
      [1e20, '100000000000000000000'],
      [12n, '12'],
      [new Number(3.5), '3 1/2'],
      [MixedNumber.parse('7/9'), '7/9'],
    ];

    for (const [result, expected] of results) {
      expect(new HerosValues({ ValueFunction: () => result }).toString()).toBe(expected);
    }
    expect(() => new HerosValues({ ValueFunction: () => Number.NaN })).toThrow(TypeError);
    expect(() => new HerosValues({ ValueFunction: () => Number.POSITIVE_INFINITY })).toThrow(
      TypeError
    );
  });

  it('validates calculation functions and results', () => {
    expect(() => new HerosValues()).toThrow(TypeError);
    expect(() => new HerosValues({ ValueFunction: 4 })).toThrow(TypeError);
    expect(() => new HerosValues({ BaseValueFunction: 1, ValueFunction: () => 1 })).toThrow(
      TypeError
    );
    expect(() => new HerosValues({ ValueFunction: () => 'not numeric' })).toThrow(TypeError);
  });
});
