import { Collection } from '../../../collection.mjs';
import { BodyShape } from './body-shapes.mjs';
import { Head } from './body-parts.mjs/head-parts.mjs';
import { AntennaeMandibles } from './body-parts.mjs/antennae-mandibles-parts.mjs';
import { LegsFrontSets } from './body-parts.mjs/legs-front-sets-parts.mjs';
import { ThoraxUpperBody } from './body-parts.mjs/thorax-upper-body-parts.mjs';
import { AbdomenLowerBody } from './body-parts.mjs/abdomen-lower-body-parts.mjs';
import { Vitals } from './body-parts.mjs/vitals-parts.mjs';
import { LegsRearSets } from './body-parts.mjs/legs-rear-sets-parts.mjs';
import { StingerSpinneretTail } from './body-parts.mjs/stinger-spinneret-tail-parts.mjs';

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
    this.parts.add(new AntennaeMandibles());
    this.parts.add(new LegsFrontSets());
    this.parts.add(new ThoraxUpperBody());
    this.parts.add(new AbdomenLowerBody());
    this.parts.add(new Vitals());
    this.parts.add(new LegsRearSets());
    this.parts.add(new StingerSpinneretTail());
    this.restoreParts(options.parts);
  }
}

/** @extends {Collection<Insectoid>} */
export class InsectoidShapes extends Collection {}
