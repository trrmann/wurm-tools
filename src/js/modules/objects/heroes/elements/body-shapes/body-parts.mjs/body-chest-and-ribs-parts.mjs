import { Collection } from '../../../../collection.mjs';
import { CompoundBodyPart } from './compound-parts.mjs';
import { MainBody } from './body-main-parts.mjs';
import { Chest } from './chest-parts.mjs';
import { Ribs } from './ribs-parts.mjs';
export class BodyChestAndRibs extends CompoundBodyPart {
  static defaultName = 'Body Chest And Ribs';
  static defaultDefinition = Object.freeze({
    name: 'Body Chest And Ribs',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  constructor(options = {}) {
    super(options);
    if (options.parts !== undefined) return;
    super.parts.add(new MainBody());
    super.parts.add(new Chest());
    super.parts.add(new Ribs());
  }
}

/** @extends {Collection<BodyChestAndRibs>} */
export class BodyChestAndRibsParts extends Collection {}
