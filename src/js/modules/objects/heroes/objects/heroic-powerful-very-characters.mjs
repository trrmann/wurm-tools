import { Character } from './physical-living-mobile-sentient-objects.mjs';
import { Collection } from '../../../../collection.mjs';
export class VeryPowerfulHeroicCharacter extends Character {
    constructor({points=0} = {}) {
        super({points:points,basePoints:125,maxDisadvantagePoints: 125,maxPointsFromAnyOneTypeOfDisadvantage: 40});
    }
}
/** @extends {Collection<VeryPowerfulHeroicCharacter>} */
export class VeryPowerfulHeroicCharacters extends Collection {

}