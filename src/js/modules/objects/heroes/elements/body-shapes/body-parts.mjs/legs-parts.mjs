import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class Legs extends BodyPart {
  static defaultName = 'Legs';
  static defaultDefinition = Object.freeze({
    name: 'Legs',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<Legs>} */
export class LegsParts extends Collection {}
