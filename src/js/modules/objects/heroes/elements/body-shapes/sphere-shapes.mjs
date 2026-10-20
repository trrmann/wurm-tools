import { Collection } from '../../../collection.mjs';
import { Top } from './body-parts.mjs/top-parts.mjs';
import { Bottom } from './body-parts.mjs/bottom-parts.mjs';
import { Left } from './body-parts.mjs/left-parts.mjs';
import { Right } from './body-parts.mjs/right-parts.mjs';
import { Center } from './body-parts.mjs/center-parts.mjs';
import { Ellipsoid } from './ellipsoid-shapes.mjs';

export class Sphere extends Ellipsoid {
  static defaultName = 'Sphere';
  static defaultDefinition = Object.freeze({
    name: 'Sphere',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });

  constructor(options = {}) {
    super(options);
    this.parts.length = 0;
    this.parts.add(new Top());
    this.parts.add(new Bottom());
    this.parts.add(new Left());
    this.parts.add(new Right());
    this.parts.add(new Center());
    this.restoreParts(options.parts);
  }
}

/** @extends {Collection<Sphere>} */
export class SphereShapes extends Collection {}
