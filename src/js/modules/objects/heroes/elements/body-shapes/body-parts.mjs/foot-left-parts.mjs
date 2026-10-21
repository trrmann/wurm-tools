import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class LeftFoot extends BodyPart {
  static defaultName = 'Left Foot';
  static defaultDefinition = Object.freeze({
    name: 'Left Foot',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<LeftFoot>} */
export class LeftFootParts extends Collection {}
