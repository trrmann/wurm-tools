import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class Left extends BodyPart {
  static defaultName = 'Left';
  static defaultDefinition = Object.freeze({
    name: 'Left',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<Left>} */
export class LeftParts extends Collection {}
