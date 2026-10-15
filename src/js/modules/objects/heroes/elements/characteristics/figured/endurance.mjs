import { CharacteristicFigured } from '../../characteristic-figured.mjs';
import { Constitution } from '../primary/constitution.mjs';
export class Endurance extends CharacteristicFigured {
  constructor({ Points = 0 } = {}) {
    super({
      Points: Points,
      AbsoluteMinValue: '0',
      AbsoluteMaxValue: '-1',
      MinValue: '0',
      UnderMinValueRate: '0',
      MaxValue: '50',
      OverMaxValueRate: '2',
      ValueRate: '1/2',
      BaseValue: '0',
      BaseValueFunction: ({ ConstitutionObject }) => {
        if (ConstitutionObject instanceof Constitution) {
          return ConstitutionObject.Value() * 2;
        }
        throw new Error('Endurance Base Value requires a valid Constitution object');
      },
      Name: 'Endurance',
      ShortName: 'END',
    });
  }
}
