import { Collection } from '../../../../collection.mjs';
import { CompoundBodyPart } from './compound-parts.mjs';
import { LowerTail } from './tail-lower-parts.mjs';
import { TailTip } from './tail-tip-parts.mjs';

export class LowerTailAndTip extends CompoundBodyPart {
  static defaultName = 'Lower Tail And Tip';
  static defaultDefinition = Object.freeze({
    name: 'Lower Tail And Tip',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  constructor(options = {}) {
    super(options);
    if (options.parts !== undefined) return;
    super.parts.add(new LowerTail());
    super.parts.add(new TailTip());
  }
}

/** @extends {Collection<LowerTailAndTip>} */
export class LowerTailAndTipParts extends Collection {}
