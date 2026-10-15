import { Character } from './physical-living-mobile-sentient-objects.mjs';

export class StandardHeroicCharacter extends Character {
    constructor({points=0} = {}) {
        super({points:points,basePoints:75,maxDisadvantagePoints: 75,maxPointsFromAnyOneTypeOfDisadvantage: 25});
    }
}
