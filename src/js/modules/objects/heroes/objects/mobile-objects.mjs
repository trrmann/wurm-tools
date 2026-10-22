import { GameObject } from './game-objects.mjs';
import { Strength } from '../elements/characteristics/primary-characteristcs/strength-characteristics.mjs';
import { Dexterity } from '../elements/characteristics/primary-characteristcs/dexterity-characteristics.mjs';
import { Speed } from '../elements/characteristics/figured-characteristics/speed-characteristics.mjs';
import { Endurance } from '../elements/characteristics/figured-characteristics/endurance-characteristics.mjs';
import { OffensiveCombatValue } from '../elements/characteristics/figured-characteristics/offensive-combat-values.mjs';
import { DefensiveCombatValue } from '../elements/characteristics/figured-characteristics/defensive-combat-values.mjs';
import { PhysicalDefense } from '../elements/characteristics/figured-characteristics/physical-defense-characteristics.mjs';
import { RectangularParallelepiped } from '../elements/body-shapes/rectangular-parallelepiped-shapes.mjs';
// TODO - movement is not a characteristic, instead they are covered in movement powers
// TODO - need to track effective current Endurance and allow actions to spend it, need a refuel ability, that if alive can use recovery otherwise needs a fuel to refill - verify the rules on this
// TODO - need to track effective current Strength, Dexterity, and Speed.
// TODO - Presense does not belong here - non-mobile, non-living, non-mental, and non-scentient objects also have presense.  the question is what doesn't - does this belong with comeliness in the game-object?
import { Swimming } from '../elements/powers/movement-powers/swimming-powers.mjs';
import { Collection } from '../../../collection.mjs';
import { Running } from '../elements/powers/movement-powers/running-powers.mjs';
import { Leaping } from '../elements/powers/movement-powers/leaping-powers.mjs';
export class MobileObject extends GameObject {
  static get defaultElements() {
    return [
      ...super.defaultElements,
      ...[
        Strength,
        Dexterity,
        Speed,
        OffensiveCombatValue,
        DefensiveCombatValue,
        PhysicalDefense,
        Running,
        Swimming,
        Leaping,
      ].map((Type) => ({ Type })),
      { Type: Endurance, options: { BaseValue: 0 } },
    ];
  }
  static createDefaultBodyShape() {
    return new RectangularParallelepiped();
  }
  constructor({
    points = 0,
    basePoints = 0,
    maxDisadvantagePoints = 0,
    maxPointsFromAnyOneTypeOfDisadvantage = 0,
  } = {}) {
    super({
      points: points,
      basePoints: basePoints,
      maxDisadvantagePoints: maxDisadvantagePoints,
      maxPointsFromAnyOneTypeOfDisadvantage: maxPointsFromAnyOneTypeOfDisadvantage,
    });
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
export class MobileObjects extends Collection {}
