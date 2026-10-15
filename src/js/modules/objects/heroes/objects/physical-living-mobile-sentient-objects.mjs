import { PhysicalLivingMobileObject } from './physical-living-mobile-objects.mjs';
import { SentientObject } from './sentient-objects.mjs';
export class PhysicalLivingMobileSentientObject extends PhysicalLivingMobileObject {
    constructor({points=0,basePoints=0,maxDisadvantagePoints=0,maxPointsFromAnyOneTypeOfDisadvantage=0} = {}) {
        super({points:points,basePoints:basePoints,maxDisadvantagePoints: maxDisadvantagePoints,maxPointsFromAnyOneTypeOfDisadvantage: maxPointsFromAnyOneTypeOfDisadvantage});
        const sentientObj = new SentientObject({points:points,basePoints:basePoints,maxDisadvantagePoints: maxDisadvantagePoints,maxPointsFromAnyOneTypeOfDisadvantage: maxPointsFromAnyOneTypeOfDisadvantage});
        sentientObj.characteristics().GetAll().forEach(characteristic => {
            this.characteristics().Add(characteristic);
        });
    }
}