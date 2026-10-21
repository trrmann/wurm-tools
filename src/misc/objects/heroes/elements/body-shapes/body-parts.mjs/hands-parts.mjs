import { Collection } from '../../../../collection.mjs';
import { CompoundBodyPart } from './compound-parts.mjs';
import { LeftHand } from './hand-left-parts.mjs';
import { RightHand } from './hand-right-parts.mjs';

export class Hands extends CompoundBodyPart {
  static defaultName = 'Hands';
  static defaultDefinition = Object.freeze({
    name: 'Hands',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  constructor() {
    super();
    super.parts.add(new LeftHand());
    super.parts.add(new RightHand());
  }
}

/** @extends {Collection<Hands>} */
export class HandsParts extends Collection {}
