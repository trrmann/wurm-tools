import { PhysicalLivingObject } from './physical-living-objects.mjs';
import { Collection } from '../../../collection.mjs';
export class Plant extends PhysicalLivingObject {
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

/** @extends {Collection<Plant>} */
export class Plants extends Collection {}
