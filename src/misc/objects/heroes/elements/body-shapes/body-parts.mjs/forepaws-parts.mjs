import { Collection } from '../../../../collection.mjs';
import { Paws } from './paws-parts.mjs';

export class Forepaws extends Paws {
  static defaultName = 'Forepaws';
  static defaultDefinition = Object.freeze({
    name: 'Forepaws',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<Forepaws>} */
export class ForepawsParts extends Collection {}
