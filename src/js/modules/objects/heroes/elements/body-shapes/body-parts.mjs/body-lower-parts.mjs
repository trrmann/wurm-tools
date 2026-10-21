import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class LowerBody extends BodyPart {
  static defaultName = 'Lower Body';
  static defaultDefinition = Object.freeze({
    name: 'Lower Body',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<LowerBody>} */
export class LowerBodyParts extends Collection {}
