import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class RightFoot extends BodyPart {
  static defaultName = 'Right Foot';
  static defaultDefinition = Object.freeze({
    name: 'Right Foot',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<RightFoot>} */
export class RightFootParts extends Collection {}
