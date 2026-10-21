import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class LeftThigh extends BodyPart {
  static defaultName = 'Left Thigh';
  static defaultDefinition = Object.freeze({
    name: 'Left Thigh',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<LeftThigh>} */
export class LeftThighParts extends Collection {}
