import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class Hands extends BodyPart {
  static defaultName = 'Hands';
  static defaultDefinition = Object.freeze({
    name: 'Hands',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<Hands>} */
export class HandsParts extends Collection {}
