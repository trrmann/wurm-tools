import { PhysicalLivingMobileSentientObject } from './physical-living-mobile-sentient-objects.mjs';

export class Character extends PhysicalLivingMobileSentientObject {
    constructor({points=0,basePoints=0,maxDisadvantagePoints=0,maxPointsFromAnyOneTypeOfDisadvantage=0} = {}) {
        super({points:points,basePoints:basePoints,maxDisadvantagePoints: maxDisadvantagePoints,maxPointsFromAnyOneTypeOfDisadvantage: maxPointsFromAnyOneTypeOfDisadvantage});
    }
}
