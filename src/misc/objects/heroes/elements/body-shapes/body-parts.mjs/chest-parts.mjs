import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class Chest extends BodyPart {
  static defaultName = 'Chest';
  static defaultDefinition = Object.freeze({
    name: 'Chest',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<Chest>} */
export class ChestParts extends Collection {}
