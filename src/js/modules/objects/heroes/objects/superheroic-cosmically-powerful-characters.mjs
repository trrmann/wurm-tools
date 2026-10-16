import { Character } from './physical-living-mobile-sentient-objects.mjs';
import { Collection } from '../../../../collection.mjs';
export class CosmicallyPowerfulSuperheroicCharacter extends Character {
    constructor({points=0} = {}) {
        super({points:points,basePoints:500,maxDisadvantagePoints: 200,maxPointsFromAnyOneTypeOfDisadvantage: 75});
    }
}
/** @extends {Collection<CosmicallyPowerfulSuperheroicCharacter>} */
export class CosmicallyPowerfulSuperheroicCharacters extends Collection {

}