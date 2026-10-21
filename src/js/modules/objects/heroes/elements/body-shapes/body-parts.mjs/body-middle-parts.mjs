import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class MiddleBody extends BodyPart {
  static defaultName = 'Middle Body';
  static defaultDefinition = Object.freeze({
    name: 'Middle Body',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<MiddleBody>} */
export class MiddleBodyParts extends Collection {}
