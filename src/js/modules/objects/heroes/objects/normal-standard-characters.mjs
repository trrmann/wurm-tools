import { Character } from './physical-living-mobile-sentient-objects.mjs';

export class StandardNormalCharacter extends Character {
    constructor({points=0} = {}) {
        super({points:points,basePoints:0,maxDisadvantagePoints: 25,maxPointsFromAnyOneTypeOfDisadvantage: 25});
    }
}
