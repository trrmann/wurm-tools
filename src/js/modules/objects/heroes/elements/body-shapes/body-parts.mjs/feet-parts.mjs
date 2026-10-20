import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class Feet extends BodyPart {
  static defaultName = 'Feet';
  static defaultDefinition = Object.freeze({
    name: 'Feet',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<Feet>} */
export class FeetParts extends Collection {}
