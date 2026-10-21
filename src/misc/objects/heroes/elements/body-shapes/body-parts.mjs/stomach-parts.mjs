import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class Stomach extends BodyPart {
  static defaultName = 'Stomach';
  static defaultDefinition = Object.freeze({
    name: 'Stomach',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<Stomach>} */
export class StomachParts extends Collection {}
