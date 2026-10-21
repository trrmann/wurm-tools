import { Collection } from '../../../../collection.mjs';
import { CompoundBodyPart } from './compound-parts.mjs';
import { FirstSetRearLegs } from './legs-rear-first-set-parts.mjs';
import { SecondSetRearLegs } from './legs-rear-second-set-parts.mjs';

export class LegsRearSets extends CompoundBodyPart {
  static defaultName = 'Legs Rear Sets';
  static defaultDefinition = Object.freeze({
    name: 'Legs Rear Sets',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  constructor() {
    super();
    super.parts.add(new FirstSetRearLegs());
    super.parts.add(new SecondSetRearLegs());
  }
}

/** @extends {Collection<LegsRearSets>} */
export class LegsRearSetsParts extends Collection {}
