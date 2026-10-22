import { Collection } from '../../../../collection.mjs';
import { CompoundBodyPart } from './compound-parts.mjs';
import { LowerTailAndTip } from './tail-lower-and-tip-parts.mjs';
import { UpperTail } from './tail-upper-parts.mjs';

export class Tail extends CompoundBodyPart {
  static defaultName = 'Tail';
  static defaultDefinition = Object.freeze({
    name: 'Tail',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  constructor(options = {}) {
    super(options);
    if (options.parts !== undefined) return;
    super.parts.add(new UpperTail());
    super.parts.add(new LowerTailAndTip());
  }
}

/** @extends {Collection<Tail>} */
export class TailParts extends Collection {}
