import { Character } from './physical-living-mobile-sentient-objects.mjs';
import { Collection } from '../../../../collection.mjs';

export class StandardHeroicCharacter extends Character {
  constructor({ points = 0 } = {}) {
    super({
      points: points,
      basePoints: 75,
      maxDisadvantagePoints: 75,
      maxPointsFromAnyOneTypeOfDisadvantage: 25,
    });
  }
}
/** @extends {Collection<StandardHeroicCharacter>} */
export class StandardHeroicCharacters extends Collection {}
