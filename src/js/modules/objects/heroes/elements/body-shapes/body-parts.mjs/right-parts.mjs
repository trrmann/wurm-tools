import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class Right extends BodyPart {
  static defaultName = 'Right';
  static defaultDefinition = Object.freeze({
    name: 'Right',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<Right>} */
export class RightParts extends Collection {}
