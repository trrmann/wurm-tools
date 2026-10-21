import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class LeftPaw extends BodyPart {
  static defaultName = 'Left Paw';
  static defaultDefinition = Object.freeze({
    name: 'Left Paw',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<LeftPaw>} */
export class LeftPawParts extends Collection {}
