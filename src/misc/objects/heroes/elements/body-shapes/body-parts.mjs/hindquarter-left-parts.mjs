import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class LeftHindquarter extends BodyPart {
  static defaultName = 'Left Hindquarter';
  static defaultDefinition = Object.freeze({
    name: 'Left Hindquarter',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<LeftHindquarter>} */
export class LeftHindquarterParts extends Collection {}
