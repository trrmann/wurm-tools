import { MentalObject } from './mental-objects.mjs';
import { Ego } from '../elements/characteristics/primary-characteristcs/ego-characteristics.mjs';
import { EgoCombatValue } from '../elements/characteristics/figured-characteristics/ego-combat-values.mjs';
import { MentalDefense } from '../elements/characteristics/figured-characteristics/mental-defense-characteristics.mjs';
import { Collection } from '../../../collection.mjs';
// TODO - review the rules on conscious as tied to ego, if living then also constitution and if physical then also body
// TODO - review rules on subconscious operations as well
// TODO - track effective current Ego (allowing push, etc.)

export class SentientObject extends MentalObject {
  static get defaultElements() {
    return [
      ...super.defaultElements,
      { Type: Ego },
      { Type: EgoCombatValue },
      { Type: MentalDefense },
    ];
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
/** @extends {Collection<SentientObject>} */
export class SentientObjects extends Collection {}
