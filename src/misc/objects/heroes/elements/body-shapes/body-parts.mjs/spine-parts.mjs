import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class Spine extends BodyPart {
  static defaultName = 'Spine';
  static defaultDefinition = Object.freeze({
    name: 'Spine',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<Spine>} */
export class SpineParts extends Collection {}
