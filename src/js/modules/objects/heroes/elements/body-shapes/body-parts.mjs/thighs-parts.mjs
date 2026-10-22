import { Collection } from '../../../../collection.mjs';
import { CompoundBodyPart } from './compound-parts.mjs';
import { LeftThigh } from './thigh-left-parts.mjs';
import { RightThigh } from './thigh-right-parts.mjs';

export class Thighs extends CompoundBodyPart {
  static defaultName = 'Thighs';
  static defaultDefinition = Object.freeze({
    name: 'Thighs',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  constructor(options = {}) {
    super(options);
    if (options.parts !== undefined) return;
    super.parts.add(new LeftThigh());
    super.parts.add(new RightThigh());
  }
}

/** @extends {Collection<Thighs>} */
export class ThighsParts extends Collection {}
