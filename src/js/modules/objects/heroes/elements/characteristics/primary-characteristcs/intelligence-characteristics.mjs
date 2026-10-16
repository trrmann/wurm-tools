import { PrimaryCharacteristic } from '../../primary-characteristics.mjs';
import { Collection } from '../../../../collection.mjs'
import { CharacterElements } from '../../../character-element.mjs';
// TODO - add perception roll
export class Intelligence extends PrimaryCharacteristic {
  static Filter(characterElements) {
    if(characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter(element => element instanceof Intelligence);
  }
  constructor({ Points = 0 } = {}) {
    super({
      Points: Points,
      ValueRate: '1',
      Name: 'Intelligence',
      ShortName: 'INT',
    });
  }
  IntelligenceRoll() {
    return this.CharacteristicRoll();
  }
  EffectiveIntelligenceRoll() {
    return this.EffectiveCharacteristicRoll();
  }
  PerceptionRoll() {
    return this.CharacteristicRoll();
  }
  EffectivePerceptionRoll() {
    return this.EffectiveCharacteristicRoll();
  }
}
/** @extends {Collection<Intelligence>} */
export class IntelligenceCharacteristics extends Collection {}