import { CharacteristicFigured } from '../../characteristic-figured.mjs';
import { Strength } from '../primary/strength.mjs';
export class PhysicalDefense extends CharacteristicFigured {
  constructor({ Points = 0 } = {}) {
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
      BaseValueFunction: ({ StrengthObject }) => {
        if (StrengthObject instanceof Strength) {
          return StrengthObject.Value() / 5;
        }
        throw new Error('Physical Defense Base Value requires a valid Strength object');
      },
      Name: 'Physical Defense',
      ShortName: 'PD',
    });
  }
}
