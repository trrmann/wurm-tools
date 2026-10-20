import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class ForepawsFrontFeet extends BodyPart {
  static defaultName = 'Forepaws Front Feet';
  static defaultDefinition = Object.freeze({
    name: 'Forepaws Front Feet',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<ForepawsFrontFeet>} */
export class ForepawsFrontFeetParts extends Collection {}
