import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class MainBody extends BodyPart {
  static defaultName = 'Main Body';
  static defaultDefinition = Object.freeze({
    name: 'Main Body',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<MainBody>} */
export class MainBodyParts extends Collection {}
