import { PrimaryCharacteristic } from '../../primary-characteristics.mjs';
import { Collection } from '../../../../collection.mjs';
import { CharacterElements } from '../../../character-element.mjs';
export class Body extends PrimaryCharacteristic {
  static Filter(characterElements) {
    if (characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter((element) => element instanceof Body);
  }
  constructor({ Points = 0 } = {}) {
    super({
      Points: Points,
      ValueRate: '2',
      Name: 'Body',
      ShortName: 'BODY',
    });
  }
  BodyRoll() {
    return this.CharacteristicRoll();
  }
  EffectiveBodyRoll() {
    return this.EffectiveCharacteristicRoll();
  }
}
/** @extends {Collection<Body>} */
export class BodyCharacteristics extends Collection {}
