import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class Stinger extends BodyPart {
  static defaultName = 'Stinger';
  static defaultDefinition = Object.freeze({
    name: 'Stinger',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<Stinger>} */
export class StingerParts extends Collection {}
