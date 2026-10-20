import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class Bottom extends BodyPart {
  static defaultName = 'Bottom';
  static defaultDefinition = Object.freeze({
    name: 'Bottom',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<Bottom>} */
export class BottomParts extends Collection {}
