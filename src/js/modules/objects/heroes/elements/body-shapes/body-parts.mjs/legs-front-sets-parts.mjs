import { Collection } from '../../../../collection.mjs';
import { CompoundBodyPart } from './compound-parts.mjs';
import { FirstSetFrontLegs } from './legs-front-first-set-parts.mjs';
import { SecondSetFrontLegs } from './legs-front-second-set-parts.mjs';

export class LegsFrontSets extends CompoundBodyPart {
  static defaultName = 'LegsFrontSets';
  static defaultDefinition = Object.freeze({
    name: 'LegsFrontSets',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  constructor(options = {}) {
    super(options);
    if (options.parts !== undefined) return;
    super.parts.add(new FirstSetFrontLegs());
    super.parts.add(new SecondSetFrontLegs());
  }
}

/** @extends {Collection<LegsFrontSets>} */
export class LegsFrontSetsParts extends Collection {}
