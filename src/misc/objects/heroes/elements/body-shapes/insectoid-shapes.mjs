import { Collection } from '../../../collection.mjs';
import { BodyShape } from './body-shapes.mjs';
import { Head } from './body-parts.mjs/head-parts.mjs';
import { AntennaeAndOrMandibles } from './body-parts.mjs/antennae-and-or-mandibles-parts.mjs';
import { LegsFrontSets } from './body-parts.mjs/legs-front-sets-parts.mjs';
import { ThoraxAndUpperBody } from './body-parts.mjs/thorax-and-upper-body-parts.mjs';
import { AbdomenOrLowerBody } from './body-parts.mjs/abdomen-or-lower-body-parts.mjs';
import { Vitals } from './body-parts.mjs/vitals-parts.mjs';
import { LegsRearSets } from './body-parts.mjs/legs-rear-sets-parts.mjs';
import { StingerSpinneretAndOrTail } from './body-parts.mjs/stinger-spinneret-and-or-tail-parts.mjs';

export class Insectoid extends BodyShape {
  static defaultName = 'Insectoid';
  static defaultDefinition = Object.freeze({
    name: 'Insectoid',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });

  constructor(options = {}) {
    super(options);
    this.parts.length = 0;
    this.parts.add(new Head());
    this.parts.add(new AntennaeAndOrMandibles());
    this.parts.add(new LegsFrontSets());
    this.parts.add(new ThoraxAndUpperBody());
    this.parts.add(new AbdomenOrLowerBody());
    this.parts.add(new Vitals());
    this.parts.add(new LegsRearSets());
    this.parts.add(new StingerSpinneretAndOrTail());
    this.restoreParts(options.parts);
  }
}

/** @extends {Collection<Insectoid>} */
export class InsectoidShapes extends Collection {}
