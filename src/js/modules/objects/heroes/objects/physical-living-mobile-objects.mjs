import { PhysicalLivingObject } from './physical-living-objects.mjs';
import { MobileObject } from './mobile-objects.mjs';
import { Collection } from '../../../../collection.mjs';
export class PhysicalLivingMobileObject extends PhysicalLivingObject {
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
    const mobileObj = new MobileObject({
      points: points,
      basePoints: basePoints,
      maxDisadvantagePoints: maxDisadvantagePoints,
      maxPointsFromAnyOneTypeOfDisadvantage: maxPointsFromAnyOneTypeOfDisadvantage,
    });
    mobileObj
      .characteristics()
      .GetAll()
      .forEach((characteristic) => {
        this.characteristics().Add(characteristic);
      });
  }
}
/** @extends {Collection<PhysicalLivingMobileObject>} */
export class PhysicalLivingMobileObjects extends Collection {}
