import { describe, expect, it } from 'vitest';
import { MixedNumber } from '../src/js/modules/objects/mixed-numbers.mjs';
import { Value } from '../src/js/modules/objects/values.mjs';
import { HerosValues } from '../src/js/modules/objects/heros-values.mjs';
import { CharacterElements } from '../src/js/modules/objects/heroes/elements/character-elements.mjs';
import { Constitution } from '../src/js/modules/objects/heroes/elements/characteristics/primary-characteristcs/constitution-characteristics.mjs';
import { Dexterity } from '../src/js/modules/objects/heroes/elements/characteristics/primary-characteristcs/dexterity-characteristics.mjs';
import { Strength } from '../src/js/modules/objects/heroes/elements/characteristics/primary-characteristcs/strength-characteristics.mjs';
import { Recovery } from '../src/js/modules/objects/heroes/elements/characteristics/figured-characteristics/recovery-characteristics.mjs';
import { Speed } from '../src/js/modules/objects/heroes/elements/characteristics/figured-characteristics/speed-characteristics.mjs';

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

  it('rounds only the final value and retains the exact unrounded result', () => {
    const cases = [
      ['2.4', '2'],
      ['2.5', '3'],
      ['2.6', '3'],
      ['-1.5', '-1'],
    ];

    for (const [input, expected] of cases) {
      const value = new HerosValues({
        BaseValue: input,
        RoundingMode: 'nearest',
      });
      expect(value.toString()).toBe(expected);
      expect(value.UnroundedValue.toString()).toBe(MixedNumber.from(input).toString());
    }

    const down = new HerosValues({ BaseValue: '2.9', RoundingMode: 'down' });
    expect(down.toString()).toBe('2');
    expect(down.UnroundedValue.toString()).toBe('2 9/10');
  });

  it('converts characteristic point costs through the configured cost rate', () => {
    const value = new HerosValues({
      BaseValue: 10,
      Points: 3,
      ValueRate: 2,
      RoundingMode: 'nearest',
    });

    expect(value.UnroundedValue.toString()).toBe('11 1/2');
    expect(value.toString()).toBe('12');
  });

  it('uses 5th Edition characteristic rates and rounds only figured final values', () => {
    const strength = new Strength({ Points: 1 });
    const dexterity = new Dexterity({ Points: 15 });
    const constitution = new Constitution();
    const characteristics = new CharacterElements([strength, dexterity, constitution]);
    const recovery = new Recovery({ characterElements: characteristics });
    const speed = new Speed({ characterElements: characteristics });

    expect(strength.ValueRate.toString()).toBe('1');
    expect(strength.Value()).toBe(11);
    expect(dexterity.ValueRate.toString()).toBe('3');
    expect(dexterity.Value()).toBe(15);
    expect(recovery.BaseValue.toString()).toBe('4 1/5');
    expect(recovery.UnroundedValue.toString()).toBe('4 1/5');
    expect(recovery.Value()).toBe(4);
    expect(speed.ValueRate.toString()).toBe('10');
    expect(speed.UnroundedValue.toString()).toBe('2 1/2');
    expect(speed.Value()).toBe(2);
    expect(speed.MaxValue.toString()).toBe('4');
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
    expect(new HerosValues().toString()).toBe('0');
    expect(() => new HerosValues({ ValueFunction: null })).toThrow(TypeError);
    expect(() => new HerosValues({ ValueFunction: 4 })).toThrow(TypeError);
    expect(() => new HerosValues({ BaseValueFunction: 1, ValueFunction: () => 1 })).toThrow(
      TypeError
    );
    expect(() => new HerosValues({ ValueFunction: () => 'not numeric' })).toThrow(TypeError);
  });
});
