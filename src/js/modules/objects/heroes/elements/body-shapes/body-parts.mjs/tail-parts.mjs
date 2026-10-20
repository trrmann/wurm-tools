import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class Tail extends BodyPart {
  static defaultName = 'Tail';
  static defaultDefinition = Object.freeze({
    name: 'Tail',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<Tail>} */
export class TailParts extends Collection {}
