import { GameObject } from './game-objects.mjs';
import { Constitution } from '../elements/characteristics/primary-characteristcs/constitution-characteristics.mjs';
import { EnergyDefense } from '../elements/characteristics/figured-characteristics/energy-defense-characteristics.mjs';
import { Recovery } from '../elements/characteristics/figured-characteristics/recovery-characteristics.mjs';
import { Collection } from '../../../collection.mjs';
// TODO - review the rules on alive as tied to constitution and if physical then also body
// TODO - track effective current Constitution (allowing push, etc.)
export class LivingObject extends GameObject {
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
    this.Add(new Constitution({ points: 0 }));
    this.Add(new EnergyDefense({ points: 0 }));
    this.Add(new Recovery({ points: 0 }));
  }
}

/** @extends {Collection<LivingObject>} */
export class LivingObjects extends Collection {}
