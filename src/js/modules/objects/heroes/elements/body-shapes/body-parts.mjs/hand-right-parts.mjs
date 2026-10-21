import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class RightHand extends BodyPart {
  static defaultName = 'Right Hand';
  static defaultDefinition = Object.freeze({
    name: 'Right Hand',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<RightHand>} */
export class RightHandParts extends Collection {}
