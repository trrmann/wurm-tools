import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class LeftLeg extends BodyPart {
  static defaultName = 'Left Leg';
  static defaultDefinition = Object.freeze({
    name: 'Left Leg',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<LeftLeg>} */
export class LeftLegParts extends Collection {}
