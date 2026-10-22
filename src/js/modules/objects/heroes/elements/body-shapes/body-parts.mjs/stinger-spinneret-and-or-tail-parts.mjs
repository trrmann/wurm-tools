import { Collection } from '../../../../collection.mjs';
import { CompoundBodyPart } from './compound-parts.mjs';
import { Stinger } from './stinger-parts.mjs';
import { Spinneret } from './spinneret-parts.mjs';
import { Tail } from './tail-parts.mjs';

export class StingerSpinneretAndOrTail extends CompoundBodyPart {
  static defaultName = 'Stinger/Spinneret Tail';
  static defaultDefinition = Object.freeze({
    name: 'Stinger/Spinneret Tail',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  constructor(options = {}) {
    super(options);
    if (options.parts !== undefined) return;
    super.parts.add(new Stinger());
    super.parts.add(new Spinneret());
    super.parts.add(new Tail());
  }
}

/** @extends {Collection<StingerSpinneretTail>} */
export class StingerSpinneretTailParts extends Collection {}
