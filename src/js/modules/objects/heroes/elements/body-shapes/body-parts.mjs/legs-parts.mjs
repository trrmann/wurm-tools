import { Collection } from '../../../../collection.mjs';
import { CompoundBodyPart } from './compound-parts.mjs';
import { LeftLeg } from './leg-left-parts.mjs';
import { RightLeg } from './leg-right-parts.mjs';

export class Legs extends CompoundBodyPart {
  static defaultName = 'Legs';
  static defaultDefinition = Object.freeze({
    name: 'Legs',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  constructor(options = {}) {
    super(options);
    if (options.parts !== undefined) return;
    super.parts.add(new LeftLeg());
    super.parts.add(new RightLeg());
  }
}

/** @extends {Collection<Legs>} */
export class LegsParts extends Collection {}
