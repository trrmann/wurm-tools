import { Collection } from '../../../../collection.mjs';
import { CompoundBodyPart } from './compound-parts.mjs';
import { Tail } from './tail-parts.mjs';
import { HindFeet } from './feet-hind-parts.mjs';

export class TailAndHindFeet extends CompoundBodyPart {
  static defaultName = 'Tail And Hind Feet';
  static defaultDefinition = Object.freeze({
    name: 'Tail And Hind Feet',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  constructor() {
    super();
    super.parts.add(new Tail());
    super.parts.add(new HindFeet());
  }
}

/** @extends {Collection<TailAndHindFeet>} */
export class TailAndHindFeetParts extends Collection {}
