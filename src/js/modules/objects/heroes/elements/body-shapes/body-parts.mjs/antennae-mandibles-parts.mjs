import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class AntennaeMandibles extends BodyPart {
  static defaultName = 'AntennaeMandibles';
  static defaultDefinition = Object.freeze({
    name: 'AntennaeMandibles',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<AntennaeMandibles>} */
export class AntennaeMandiblesParts extends Collection {}
