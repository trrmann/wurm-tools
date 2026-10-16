import { FiguredCharacteristic } from '../../figured-characteristics.mjs';
import { Ego } from '../primary-characteristics/ego-characteristics.mjs';
import { CharacterElements } from '../../../character-element.mjs';
export class OffensiveEgoCombatValue extends FiguredCharacteristic {
  static Filter(characterElements) {
    if(characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter(element => element instanceof OffensiveEgoCombatValue);
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
          const EgoCharacteristic = Ego.Filter(characterElements)[0] || null;
          if (EgoCharacteristic instanceof Ego) {
            return EgoCharacteristic.Value() / 3;
          }
        }
        throw new Error('Offensive Ego Combat Value Base Value requires a valid Ego object');
      },
      Name: 'Offensive Ego Combat Value',
      ShortName: 'OECV',
    });
  }
}
import { Collection } from '../../../../collection.mjs';
/** @extends {Collection<OffensiveEgoCombatValue>} */
export class OffensiveEgoCombatValues extends Collection {}