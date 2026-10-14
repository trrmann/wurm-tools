/**
 * @template T
 * @extends {Array<T>}
 */
export class Collection extends Array {
  constructor(items = []) {
    if (typeof items === 'number') {
      super(items);
      return;
    }

    super();
    if (items != null && typeof items[Symbol.iterator] === 'function') this.addRange(items);
    else this.add(items);
  }

  static get [Symbol.species]() {
    return this;
  }

  static of(...items) {
    return new this(items);
  }

  static compareValues(left, right) {
    const leftValue = left instanceof Date ? left.getTime() : left;
    const rightValue = right instanceof Date ? right.getTime() : right;
    if (Object.is(leftValue, rightValue)) return 0;
    if (typeof leftValue === 'string' && typeof rightValue === 'string') {
      return leftValue.localeCompare(rightValue);
    }
    if (leftValue < rightValue) return -1;
    if (leftValue > rightValue) return 1;
    return 0;
  }

  get size() {
    return this.length;
  }

  get isEmpty() {
    return this.length === 0;
  }

  get first() {
    return this[0];
  }

  get last() {
    return this[this.length - 1];
  }

  /** @returns {this} */
  create(items) {
    return new this.constructor(items);
  }

  /** @template U @param {(item: T, index: number, collection: this) => U} mapper @param {unknown} [thisArg] @returns {Collection<U>} */
  map(mapper, thisArg) {
    const mapped = [];
    this.forEach((item, index) => mapped.push(mapper.call(thisArg, item, index, this)));
    return new Collection(mapped);
  }

  /** @param {(item: T, index: number, collection: this) => unknown} predicate @param {unknown} [thisArg] @returns {this} */
  filter(predicate, thisArg) {
    return this.create(Array.prototype.filter.call(this, predicate, thisArg));
  }

  /** @param {(item: T, index: number, collection: this) => unknown} predicate @param {unknown} [thisArg] @returns {this} */
  where(predicate, thisArg) {
    return this.filter(predicate, thisArg);
  }

  /** @param {(item: T, index: number, collection: this) => unknown} action @param {unknown} [thisArg] */
  forEach(action, thisArg) {
    Array.prototype.forEach.call(this, action, thisArg);
  }

  /** @param {(item: T, index: number, collection: this) => unknown} selector @param {(left: *, right: *) => number} [comparator] @returns {this} */
  sortBy(selector, comparator) {
    if (typeof selector !== 'function') throw new TypeError('Selector must be a function');
    const compare = comparator ?? this.constructor.compareValues;
    if (typeof compare !== 'function') throw new TypeError('Comparator must be a function');
    this.sort((left, right) => compare(selector(left), selector(right)));
    return this;
  }

  /** @param {(item: T, index: number, collection: this) => unknown} selector @returns {Map<*, this>} */
  groupBy(selector) {
    if (typeof selector !== 'function') throw new TypeError('Selector must be a function');
    const groups = new Map();
    this.forEach((item, index) => {
      const key = selector(item, index, this);
      if (!groups.has(key)) groups.set(key, this.create([]));
      groups.get(key).add(item);
    });
    return groups;
  }

  /** @param {(item: T, index: number, collection: this) => unknown} predicate @returns {[this, this]} */
  partition(predicate) {
    if (typeof predicate !== 'function') throw new TypeError('Predicate must be a function');
    const matching = [];
    const remaining = [];
    this.forEach((item, index) => {
      (predicate(item, index, this) ? matching : remaining).push(item);
    });
    return [this.create(matching), this.create(remaining)];
  }

  /** @param {*} id @param {PropertyKey | ((item: T) => *)} [idSelector] @returns {T | undefined} */
  findById(id, idSelector = 'id') {
    return this.find((item) => this.#select(item, idSelector) === id);
  }

  /** @param {*} id @param {PropertyKey | ((item: T) => *)} [idSelector] @returns {boolean} */
  removeById(id, idSelector = 'id') {
    const index = this.findIndex((item) => this.#select(item, idSelector) === id);
    if (index < 0) return false;
    this.splice(index, 1);
    return true;
  }

  /** @param {...T} items @returns {this} */
  add(...items) {
    this.push(...items);
    return this;
  }

  /** @param {Iterable<T>} items @returns {this} */
  addRange(items) {
    if (items == null || typeof items[Symbol.iterator] !== 'function') {
      throw new TypeError('Items must be iterable');
    }
    const source = items === this ? this.toArray() : items;
    for (const item of source) this.push(item);
    return this;
  }

  /** @param {number} index @param {...T} items @returns {this} */
  insert(index, ...items) {
    if (!Number.isInteger(index)) throw new TypeError('Index must be an integer');
    const position = index < 0 ? Math.max(this.length + index, 0) : Math.min(index, this.length);
    this.splice(position, 0, ...items);
    return this;
  }

  /** @param {T} item @returns {boolean} */
  remove(item) {
    const index = this.findIndex((candidate) => candidate === item || Object.is(candidate, item));
    if (index < 0) return false;
    this.splice(index, 1);
    return true;
  }

  /** @param {number} index @returns {T} */
  removeAt(index) {
    if (!Number.isInteger(index)) throw new TypeError('Index must be an integer');
    const position = index < 0 ? this.length + index : index;
    if (position < 0 || position >= this.length) throw new RangeError('Index is out of range');
    return this.splice(position, 1)[0];
  }

  /** @param {(item: T, index: number, collection: this) => boolean} predicate @returns {T[]} */
  removeWhere(predicate) {
    if (typeof predicate !== 'function') throw new TypeError('Predicate must be a function');
    const original = this.toArray();
    const kept = [];
    const removed = [];
    original.forEach((item, index) => {
      (predicate(item, index, this) ? removed : kept).push(item);
    });
    this.length = 0;
    this.addRange(kept);
    return removed;
  }

  /** @param {T} item @returns {boolean} */
  contains(item) {
    return this.includes(item);
  }

  /** @param {(item: T, index: number, collection: this) => unknown} [predicate] @returns {number} */
  count(predicate) {
    if (predicate === undefined) return this.length;
    if (typeof predicate !== 'function') throw new TypeError('Predicate must be a function');
    return this.reduce((total, item, index) => total + Number(predicate(item, index, this)), 0);
  }

  /** @returns {this} */
  clear() {
    this.length = 0;
    return this;
  }

  /** @returns {this} */
  clone() {
    return new this.constructor(this);
  }

  /** @returns {T[]} */
  toArray() {
    return Array.from(this);
  }

  toJSON() {
    return this.toArray();
  }

  #select(item, selector) {
    return typeof selector === 'function' ? selector(item) : item?.[selector];
  }
}

/**
 * @template {number | bigint | Number} T
 * @extends {Collection<T>}
 */
export class CollectionOfNumbers extends Collection {
  /** @param {Iterable<T> | T | null} [items] */
  constructor(items = []) {
    super();

    const numbers = new Proxy(this, {
      set(target, property, value, receiver) {
        if (/^(0|[1-9]\d*)$/.test(property)) target.constructor.assertNumeric([value]);
        return Reflect.set(target, property, value, receiver);
      },
      defineProperty(target, property, descriptor) {
        if (/^(0|[1-9]\d*)$/.test(property) && 'value' in descriptor) {
          target.constructor.assertNumeric([descriptor.value]);
        }
        return Reflect.defineProperty(target, property, descriptor);
      },
    });

    if (typeof items === 'number' && Number.isSafeInteger(items) && items >= 0) {
      numbers.length = items;
    } else if (this.constructor.isNumeric(items)) {
      numbers.add(items);
    } else if (items != null && typeof items[Symbol.iterator] === 'function') {
      numbers.addRange(items);
    } else if (items != null) {
      throw new TypeError('CollectionOfNumbers items must be numeric or iterable');
    }

    return numbers;
  }

  static isNumeric(value) {
    if (typeof value === 'number' || typeof value === 'bigint') return true;
    try {
      Number.prototype.valueOf.call(value);
      return true;
    } catch {
      try {
        BigInt.prototype.valueOf.call(value);
        return true;
      } catch {
        return false;
      }
    }
  }

  static assertNumeric(values) {
    if (!values.every(this.isNumeric)) {
      throw new TypeError(`${this.name} only accepts values of its numeric element type`);
    }
  }

  static numericValue(value) {
    if (typeof value === 'number' || typeof value === 'bigint') return value;
    try {
      return Number.prototype.valueOf.call(value);
    } catch {
      try {
        return BigInt.prototype.valueOf.call(value);
      } catch {
        throw new TypeError('Value is not numeric');
      }
    }
  }

  static toNumber(value) {
    return Number(CollectionOfNumbers.numericValue(value));
  }

  static compareValues(left, right) {
    if (left != null && typeof left.compare === 'function') return left.compare(right);
    if (right != null && typeof right.compare === 'function') return -right.compare(left);
    const leftValue = CollectionOfNumbers.numericValue(left);
    const rightValue = CollectionOfNumbers.numericValue(right);
    if (leftValue < rightValue) return -1;
    if (leftValue > rightValue) return 1;
    return 0;
  }

  static addValues(left, right) {
    if (left != null && typeof left.add === 'function') return left.add(right);
    if (right != null && typeof right.add === 'function') return right.add(left);
    const leftValue = CollectionOfNumbers.numericValue(left);
    const rightValue = CollectionOfNumbers.numericValue(right);
    if (typeof leftValue === 'bigint' && typeof rightValue === 'bigint') {
      return leftValue + rightValue;
    }
    return Number(leftValue) + Number(rightValue);
  }

  static subtractValues(left, right) {
    if (left != null && typeof left.subtract === 'function') return left.subtract(right);
    const leftValue = CollectionOfNumbers.numericValue(left);
    const rightValue = CollectionOfNumbers.numericValue(right);
    if (typeof leftValue === 'bigint' && typeof rightValue === 'bigint') {
      return leftValue - rightValue;
    }
    return Number(leftValue) - Number(rightValue);
  }

  static multiplyValues(left, right) {
    if (left != null && typeof left.multiply === 'function') return left.multiply(right);
    if (right != null && typeof right.multiply === 'function') return right.multiply(left);
    const leftValue = CollectionOfNumbers.numericValue(left);
    const rightValue = CollectionOfNumbers.numericValue(right);
    if (typeof leftValue === 'bigint' && typeof rightValue === 'bigint') {
      return leftValue * rightValue;
    }
    return Number(leftValue) * Number(rightValue);
  }

  static divideValues(left, right) {
    if (left != null && typeof left.divide === 'function') return left.divide(right);
    const leftValue = CollectionOfNumbers.numericValue(left);
    const rightValue = CollectionOfNumbers.numericValue(right);
    if (rightValue === 0 || rightValue === 0n) throw new RangeError('Cannot divide by zero');
    if (typeof leftValue === 'bigint' && typeof rightValue === 'bigint') {
      return leftValue / rightValue;
    }
    return Number(leftValue) / Number(rightValue);
  }

  /** @param {...T} items @returns {number} */
  push(...items) {
    this.constructor.assertNumeric(items);
    return super.push(...items);
  }

  /** @param {...T} items @returns {number} */
  unshift(...items) {
    this.constructor.assertNumeric(items);
    return super.unshift(...items);
  }

  /** @param {number} start @param {number} [deleteCount] @param {...T} items @returns {T[]} */
  splice(start, deleteCount, ...items) {
    this.constructor.assertNumeric(items);
    if (arguments.length === 0) return super.splice();
    if (arguments.length === 1) return super.splice(start);
    return super.splice(start, deleteCount, ...items);
  }

  /** @param {...T} items @returns {this} */
  add(...items) {
    this.push(...items);
    return this;
  }

  /** @param {Iterable<T>} items @returns {this} */
  addRange(items) {
    if (items == null || typeof items[Symbol.iterator] !== 'function') {
      throw new TypeError('Items must be iterable');
    }
    const values = Array.from(items);
    this.constructor.assertNumeric(values);
    for (const value of values) this.push(value);
    return this;
  }

  /** @param {number} index @param {...T} items @returns {this} */
  insert(index, ...items) {
    this.constructor.assertNumeric(items);
    return super.insert(index, ...items);
  }

  /** @param {T} value @param {number} [start] @param {number} [end] @returns {this} */
  fill(value, start, end) {
    this.constructor.assertNumeric([value]);
    return super.fill(value, start, end);
  }

  /** @template R @param {(accumulator: R, value: T, index: number, collection: this) => R} reducer @param {R} initialValue @returns {R} */
  aggregate(reducer, initialValue) {
    if (typeof reducer !== 'function') throw new TypeError('Reducer must be a function');
    if (arguments.length > 1) return this.reduce(reducer, initialValue);
    return this.reduce(reducer);
  }

  /** @returns {number | bigint | Number} */
  sum() {
    if (this.isEmpty) return 0;
    let total = this[0];
    for (let index = 1; index < this.length; index++) {
      total = CollectionOfNumbers.addValues(total, this[index]);
    }
    return total;
  }

  /** @returns {number | Number} */
  average() {
    if (this.isEmpty) throw new RangeError('Cannot average an empty collection');
    const total = this.sum();
    if (total != null && typeof total.divide === 'function') return total.divide(this.length);
    return Number(total) / this.length;
  }

  /** @returns {T | undefined} */
  min() {
    if (this.isEmpty) return undefined;
    return this.reduce((minimum, value) =>
      CollectionOfNumbers.compareValues(value, minimum) < 0 ? value : minimum
    );
  }

  /** @returns {T | undefined} */
  max() {
    if (this.isEmpty) return undefined;
    return this.reduce((maximum, value) =>
      CollectionOfNumbers.compareValues(value, maximum) > 0 ? value : maximum
    );
  }

  /** @returns {T | number} */
  median() {
    if (this.isEmpty) throw new RangeError('Cannot find the median of an empty collection');
    const values = this.toArray().sort(CollectionOfNumbers.compareValues);
    const middle = Math.floor(values.length / 2);
    if (values.length % 2 === 1) return values[middle];
    const left = values[middle - 1];
    const right = values[middle];
    if (left != null && typeof left.add === 'function') return left.add(right).divide(2);
    if (right != null && typeof right.add === 'function') return right.add(left).divide(2);
    return (CollectionOfNumbers.toNumber(left) + CollectionOfNumbers.toNumber(right)) / 2;
  }

  /** @returns {T | undefined} The most frequent value; ties use first occurrence. */
  mode() {
    if (this.isEmpty) return undefined;
    const frequencies = [];
    for (const value of this) {
      const match = frequencies.find(
        (entry) => CollectionOfNumbers.compareValues(entry.value, value) === 0
      );
      if (match) match.count++;
      else frequencies.push({ value, count: 1 });
    }
    return frequencies.reduce((mode, entry) => (entry.count > mode.count ? entry : mode)).value;
  }

  /** @param {{ sample?: boolean }} [options] @returns {number} */
  variance({ sample = false } = {}) {
    const divisor = this.length - Number(sample);
    if (divisor <= 0) throw new RangeError('Not enough values to calculate variance');
    const mean =
      this.reduce((total, value) => total + CollectionOfNumbers.toNumber(value), 0) / this.length;
    return (
      this.reduce((total, value) => total + (CollectionOfNumbers.toNumber(value) - mean) ** 2, 0) /
      divisor
    );
  }

  /** @param {{ sample?: boolean }} [options] @returns {number} */
  standardDeviation(options) {
    return Math.sqrt(this.variance(options));
  }

  /** @param {number | bigint | Number} factor @returns {this} */
  scale(factor) {
    return this.multiplyScalar(factor);
  }

  /** @param {number | bigint | Number} value @returns {this} */
  addScalar(value) {
    return this.transform((item) => CollectionOfNumbers.addValues(item, value));
  }

  /** @param {number | bigint | Number} value @returns {this} */
  subtractScalar(value) {
    return this.transform((item) => CollectionOfNumbers.subtractValues(item, value));
  }

  /** @param {number | bigint | Number} value @returns {this} */
  multiplyScalar(value) {
    return this.transform((item) => CollectionOfNumbers.multiplyValues(item, value));
  }

  /** @param {number | bigint | Number} value @returns {this} */
  divideScalar(value) {
    return this.transform((item) => CollectionOfNumbers.divideValues(item, value));
  }

  /** @param {(value: T, index: number, collection: this) => number | bigint | Number} operation @returns {this} */
  transform(operation) {
    if (typeof operation !== 'function') throw new TypeError('Operation must be a function');
    return this.create(Array.from(this, operation));
  }

  /** @param {number | bigint | Number} [minimum] @param {number | bigint | Number} [maximum] @returns {this} */
  normalize(minimum = 0, maximum = 1) {
    const lower = CollectionOfNumbers.toNumber(minimum);
    const upper = CollectionOfNumbers.toNumber(maximum);
    if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower > upper) {
      throw new RangeError('Normalization bounds must be finite and ordered');
    }
    if (this.isEmpty) return this.create([]);

    const sourceMinimum = CollectionOfNumbers.toNumber(this.min());
    const sourceMaximum = CollectionOfNumbers.toNumber(this.max());
    if (sourceMinimum === sourceMaximum) return this.create(Array(this.length).fill(lower));
    return this.create(
      Array.from(
        this,
        (value) =>
          lower +
          ((CollectionOfNumbers.toNumber(value) - sourceMinimum) /
            (sourceMaximum - sourceMinimum)) *
            (upper - lower)
      )
    );
  }

  /** @param {Iterable<number | bigint | Number>} other @returns {this} */
  addEach(other) {
    return this.combineEach(other, CollectionOfNumbers.addValues);
  }

  /** @param {Iterable<number | bigint | Number>} other @returns {this} */
  subtractEach(other) {
    return this.combineEach(other, CollectionOfNumbers.subtractValues);
  }

  /** @param {Iterable<number | bigint | Number>} other @returns {this} */
  multiplyEach(other) {
    return this.combineEach(other, CollectionOfNumbers.multiplyValues);
  }

  /** @param {Iterable<number | bigint | Number>} other @returns {this} */
  divideEach(other) {
    return this.combineEach(other, CollectionOfNumbers.divideValues);
  }

  /** @param {Iterable<number | bigint | Number>} other @returns {number | bigint | Number} */
  dot(other) {
    return this.combineEach(other, CollectionOfNumbers.multiplyValues).sum();
  }

  /** @param {Iterable<number | bigint | Number>} other @param {(left: *, right: *) => *} operation @returns {this} */
  combineEach(other, operation) {
    if (other == null || typeof other[Symbol.iterator] !== 'function') {
      throw new TypeError('Other values must be iterable');
    }
    if (typeof operation !== 'function') throw new TypeError('Operation must be a function');
    const values = Array.from(other);
    CollectionOfNumbers.assertNumeric(values);
    if (values.length !== this.length) throw new RangeError('Collections must have equal lengths');
    return this.create(Array.from(this, (value, index) => operation(value, values[index])));
  }
}

/**
 * @template {string | String} T
 * @extends {Collection<T>}
 */
export class CollectionOfStrings extends Collection {
  /** @param {Iterable<T> | T | null} [items] */
  constructor(items = []) {
    super();

    const strings = new Proxy(this, {
      set(target, property, value, receiver) {
        if (/^(0|[1-9]\d*)$/.test(property)) target.constructor.assertString([value]);
        return Reflect.set(target, property, value, receiver);
      },
      defineProperty(target, property, descriptor) {
        if (/^(0|[1-9]\d*)$/.test(property) && 'value' in descriptor) {
          target.constructor.assertString([descriptor.value]);
        }
        return Reflect.defineProperty(target, property, descriptor);
      },
    });

    if (typeof items === 'number' && Number.isSafeInteger(items) && items >= 0) {
      strings.length = items;
    } else if (this.constructor.isString(items)) {
      strings.add(items);
    } else if (items != null && typeof items[Symbol.iterator] === 'function') {
      strings.addRange(items);
    } else if (items != null) {
      throw new TypeError(`${this.constructor.name} items must be strings or iterable`);
    }

    return strings;
  }

  static isString(value) {
    if (typeof value === 'string') return true;
    try {
      String.prototype.valueOf.call(value);
      return true;
    } catch {
      return false;
    }
  }

  static assertString(values) {
    if (!values.every((value) => this.isString(value))) {
      throw new TypeError(`${this.name} only accepts string values`);
    }
  }

  /** @param {...T} items @returns {number} */
  push(...items) {
    this.constructor.assertString(items);
    return super.push(...items);
  }

  /** @param {...T} items @returns {number} */
  unshift(...items) {
    this.constructor.assertString(items);
    return super.unshift(...items);
  }

  /** @param {number} start @param {number} [deleteCount] @param {...T} items @returns {T[]} */
  splice(start, deleteCount, ...items) {
    this.constructor.assertString(items);
    if (arguments.length === 0) return super.splice();
    if (arguments.length === 1) return super.splice(start);
    return super.splice(start, deleteCount, ...items);
  }

  /** @param {...T} items @returns {this} */
  add(...items) {
    this.push(...items);
    return this;
  }

  /** @param {Iterable<T>} items @returns {this} */
  addRange(items) {
    if (items == null || typeof items[Symbol.iterator] !== 'function') {
      throw new TypeError('Items must be iterable');
    }
    const values = Array.from(items);
    this.constructor.assertString(values);
    for (const value of values) this.push(value);
    return this;
  }

  /** @param {number} index @param {...T} items @returns {this} */
  insert(index, ...items) {
    this.constructor.assertString(items);
    return super.insert(index, ...items);
  }

  /** @param {T} value @param {number} [start] @param {number} [end] @returns {this} */
  fill(value, start, end) {
    this.constructor.assertString([value]);
    return super.fill(value, start, end);
  }

  join(separator = ',') {
    return Array.prototype.join.call(this, separator);
  }

  /** Split every entry and flatten all resulting pieces into this collection type. */
  split(separator, limit) {
    const pieces = [];
    for (const value of this) pieces.push(...String(value).split(separator, limit));
    return this.create(pieces);
  }

  splitEach(separator, limit) {
    return this.split(separator, limit);
  }

  /** @param {string} [locale] @param {Intl.CollatorOptions} [options] @returns {this} */
  sortLocale(locale, options = {}) {
    const collator = new Intl.Collator(locale, options);
    return this.sort((left, right) => collator.compare(String(left), String(right)));
  }

  /** @param {string} [locale] @param {Intl.CollatorOptions} [options] @returns {this} */
  sortNatural(locale, options = {}) {
    const collator = new Intl.Collator(locale, {
      numeric: true,
      sensitivity: 'base',
      ...options,
    });
    return this.sort((left, right) => collator.compare(String(left), String(right)));
  }

  /** @param {string} [locale] @returns {this} */
  sortIgnoreCase(locale) {
    return this.sortLocale(locale, { sensitivity: 'base' });
  }

  /** @param {string} [locale] @returns {this} */
  lowercase(locale) {
    return this.create(
      Array.from(this, (value) =>
        locale ? String(value).toLocaleLowerCase(locale) : String(value).toLowerCase()
      )
    );
  }

  /** @param {string} [locale] @returns {this} */
  uppercase(locale) {
    return this.create(
      Array.from(this, (value) =>
        locale ? String(value).toLocaleUpperCase(locale) : String(value).toUpperCase()
      )
    );
  }

  trimAll() {
    return this.create(Array.from(this, (value) => String(value).trim()));
  }

  /** @param {string} prefix @param {{ caseInsensitive?: boolean, locale?: string }} [options] @returns {this} */
  filterStartsWith(prefix, { caseInsensitive = false, locale } = {}) {
    const expected = caseInsensitive ? prefix.toLocaleLowerCase(locale) : prefix;
    return this.filter((value) => {
      const text = String(value);
      return (caseInsensitive ? text.toLocaleLowerCase(locale) : text).startsWith(expected);
    });
  }

  /** @param {string} suffix @param {{ caseInsensitive?: boolean, locale?: string }} [options] @returns {this} */
  filterEndsWith(suffix, { caseInsensitive = false, locale } = {}) {
    const expected = caseInsensitive ? suffix.toLocaleLowerCase(locale) : suffix;
    return this.filter((value) => {
      const text = String(value);
      return (caseInsensitive ? text.toLocaleLowerCase(locale) : text).endsWith(expected);
    });
  }

  /** @param {string} substring @param {{ caseInsensitive?: boolean, locale?: string }} [options] @returns {this} */
  filterContains(substring, { caseInsensitive = false, locale } = {}) {
    const expected = caseInsensitive ? substring.toLocaleLowerCase(locale) : substring;
    return this.filter((value) => {
      const text = String(value);
      return (caseInsensitive ? text.toLocaleLowerCase(locale) : text).includes(expected);
    });
  }

  /** @param {RegExp} pattern @returns {this} */
  filterRegex(pattern) {
    if (!(pattern instanceof RegExp)) throw new TypeError('Pattern must be a RegExp');
    return this.filter((value) => {
      pattern.lastIndex = 0;
      return pattern.test(String(value));
    });
  }

  /** @param {{ caseInsensitive?: boolean, locale?: string }} [options] @returns {this} */
  unique({ caseInsensitive = false, locale } = {}) {
    const seen = new Set();
    const uniqueValues = [];
    for (const value of this) {
      const text = String(value);
      const key = caseInsensitive ? text.toLocaleLowerCase(locale) : text;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueValues.push(value);
      }
    }
    return this.create(uniqueValues);
  }

  longest() {
    return this.reduce(
      (longest, value) =>
        longest === undefined || String(value).length > String(longest).length ? value : longest,
      undefined
    );
  }

  shortest() {
    return this.reduce(
      (shortest, value) =>
        shortest === undefined || String(value).length < String(shortest).length ? value : shortest,
      undefined
    );
  }

  get totalCharacters() {
    return this.reduce((total, value) => total + String(value).length, 0);
  }
}
