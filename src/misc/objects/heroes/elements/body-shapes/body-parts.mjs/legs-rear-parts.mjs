import { Collection } from '../../../../collection.mjs';
import { Legs } from './legs-parts.mjs';

export class RearLegs extends Legs {
  static defaultName = 'Rear Legs';
  static defaultDefinition = Object.freeze({
    name: 'Rear Legs',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<RearLegs>} */
export class RearLegsParts extends Collection {}
