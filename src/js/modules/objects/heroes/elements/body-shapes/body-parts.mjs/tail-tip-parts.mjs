import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class TailTip extends BodyPart {
  static defaultName = 'Tail Tip';
  static defaultDefinition = Object.freeze({
    name: 'Tail Tip',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<TailTip>} */
export class TailTipParts extends Collection {}
