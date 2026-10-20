import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class LegsFrontSets extends BodyPart {
  static defaultName = 'LegsFrontSets';
  static defaultDefinition = Object.freeze({
    name: 'LegsFrontSets',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<LegsFrontSets>} */
export class LegsFrontSetsParts extends Collection {}
