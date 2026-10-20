import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class Vitals extends BodyPart {
  static defaultName = 'Vitals';
  static defaultDefinition = Object.freeze({
    name: 'Vitals',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<Vitals>} */
export class VitalsParts extends Collection {}
