import { PrimaryCharacteristic } from '../../primary-characteristics.mjs';
import { Collection } from '../../../../collection.mjs'
import { CharacterElements } from '../../../character-element.mjs';
export class Constitution extends PrimaryCharacteristic {
  static Filter(characterElements) {
    if(characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter(element => element instanceof Constitution);
  }

  constructor({ Points = 0 } = {}) {
    super({
      Points: Points,
      ValueRate: '2',
      Name: 'Constitution',
      ShortName: 'CON',
    });
  }
  ConstitutionRoll() {
    return this.CharacteristicRoll();
  }
  EffectiveConstitutionRoll() {
    return this.EffectiveCharacteristicRoll();
  }
}
/** @extends {Collection<Constitution>} */
export class ConstitutionCharacteristics extends Collection {}