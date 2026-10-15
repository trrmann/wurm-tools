import { CharacteristicFigured } from '../../characteristic-figured.mjs';
import { Ego } from '../primary/ego.mjs';
export class OffensiveEgoCombatValue extends CharacteristicFigured {
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
        throw new Error('Offensive Ego Combat Value Base Value requires a valid Ego object');
      },
      Name: 'Offensive Ego Combat Value',
      ShortName: 'OECV',
    });
  }
}
