import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class UpperTail extends BodyPart {
  static defaultName = 'UpperTail';
  static defaultDefinition = Object.freeze({
    name: 'UpperTail',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<UpperTail>} */
export class UpperTailParts extends Collection {}
