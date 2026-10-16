import { PhysicalMobileObject } from '../physical-mobile-objects.mjs';
import { Collection } from '../../../../collection.mjs';
// TODO - review the rules, are vehicles really mobile bases?
export class Vehicle extends PhysicalMobileObject {
    constructor({points=0,basePoints=0,maxDisadvantagePoints=0,maxPointsFromAnyOneTypeOfDisadvantage=0} = {}) {
        super({points:points,basePoints:basePoints,maxDisadvantagePoints: maxDisadvantagePoints,maxPointsFromAnyOneTypeOfDisadvantage: maxPointsFromAnyOneTypeOfDisadvantage});
        this.pilot = null;
    }
}
/** @extends {Collection<Vehicle>} */
export class Vehicles extends Collection {

}