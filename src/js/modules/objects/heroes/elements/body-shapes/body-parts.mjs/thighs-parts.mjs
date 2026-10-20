import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class Thighs extends BodyPart {
  static defaultName = 'Thighs';
  static defaultDefinition = Object.freeze({
    name: 'Thighs',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<Thighs>} */
export class ThighsParts extends Collection {}
