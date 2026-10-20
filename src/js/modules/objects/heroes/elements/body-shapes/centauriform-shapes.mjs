import { Collection } from '../../../collection.mjs';
import { BodyShape } from './body-shapes.mjs';
import { Head } from './body-parts.mjs/head-parts.mjs';
import { Hands } from './body-parts.mjs/hands-parts.mjs';
import { Arms } from './body-parts.mjs/arms-parts.mjs';
import { SpineFlank } from './body-parts.mjs/spine-flank-parts.mjs';
import { BodyChestRibs } from './body-parts.mjs/body-chest-ribs-parts.mjs';
import { Hindquarters } from './body-parts.mjs/hindquarters-parts.mjs';
import { Vitals } from './body-parts.mjs/vitals-parts.mjs';
import { ThighsRump } from './body-parts.mjs/thighs-rump-parts.mjs';
import { BackLegs } from './body-parts.mjs/back-legs-parts.mjs';
import { TailHindFeet } from './body-parts.mjs/tail-hind-feet-parts.mjs';

export class Centauriform extends BodyShape {
  static defaultName = 'Centauriform';
  static defaultDefinition = Object.freeze({
    name: 'Centauriform',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });

  constructor(options = {}) {
    super(options);
    this.parts.length = 0;
    this.parts.add(new Head());
    this.parts.add(new Hands());
    this.parts.add(new Arms());
    this.parts.add(new SpineFlank());
    this.parts.add(new BodyChestRibs());
    this.parts.add(new Hindquarters());
    this.parts.add(new Vitals());
    this.parts.add(new ThighsRump());
    this.parts.add(new BackLegs());
    this.parts.add(new TailHindFeet());
    this.restoreParts(options.parts);
  }
}

/** @extends {Collection<Centauriform>} */
export class CentauriformShapes extends Collection {}
