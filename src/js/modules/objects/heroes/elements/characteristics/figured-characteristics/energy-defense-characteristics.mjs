import { FiguredCharacteristic } from '../../figured-characteristics.mjs';
import { Constitution } from '../primary/constitution.mjs';
import { CharacterElements } from '../../../character-element.mjs';
export class EnergyDefense extends FiguredCharacteristic {
  static Filter(characterElements) {
    if (characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter((element) => element instanceof EnergyDefense);
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
          const ConstitutionCharacteristic = Constitution.Filter(characterElements)[0] || null;
          if (ConstitutionCharacteristic instanceof Constitution) {
            return ConstitutionCharacteristic.Value() / 5;
          }
        }
        throw new Error('Energy Defense Base Value requires a valid Constitution characteristic');
      },
      Name: 'Energy Defense',
      ShortName: 'ED',
    });
  }
}
import { Collection } from '../../../../collection.mjs';
/** @extends {Collection<EnergyDefense>} */
export class EnergyDefenseCharacteristics extends Collection {}
