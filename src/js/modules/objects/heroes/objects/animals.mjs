import { Collection } from '../../collection.mjs';
import { PhysicalLivingMobileObject } from '../objects/physical-living-mobile-objects.mjs';

export class Animal extends PhysicalLivingMobileObject {
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
  }
}

/** @extends {Collection<Animal>} */
export class Animals extends Collection {}
