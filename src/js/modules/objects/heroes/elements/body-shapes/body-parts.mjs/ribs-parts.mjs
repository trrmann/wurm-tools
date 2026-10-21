import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class Ribs extends BodyPart {
  static defaultName = 'Ribs';
  static defaultDefinition = Object.freeze({
    name: 'Ribs',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<Ribs>} */
export class RibsParts extends Collection {}
