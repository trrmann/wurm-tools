import { FiguredCharacteristic } from '../../figured-characteristics.mjs';
import { Strength } from '../primary-characteristics/strength-characteristics.mjs';
import { Constitution } from '../primary-characteristics/constitution-characteristics.mjs';
import { CharacterElements } from '../../../character-element.mjs';
export class Recovery extends FiguredCharacteristic {
  static Filter(characterElements) {
    if (characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter((element) => element instanceof Recovery);
  }
  constructor({ Points = 0 } = {}) {
    super({
      Points: Points,
      AbsoluteMinValue: '0',
      AbsoluteMaxValue: '-1',
      MinValue: '0',
      UnderMinValueRate: '0',
      MaxValue: '50',
      OverMaxValueRate: '2',
      ValueRate: '2',
      BaseValue: '0',
      BaseValueFunction: ({ characterElements = null }) => {
        if (characterElements instanceof CharacterElements) {
          const ConstitutionCharacteristic = Constitution.Filter(characterElements)[0] || null;
          const StrengthCharacteristic = Strength.Filter(characterElements)[0] || null;
          if (
            StrengthCharacteristic instanceof Strength &&
            ConstitutionCharacteristic instanceof Constitution
          ) {
            return StrengthCharacteristic.Value() / 5 + ConstitutionCharacteristic.Value() / 5;
          } else if (StrengthCharacteristic instanceof Strength) {
            return StrengthCharacteristic.Value() / 5;
          } else if (ConstitutionCharacteristic instanceof Constitution) {
            return ConstitutionCharacteristic.Value() / 5;
          }
        }
        throw new Error('Recovery Base Value requires valid Strength and Constitution objects');
      },
      Name: 'Recovery',
      ShortName: 'REC',
    });
  }
}
import { Collection } from '../../../../collection.mjs';
/** @extends {Collection<Recovery>} */
export class RecoveryCharacteristics extends Collection {}
