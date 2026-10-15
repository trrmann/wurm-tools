import { MentalObject } from './mental-objects.mjs';
import { Ego } from '../characteristics/primary/ego.mjs';
import { EgoCombatValue } from '../characteristics/figured/combat-value-ego.mjs';
import { MentalDefense } from '../characteristics/figured/defense-mental.mjs';

export class SentientObject extends MentalObject {
    constructor({points=0,basePoints=0,maxDisadvantagePoints=0,maxPointsFromAnyOneTypeOfDisadvantage=0} = {}) {
        super({points:points,basePoints:basePoints,maxDisadvantagePoints: maxDisadvantagePoints,maxPointsFromAnyOneTypeOfDisadvantage: maxPointsFromAnyOneTypeOfDisadvantage});
        this.characteristics().Add(new Ego({points: 10}));
        this.characteristics().Add(new EgoCombatValue({points: 0}));
        this.characteristics().Add(new MentalDefense({points: 0}));
    }
}
