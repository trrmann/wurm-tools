import { Collection } from '../../../../collection.mjs';
import { CompoundBodyPart } from './compound-parts.mjs';
import { Antennae } from './antennae-parts.mjs';
import { Mandibles } from './mandibles-parts.mjs';

export class AntennaeAndOrMandibles extends CompoundBodyPart {
  static defaultName = 'AntennaeAndOrMandibles';
  static defaultDefinition = Object.freeze({
    name: 'AntennaeAndOrMandibles',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  constructor(options = {}) {
    super(options);
    if (options.parts !== undefined) return;
    super.parts.add(new Antennae());
    super.parts.add(new Mandibles());
  }
}

/** @extends {Collection<AntennaeAndOrMandibles>} */
export class AntennaeAndOrMandiblesParts extends Collection {}
