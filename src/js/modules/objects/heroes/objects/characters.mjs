import { Collection } from '../../../collection.mjs';
import { PhysicalLivingMobileSentientObject } from './physical-living-mobile-sentient-objects.mjs';
import { Humanoid } from '../elements/body-shapes/humanoid-shapes.mjs';

export class Character extends PhysicalLivingMobileSentientObject {
  static createDefaultBodyShape() {
    return new Humanoid();
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
    this.Add(Character.createDefaultBodyShape());
  }
}
/** @extends {Collection<Character>} */
export class Characters extends Collection {}
