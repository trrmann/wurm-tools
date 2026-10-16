import { FiguredCharacteristic } from '../../figured-characteristics.mjs';
import { Ego } from '../primary-characteristics/ego-characteristics.mjs';
import { DefensiveEgoCombatValue } from './defensive-ego-combat-values.mjs';
import { OffensiveEgoCombatValue } from './offensive-ego-combat-values.mjs';
import { CharacterElements } from '../../character-elements.mjs';
export class EgoCombatValue extends FiguredCharacteristic {
  static Filter(characterElements) {
    if (characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter((element) => element instanceof EgoCombatValue);
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
          const EgoCharacteristic = Ego.Filter(characterElements)[0] ?? null;
          const DefensiveEgoCombatValueCharacteristic =
            DefensiveEgoCombatValue.Filter(characterElements)[0] ?? null;
          const OffensiveEgoCombatValueCharacteristic =
            OffensiveEgoCombatValue.Filter(characterElements)[0] ?? null;
          if (
            EgoCharacteristic instanceof Ego ||
            DefensiveEgoCombatValueCharacteristic instanceof DefensiveEgoCombatValue ||
            OffensiveEgoCombatValueCharacteristic instanceof OffensiveEgoCombatValue
          ) {
            if (
              DefensiveEgoCombatValueCharacteristic instanceof DefensiveEgoCombatValue &&
              OffensiveEgoCombatValueCharacteristic instanceof OffensiveEgoCombatValue
            ) {
              return (
                (DefensiveEgoCombatValueCharacteristic.Value() +
                  OffensiveEgoCombatValueCharacteristic.Value()) /
                2
              );
            } else if (DefensiveEgoCombatValueCharacteristic instanceof DefensiveEgoCombatValue) {
              return DefensiveEgoCombatValueCharacteristic.Value();
            } else if (OffensiveEgoCombatValueCharacteristic instanceof OffensiveEgoCombatValue) {
              return OffensiveEgoCombatValueCharacteristic.Value();
            }
            return EgoCharacteristic.Value() / 3;
          }
        }
        throw new Error('Ego Combat Value Base Value requires a valid Ego object');
      },
      Name: 'Ego Combat Value',
      ShortName: 'ECV',
    });
  }
}
import { Collection } from '../../../../collection.mjs';
/** @extends {Collection<EgoCombatValue>} */
export class EgoCombatValues extends Collection {}
