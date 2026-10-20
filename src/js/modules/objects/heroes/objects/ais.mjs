import { Collection } from '../../collection.mjs';
import { SentientObject } from './sentient-objects.mjs';

export class AI extends SentientObject {
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

/** @extends {Collection<AI>} */
export class AIs extends Collection {}
