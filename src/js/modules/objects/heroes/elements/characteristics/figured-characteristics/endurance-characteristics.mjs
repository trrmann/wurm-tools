import { FiguredCharacteristic } from '../../figured-characteristics.mjs';
import { Constitution } from '../primary-characteristics/constitution-characteristics.mjs';
import { CharacterElements } from '../../../character-element.mjs';
export class Endurance extends FiguredCharacteristic {
  static Filter(characterElements) {
    if (characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter((element) => element instanceof Endurance);
  }
  constructor({ Points = 0, characterElements = null } = {}) {
    super({
      Points: Points,
      AbsoluteMinValue: '0',
      MinValue: '0',
      UnderMinValueRate: '0',
      MaxValue: '50',
      OverMaxValueRate: '2',
      ValueRate: '1/2',
      BaseValue: '0',
      BaseValueFunction: ({ characterElements = null }) => {
        if (characterElements instanceof CharacterElements) {
          const ConstitutionCharacteristic = Constitution.Filter(characterElements)[0] || null;
          if (ConstitutionCharacteristic instanceof Constitution) {
            return ConstitutionCharacteristic.Value() * 2;
          }
        }
        throw new Error('Endurance Base Value requires a valid Constitution characteristic');
      },
      Name: 'Endurance',
      ShortName: 'END',
      characterElements,
    });
  }
}
import { Collection } from '../../../../collection.mjs';
/** @extends {Collection<Endurance>} */
export class EnduranceCharacteristics extends Collection {}
