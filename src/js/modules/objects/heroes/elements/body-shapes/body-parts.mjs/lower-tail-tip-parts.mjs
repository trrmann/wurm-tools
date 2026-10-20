import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class LowerTailTip extends BodyPart {
  static defaultName = 'Lower Tail Tip';
  static defaultDefinition = Object.freeze({
    name: 'Lower Tail Tip',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<LowerTailTip>} */
export class LowerTailTipParts extends Collection {}
