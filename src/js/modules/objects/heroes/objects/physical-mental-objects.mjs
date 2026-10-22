import { PhysicalObject } from './physical-objects.mjs';
import { MentalObject } from './mental-objects.mjs';
import { Collection } from '../../../collection.mjs';
export class PhysicalMentalObject extends PhysicalObject {
  static get defaultElements() {
    return [...super.defaultElements, ...MentalObject.defaultElements];
  }
}
/** @extends {Collection<PhysicalMentalObject>} */
export class PhysicalMentalObjects extends Collection {}
