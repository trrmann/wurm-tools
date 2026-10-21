import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class LeftRump extends BodyPart {
  static defaultName = 'Left Rump';
  static defaultDefinition = Object.freeze({
    name: 'Left Rump',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<LeftRump>} */
export class LeftRumpParts extends Collection {}
