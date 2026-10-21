import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class Top extends BodyPart {
  static defaultName = 'Top';
  static defaultDefinition = Object.freeze({
    name: 'Top',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<Top>} */
export class TopParts extends Collection {}
