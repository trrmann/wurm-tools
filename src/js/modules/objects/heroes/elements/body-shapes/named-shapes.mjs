import { Collection } from '../../../collection.mjs';
import { BodyShape } from './body-shapes.mjs';
import { Centauriform } from './centauriform-shapes.mjs';
import { Humanoid } from './humanoid-shapes.mjs';
import { Quadruped } from './quadruped-shapes.mjs';
import { RectangularParallelepiped } from './rectangular-parallelepiped-shapes.mjs';

export class Bipedal extends Humanoid {
  static defaultName = 'Bipedal';
  static defaultDefinition = Object.freeze({
    name: 'Bipedal',
    generalShape: 'Bipedal',
    shapeTypes: ['bipedal'],
  });
}

export class Equestrian extends Centauriform {
  static defaultName = 'Equestrian';
  static defaultDefinition = Object.freeze({
    name: 'Equestrian',
    generalShape: 'Equestrian',
    shapeTypes: ['equestrian'],
  });
}

export class Canine extends Quadruped {
  static defaultName = 'Canine';
  static defaultDefinition = Object.freeze({
    name: 'Canine',
    generalShape: 'Canine',
    shapeTypes: ['quadrupedal', 'canine'],
  });
}

export class Feline extends Quadruped {
  static defaultName = 'Feline';
  static defaultDefinition = Object.freeze({
    name: 'Feline',
    generalShape: 'Feline',
    shapeTypes: ['quadrupedal', 'feline'],
  });
}

export class Limbless extends BodyShape {
  static defaultName = 'Limbless';
  static defaultDefinition = Object.freeze({
    name: 'Limbless',
    generalShape: 'Limbless',
    shapeTypes: ['limbless'],
  });
}

export class Vehicle extends RectangularParallelepiped {
  static defaultName = 'Vehicle';
  static defaultDefinition = Object.freeze({
    name: 'Vehicle',
    generalShape: 'Vehicle',
    shapeTypes: ['vehicle', 'box'],
  });
}

export class SurfaceArea extends BodyShape {
  static defaultName = 'Surface Area';
  static defaultDefinition = Object.freeze({
    name: 'Surface Area',
    generalShape: 'Surface Area',
    shapeTypes: ['surface-area', 'base', 'city/town'],
  });
}

/** @extends {Collection<BodyShape>} */
export class NamedBodyShapes extends Collection {}
