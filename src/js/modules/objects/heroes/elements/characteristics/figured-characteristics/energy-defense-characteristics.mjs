import { FiguredCharacteristic } from '../../figured-characteristics.mjs';
import { Constitution } from '../primary/constitution.mjs';
import { CharacterElements } from '../../../character-element.mjs';
import { MixedNumber } from '../../../../mixed-numbers.mjs';
export class EnergyDefense extends FiguredCharacteristic {
  static Filter(characterElements) {
    if (characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter((element) => element instanceof EnergyDefense);
  }
  constructor({ Points = 0, characterElements = null } = {}) {
    super({
      Points: Points,
      AbsoluteMinValue: '0',
      MinValue: '0',
      UnderMinValueRate: '0',
      MaxValue: '8',
      OverMaxValueRate: '2',
      ValueRate: '1',
      BaseValue: '0',
      BaseValueFunction: ({ characterElements = null }) => {
        if (characterElements instanceof CharacterElements) {
          const ConstitutionCharacteristic = Constitution.Filter(characterElements)[0] || null;
          if (ConstitutionCharacteristic instanceof Constitution) {
            return MixedNumber.from(ConstitutionCharacteristic.Value()).divide(5);
          }
        }
        throw new Error('Energy Defense Base Value requires a valid Constitution characteristic');
      },
      Name: 'Energy Defense',
      ShortName: 'ED',
      characterElements,
    });
  }
}
import { Collection } from '../../../../collection.mjs';
/** @extends {Collection<EnergyDefense>} */
export class EnergyDefenseCharacteristics extends Collection {}
