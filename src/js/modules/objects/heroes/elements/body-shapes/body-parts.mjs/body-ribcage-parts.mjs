import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class BodyRibcage extends BodyPart {
  static defaultName = 'Body Ribcage';
  static defaultDefinition = Object.freeze({
    name: 'Body Ribcage',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<BodyRibcage>} */
export class BodyRibcageParts extends Collection {}
