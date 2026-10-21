import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class Head extends BodyPart {
  static defaultName = 'Head';
  static defaultDefinition = Object.freeze({
    name: 'Head',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<Head>} */
export class HeadParts extends Collection {}
