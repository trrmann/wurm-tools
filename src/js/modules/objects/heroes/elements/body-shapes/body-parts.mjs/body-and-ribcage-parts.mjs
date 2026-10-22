import { Collection } from '../../../../collection.mjs';
import { CompoundBodyPart } from './compound-parts.mjs';
import { MainBody } from './body-main-parts.mjs';
import { Ribs } from './ribs-parts.mjs';

export class BodyAndRibcage extends CompoundBodyPart {
  static defaultName = 'Body And Ribcage';
  static defaultDefinition = Object.freeze({
    name: 'Body And Ribcage',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  constructor(options = {}) {
    super(options);
    if (options.parts !== undefined) return;
    super.parts.add(new MainBody());
    super.parts.add(new Ribs());
  }
}

/** @extends {Collection<BodyAndRibcage>} */
export class BodyAndRibcageParts extends Collection {}
