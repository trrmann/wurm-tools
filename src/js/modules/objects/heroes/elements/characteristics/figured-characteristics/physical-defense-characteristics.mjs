import { FiguredCharacteristic } from '../../figured-characteristics.mjs';
import { Strength } from '../primary-characteristics/strength-characteristics.mjs';
import { CharacterElements } from '../../../character-element.mjs';
export class PhysicalDefense extends FiguredCharacteristic {
  static Filter(characterElements) {
    if (characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter((element) => element instanceof PhysicalDefense);
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
      ValueRate: '1',
      BaseValue: '0',
      BaseValueFunction: ({ characterElements = null }) => {
        if (characterElements instanceof CharacterElements) {
          const StrengthCharacteristic = Strength.Filter(characterElements)[0] || null;
          if (StrengthCharacteristic instanceof Strength) {
            return StrengthCharacteristic.Value() / 5;
          }
        }
        throw new Error('Physical Defense Base Value requires a valid Strength object');
      },
      Name: 'Physical Defense',
      ShortName: 'PD',
    });
  }
}
import { Collection } from '../../../../collection.mjs';
/** @extends {Collection<PhysicalDefense>} */
export class PhysicalDefenseCharacteristics extends Collection {}
