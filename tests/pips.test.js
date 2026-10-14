import { describe, expect, it } from 'vitest';
import { CollectionOfNumbers } from '../src/js/modules/objects/collection.mjs';
import { MixedNumber } from '../src/js/modules/objects/mixed-numbers.mjs';
import { Point } from '../src/js/modules/objects/points.mjs';
import { Pip, Pips } from '../src/js/modules/objects/pips.mjs';

describe('Pip', () => {
  it('represents only a fractional point value below one', () => {
    expect(new Pip('3/4').toString()).toBe('3/4');
    expect(new Pip(0, 1, 8).toString()).toBe('1/8');
    expect(new Pip(0).toString()).toBe('0');
    expect(() => new Pip(1)).toThrow(RangeError);
    expect(() => new Pip('1 1/4')).toThrow(RangeError);
    expect(() => new Pip('-1/4')).toThrow(RangeError);
  });

  it('modifies points through exact mixed-number arithmetic', () => {
    const point = new Point(2, 1, 4);
    const pip = new Pip('1/2');

    expect(point.add(pip).toString()).toBe('2 3/4');
    expect(point.subtract(pip).toString()).toBe('1 3/4');
    expect(pip.applyTo(point).toString()).toBe('2 3/4');
    expect(() => pip.applyTo(new MixedNumber(2))).toThrow(TypeError);
  });

  it('provides a Pip-only numeric collection', () => {
    const first = new Pip('1/4');
    const second = new Pip('1/2');
    const pips = new Pips([first]);

    pips.add(second);

    expect(pips).toBeInstanceOf(CollectionOfNumbers);
    expect(pips).toBeInstanceOf(Pips);
    expect(pips.sum().toString()).toBe('3/4');
    expect(pips.filter((pip) => pip.compare(first) > 0)).toBeInstanceOf(Pips);
    expect(() => pips.add(new MixedNumber('1/3'))).toThrow(TypeError);
    expect(() => pips.push(0.25)).toThrow(TypeError);
    expect(() => (pips[0] = new MixedNumber('1/5'))).toThrow(TypeError);
  });
});
