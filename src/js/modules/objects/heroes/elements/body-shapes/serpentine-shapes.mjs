import { Collection } from '../../../collection.mjs';
import { BodyShape } from './body-shapes.mjs';
import { Head } from './body-parts.mjs/head-parts.mjs';
import { UpperBody } from './body-parts.mjs/body-upper-parts.mjs';
import { MiddleBody } from './body-parts.mjs/body-middle-parts.mjs';
import { LowerBody } from './body-parts.mjs/body-lower-parts.mjs';
import { Vitals } from './body-parts.mjs/vitals-parts.mjs';
import { UpperTail } from './body-parts.mjs/tail-upper-parts.mjs';
import { LowerTailAndTip } from './body-parts.mjs/tail-lower-and-tip-parts.mjs';

export class Serpentine extends BodyShape {
  static defaultName = 'Serpentine';
  static defaultDefinition = Object.freeze({
    name: 'Serpentine',
    generalShape: 'Limbless',
    shapeTypes: ['limbless'],
  });

  constructor(options = {}) {
    super(options);
    this.parts.length = 0;
    this.parts.add(new Head());
    this.parts.add(new UpperBody());
    this.parts.add(new MiddleBody());
    this.parts.add(new LowerBody());
    this.parts.add(new Vitals());
    this.parts.add(new UpperTail());
    this.parts.add(new LowerTailAndTip());
    this.restoreParts(options.parts);
  }
}

/** @extends {Collection<Serpentine>} */
export class SerpentineShapes extends Collection {}
