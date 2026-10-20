import { Collection } from '../../../collection.mjs';
import { PhysicalLivingMobileObject } from '../objects/physical-living-mobile-objects.mjs';
import { Quadruped } from '../elements/body-shapes/quadruped-shapes.mjs';

export class Animal extends PhysicalLivingMobileObject {
  static createDefaultBodyShape() {
    return new Quadruped();
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
    this.Add(Animal.createDefaultBodyShape());
  }
}

/** @extends {Collection<Animal>} */
export class Animals extends Collection {}
