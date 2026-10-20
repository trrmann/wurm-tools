import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class Hindquarters extends BodyPart {
  static defaultName = 'Hindquarters';
  static defaultDefinition = Object.freeze({
    name: 'Hindquarters',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<Hindquarters>} */
export class HindquartersParts extends Collection {}
