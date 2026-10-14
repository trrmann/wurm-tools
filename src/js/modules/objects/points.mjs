import { CollectionOfNumbers } from './collection.mjs';
import { MixedNumber } from './mixed-numbers.mjs';

export { CollectionOfNumbers };

/** @extends {CollectionOfNumbers<Point>} */
export class Points extends CollectionOfNumbers {}

export class Point extends MixedNumber {}
