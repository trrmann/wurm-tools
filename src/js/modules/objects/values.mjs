import { MixedNumber } from './mixed-numbers.mjs';
import { Point, Points } from './points.mjs';

/** @extends {Point} */
export class Value extends Point {
  constructor(value = 0, numerator = 0, denominator = 1) {
    if (arguments.length === 1 && value != null && typeof value === 'object') {
      const mixedNumber = MixedNumber.from(value);
      super(mixedNumber.wholeBigInt, mixedNumber.numeratorBigInt, mixedNumber.denominatorBigInt);
      return;
    }

    super(value, numerator, denominator);
  }

  static from(value) {
    return new Value(MixedNumber.from(value));
  }
}

/** @extends {Points} */
export class Values extends Points {
  /** @param {(points: Points) => number | bigint | Number} template @returns {Value} */
  calculate(template) {
    if (typeof template !== 'function')
      throw new TypeError('Calculation template must be a function');
    return Value.from(template(this));
  }

  /** @param {Iterable<Point>} points @param {(points: Points) => number | bigint | Number} template @returns {Value} */
  static calculate(points, template) {
    return new Values(points).calculate(template);
  }
}
