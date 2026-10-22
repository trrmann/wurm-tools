import { Collection } from '../../../../collection.mjs';
import { CompoundBodyPart } from './compound-parts.mjs';
import { LeftArm } from './arm-left-parts.mjs';
import { RightArm } from './arm-right-parts.mjs';

export class Arms extends CompoundBodyPart {
  static defaultName = 'Arms';
  static defaultDefinition = Object.freeze({
    name: 'Arms',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  constructor(options = {}) {
    super(options);
    if (options.parts !== undefined) return;
    super.parts.add(new LeftArm());
    super.parts.add(new RightArm());
  }
}

/** @extends {Collection<Arms>} */
export class ArmsParts extends Collection {}
