import { GameObject } from '../game-objects.mjs';
import { Constitution } from '../characteristics/primary/constitution.mjs';
import { EnergyDefense } from '../characteristics/figured/combat-value-defensive.mjs';
import { Recovery } from '../characteristics/figured/recovery.mjs';
export class LivingObject extends GameObject {
    constructor({points=0,basePoints=0,maxDisadvantagePoints=0,maxPointsFromAnyOneTypeOfDisadvantage=0} = {}) {
        super({points:points,basePoints:basePoints,maxDisadvantagePoints: maxDisadvantagePoints,maxPointsFromAnyOneTypeOfDisadvantage: maxPointsFromAnyOneTypeOfDisadvantage});
        this.characteristics().Add(new Constitution({points: 0}));
        this.characteristics().Add(new EnergyDefense({points: 0}));
        this.characteristics().Add(new Recovery({points: 0}));
        this.isAlive = true;
    }

    onBreak() {
        this.isAlive = false;
    }
}

