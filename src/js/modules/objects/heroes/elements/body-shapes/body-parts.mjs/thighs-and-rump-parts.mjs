import { Collection } from '../../../../collection.mjs';
import { CompoundBodyPart } from './compound-parts.mjs';
import { Thighs } from './thighs-parts.mjs';
import { Rump } from './rump-parts.mjs';

export class ThighsAndRump extends CompoundBodyPart {
  static defaultName = 'ThighsRump';
  static defaultDefinition = Object.freeze({
    name: 'ThighsRump',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  constructor(options = {}) {
    super(options);
    if (options.parts !== undefined) return;
    super.parts.add(new Thighs());
    super.parts.add(new Rump());
  }
}

/** @extends {Collection<ThighsRump>} */
export class ThighsRumpParts extends Collection {}
