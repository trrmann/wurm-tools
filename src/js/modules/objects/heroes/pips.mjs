import { CollectionOfNumbers } from '../collection.mjs';
import { MixedNumber } from '../mixed-numbers.mjs';
import { Point } from '../points.mjs';

/** A non-negative fractional point value smaller than one whole point. */
export class Pip extends MixedNumber {
  constructor(value = 0, numerator = 0, denominator = 1) {
    if (arguments.length === 1 && value != null && typeof value === 'object') {
      const mixedNumber = MixedNumber.from(value);
      super(mixedNumber.wholeBigInt, mixedNumber.numeratorBigInt, mixedNumber.denominatorBigInt);
    } else if (arguments.length === 1) {
      super(value);
    } else {
      super(value, numerator, denominator);
    }

    if (this.compare(0) < 0 || this.compare(1) >= 0) {
      throw new RangeError('Pip must be at least zero and less than one');
    }
  }

  static from(value) {
    const mixedNumber = MixedNumber.from(value);
    return new Pip(
      mixedNumber.wholeBigInt,
      mixedNumber.numeratorBigInt,
      mixedNumber.denominatorBigInt
    );
  }

  /** @param {Point} point @returns {MixedNumber} */
  applyTo(point) {
    if (!(point instanceof Point)) throw new TypeError('Pip can only be applied to a Point');
    return point.add(this);
  }
}

/** @extends {CollectionOfNumbers<Pip>} */
export class Pips extends CollectionOfNumbers {
  static isNumeric(value) {
    return value instanceof Pip;
  }

  constructor(values = []) {
    super();
    if (values == null) return;
    if (typeof values === 'number' && Number.isSafeInteger(values) && values >= 0) {
      this.length = values;
    } else if (Pips.isNumeric(values)) {
      this.add(values);
    } else if (typeof values[Symbol.iterator] === 'function') {
      this.addRange(values);
    } else {
      throw new TypeError('Pips must be constructed from Pip values or an iterable of Pips');
    }
  }
}
