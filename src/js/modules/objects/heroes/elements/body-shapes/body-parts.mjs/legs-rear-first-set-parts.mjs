import { Collection } from '../../../../collection.mjs';
import { RearLegs } from './legs-rear-parts.mjs';

export class FirstSetRearLegs extends RearLegs {
  static defaultName = 'First Set Rear Legs';
  static defaultDefinition = Object.freeze({
    name: 'First Set Rear Legs',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<FirstSetRearLegs>} */
export class FirstSetRearLegsParts extends Collection {}
