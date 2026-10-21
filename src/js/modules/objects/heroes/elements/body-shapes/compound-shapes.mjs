import { Collection } from '../../../collection.mjs';
import { BodyShape, BodyShapes } from './body-shapes.mjs';
import { BodyParts } from './body-parts.mjs/body-parts.mjs';

export class CompoundShape extends BodyShape {
  static defaultName = 'CompoundShape';
  static defaultDefinition = Object.freeze({
    name: 'CompoundShape',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  #shapes;
  constructor(options = {}) {
    super(options);
    this.parts.length = 0;
    this.#shapes = new BodyShapes();
    this.restoreParts(options.parts);
  }
  get shapes() {
    return this.#shapes;
  }
  get parts() {
    return Object.values(this.#shapes || {}).reduce((acc, shape) => {
      Object.values(shape.parts || {}).reduce((innerAcc, part) => {
        innerAcc.add(part);
        return innerAcc;
      }, acc);
      return acc;
    }, new BodyParts());
  }
}

/** @extends {Collection<CompoundShape>} */
export class CompoundShapes extends Collection {}
