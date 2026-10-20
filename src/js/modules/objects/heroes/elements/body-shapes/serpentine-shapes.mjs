import { Collection } from '../../../collection.mjs';
import { BodyShape } from './body-shapes.mjs';
import { Head } from './body-parts.mjs/head-parts.mjs';
import { UpperBody } from './body-parts.mjs/upper-body-parts.mjs';
import { MainBody } from './body-parts.mjs/main-body-parts.mjs';
import { LowerBody } from './body-parts.mjs/lower-body-parts.mjs';
import { Vitals } from './body-parts.mjs/vitals-parts.mjs';
import { UpperTail } from './body-parts.mjs/upper-tail-parts.mjs';
import { LowerTailTip } from './body-parts.mjs/lower-tail-tip-parts.mjs';

export class Serpentine extends BodyShape {
  static defaultName = 'Serpentine';
  static defaultDefinition = Object.freeze({
    name: 'Serpentine',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });

  constructor(options = {}) {
    super(options);
    this.parts.length = 0;
    this.parts.add(new Head());
    this.parts.add(new UpperBody());
    this.parts.add(new MainBody());
    this.parts.add(new LowerBody());
    this.parts.add(new Vitals());
    this.parts.add(new UpperTail());
    this.parts.add(new LowerTailTip());
    this.restoreParts(options.parts);
  }
}

/** @extends {Collection<Serpentine>} */
export class SerpentineShapes extends Collection {}
