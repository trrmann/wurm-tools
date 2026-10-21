import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class Antennae extends BodyPart {
  static defaultName = 'Antennae';
  static defaultDefinition = Object.freeze({
    name: 'Antennae',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<Antennae>} */
export class AntennaeParts extends Collection {}
