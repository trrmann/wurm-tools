import { Character } from './physical-living-mobile-sentient-objects.mjs';
import { Collection } from '../../../../collection.mjs';
export class PowerfulHeroicCharacter extends Character {
    constructor({points=0} = {}) {
        super({points:points,basePoints:100,maxDisadvantagePoints: 100,maxPointsFromAnyOneTypeOfDisadvantage: 25});
    }
}
/** @extends {Collection<PowerfulHeroicCharacter>} */
export class PowerfulHeroicCharacters extends Collection {

}