import { Character } from './physical-living-mobile-sentient-objects.mjs';
import { Collection } from '../../../../collection.mjs';
export class StandardSuperheroicCharacter extends Character {
  constructor({ points = 0 } = {}) {
    super({
      points: points,
      basePoints: 200,
      maxDisadvantagePoints: 150,
      maxPointsFromAnyOneTypeOfDisadvantage: 50,
    });
  }
}
/** @extends {Collection<StandardSuperheroicCharacter>} */
export class StandardSuperheroicCharacters extends Collection {}
