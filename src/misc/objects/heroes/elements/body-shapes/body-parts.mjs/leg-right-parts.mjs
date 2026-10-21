import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class RightLeg extends BodyPart {
  static defaultName = 'Right Leg';
  static defaultDefinition = Object.freeze({
    name: 'Right Leg',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<RightLeg>} */
export class RightLegParts extends Collection {}
