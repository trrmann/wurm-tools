import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class ThoraxUpperBody extends BodyPart {
  static defaultName = 'ThoraxUpperBody';
  static defaultDefinition = Object.freeze({
    name: 'ThoraxUpperBody',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<ThoraxUpperBody>} */
export class ThoraxUpperBodyParts extends Collection {}
