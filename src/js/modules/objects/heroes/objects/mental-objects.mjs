import { GameObject } from './game-objects.mjs';
import { Intelligence } from '../elements/characteristics/primary-characteristcs/intelligence-characteristics.mjs';
import { Collection } from '../../../collection.mjs';

export class MentalObject extends GameObject {
  static get defaultElements() {
    return [...super.defaultElements, { Type: Intelligence }];
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
  }
}

/** @extends {Collection<MentalObject>} */
export class MentalObjects extends Collection {}
