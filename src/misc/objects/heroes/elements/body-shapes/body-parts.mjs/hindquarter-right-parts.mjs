import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class RightHindquarter extends BodyPart {
  static defaultName = 'Right Hindquarter';
  static defaultDefinition = Object.freeze({
    name: 'Right Hindquarter',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<RightHindquarter>} */
export class RightHindquarterParts extends Collection {}
