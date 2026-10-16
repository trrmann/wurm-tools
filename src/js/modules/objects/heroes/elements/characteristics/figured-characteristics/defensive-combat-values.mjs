import { FiguredCharacteristic } from '../../figured-characteristics.mjs';
import { Dexterity } from '../primary-characteristics/dexterity-characteristics.mjs';
import { CharacterElements } from '../../character-elements.mjs';
export class DefensiveCombatValue extends FiguredCharacteristic {
  static Filter(characterElements) {
    if (characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter((element) => element instanceof DefensiveCombatValue);
  }
  constructor({ Points = 0 } = {}) {
    super({
      Points: Points,
      AbsoluteMinValue: '0',
      AbsoluteMaxValue: '-1',
      MinValue: '0',
      UnderMinValueRate: '0',
      MaxValue: '-1',
      OverMaxValueRate: '2',
      ValueRate: '10',
      BaseValue: '0',
      BaseValueFunction: ({ characterElements = null }) => {
        if (characterElements instanceof CharacterElements) {
          const DexterityCharacteristic = Dexterity.Filter(characterElements)[0] ?? null;
          if (DexterityCharacteristic instanceof Dexterity) {
            return DexterityCharacteristic.Value() / 3;
          }
        }
        throw new Error('Defensive Combat Value Base Value requires a valid Dexterity object');
      },
      Name: 'Defensive Combat Value',
      ShortName: 'DCV',
    });
  }
}
import { Collection } from '../../../../collection.mjs';
/** @extends {Collection<DefensiveCombatValue>} */
export class DefensiveCombatValues extends Collection {}
