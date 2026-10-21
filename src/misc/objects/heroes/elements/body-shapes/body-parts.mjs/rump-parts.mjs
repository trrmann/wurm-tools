import { Collection } from '../../../../collection.mjs';
import { CompoundBodyPart } from './compound-parts.mjs';
import { LeftRump } from './rump-left-parts.mjs';
import { RightRump } from './rump-right-parts.mjs';

export class Rump extends CompoundBodyPart {
  static defaultName = 'Rump';
  static defaultDefinition = Object.freeze({
    name: 'Rump',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  constructor() {
    super();
    super.parts.add(new LeftRump());
    super.parts.add(new RightRump());
  }
}

/** @extends {Collection<Rump>} */
export class RumpParts extends Collection {}
