import { PhysicalObject } from './physical-objects.mjs';
import { LivingObject } from './living-objects.mjs';
import { Collection } from '../../../collection.mjs';
export class PhysicalLivingObject extends PhysicalObject {
  static get defaultElements() {
    return [...super.defaultElements, ...LivingObject.defaultElements];
  }
}
/** @extends {Collection<PhysicalLivingObject>} */
export class PhysicalLivingObjects extends Collection {}
