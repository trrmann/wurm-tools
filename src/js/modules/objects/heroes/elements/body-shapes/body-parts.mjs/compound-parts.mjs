import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class CompoundBodyPart extends BodyPart {
  static defaultName = 'Compound Body Part';
  static defaultDefinition = Object.freeze({
    name: 'Compound Body Part',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  static get requiresLibrary() {
    return this === CompoundBodyPart;
  }
}

/** @extends {Collection<CompoundBodyPart>} */
export class CompoundBodyParts extends Collection {}
