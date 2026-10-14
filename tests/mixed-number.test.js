import { describe, expect, it } from 'vitest';
import { Collection, CollectionOfNumbers } from '../src/js/modules/objects/collection.mjs';
import { MixedNumber, MixedNumbers } from '../src/js/modules/objects/mixed-numbers.mjs';

describe('MixedNumber', () => {
  it('normalizes mixed components and improper fractions', () => {
    expect(new MixedNumber(1, 2, 4).toString()).toBe('1 1/2');
    expect(new MixedNumber(-1, 2, 4).toString()).toBe('-1 1/2');
    expect(MixedNumber.fromImproper(9, 6).toString()).toBe('1 1/2');
    expect(MixedNumber.fromImproper(-1, 2).toString()).toBe('-1/2');
  });

  it('exposes helper functions as static methods', () => {
    expect(MixedNumber.toInteger(3, 'Value')).toBe(3n);
    expect(MixedNumber.absolute(-3n)).toBe(3n);
    expect(MixedNumber.greatestCommonDivisor(-12n, 8n)).toBe(4n);
    expect(MixedNumber.decimalParts('0.125')).toEqual([125n, 1000n]);
  });

  it('parses mixed numbers, fractions, decimals, and scientific notation', () => {
    expect(MixedNumber.parse('2 6/8').toString()).toBe('2 3/4');
    expect(MixedNumber.parse('-2 1/4').toString()).toBe('-2 1/4');
    expect(MixedNumber.parse('-0 1/2').toString()).toBe('-1/2');
    expect(MixedNumber.parse('7/3').toString()).toBe('2 1/3');
    expect(MixedNumber.parse('0.125').toString()).toBe('1/8');
    expect(MixedNumber.from(1e-3).toString()).toBe('1/1000');
  });

  it('supports exact arithmetic and comparison', () => {
    const twoThirds = MixedNumber.parse('2/3');
    const oneSixth = MixedNumber.parse('1/6');

    expect(twoThirds.add(oneSixth).toString()).toBe('5/6');
    expect(twoThirds.subtract(oneSixth).toString()).toBe('1/2');
    expect(twoThirds.multiply('3/4').toString()).toBe('1/2');
    expect(twoThirds.divide('4/3').toString()).toBe('1/2');
    expect(MixedNumber.parse('-3/2').abs().toString()).toBe('1 1/2');
    expect(twoThirds.negate().toString()).toBe('-2/3');
    expect(twoThirds.compare(oneSixth)).toBe(1);
    expect(twoThirds.equals('4/6')).toBe(true);
  });

  it('exposes normalized components and numeric conversions', () => {
    const value = MixedNumber.parse('-7/4');

    expect(value.whole).toBe(-1);
    expect(value.numerator).toBe(3);
    expect(value.denominator).toBe(4);
    expect(value.wholeBigInt).toBe(-1n);
    expect(value.numeratorBigInt).toBe(3n);
    expect(value.denominatorBigInt).toBe(4n);
    expect(value.toImproperString()).toBe('-7/4');
    expect(value.toNumber()).toBe(-1.75);
    expect(JSON.stringify(value)).toBe('"-1 3/4"');
    expect(value).toBeInstanceOf(Number);
    expect(Number.prototype.valueOf.call(value)).toBe(-1.75);
    expect(value + 0).toBe(-1.75);
  });

  it('rejects invalid values and division by zero', () => {
    expect(() => new MixedNumber(1, 1, 0)).toThrow(RangeError);
    expect(() => MixedNumber.parse('1/0')).toThrow(RangeError);
    expect(() => MixedNumber.parse('not a number')).toThrow(TypeError);
    expect(() => MixedNumber.parse('1/2').divide(0)).toThrow(RangeError);
  });

  it('supports MixedNumber values through a typed collection', () => {
    const half = MixedNumber.parse('1/2');
    const whole = MixedNumber.from(1);
    const values = new MixedNumbers([half]);

    values.add(whole);

    expect(values).toBeInstanceOf(Collection);
    expect(values).toBeInstanceOf(CollectionOfNumbers);
    expect(values).toBeInstanceOf(MixedNumbers);
    expect(values.first).toBe(half);
    expect(values.last).toBe(whole);
    expect(values.filter((value) => value.compare(half) >= 0)).toBeInstanceOf(MixedNumbers);
    expect(values.map((value) => value.toNumber())).toEqual([0.5, 1]);
    const strings = values.map((value) => value.toString());
    expect(strings).toBeInstanceOf(Collection);
    expect(strings.toArray()).toEqual(['1/2', '1']);
  });
});
