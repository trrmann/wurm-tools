import { CollectionOfNumbers } from './collection.mjs';

/**
 * An immutable, reduced rational number with mixed-number parsing and display.
 */
export class MixedNumber extends Number {
  #numerator = 0n;
  #denominator = 1n;

  static toInteger(value, label) {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number' && Number.isSafeInteger(value)) return BigInt(value);
    throw new TypeError(`${label} must be a safe integer or BigInt`);
  }

  static absolute(value) {
    return value < 0n ? -value : value;
  }

  static greatestCommonDivisor(left, right) {
    let a = MixedNumber.absolute(left);
    let b = MixedNumber.absolute(right);
    while (b !== 0n) [a, b] = [b, a % b];
    return a || 1n;
  }

  static decimalParts(value) {
    const match = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/i.exec(value);
    if (!match) throw new TypeError(`Invalid mixed number: ${value}`);

    const fraction = match[3] ?? match[4] ?? '';
    const exponent = Number(match[5] ?? 0);
    if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 10000) {
      throw new RangeError('Decimal exponent is out of range');
    }

    const digits = `${match[2] ?? '0'}${fraction}`;
    let numerator = BigInt(digits || '0');
    if (match[1] === '-') numerator = -numerator;

    const scale = fraction.length - exponent;
    if (scale < 0) return [numerator * 10n ** BigInt(-scale), 1n];
    return [numerator, 10n ** BigInt(scale)];
  }

  constructor(whole = 0, numerator = 0, denominator = 1) {
    let valueNumerator;
    let valueDenominator;
    if (
      arguments.length === 1 &&
      (typeof whole === 'string' || (typeof whole === 'number' && !Number.isInteger(whole)))
    ) {
      const parsed = MixedNumber.parse(String(whole));
      valueNumerator = parsed.#numerator;
      valueDenominator = parsed.#denominator;
    } else {
      const wholeValue = MixedNumber.toInteger(whole, 'Whole part');
      const numeratorValue = MixedNumber.toInteger(numerator, 'Numerator');
      const denominatorValue = MixedNumber.toInteger(denominator, 'Denominator');
      if (denominatorValue === 0n) throw new RangeError('Denominator cannot be zero');
      if (denominatorValue < 0n) throw new RangeError('Denominator must be positive');

      const sign = wholeValue < 0n ? -1n : wholeValue > 0n ? 1n : 0n;
      valueNumerator =
        sign === 0n
          ? numeratorValue
          : sign *
            (MixedNumber.absolute(wholeValue) * denominatorValue +
              MixedNumber.absolute(numeratorValue));
      valueDenominator = denominatorValue;
    }

    super(Number(valueNumerator) / Number(valueDenominator));
    this.#numerator = valueNumerator;
    this.#denominator = valueDenominator;
    this.#reduce();
  }

  static from(value) {
    if (value instanceof MixedNumber) return value;
    if (typeof value === 'string') return MixedNumber.parse(value);
    if (typeof value === 'bigint') return MixedNumber.fromImproper(value, 1n);
    if (typeof value === 'number' && Number.isFinite(value)) {
      return MixedNumber.parse(value.toString());
    }
    if (value != null && (typeof value === 'object' || typeof value === 'function')) {
      try {
        const numericValue = Number.prototype.valueOf.call(value);
        if (Number.isFinite(numericValue)) return MixedNumber.parse(numericValue.toString());
      } catch {
        // Try the boxed BigInt path below.
      }
      try {
        return MixedNumber.fromImproper(BigInt.prototype.valueOf.call(value), 1n);
      } catch {
        // Use the shared invalid-value error below.
      }
    }
    throw new TypeError('Value must be a MixedNumber, finite number, BigInt, or string');
  }

  static fromImproper(numerator, denominator = 1) {
    const top = MixedNumber.toInteger(numerator, 'Numerator');
    const bottom = MixedNumber.toInteger(denominator, 'Denominator');
    if (bottom === 0n) throw new RangeError('Denominator cannot be zero');
    const sign = bottom < 0n ? -1n : 1n;
    return new MixedNumber(0n, sign * top, MixedNumber.absolute(bottom));
  }

  static parse(input) {
    const value = input.trim();
    const mixed = /^([+-]?\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(value);
    if (mixed) {
      const whole = BigInt(mixed[1]);
      const fractionSign = whole === 0n && mixed[1].startsWith('-') ? -1n : 1n;
      return new MixedNumber(whole, fractionSign * BigInt(mixed[2]), BigInt(mixed[3]));
    }

    const fraction = /^([+-]?\d+)\s*\/\s*(\d+)$/.exec(value);
    if (fraction) return MixedNumber.fromImproper(BigInt(fraction[1]), BigInt(fraction[2]));

    const [numerator, denominator] = MixedNumber.decimalParts(value);
    return MixedNumber.fromImproper(numerator, denominator);
  }

  get wholeBigInt() {
    return this.#numerator / this.#denominator;
  }

  get numeratorBigInt() {
    const remainder = MixedNumber.absolute(this.#numerator) % this.#denominator;
    return this.wholeBigInt === 0n && this.#numerator < 0n ? -remainder : remainder;
  }

  get denominatorBigInt() {
    return this.#denominator;
  }

  get whole() {
    return Number(this.wholeBigInt);
  }

  get numerator() {
    return Number(this.numeratorBigInt);
  }

  get denominator() {
    return Number(this.#denominator);
  }

  get sign() {
    return this.#numerator < 0n ? -1 : this.#numerator > 0n ? 1 : 0;
  }

  get isInteger() {
    return this.#numerator % this.#denominator === 0n;
  }

  add(value) {
    const other = MixedNumber.from(value);
    return MixedNumber.fromImproper(
      this.#numerator * other.#denominator + other.#numerator * this.#denominator,
      this.#denominator * other.#denominator
    );
  }

  subtract(value) {
    const other = MixedNumber.from(value);
    return MixedNumber.fromImproper(
      this.#numerator * other.#denominator - other.#numerator * this.#denominator,
      this.#denominator * other.#denominator
    );
  }

  multiply(value) {
    const other = MixedNumber.from(value);
    return MixedNumber.fromImproper(
      this.#numerator * other.#numerator,
      this.#denominator * other.#denominator
    );
  }

  divide(value) {
    const other = MixedNumber.from(value);
    if (other.#numerator === 0n) throw new RangeError('Cannot divide by zero');
    return MixedNumber.fromImproper(
      this.#numerator * other.#denominator,
      this.#denominator * other.#numerator
    );
  }

  negate() {
    return MixedNumber.fromImproper(-this.#numerator, this.#denominator);
  }

  abs() {
    return MixedNumber.fromImproper(MixedNumber.absolute(this.#numerator), this.#denominator);
  }

  compare(value) {
    const other = MixedNumber.from(value);
    const difference = this.#numerator * other.#denominator - other.#numerator * this.#denominator;
    return difference < 0n ? -1 : difference > 0n ? 1 : 0;
  }

  equals(value) {
    return this.compare(value) === 0;
  }

  toNumber() {
    return Number(this.#numerator) / Number(this.#denominator);
  }

  toImproperString() {
    return `${this.#numerator}/${this.#denominator}`;
  }

  toString() {
    const sign = this.#numerator < 0n ? '-' : '';
    const absoluteNumerator = MixedNumber.absolute(this.#numerator);
    const whole = absoluteNumerator / this.#denominator;
    const remainder = absoluteNumerator % this.#denominator;

    if (remainder === 0n) return `${sign}${whole}`;
    if (whole === 0n) return `${sign}${remainder}/${this.#denominator}`;
    return `${sign}${whole} ${remainder}/${this.#denominator}`;
  }

  toJSON() {
    return this.toString();
  }

  valueOf() {
    return this.toNumber();
  }

  [Symbol.toPrimitive](hint) {
    return hint === 'string' ? this.toString() : this.toNumber();
  }

  #reduce() {
    const divisor = MixedNumber.greatestCommonDivisor(this.#numerator, this.#denominator);
    this.#numerator /= divisor;
    this.#denominator /= divisor;
  }
}

/** @extends {CollectionOfNumbers<MixedNumber>} */
export class MixedNumbers extends CollectionOfNumbers {}
