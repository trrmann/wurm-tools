import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class ThighsRump extends BodyPart {
  static defaultName = 'ThighsRump';
  static defaultDefinition = Object.freeze({
    name: 'ThighsRump',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<ThighsRump>} */
export class ThighsRumpParts extends Collection {}
