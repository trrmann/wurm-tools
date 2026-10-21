import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class UpperBody extends BodyPart {
  static defaultName = 'UpperBody';
  static defaultDefinition = Object.freeze({
    name: 'UpperBody',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<UpperBody>} */
export class UpperBodyParts extends Collection {}
