import { ItemObject } from './item-objects.mjs';
import { Collection } from '../../../../collection.mjs';
export class EquipmentItem extends ItemObject {
    constructor({points=0,basePoints=0,maxDisadvantagePoints=0,maxPointsFromAnyOneTypeOfDisadvantage=0} = {}) {
        super({points:points,basePoints:basePoints,maxDisadvantagePoints: maxDisadvantagePoints,maxPointsFromAnyOneTypeOfDisadvantage: maxPointsFromAnyOneTypeOfDisadvantage});
        this.equipSlot = 'None';
    }
}
/** @extends {Collection<EquipmentItem>} */
export class Equipment extends Collection {

}