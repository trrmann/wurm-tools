import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class AbdomenLowerBody extends BodyPart {
  static defaultName = 'AbdomenLowerBody';
  static defaultDefinition = Object.freeze({
    name: 'AbdomenLowerBody',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<AbdomenLowerBody>} */
export class AbdomenLowerBodyParts extends Collection {}
