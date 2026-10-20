import { PrimaryCharacteristic } from '../../primary-characteristics.mjs';
import { Collection } from '../../../../collection.mjs';
import { CharacterElements } from '../../../character-element.mjs';
export class Ego extends PrimaryCharacteristic {
  static Filter(characterElements) {
    if (characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter((element) => element instanceof Ego);
  }
  constructor({ Points = 0 } = {}) {
    super({
      Points: Points,
      ValueRate: '2',
      Name: 'Ego',
      ShortName: 'EGO',
    });
  }
  EgoRoll() {
    return this.CharacteristicRoll();
  }
  EffectiveEgoRoll() {
    return this.EffectiveCharacteristicRoll();
  }
}
/** @extends {Collection<Ego>} */
export class EgoCharacteristics extends Collection {}
