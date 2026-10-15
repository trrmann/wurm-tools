import { PhysicalObject } from './physical-objects.mjs';
import { LivingObject } from './living-objects.mjs';
export class PhysicalLivingObject extends PhysicalObject {
    constructor({points=0,basePoints=0,maxDisadvantagePoints=0,maxPointsFromAnyOneTypeOfDisadvantage=0} = {}) {
        super({points:points,basePoints:basePoints,maxDisadvantagePoints: maxDisadvantagePoints,maxPointsFromAnyOneTypeOfDisadvantage: maxPointsFromAnyOneTypeOfDisadvantage});
        const livingObj = new LivingObject({points:points,basePoints:basePoints,maxDisadvantagePoints: maxDisadvantagePoints,maxPointsFromAnyOneTypeOfDisadvantage: maxPointsFromAnyOneTypeOfDisadvantage});
        livingObj.characteristics().GetAll().forEach(characteristic => {
            this.characteristics().Add(characteristic);
        });
    }
}