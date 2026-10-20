import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class FrontLegs extends BodyPart {
  static defaultName = 'Front Legs';
  static defaultDefinition = Object.freeze({
    name: 'Front Legs',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<FrontLegs>} */
export class FrontLegsParts extends Collection {}
