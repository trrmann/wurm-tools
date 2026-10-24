import { Collection } from '../../../collection.mjs';
import { BodyShape } from './body-shapes.mjs';
import { Head } from './body-parts.mjs/head-parts.mjs';
import { Hands } from './body-parts.mjs/hands-parts.mjs';
import { Arms } from './body-parts.mjs/arms-parts.mjs';
import { Shoulders } from './body-parts.mjs/shoulders-parts.mjs';
import { Chest } from './body-parts.mjs/chest-parts.mjs';
import { Stomach } from './body-parts.mjs/stomach-parts.mjs';
import { Vitals } from './body-parts.mjs/vitals-parts.mjs';
import { Thighs } from './body-parts.mjs/thighs-parts.mjs';
import { Legs } from './body-parts.mjs/legs-parts.mjs';
import { Feet } from './body-parts.mjs/feet-parts.mjs';

export class Humanoid extends BodyShape {
  static defaultName = 'Humanoid';
  static defaultDefinition = Object.freeze({
    name: 'Humanoid',
    generalShape: 'Humanoid',
    shapeTypes: ['humanoid', 'bipedal'],
  });

  constructor(options = {}) {
    super(options);
    this.parts.length = 0;
    this.parts.add(new Head());
    this.parts.add(new Hands());
    this.parts.add(new Arms());
    this.parts.add(new Shoulders());
    this.parts.add(new Chest());
    this.parts.add(new Stomach());
    this.parts.add(new Vitals());
    this.parts.add(new Thighs());
    this.parts.add(new Legs());
    this.parts.add(new Feet());
    this.restoreParts(options.parts);
  }
}

/** @extends {Collection<Humanoid>} */
export class HumanoidShapes extends Collection {}
