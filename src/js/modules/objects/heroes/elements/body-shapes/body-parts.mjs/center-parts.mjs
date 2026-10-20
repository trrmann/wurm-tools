import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class Center extends BodyPart {
  static defaultName = 'Center';
  static defaultDefinition = Object.freeze({
    name: 'Center',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<Center>} */
export class CenterParts extends Collection {}
