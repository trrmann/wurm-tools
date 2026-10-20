import { PhysicalObject } from '../physical-objects.mjs';
import { Collection } from '../../../../collection.mjs';
// TODO need to flush this out better from the rules
export class Base extends PhysicalObject {
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
/** @extends {Collection<Base>} */
export class Bases extends Collection {}
