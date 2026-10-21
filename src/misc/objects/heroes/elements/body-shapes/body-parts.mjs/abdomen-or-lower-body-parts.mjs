import { Collection } from '../../../../collection.mjs';
import { CompoundBodyPart } from './compound-parts.mjs';
import { Abdomen } from './abdomen-parts.mjs';
import { LowerBody } from './body-lower-parts.mjs';
export class AbdomenOrLowerBody extends CompoundBodyPart {
  static defaultName = 'AbdomenOrLowerBody';
  static defaultDefinition = Object.freeze({
    name: 'AbdomenOrLowerBody',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  constructor() {
    super();
    super.parts.add(new Abdomen());
    super.parts.add(new LowerBody());
  }
}

/** @extends {Collection<AbdomenOrLowerBody>} */
export class AbdomenOrLowerBodyParts extends Collection {}
