import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class Thorax extends BodyPart {
  static defaultName = 'Thorax';
  static defaultDefinition = Object.freeze({
    name: 'Thorax',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<Thorax>} */
export class ThoraxParts extends Collection {}
