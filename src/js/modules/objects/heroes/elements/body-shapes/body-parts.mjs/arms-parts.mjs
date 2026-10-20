import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class Arms extends BodyPart {
  static defaultName = 'Arms';
  static defaultDefinition = Object.freeze({
    name: 'Arms',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<Arms>} */
export class ArmsParts extends Collection {}
