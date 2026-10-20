import { PrimaryCharacteristic } from '../../primary-characteristics.mjs';
import { Collection } from '../../../../collection.mjs';
import { CharacterElements } from '../../../character-element.mjs';
export class Comeliness extends PrimaryCharacteristic {
  static Filter(characterElements) {
    if (characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter((element) => element instanceof Comeliness);
  }

  constructor({ Points = 0 } = {}) {
    super({
      Points: Points,
      ValueRate: '1/2',
      Name: 'Comeliness',
      ShortName: 'COM',
    });
  }
  ComelinessRoll() {
    return this.CharacteristicRoll();
  }
  EffectiveComelinessRoll() {
    return this.EffectiveCharacteristicRoll();
  }
}
/** @extends {Collection<Comeliness>} */
export class ComelinessCharacteristics extends Collection {}
