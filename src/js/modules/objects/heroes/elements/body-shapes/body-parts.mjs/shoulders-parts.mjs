import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class Shoulders extends BodyPart {
  static defaultName = 'Shoulders';
  static defaultDefinition = Object.freeze({
    name: 'Shoulders',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<Shoulders>} */
export class ShouldersParts extends Collection {}
