import { Character } from './physical-living-mobile-sentient-objects.mjs';

export class StandardSuperheroicCharacter extends Character {
    constructor({points=0} = {}) {
        super({points:points,basePoints:200,maxDisadvantagePoints: 150,maxPointsFromAnyOneTypeOfDisadvantage: 50});
    }
}
