import { Character } from './physical-living-mobile-sentient-objects.mjs';

export class PowerfulHeroicCharacter extends Character {
    constructor({points=0} = {}) {
        super({points:points,basePoints:100,maxDisadvantagePoints: 100,maxPointsFromAnyOneTypeOfDisadvantage: 25});
    }
}
