import { PrimaryCharacteristic } from '../../primary-characteristics.mjs';
import { Collection } from '../../../../collection.mjs';
import { CharacterElements } from '../../../character-element.mjs';
export class Dexterity extends PrimaryCharacteristic {
  static Filter(characterElements) {
    if (characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter((element) => element instanceof Dexterity);
  }
  constructor({ Points = 0 } = {}) {
    super({
      Points: Points,
      ValueRate: '3',
      Name: 'Dexterity',
      ShortName: 'DEX',
    });
  }
  DexterityRoll() {
    return this.CharacteristicRoll();
  }
  EffectiveDexterityRoll() {
    return this.EffectiveCharacteristicRoll();
  }
}
/** @extends {Collection<Dexterity>} */
export class DexterityCharacteristics extends Collection {}
