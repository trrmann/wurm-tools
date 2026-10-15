import { CharacteristicFigured } from '../../characteristic-figured.mjs';
import { Ego } from '../primary/ego.mjs';
export class DefensiveEgoCombatValue extends CharacteristicFigured {
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
      BaseValueFunction: ({ EgoObject }) => {
        if (EgoObject instanceof Ego) {
          return EgoObject.Value() / 3;
        }
         throw new Error('Defensive Ego Combat Value Base Value requires a valid Ego object');
      },
      Name: 'Defensive Ego Combat Value',
      ShortName: 'DECV',
    });
  }
}
