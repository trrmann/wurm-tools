import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class BackLegs extends BodyPart {
  static defaultName = 'Back Legs';
  static defaultDefinition = Object.freeze({
    name: 'Back Legs',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<BackLegs>} */
export class BackLegsParts extends Collection {}
