import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class LowerTail extends BodyPart {
  static defaultName = 'Lower Tail';
  static defaultDefinition = Object.freeze({
    name: 'Lower Tail',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<LowerTail>} */
export class LowerTailParts extends Collection {}
