import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class RightArm extends BodyPart {
  static defaultName = 'Right Arm';
  static defaultDefinition = Object.freeze({
    name: 'Right Arm',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<RightArm>} */
export class RightArmParts extends Collection {}
