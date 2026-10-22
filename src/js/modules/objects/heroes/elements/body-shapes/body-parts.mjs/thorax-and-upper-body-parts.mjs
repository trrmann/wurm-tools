import { Collection } from '../../../../collection.mjs';
import { CompoundBodyPart } from './compound-parts.mjs';
import { Thorax } from './thorax-parts.mjs';
import { UpperBody } from './body-upper-parts.mjs';

export class ThoraxAndUpperBody extends CompoundBodyPart {
  static defaultName = 'ThoraxAndUpperBody';
  static defaultDefinition = Object.freeze({
    name: 'ThoraxAndUpperBody',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  constructor(options = {}) {
    super(options);
    if (options.parts !== undefined) return;
    super.parts.add(new Thorax());
    super.parts.add(new UpperBody());
  }
}

/** @extends {Collection<ThoraxAndUpperBody>} */
export class ThoraxAndUpperBodyParts extends Collection {}
