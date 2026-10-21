import { Collection } from '../../../../collection.mjs';
import { RearLegs } from './legs-rear-parts.mjs';

export class SecondSetRearLegs extends RearLegs {
  static defaultName = 'Second Set Rear Legs';
  static defaultDefinition = Object.freeze({
    name: 'Second Set Rear Legs',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<SecondSetRearLegs>} */
export class SecondSetRearLegsParts extends Collection {}
