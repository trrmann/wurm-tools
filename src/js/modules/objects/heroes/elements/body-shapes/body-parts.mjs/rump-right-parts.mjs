import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class RightRump extends BodyPart {
  static defaultName = 'Right Rump';
  static defaultDefinition = Object.freeze({
    name: 'Right Rump',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<RightRump>} */
export class RightRumpParts extends Collection {}
