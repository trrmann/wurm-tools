import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class SpineFlank extends BodyPart {
  static defaultName = 'Spine Flank';
  static defaultDefinition = Object.freeze({
    name: 'Spine Flank',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<SpineFlank>} */
export class SpineFlankParts extends Collection {}
