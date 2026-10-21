import { Collection } from '../../../../collection.mjs';
import { CompoundBodyPart } from './compound-parts.mjs';
import { Flanks } from './flanks-parts.mjs';
import { Spine } from './spine-parts.mjs';

export class SpineAndFlank extends CompoundBodyPart {
  static defaultName = 'Spine Flank';
  static defaultDefinition = Object.freeze({
    name: 'Spine Flank',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  constructor() {
    super();
    super.parts.add(new Flanks());
    super.parts.add(new Spine());
  }
}

/** @extends {Collection<SpineFlank>} */
export class SpineFlankParts extends Collection {}
