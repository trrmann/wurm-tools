import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';
export class RightFlank extends BodyPart {
  static defaultName = 'Right Flank';
  static defaultDefinition = Object.freeze({
    name: 'Right Flank',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<RightFlank>} */
export class RightFlankParts extends Collection {}
