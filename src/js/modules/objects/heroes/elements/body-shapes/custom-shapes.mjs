import { Collection } from '../../../collection.mjs';
import { BodyShape } from './body-shapes.mjs';

export class CustomShape extends BodyShape {
  static defaultName = 'CustomShape';
  static defaultDefinition = Object.freeze({
    name: 'CustomShape',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });

  constructor(options = {}) {
    super(options);
    this.parts.length = 0;
    this.restoreParts(options.parts);
  }
}

/** @extends {Collection<CustomShape>} */
export class CustomShapes extends Collection {}
