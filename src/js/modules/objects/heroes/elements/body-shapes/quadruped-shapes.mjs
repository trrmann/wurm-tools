import { Collection } from '../../../collection.mjs';
import { BodyShape } from './body-shapes.mjs';
import { Head } from './body-parts.mjs/head-parts.mjs';
import { ForepawsOrFrontFeet } from './body-parts.mjs/forepaws-or-front-feet-parts.mjs';
import { FrontLegs } from './body-parts.mjs/legs-front-parts.mjs';
import { SpineAndFlank } from './body-parts.mjs/spine-and-flank-parts.mjs';
import { BodyAndRibcage } from './body-parts.mjs/body-and-ribcage-parts.mjs';
import { Hindquarters } from './body-parts.mjs/hindquarters-parts.mjs';
import { Vitals } from './body-parts.mjs/vitals-parts.mjs';
import { ThighsAndRump } from './body-parts.mjs/thighs-and-rump-parts.mjs';
import { BackLegs } from './body-parts.mjs/legs-back-parts.mjs';
import { TailAndHindFeet } from './body-parts.mjs/tail-and-hind-feet-parts.mjs';

export class Quadruped extends BodyShape {
  static defaultName = 'Quadruped';
  static defaultDefinition = Object.freeze({
    name: 'Quadruped',
    generalShape: 'Quadruped',
    shapeTypes: ['quadrupedal'],
  });

  constructor(options = {}) {
    super(options);
    this.parts.length = 0;
    this.parts.add(new Head());
    this.parts.add(new ForepawsOrFrontFeet());
    this.parts.add(new FrontLegs());
    this.parts.add(new SpineAndFlank());
    this.parts.add(new BodyAndRibcage());
    this.parts.add(new Hindquarters());
    this.parts.add(new Vitals());
    this.parts.add(new ThighsAndRump());
    this.parts.add(new BackLegs());
    this.parts.add(new TailAndHindFeet());
    this.restoreParts(options.parts);
  }
}

/** @extends {Collection<Quadruped>} */
export class QuadrupedShapes extends Collection {}
