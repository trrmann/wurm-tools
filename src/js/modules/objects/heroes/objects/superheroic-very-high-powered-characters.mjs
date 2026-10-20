import { Character } from './physical-living-mobile-sentient-objects.mjs';
import { Collection } from '../../../../collection.mjs';

export class VeryHighPoweredSuperheroicCharacter extends Character {
  constructor({ points = 0 } = {}) {
    super({
      points: points,
      basePoints: 400,
      maxDisadvantagePoints: 200,
      maxPointsFromAnyOneTypeOfDisadvantage: 75,
    });
  }
}
/** @extends {Collection<VeryHighPoweredSuperheroicCharacter>} */
export class VeryHighPoweredSuperheroicCharacters extends Collection {}
