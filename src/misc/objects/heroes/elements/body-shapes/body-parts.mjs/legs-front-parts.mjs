import { Collection } from '../../../../collection.mjs';
import { Legs } from './legs-parts.mjs';

export class FrontLegs extends Legs {
  static defaultName = 'Front Legs';
  static defaultDefinition = Object.freeze({
    name: 'Front Legs',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<FrontLegs>} */
export class FrontLegsParts extends Collection {}
