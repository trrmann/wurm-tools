import { Collection } from '../../../../collection.mjs';
import { CompoundBodyPart } from './compound-parts.mjs';
import { LeftPaw } from './paw-left-parts.mjs';
import { RightPaw } from './paw-right-parts.mjs';

export class Paws extends CompoundBodyPart {
  static defaultName = 'Paws';
  static defaultDefinition = Object.freeze({
    name: 'Paws',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  constructor() {
    super();
    super.parts.add(new LeftPaw());
    super.parts.add(new RightPaw());
  }
}

/** @extends {Collection<Paws>} */
export class PawsParts extends Collection {}
