import { Collection } from '../../../collection.mjs';
import { BodyShape } from './body-shapes.mjs';
import { Head } from './body-parts.mjs/head-parts.mjs';
import { Hands } from './body-parts.mjs/hands-parts.mjs';
import { Arms } from './body-parts.mjs/arms-parts.mjs';
import { SpineAndFlank } from './body-parts.mjs/spine-and-flank-parts.mjs';
import { BodyChestAndRibs } from './body-parts.mjs/body-chest-and-ribs-parts.mjs';
import { Hindquarters } from './body-parts.mjs/hindquarters-parts.mjs';
import { Vitals } from './body-parts.mjs/vitals-parts.mjs';
import { ThighsAndRump } from './body-parts.mjs/thighs-and-rump-parts.mjs';
import { BackLegs } from './body-parts.mjs/legs-back-parts.mjs';
import { TailAndHindFeet } from './body-parts.mjs/tail-and-hind-feet-parts.mjs';

export class Centauriform extends BodyShape {
  static defaultName = 'Centauriform';
  static defaultDefinition = Object.freeze({
    name: 'Centauriform',
    generalShape: 'Equestrian',
    shapeTypes: ['equestrian'],
  });

  constructor(options = {}) {
    super(options);
    this.parts.length = 0;
    this.parts.add(new Head());
    this.parts.add(new Hands());
    this.parts.add(new Arms());
    this.parts.add(new SpineAndFlank());
    this.parts.add(new BodyChestAndRibs());
    this.parts.add(new Hindquarters());
    this.parts.add(new Vitals());
    this.parts.add(new ThighsAndRump());
    this.parts.add(new BackLegs());
    this.parts.add(new TailAndHindFeet());
    this.restoreParts(options.parts);
  }
}

/** @extends {Collection<Centauriform>} */
export class CentauriformShapes extends Collection {}
