import { PhysicalLivingObject } from './physical-living-objects.mjs';
import { MobileObject } from './mobile-objects.mjs';
import { Collection } from '../../../collection.mjs';
export class PhysicalLivingMobileObject extends PhysicalLivingObject {
  static get defaultElements() {
    return [...super.defaultElements, ...MobileObject.defaultElements];
  }
}
/** @extends {Collection<PhysicalLivingMobileObject>} */
export class PhysicalLivingMobileObjects extends Collection {}
