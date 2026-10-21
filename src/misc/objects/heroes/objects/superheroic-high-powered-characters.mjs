import { Character } from './physical-living-mobile-sentient-objects.mjs';
import { Collection } from '../../../../collection.mjs';
export class HighPoweredSuperheroicCharacter extends Character {
  constructor({ points = 0 } = {}) {
    super({
      points: points,
      basePoints: 300,
      maxDisadvantagePoints: 150,
      maxPointsFromAnyOneTypeOfDisadvantage: 60,
    });
  }
}
/** @extends {Collection<HighPoweredSuperheroicCharacter>} */
export class HighPoweredSuperheroicCharacters extends Collection {}
