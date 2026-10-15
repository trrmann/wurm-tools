import { Character } from './physical-living-mobile-sentient-objects.mjs';

export class IncompetentNormalCharacter extends Character {
    constructor({points=0} = {}) {
        super({points:points,basePoints:-25,maxDisadvantagePoints: 25,maxPointsFromAnyOneTypeOfDisadvantage: 25});
    }
}
