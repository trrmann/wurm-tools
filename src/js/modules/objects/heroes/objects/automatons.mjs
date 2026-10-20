import { Collection } from '../../collection.mjs';
import { PhysicalMobileObject } from './physical-mobile-objects.mjs';
export class Automaton extends PhysicalMobileObject {
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

/** @extends {Collection<Automaton>} */
export class Automatons extends Collection {}
