import { PhysicalObject } from './physical-objects.mjs';
import { Collection } from '../../../collection.mjs';
export class ItemObject extends PhysicalObject {
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
    this.isEquipped = false;
  }
}

/** @extends {Collection<ItemObject>} */
export class Items extends Collection {}
