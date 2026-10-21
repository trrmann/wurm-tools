import { Collection } from '../../../../collection.mjs';
import { Feet } from './feet-parts.mjs';

export class HindFeet extends Feet {
  static defaultName = 'Hind Feet';
  static defaultDefinition = Object.freeze({
    name: 'Hind Feet',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<HindFeet>} */
export class HindFeetParts extends Collection {}
