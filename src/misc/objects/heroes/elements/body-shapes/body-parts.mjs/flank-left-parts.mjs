import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class LeftFlank extends BodyPart {
  static defaultName = 'Left Flank';
  static defaultDefinition = Object.freeze({
    name: 'Left Flank',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<LeftFlank>} */
export class LeftFlankParts extends Collection {}
