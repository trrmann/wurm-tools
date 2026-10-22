import { PhysicalLivingMobileObject } from './physical-living-mobile-objects.mjs';
import { SentientObject } from './sentient-objects.mjs';
import { Collection } from '../../../collection.mjs';
export class PhysicalLivingMobileSentientObject extends PhysicalLivingMobileObject {
  static get defaultElements() {
    return [...super.defaultElements, ...SentientObject.defaultElements];
  }
}
/** @extends {Collection<PhysicalLivingMobileSentientObject>} */
export class PhysicalLivingMobileSentientObjects extends Collection {}
