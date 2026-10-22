import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class CustomBodyPart extends BodyPart {
  static defaultName = 'Custom Body Part';
  static defaultDefinition = Object.freeze({
    name: 'Custom Body Part',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  static requiresLibrary = true;
}

/** @extends {Collection<CustomBodyPart>} */
export class CustomBodyParts extends Collection {}
