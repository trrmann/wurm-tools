import { GameObject } from './game-objects.mjs';
import { Body } from '../elements/characteristics/primary-characteristcs/body-characteristics.mjs';
import { Defense } from '../elements/characteristics/figured-characteristics/defense-characteristics.mjs';
import { Collection } from '../../../collection.mjs';
import { RectangularParallelepiped } from '../elements/body-shapes/rectangular-parallelepiped-shapes.mjs';
export class PhysicalObject extends GameObject {
  static get defaultElements() {
    return [
      ...super.defaultElements,
      { Type: Body },
      { Type: Defense, options: { Composition: 0 } },
    ];
  }
  static createDefaultBodyShape() {
    return new RectangularParallelepiped();
  }
  #structuralState() {
    const ratio = this.Get('Body').EffectiveValue() / this.Get('Body').Value();
    if (ratio <= -1) {
      return 'Disintegrated';
    } else if (ratio <= -0.5) {
      return 'Destroyed';
    } else if (ratio <= 0) {
      return 'Broken';
    } else if (ratio <= 0.25) {
      return 'Fractured';
    } else if (ratio <= 0.75) {
      return 'Damaged';
    } else {
      return 'Intact';
    }
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
    this.sizePower = 0; // Scale and volume metric
  }
  takeDamage({ damage } = {}) {
    const amount = damage.bodyAmount(this.characterElements()) || 0;
    if (amount <= 0) return;
    this.Get('Body').SetAdjustment(this.Get('Body').SetAdjustment() + amount);
  }
  structuralState() {
    return this.#structuralState();
  }
}
/** @extends {Collection<PhysicalObject>} */
export class PhysicalObjects extends Collection {}
