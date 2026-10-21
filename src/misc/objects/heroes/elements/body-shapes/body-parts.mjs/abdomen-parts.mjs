import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class Abdomen extends BodyPart {
  static defaultName = 'Abdomen';
  static defaultDefinition = Object.freeze({
    name: 'Abdomen',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<Abdomen>} */
export class AbdomenParts extends Collection {}
