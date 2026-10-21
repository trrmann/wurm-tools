import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';
export class RightPaw extends BodyPart {
  static defaultName = 'Right Paw';
  static defaultDefinition = Object.freeze({
    name: 'Right Paw',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<RightPaw>} */
export class RightPawParts extends Collection {}
