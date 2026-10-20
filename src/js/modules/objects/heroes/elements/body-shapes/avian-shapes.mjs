import { Collection } from '../../../collection.mjs';
import { BodyShape } from './body-shapes.mjs';
import { Head } from './body-parts.mjs/head-parts.mjs';
import { Wings } from './body-parts.mjs/wings-parts.mjs';
import { BodyChestRibs } from './body-parts.mjs/body-chest-ribs-parts.mjs';
import { Stomach } from './body-parts.mjs/stomach-parts.mjs';
import { Vitals } from './body-parts.mjs/vitals-parts.mjs';
import { Legs } from './body-parts.mjs/legs-parts.mjs';
import { Tail } from './body-parts.mjs/tail-parts.mjs';

export class Avian extends BodyShape {
  static defaultName = 'Avian';
  static defaultDefinition = Object.freeze({
    name: 'Avian',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });

  constructor(options = {}) {
    super(options);
    this.parts.length = 0;
    this.parts.add(new Head());
    this.parts.add(new Wings());
    this.parts.add(new BodyChestRibs());
    this.parts.add(new Stomach());
    this.parts.add(new Vitals());
    this.parts.add(new Legs());
    this.parts.add(new Tail());
    this.restoreParts(options.parts);
  }
}

/** @extends {Collection<Avian>} */
export class AvianShapes extends Collection {}
