import { Collection } from '../../../../collection.mjs';
import { CompoundBodyPart } from './compound-parts.mjs';
import { Forepaws } from './forepaws-parts.mjs';
import { FrontFeet } from './feet-front-parts.mjs';

export class ForepawsOrFrontFeet extends CompoundBodyPart {
  static defaultName = 'Forepaws Or Front Feet';
  static defaultDefinition = Object.freeze({
    name: 'Forepaws Or Front Feet',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  constructor() {
    super();
    super.parts.add(new Forepaws());
    super.parts.add(new FrontFeet());
  }
}

/** @extends {Collection<ForepawsOrFrontFeet>} */
export class ForepawsOrFrontFeetParts extends Collection {}
