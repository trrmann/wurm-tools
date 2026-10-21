import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class LeftArm extends BodyPart {
  static defaultName = 'Left Arm';
  static defaultDefinition = Object.freeze({
    name: 'Left Arm',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<LeftArm>} */
export class LeftArmParts extends Collection {}
