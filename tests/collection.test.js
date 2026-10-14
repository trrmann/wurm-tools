import { describe, expect, it } from 'vitest';
import { Collection, CollectionOfNumbers } from '../src/js/modules/objects/collection.mjs';
import { MixedNumber, MixedNumbers } from '../src/js/modules/objects/mixed-numbers.mjs';
import { Point, Points } from '../src/js/modules/objects/points.mjs';

describe('Collection', () => {
  it('constructs from iterable values and retains native array behavior', () => {
    const collection = new Collection([1, 2, 3]);

    expect(collection).toBeInstanceOf(Collection);
    expect(collection.toArray()).toEqual([1, 2, 3]);
    expect(collection.map((value) => value * 2)).toEqual([2, 4, 6]);
    expect(collection.filter((value) => value > 1)).toBeInstanceOf(Collection);
    expect(Collection.of(4, 5).toArray()).toEqual([4, 5]);
    expect(JSON.stringify(collection)).toBe('[1,2,3]');
  });

  it('restricts CollectionOfNumbers to numeric values', () => {
    const mixed = MixedNumber.parse('1/2');
    const numbers = new CollectionOfNumbers([1, 2n, new Number(3), mixed]);

    expect(numbers).toBeInstanceOf(CollectionOfNumbers);
    expect(numbers.toArray()).toEqual([1, 2n, new Number(3), mixed]);
    expect(() => numbers.add('4')).toThrow(TypeError);
    expect(() => numbers.push(5, {})).toThrow(TypeError);
    expect(() => (numbers[0] = 'invalid')).toThrow(TypeError);
  });

  it('aggregates and calculates statistical metrics', () => {
    const numbers = new CollectionOfNumbers([1, 2, 2, 5]);

    expect(numbers.aggregate((total, value) => total + value, 0)).toBe(10);
    expect(numbers.aggregate((total, value) => total + value)).toBe(10);
    expect(numbers.sum()).toBe(10);
    expect(numbers.average()).toBe(2.5);
    expect(numbers.min()).toBe(1);
    expect(numbers.max()).toBe(5);
    expect(numbers.median()).toBe(2);
    expect(numbers.mode()).toBe(2);
    expect(numbers.variance()).toBe(2.25);
    expect(numbers.variance({ sample: true })).toBe(3);
    expect(numbers.standardDeviation()).toBe(1.5);
    expect(new CollectionOfNumbers([2n, 3n]).sum()).toBe(5n);
    expect(new CollectionOfNumbers([2n, 3n]).average()).toBe(2.5);
  });

  it('applies scalar arithmetic and normalizes values', () => {
    const numbers = new CollectionOfNumbers([1, 2, 3]);

    expect(numbers.addScalar(2).toArray()).toEqual([3, 4, 5]);
    expect(numbers.subtractScalar(1).toArray()).toEqual([0, 1, 2]);
    expect(numbers.multiplyScalar(2).toArray()).toEqual([2, 4, 6]);
    expect(numbers.divideScalar(2).toArray()).toEqual([0.5, 1, 1.5]);
    expect(numbers.scale(3).toArray()).toEqual([3, 6, 9]);
    expect(numbers.normalize().toArray()).toEqual([0, 0.5, 1]);
    expect(numbers.normalize(-1, 1).toArray()).toEqual([-1, 0, 1]);
    expect(() => numbers.divideScalar(0)).toThrow(RangeError);
    expect(() => numbers.normalize(2, 1)).toThrow(RangeError);
  });

  it('supports element-wise vector operations and dot products', () => {
    const left = new CollectionOfNumbers([1, 2, 3]);

    expect(left.addEach([3, 2, 1]).toArray()).toEqual([4, 4, 4]);
    expect(left.subtractEach([3, 2, 1]).toArray()).toEqual([-2, 0, 2]);
    expect(left.multiplyEach([3, 2, 1]).toArray()).toEqual([3, 4, 3]);
    expect(left.divideEach([2, 2, 2]).toArray()).toEqual([0.5, 1, 1.5]);
    expect(left.dot([3, 2, 1])).toBe(10);
    expect(() => left.addEach([1, 2])).toThrow(RangeError);
  });

  it('preserves exact mixed-number arithmetic in numeric aggregations', () => {
    const values = new MixedNumbers([MixedNumber.parse('1/2'), MixedNumber.parse('1/4')]);

    expect(values.sum().toString()).toBe('3/4');
    expect(values.average().toString()).toBe('3/8');
    expect(
      values
        .scale(2)
        .map((value) => value.toString())
        .toArray()
    ).toEqual(['1', '1/2']);
    expect(values.dot([2, 4]).toString()).toBe('2');
    expect(MixedNumber.parse('1/2').add(new Number(1)).toString()).toBe('1 1/2');
  });

  it('supports mutation, lookup, counting, and empty state', () => {
    const collection = new Collection([1, 2, 3]);

    collection.add(4).addRange([5, 6]).insert(-1, 7);
    expect(collection.toArray()).toEqual([1, 2, 3, 4, 5, 7, 6]);
    expect(collection.size).toBe(7);
    expect(collection.isEmpty).toBe(false);
    expect(collection.first).toBe(1);
    expect(collection.last).toBe(6);
    expect(collection.contains(4)).toBe(true);
    expect(collection.count()).toBe(7);
    expect(collection.count((value) => value % 2 === 0)).toBe(3);
    expect(collection.remove(4)).toBe(true);
    expect(collection.remove(4)).toBe(false);
    expect(collection.removeAt(-1)).toBe(6);
    expect(collection.removeWhere((value) => value % 2 === 0)).toEqual([2]);
    expect(collection.toArray()).toEqual([1, 3, 5, 7]);

    const clone = collection.clone();
    expect(clone).toBeInstanceOf(Collection);
    expect(clone).not.toBe(collection);
    expect(clone.toArray()).toEqual(collection.toArray());
    expect(collection.clear()).toBe(collection);
    expect(collection.isEmpty).toBe(true);
  });

  it('adds a snapshot when a collection is added to itself', () => {
    const collection = new Collection([1, 2]);

    collection.addRange(collection);

    expect(collection.toArray()).toEqual([1, 2, 1, 2]);
  });

  it('queries, maps, sorts, groups, partitions, iterates, and removes by id', () => {
    const users = new Collection([
      { id: 'a', name: 'Ari', active: true, city: 'Rexburg', age: 30 },
      { id: 'b', name: 'Bea', active: false, city: 'Rexburg', age: 25 },
      { id: 'c', name: 'Cal', active: true, city: 'Provo', age: 35 },
    ]);

    const activeUsers = users.where((user) => user.active);
    const names = users.map((user) => user.name);
    const groupedByCity = users.groupBy((user) => user.city);
    const [active, inactive] = users.partition((user) => user.active);
    const notifications = [];
    users.forEach((user) => notifications.push(`sent:${user.id}`));

    expect(activeUsers).toBeInstanceOf(Collection);
    expect(activeUsers.map((user) => user.id).toArray()).toEqual(['a', 'c']);
    expect(names).toBeInstanceOf(Collection);
    expect(names.toArray()).toEqual(['Ari', 'Bea', 'Cal']);
    expect(users.sortBy((user) => user.age)).toBe(users);
    expect(users.map((user) => user.id).toArray()).toEqual(['b', 'a', 'c']);
    expect(groupedByCity.get('Rexburg')).toBeInstanceOf(Collection);
    expect(
      groupedByCity
        .get('Rexburg')
        .map((user) => user.id)
        .toArray()
    ).toEqual(['a', 'b']);
    expect(active.map((user) => user.id).toArray()).toEqual(['a', 'c']);
    expect(inactive.map((user) => user.id).toArray()).toEqual(['b']);
    expect(notifications).toEqual(['sent:a', 'sent:b', 'sent:c']);
    expect(users.findById('a')?.name).toBe('Ari');
    expect(users.removeById('b')).toBe(true);
    expect(users.removeById('missing')).toBe(false);
    expect(users.map((user) => user.id).toArray()).toEqual(['a', 'c']);
  });

  it('supports Points as a typed collection subclass', () => {
    const first = new Point(1, 1, 2);
    const second = new Point(2);
    const points = new Points([first]);

    points.add(second);

    expect(points).toBeInstanceOf(Collection);
    expect(points).toBeInstanceOf(CollectionOfNumbers);
    expect(points).toBeInstanceOf(Points);
    expect(points.size).toBe(2);
    expect(points.first).toBe(first);
    expect(points.last).toBe(second);
    expect(points.filter((point) => point === first)).toBeInstanceOf(Points);
    expect(first).toBeInstanceOf(MixedNumber);
    expect(first).toBeInstanceOf(Number);
    expect(first.toString()).toBe('1 1/2');
    expect(Number(first)).toBe(1.5);
    expect(typeof first).toBe('object');
  });

  it('rejects invalid collection arguments and indexes', () => {
    const collection = new Collection([1]);

    expect(() => collection.addRange(1)).toThrow(TypeError);
    expect(() => collection.insert(0.5, 2)).toThrow(TypeError);
    expect(() => collection.removeAt(2)).toThrow(RangeError);
    expect(() => collection.removeWhere(null)).toThrow(TypeError);
  });
});
