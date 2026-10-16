import { Character } from './physical-living-mobile-sentient-objects.mjs';
import { Collection } from '../../../../collection.mjs';
export class LowPoweredSuperheroicCharacter extends Character {
    constructor({points=0} = {}) {
        super({points:points,basePoints:150,maxDisadvantagePoints: 100,maxPointsFromAnyOneTypeOfDisadvantage: 50});
    }
}
/** @extends {Collection<LowPoweredSuperheroicCharacter>} */
export class LowPoweredSuperheroicCharacters extends Collection {

}