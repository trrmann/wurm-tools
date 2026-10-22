import { Collection } from '../../../../collection.mjs';
import { CompoundBodyPart } from './compound-parts.mjs';
import { LeftHindquarter } from './hindquarter-left-parts.mjs';
import { RightHindquarter } from './hindquarter-right-parts.mjs';

export class Hindquarters extends CompoundBodyPart {
  static defaultName = 'Hindquarters';
  static defaultDefinition = Object.freeze({
    name: 'Hindquarters',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  constructor(options = {}) {
    super(options);
    if (options.parts !== undefined) return;
    super.parts.add(new LeftHindquarter());
    super.parts.add(new RightHindquarter());
  }
}

/** @extends {Collection<Hindquarters>} */
export class HindquartersParts extends Collection {}
