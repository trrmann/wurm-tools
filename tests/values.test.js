import { describe, expect, it } from 'vitest';
import { CollectionOfNumbers } from '../src/js/modules/objects/collection.mjs';
import { MixedNumber } from '../src/js/modules/objects/mixed-numbers.mjs';
import { Point, Points } from '../src/js/modules/objects/points.mjs';
import { Value, Values } from '../src/js/modules/objects/values.mjs';

describe('Values', () => {
  it('inherits Points and calculates callback results into MixedNumber values', () => {
    const points = new Values([new Point(1, 1, 2), new Point(2, 1, 2)]);
    const total = points.calculate((items) => items.sum());

    expect(points).toBeInstanceOf(Points);
    expect(points).toBeInstanceOf(Values);
    expect(total).toBeInstanceOf(Value);
    expect(total).toBeInstanceOf(Point);
    expect(total).toBeInstanceOf(MixedNumber);
    expect(total.toString()).toBe('4');
    expect(new CollectionOfNumbers([total]).first).toBe(total);
  });

  it('supports static calculation and exact mixed-number results', () => {
    const result = Values.calculate([new Point(1, 1, 2), new Point(1, 1, 2)], (points) =>
      points.average()
    );

    expect(result).toBeInstanceOf(Value);
    expect(result.toString()).toBe('1 1/2');
    expect(Value.from(MixedNumber.parse('1/3')).toString()).toBe('1/3');
  });

  it('requires a calculation template and converts its output to a number', () => {
    const points = new Values([new Point(1)]);

    expect(() => points.calculate()).toThrow(TypeError);
    expect(() => points.calculate(() => 'not numeric')).toThrow(TypeError);
    expect(points.calculate(() => 0.25).toString()).toBe('1/4');
  });
});
