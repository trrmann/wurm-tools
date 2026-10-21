import { Collection } from '../../../../collection.mjs';
import { FrontLegs } from './legs-front-parts.mjs';

export class FirstSetFrontLegs extends FrontLegs {
  static defaultName = 'First Set Front Legs';
  static defaultDefinition = Object.freeze({
    name: 'First Set Front Legs',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<FirstSetFrontLegs>} */
export class FirstSetFrontLegsParts extends Collection {}
