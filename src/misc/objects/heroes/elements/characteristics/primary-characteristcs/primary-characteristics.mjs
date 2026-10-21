import { Collection } from '../../../../collection.mjs';
import { Characteristic } from '../../characteristic.mjs';
import { CharacterElements } from '../../../character-element.mjs';
export class PrimaryCharacteristic extends Characteristic {
  static Filter(characterElements) {
    if (characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter((element) => element instanceof PrimaryCharacteristic);
  }

  constructor({
    Points = 0,
    ValueRate,
    RoundingMode = 'nearest',
    Name = 'Primary Characteristic',
    ShortName = 'PCHR',
  } = {}) {
    super({
      Points: Points,
      MinValue: '1',
      UnderMinValueRate: '0',
      MaxValue: '20',
      OverMaxValueRate: '2',
      ValueRate: ValueRate,
      BaseValue: '10',
      BaseValueFunction: ({ BaseValue }) => BaseValue,
      OptionFlagCollection: {},
      RoundingMode: RoundingMode,
      Name: Name,
      ShortName: ShortName,
    });
  }
  CharacteristicRoll() {
    if (['STR', 'DEX', 'CON', 'BODY', 'INT', 'EGO', 'PRE', 'COM'].includes(this.shortName))
      return 9 + this.toNumber() / 5;
    return 0; // Default roll if characteristic is not recognized
  }
  EffectiveCharacteristicRoll() {
    if (this.CharacteristicRoll() > 0) return 9 + this.Effective / 5;
    return 0; // Default roll if characteristic is not recognized
  }
}
/** @extends {Collection<PrimaryCharacteristic>} */
export class PrimaryCharacteristics extends Collection {}
