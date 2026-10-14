import { CollectionOfStrings } from './collection.mjs';

/** A string value with the native String API. */
export class Name extends String {
  constructor(value = '') {
    if (!CollectionOfStrings.isString(value)) throw new TypeError('Name must be a string');
    super(String(value));
  }

  equals(value) {
    return CollectionOfStrings.isString(value) && this.valueOf() === String(value);
  }
}

/**
 * @template {Name} T
 * @extends {CollectionOfStrings<T>}
 */
export class Names extends CollectionOfStrings {
  /** @type {typeof Name} */
  static NameType = Name;

  static isString(value) {
    if (value instanceof Name) return value instanceof this.NameType;
    return CollectionOfStrings.isString(value);
  }

  static toName(value) {
    if (value instanceof this.NameType) return value;
    if (value instanceof Name) {
      throw new TypeError(`${this.name} cannot contain ${value.constructor.name}`);
    }
    return new this.NameType(value);
  }

  /** @param {Iterable<T> | T | string | String | null} [items] */
  constructor(items = []) {
    if (typeof items === 'number' && Number.isSafeInteger(items) && items >= 0) {
      super(items);
      return;
    }

    let values;
    if (CollectionOfStrings.isString(items)) values = [items];
    else if (items == null) values = [];
    else if (typeof items[Symbol.iterator] === 'function') values = Array.from(items);
    else throw new TypeError(`${new.target.name} requires strings or an iterable of strings`);

    const NameType = new.target.NameType;
    const typedNames = values.map((value) => {
      if (value instanceof Name && !(value instanceof NameType)) {
        throw new TypeError(`${new.target.name} cannot contain ${value.constructor.name}`);
      }
      return value instanceof NameType ? value : new NameType(value);
    });
    super(typedNames);
  }

  push(...values) {
    return super.push(...values.map((value) => this.constructor.toName(value)));
  }

  unshift(...values) {
    return super.unshift(...values.map((value) => this.constructor.toName(value)));
  }

  splice(start, deleteCount, ...values) {
    const names = values.map((value) => this.constructor.toName(value));
    if (arguments.length === 0) return super.splice();
    if (arguments.length === 1) return super.splice(start);
    return super.splice(start, deleteCount, ...names);
  }

  add(...values) {
    this.push(...values);
    return this;
  }

  addRange(values) {
    if (values == null || typeof values[Symbol.iterator] !== 'function') {
      throw new TypeError('Items must be iterable');
    }
    return this.add(...Array.from(values));
  }

  insert(index, ...values) {
    return super.insert(index, ...values.map((value) => this.constructor.toName(value)));
  }

  fill(value, start, end) {
    return super.fill(this.constructor.toName(value), start, end);
  }
}

export class ThingName extends Name {}

/** @extends {Names<ThingName>} */
export class ThingNames extends Names {
  /** @type {typeof ThingName} */
  static NameType = ThingName;
}
