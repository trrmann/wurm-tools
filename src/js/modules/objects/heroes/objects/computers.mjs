import { PhysicalMentalObject } from './physical-mental-objects.mjs';
import { Collection } from '../../../../collection.mjs';
export class Computer extends PhysicalMentalObject {
    constructor({points=0,basePoints=0,maxDisadvantagePoints=0,maxPointsFromAnyOneTypeOfDisadvantage=0} = {}) {
        super({points:points,basePoints:basePoints,maxDisadvantagePoints: maxDisadvantagePoints,maxPointsFromAnyOneTypeOfDisadvantage: maxPointsFromAnyOneTypeOfDisadvantage});
        // Hybrid Merge: Enforces its own rulebook computing mental engine layer
        this.hostedSoftware = new Map();
    }
    installSoftware(software) {
        if (this.structuralState === 'Broken') return false;
        this.hostedSoftware.set(software.id, software);
        return true;
    }
}
/** @extends {Collection<Computer>} */
export class Computers extends Collection {

}