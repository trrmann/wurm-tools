import { Collection } from '../../../collection.mjs';
import { BodyShape } from './body-shapes.mjs';
import { Top } from './body-parts.mjs/top-parts.mjs';
import { Bottom } from './body-parts.mjs/bottom-parts.mjs';
import { Left } from './body-parts.mjs/left-parts.mjs';
import { Right } from './body-parts.mjs/right-parts.mjs';
import { Center } from './body-parts.mjs/center-parts.mjs';

export class RectangularParallelepiped extends BodyShape {
  static defaultName = 'Rectangular Parallelepiped';
  static defaultDefinition = Object.freeze({
    name: 'Rectangular Parallelepiped',
    generalShape: 'Box',
    shapeTypes: ['box'],
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

/** @extends {Collection<RectangularParallelepiped>} */
export class RectangularParallelepipedShapes extends Collection {}
