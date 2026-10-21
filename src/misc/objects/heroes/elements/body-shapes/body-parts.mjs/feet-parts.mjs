import { Collection } from '../../../../collection.mjs';
import { CompoundBodyPart } from './compound-parts.mjs';
import { LeftFoot } from './foot-left-parts.mjs';
import { RightFoot } from './foot-right-parts.mjs';

export class Feet extends CompoundBodyPart {
  static defaultName = 'Feet';
  static defaultDefinition = Object.freeze({
    name: 'Feet',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  constructor() {
    super();
    super.parts.add(new LeftFoot());
    super.parts.add(new RightFoot());
  }
}

/** @extends {Collection<Feet>} */
export class FeetParts extends Collection {}
