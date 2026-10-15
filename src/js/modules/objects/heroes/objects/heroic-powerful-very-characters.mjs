import { Character } from './physical-living-mobile-sentient-objects.mjs';

export class VeryPowerfulHeroicCharacter extends Character {
    constructor({points=0} = {}) {
        super({points:points,basePoints:125,maxDisadvantagePoints: 125,maxPointsFromAnyOneTypeOfDisadvantage: 40});
    }
}
