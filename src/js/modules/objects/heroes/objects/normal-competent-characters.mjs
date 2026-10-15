import { Character } from './physical-living-mobile-sentient-objects.mjs';

export class CompetentNormalCharacter extends Character {
    constructor({points=0} = {}) {
        super({points:points,basePoints:50,maxDisadvantagePoints: 50,maxPointsFromAnyOneTypeOfDisadvantage: 25});
    }
}
