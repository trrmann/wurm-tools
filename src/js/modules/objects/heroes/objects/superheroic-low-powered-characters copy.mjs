import { Character } from './physical-living-mobile-sentient-objects.mjs';

export class LowPoweredSuperheroicCharacter extends Character {
    constructor({points=0} = {}) {
        super({points:points,basePoints:150,maxDisadvantagePoints: 100,maxPointsFromAnyOneTypeOfDisadvantage: 50});
    }
}
