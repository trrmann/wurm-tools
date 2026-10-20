import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class Wings extends BodyPart {
  static defaultName = 'Wings';
  static defaultDefinition = Object.freeze({
    name: 'Wings',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<Wings>} */
export class WingsParts extends Collection {}
