import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class RightThigh extends BodyPart {
  static defaultName = 'Right Thigh';
  static defaultDefinition = Object.freeze({
    name: 'Right Thigh',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<RightThigh>} */
export class RightThighParts extends Collection {}
