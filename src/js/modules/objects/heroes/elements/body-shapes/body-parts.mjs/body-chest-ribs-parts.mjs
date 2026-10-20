import { Collection } from '../../../../collection.mjs';
import { BodyPart } from './body-parts.mjs';

export class BodyChestRibs extends BodyPart {
  static defaultName = 'Body Chest Ribs';
  static defaultDefinition = Object.freeze({
    name: 'Body Chest Ribs',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
}

/** @extends {Collection<BodyChestRibs>} */
export class BodyChestRibsParts extends Collection {}
