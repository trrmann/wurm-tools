import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class LeftHand extends BodyPart {
  static defaultName = 'Left Hand';
  static defaultDefinition = Object.freeze({
    name: 'Left Hand',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<LeftHand>} */
export class LeftHandParts extends Collection {}
