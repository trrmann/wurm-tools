import { GameObject } from './game-objects.mjs';
import { Intelligence } from '../characteristics/primary/intelligence.mjs';
export class MentalObject extends GameObject {
    constructor({points=0,basePoints=0,maxDisadvantagePoints=0,maxPointsFromAnyOneTypeOfDisadvantage=0} = {}) {
        super({points:points,basePoints:basePoints,maxDisadvantagePoints: maxDisadvantagePoints,maxPointsFromAnyOneTypeOfDisadvantage: maxPointsFromAnyOneTypeOfDisadvantage});
        this.characteristics().Add(new Intelligence({points: 0}));
        this.isActive = true;
    }
    get perceptionRoll() {
        return this.characteristics().Get(Intelligence).GetCharacteristicAttribute('PerceptionRoll');
    }
}

