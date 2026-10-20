import { FiguredCharacteristic } from '../../figured-characteristics.mjs';
import { Ego } from '../primary-characteristics/ego-characteristics.mjs';
import { CharacterElements } from '../../character-elements.mjs';
import { MixedNumber } from '../../../../mixed-numbers.mjs';
export class DefensiveEgoCombatValue extends FiguredCharacteristic {
  static Filter(characterElements) {
    if (characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter((element) => element instanceof DefensiveEgoCombatValue);
  }
  constructor({ Points = 0, characterElements = null } = {}) {
    super({
      Points: Points,
      AbsoluteMinValue: '0',
      MinValue: '0',
      UnderMinValueRate: '0',
      BaseValue: '0',
      BaseValueFunction: ({ characterElements = null }) => {
        if (characterElements instanceof CharacterElements) {
          const EgoCharacteristic = Ego.Filter(characterElements)[0] ?? null;
          if (EgoCharacteristic instanceof Ego) {
            return MixedNumber.from(EgoCharacteristic.Value()).divide(3);
          }
        }
        throw new Error('Defensive Ego Combat Value Base Value requires a valid Ego object');
      },
      Name: 'Defensive Ego Combat Value',
      ShortName: 'DECV',
      characterElements,
    });
  }
}
import { Collection } from '../../../../collection.mjs';
/** @extends {Collection<DefensiveEgoCombatValue>} */
export class DefensiveEgoCombatValues extends Collection {}
