import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class LegsRearSets extends BodyPart {
  static defaultName = 'Legs Rear Sets';
  static defaultDefinition = Object.freeze({
    name: 'Legs Rear Sets',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<LegsRearSets>} */
export class LegsRearSetsParts extends Collection {}
