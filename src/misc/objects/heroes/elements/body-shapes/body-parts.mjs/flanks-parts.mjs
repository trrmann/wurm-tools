import { Collection } from '../../../../collection.mjs';
import { CompoundBodyPart } from './compound-parts.mjs';
import { LeftFlank } from './flank-left-parts.mjs';
import { RightFlank } from './flank-right-parts.mjs';

export class Flanks extends CompoundBodyPart {
  static defaultName = 'Flanks';
  static defaultDefinition = Object.freeze({
    name: 'Flanks',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  constructor() {
    super();
    super.parts.add(new LeftFlank());
    super.parts.add(new RightFlank());
  }
}

/** @extends {Collection<Flanks>} */
export class FlanksParts extends Collection {}
