import { Collection } from '../../../../collection.mjs';
import { Feet } from './feet-parts.mjs';

export class FrontFeet extends Feet {
  static defaultName = 'Front Feet';
  static defaultDefinition = Object.freeze({
    name: 'Front Feet',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<FrontFeet>} */
export class FrontFeetParts extends Collection {}
