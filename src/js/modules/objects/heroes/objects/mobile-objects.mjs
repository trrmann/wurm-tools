import { GameObject } from './game-objects.mjs';
import { Strength } from '../elements/characteristics/primary-characteristics/strength-characteristics.mjs';
import { Dexterity } from '../elements/characteristics/primary-characteristics/dexterity-characteristics.mjs';
import { Presence } from '../elements/characteristics/primary-characteristics/presence-characteristics.mjs';
import { Speed } from '../elements/characteristics/primary-characteristics/speed-characteristics.mjs';
import { Endurance } from '../elements/characteristics/primary-characteristics/endurance-characteristics.mjs';
import { OffensiveCombatValue } from '../elements/characteristics/figured-characteristics/offensive-combat-values.mjs';
import { DefensiveCombatValue } from '../elements/characteristics/figured-characteristics/defensive-combat-values.mjs';
import { PhysicalDefense } from '../elements/characteristics/figured-characteristics/physical-defense-characteristics.mjs';
// TODO - movement is not a characteristic, instead they are covered in movement powers
// TODO - need to track effective current Endurance and allow actions to spend it, need a refuel ability, that if alive can use recovery otherwise needs a fuel to refill - verify the rules on this
// TODO - need to track effective current Strength, Dexterity, and Speed.
// TODO - Presense does not belong here - non-mobile, non-living, non-mental, and non-scentient objects also have presense.  the question is what doesn't - does this belong with comeliness in the game-object?
import { Run } from '../elements/characteristics/primary-characteristics/run-characteristics.mjs';
import { Swim } from '../elements/characteristics/primary-characteristics/swim-characteristics.mjs';
import { VerticalJump } from '../elements/characteristics/figured/jump-vertical.mjs';
import { HorizontalJump } from '../elements/characteristics/figured/jump-horizontal.mjs';
import { Collection } from '../../../../collection.mjs';
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
/** @extends {Collection<MobileObject>} */
export class MobileObjects extends Collection {

}