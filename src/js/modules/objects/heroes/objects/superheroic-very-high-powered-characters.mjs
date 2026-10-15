import { Character } from './physical-living-mobile-sentient-objects.mjs';

export class VeryHighPoweredSuperheroicCharacter extends Character {
    constructor({points=0} = {}) {
        super({points:points,basePoints:400,maxDisadvantagePoints: 200,maxPointsFromAnyOneTypeOfDisadvantage: 75});
    }
}
