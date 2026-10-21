import { Collection } from '../../../../collection.mjs';
import { Legs } from './legs-parts.mjs';

export class BackLegs extends Legs {
  static defaultName = 'Back Legs';
  static defaultDefinition = Object.freeze({
    name: 'Back Legs',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<BackLegs>} */
export class BackLegsParts extends Collection {}
