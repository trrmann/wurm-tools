import { FiguredCharacteristic } from '../../figured-characteristics.mjs';
import { Dexterity } from '../primary-characteristics/dexterity-characteristics.mjs';
import { Collection } from '../../../../collection.mjs';
import { CharacterElements } from '../../../character-element.mjs';
import { MixedNumber } from '../../../../mixed-numbers.mjs';
export class Speed extends FiguredCharacteristic {
  static Filter(characterElements) {
    if (characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter((element) => element instanceof Speed);
  }
  constructor({ Points = 0, characterElements = null } = {}) {
    super({
      Points: Points,
      AbsoluteMinValue: '0',
      MinValue: '0',
      UnderMinValueRate: '0',
      MaxValue: '4',
      OverMaxValueRate: '2',
      ValueRate: '10',
      RoundingMode: 'down',
      BaseValue: '0',
      BaseValueFunction: ({ characterElements = null }) => {
        if (characterElements instanceof CharacterElements) {
          const DexterityCharacteristic = Dexterity.Filter(characterElements)[0] || null;
          if (DexterityCharacteristic instanceof Dexterity) {
            return MixedNumber.from(1).add(
              MixedNumber.from(DexterityCharacteristic.Value()).divide(10)
            );
          }
        }
        throw new Error('Speed Base Value requires a valid Dexterity object');
      },
      Name: 'Speed',
      ShortName: 'SPD',
      characterElements,
    });
  }
  phases() {
    switch (this.Value()) {
      case 1:
        return [7];
      case 2:
        return [4, 8];
      case 3:
        return [4, 8, 12];
      case 4:
        return [3, 6, 9, 12];
      case 5:
        return [3, 5, 8, 10, 12];
      case 6:
        return [2, 4, 6, 8, 10, 12];
      case 7:
        return [2, 4, 6, 7, 9, 11, 12];
      case 8:
        return [2, 3, 5, 6, 8, 9, 11, 12];
      case 9:
        return [2, 3, 4, 6, 7, 8, 10, 11, 12];
      case 10:
        return [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];
      case 11:
        return [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      case 12:
        return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      default:
        return [];
    }
  }
}
/** @extends {Collection<Speed>} */
export class SpeedCharacteristics extends Collection {}
