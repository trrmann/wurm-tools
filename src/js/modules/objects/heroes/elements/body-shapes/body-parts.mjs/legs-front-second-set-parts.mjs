import { Collection } from '../../../../collection.mjs';
import { FrontLegs } from './legs-front-parts.mjs';

export class SecondSetFrontLegs extends FrontLegs {
  static defaultName = 'Second Set Front Legs';
  static defaultDefinition = Object.freeze({
    name: 'Second Set Front Legs',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<SecondSetFrontLegs>} */
export class SecondSetFrontLegsParts extends Collection {}
