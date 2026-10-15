import { GameObject } from './game-object.mjs';
import { Body } from '../characteristics/primary/body.mjs';
import { Defense } from '../characteristics/figured/defense.mjs';

export class PhysicalObject extends GameObject {
    constructor({points=0,basePoints=0,maxDisadvantagePoints=0,maxPointsFromAnyOneTypeOfDisadvantage=0} = {}) {
        super({points:points,basePoints:basePoints,maxDisadvantagePoints: maxDisadvantagePoints,maxPointsFromAnyOneTypeOfDisadvantage: maxPointsFromAnyOneTypeOfDisadvantage});
        this.characteristics().Add(new Body({points: 0}));
        this.characteristics().Add(new Defense({points: 0}));
        this.sizePower = 0;            // Scale and volume metric        
        this.structuralState = 'Intact';
    }

    takeDamage(amount) {
        const netDamage = Math.max(0, amount - this.characteristics().Get('Defense').Value());
        if (netDamage <= 0) return;

        this.characteristics().Get('Body').SetValue(Math.max(0, this.characteristics().Get('Body').Value() - netDamage));
        this.updateStructuralState();
    }

    updateStructuralState() {
        const ratio = this.characteristics().Get('Body').Value() / this.characteristics().Get('Body').BaseValue();
        if (ratio <= 0) {
            this.structuralState = 'Broken';
            this.onBreak();
        } else if (ratio <= 0.25) {
            this.structuralState = 'Fractured';
        } else if (ratio <= 0.75) {
            this.structuralState = 'Damaged';
        } else {
            this.structuralState = 'Intact';
        }
    }

    onBreak() {}
}