import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class Mandibles extends BodyPart {
  static defaultName = 'Mandibles';
  static defaultDefinition = Object.freeze({
    name: 'Mandibles',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<Mandibles>} */
export class MandiblesParts extends Collection {}
