import { Character } from './physical-living-mobile-sentient-objects.mjs';
import { Collection } from '../../../../collection.mjs';

export class SkilledNormalCharacter extends Character {
  constructor({ points = 0 } = {}) {
    super({
      points: points,
      basePoints: 25,
      maxDisadvantagePoints: 25,
      maxPointsFromAnyOneTypeOfDisadvantage: 25,
    });
  }
}
/** @extends {Collection<SkilledNormalCharacter>} */
export class SkilledNormalCharacters extends Collection {}
