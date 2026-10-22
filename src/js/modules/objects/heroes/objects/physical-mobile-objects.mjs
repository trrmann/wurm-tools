import { PhysicalObject } from './physical-objects.mjs';
import { MobileObject } from './mobile-objects.mjs';
import { Collection } from '../../../collection.mjs';

export class PhysicalMobileObject extends PhysicalObject {
  static get defaultElements() {
    return [...super.defaultElements, ...MobileObject.defaultElements];
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
    this.pilot = null;
  }
}
/** @extends {Collection<PhysicalMobileObject>} */
export class PhysicalMobileObjects extends Collection {}
