import { CharacteristicFigured } from '../../characteristic-figured.mjs';
import { Ego } from '../primary/ego.mjs';
import { DefensiveEgoCombatValue } from './combat-value-ego-defensive.mjs';
import { OffensiveEgoCombatValue } from './combat-value-ego-offensive.mjs';
export class EgoCombatValue extends CharacteristicFigured {
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
      BaseValueFunction: ({ EgoObject, DefensiveEgoCombatValueObject, OffensiveEgoCombatValueObject }) => {
        if (EgoObject instanceof Ego || DefensiveEgoCombatValueObject instanceof DefensiveEgoCombatValue || OffensiveEgoCombatValueObject instanceof OffensiveEgoCombatValue) {
          if (DefensiveEgoCombatValueObject instanceof DefensiveEgoCombatValue && OffensiveEgoCombatValueObject instanceof OffensiveEgoCombatValue) {
            return (DefensiveEgoCombatValueObject.Value() + OffensiveEgoCombatValueObject.Value()) / 2;
          } else if (DefensiveEgoCombatValueObject instanceof DefensiveEgoCombatValue) {
            return DefensiveEgoCombatValueObject.Value();
          } else if(OffensiveEgoCombatValueObject instanceof OffensiveEgoCombatValue) {
            return OffensiveEgoCombatValueObject.Value();
          }
          return EgoObject.Value() / 3;
        }
        throw new Error('Ego Combat Value Base Value requires a valid Ego object');
      },
      Name: 'Ego Combat Value',
      ShortName: 'ECV',
    });
  }
}
