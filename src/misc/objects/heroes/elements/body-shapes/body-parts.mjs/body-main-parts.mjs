import { Collection } from '../../../../collection.mjs';
import { CompoundBodyPart } from './compound-parts.mjs';
import { UpperBody } from './body-upper-parts.mjs';
import { MiddleBody } from './body-middle-parts.mjs';
import { LowerBody } from './body-lower-parts.mjs';

export class MainBody extends CompoundBodyPart {
  static defaultName = 'Main Body';
  static defaultDefinition = Object.freeze({
    name: 'Main Body',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  constructor() {
    super();
    super.parts.add(new UpperBody());
    super.parts.add(new MiddleBody());
    super.parts.add(new LowerBody());
  }
}

/** @extends {Collection<MainBody>} */
export class MainBodyParts extends Collection {}
