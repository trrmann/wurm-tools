import { GameObject } from './game-objects.mjs';
import { Strength } from './strength.mjs';
import { Dexterity } from './dexterity.mjs';
import { Presence } from './presence.mjs';
import { Speed } from './speed.mjs';
import { Endurance } from './endurance.mjs';
import { OffensiveCombatValue } from './offensive-combat-value.mjs';
import { DefensiveCombatValue } from './defensive-combat-value.mjs';
import { PhysicalDefense } from './physical-defense.mjs';
import { Run } from '../elements/characteristics/primary/run.mjs';
import { Swim } from '../elements/characteristics/primary/swim.mjs';
import { VerticalJump } from '../elements/characteristics/figured/jump-vertical.mjs';
import { HorizontalJump } from '../elements/characteristics/figured/jump-horizontal.mjs';
export class MobileObject extends GameObject {
    constructor({points=0,basePoints=0,maxDisadvantagePoints=0,maxPointsFromAnyOneTypeOfDisadvantage=0} = {}) {
        super({points:points,basePoints:basePoints,maxDisadvantagePoints: maxDisadvantagePoints,maxPointsFromAnyOneTypeOfDisadvantage: maxPointsFromAnyOneTypeOfDisadvantage});
        this.characteristics().Add(new Strength({points:0}));
        this.characteristics().Add(new Dexterity({points:0}));
        this.characteristics().Add(new Presence({points:0}));
        this.characteristics().Add(new Speed({points:0}));
        this.characteristics().Add(new Endurance({points:0}));
        this.characteristics().Add(new OffensiveCombatValue({points:0}));
        this.characteristics().Add(new DefensiveCombatValue({points:0}));
        this.characteristics().Add(new PhysicalDefense({points:0}));
        this.characteristics().Add(new Run({points:0}));
        this.characteristics().Add(new Swim({points:0})); 
        this.characteristics().Add(new VerticalJump({points:0}));
        this.characteristics().Add(new HorizontalJump({points:0}));
        this.velocity = { x: 0, y: 0, z: 0 };
    }
    get maxLiftingCapacity() {
        if (this.str <= 0) return 0;
        return Math.round(100 * Math.pow(2, (this.str - 10) / 5));
    }

    move() {
        if (this.structuralState === 'Broken') return;
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        this.position.z += this.velocity.z;
    }
}
