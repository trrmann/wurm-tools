import { Collection } from '../../../collection.mjs';
import { Insectoid } from './insectoid-shapes.mjs';

export class Arachnid extends Insectoid {
  static defaultName = 'Arachnid';
  static defaultDefinition = Object.freeze({
    name: 'Arachnid',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });

  constructor(options = {}) {
    super(options);
  }
}

/** @extends {Collection<Arachnid>} */
export class ArachnidShapes extends Collection {}
