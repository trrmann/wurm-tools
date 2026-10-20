import { Collection } from '../../../collection.mjs';
import { BodyShape } from './body-shapes.mjs';
import { Head } from './body-parts.mjs/head-parts.mjs';
import { ForepawsFrontFeet } from './body-parts.mjs/forepaws-front-feet-parts.mjs';
import { FrontLegs } from './body-parts.mjs/front-legs-parts.mjs';
import { SpineFlank } from './body-parts.mjs/spine-flank-parts.mjs';
import { BodyRibcage } from './body-parts.mjs/body-ribcage-parts.mjs';
import { Hindquarters } from './body-parts.mjs/hindquarters-parts.mjs';
import { Vitals } from './body-parts.mjs/vitals-parts.mjs';
import { ThighsRump } from './body-parts.mjs/thighs-rump-parts.mjs';
import { BackLegs } from './body-parts.mjs/back-legs-parts.mjs';
import { TailHindFeet } from './body-parts.mjs/tail-hind-feet-parts.mjs';

export class Quadruped extends BodyShape {
  static defaultName = 'Quadruped';
  static defaultDefinition = Object.freeze({
    name: 'Quadruped',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });

  constructor(options = {}) {
    super(options);
    this.parts.length = 0;
    this.parts.add(new Head());
    this.parts.add(new ForepawsFrontFeet());
    this.parts.add(new FrontLegs());
    this.parts.add(new SpineFlank());
    this.parts.add(new BodyRibcage());
    this.parts.add(new Hindquarters());
    this.parts.add(new Vitals());
    this.parts.add(new ThighsRump());
    this.parts.add(new BackLegs());
    this.parts.add(new TailHindFeet());
    this.restoreParts(options.parts);
  }
}

/** @extends {Collection<Quadruped>} */
export class QuadrupedShapes extends Collection {}
