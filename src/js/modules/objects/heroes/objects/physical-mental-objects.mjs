import { PhysicalObject } from './physical-objects.mjs';
import { MentalObject } from './mental-objects.mjs';
export class PhysicalMentalObject extends PhysicalObject {
    constructor({points=0,basePoints=0,maxDisadvantagePoints=0,maxPointsFromAnyOneTypeOfDisadvantage=0} = {}) {
        super({points:points,basePoints:basePoints,maxDisadvantagePoints: maxDisadvantagePoints,maxPointsFromAnyOneTypeOfDisadvantage: maxPointsFromAnyOneTypeOfDisadvantage});
        const mentalObj = new MentalObject({points:points,basePoints:basePoints,maxDisadvantagePoints: maxDisadvantagePoints,maxPointsFromAnyOneTypeOfDisadvantage: maxPointsFromAnyOneTypeOfDisadvantage});
        mentalObj.characteristics().GetAll().forEach(characteristic => {
            this.characteristics().Add(characteristic);
        });
    }
}