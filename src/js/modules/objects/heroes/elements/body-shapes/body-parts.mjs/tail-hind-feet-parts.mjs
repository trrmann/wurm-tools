import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class TailHindFeet extends BodyPart {
  static defaultName = 'TailHindFeet';
  static defaultDefinition = Object.freeze({
    name: 'TailHindFeet',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<TailHindFeet>} */
export class TailHindFeetParts extends Collection {}
