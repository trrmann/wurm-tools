import { Character } from './physical-living-mobile-sentient-objects.mjs';

export class HighPoweredSuperheroicCharacter extends Character {
    constructor({points=0} = {}) {
        super({points:points,basePoints:300,maxDisadvantagePoints: 150,maxPointsFromAnyOneTypeOfDisadvantage: 60});
    }
}
