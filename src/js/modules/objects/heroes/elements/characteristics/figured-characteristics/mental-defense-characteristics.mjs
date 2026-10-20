// this still needs to be designated as non-standard
import { FiguredCharacteristic } from '../../figured-characteristics.mjs';
import { Ego } from '../primary-characteristics/ego-characteristics.mjs';
import { CharacterElements } from '../../../character-element.mjs';
export class MentalDefense extends FiguredCharacteristic {
  static Filter(characterElements) {
    if (characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter((element) => element instanceof MentalDefense);
  }
  constructor({ Points = 0, characterElements = null } = {}) {
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
          const EgoCharacteristic = Ego.Filter(characterElements)[0] || null;
          if (EgoCharacteristic instanceof Ego) {
            return EgoCharacteristic.Value() / 5;
          }
        }
        throw new Error('Mental Defense Base Value requires a valid Ego characteristic');
      },
      Name: 'Mental Defense',
      ShortName: 'MD',
      characterElements,
    });
  }
}
import { Collection } from '../../../../collection.mjs';
/** @extends {Collection<MentalDefense>} */
export class MentalDefenseCharacteristics extends Collection {}
