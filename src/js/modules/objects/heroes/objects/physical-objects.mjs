import { GameObject } from './game-object.mjs';
import { Body } from '../characteristics/primary/body.mjs';
import { Defense } from '../characteristics/figured/defense.mjs';
import { Collection } from '../../../../collection.mjs';
// TODO - needs a body shape - possibly as a separate element, as there are powers that modifies it
export class PhysicalObject extends GameObject {
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
    this.Add(new Body({ points: 0 }));
    this.Add(new Defense({ points: 0 }));
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
