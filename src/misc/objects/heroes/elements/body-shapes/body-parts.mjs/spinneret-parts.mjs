import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class Spinneret extends BodyPart {
  static defaultName = 'Spinneret';
  static defaultDefinition = Object.freeze({
    name: 'Spinneret',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<Spinneret>} */
export class SpinneretParts extends Collection {}
