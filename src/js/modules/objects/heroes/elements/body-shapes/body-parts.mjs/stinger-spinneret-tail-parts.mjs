import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class StingerSpinneretTail extends BodyPart {
  static defaultName = 'Stinger/Spinneret Tail';
  static defaultDefinition = Object.freeze({
    name: 'Stinger/Spinneret Tail',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<StingerSpinneretTail>} */
export class StingerSpinneretTailParts extends Collection {}
