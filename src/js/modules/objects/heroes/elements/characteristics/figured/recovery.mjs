import { CharacteristicFigured } from '../../characteristic-figured.mjs';
import { Strength } from '../primary/strength.mjs';
import { Constitution } from '../primary/constitution.mjs';
export class Recovery extends CharacteristicFigured {
  constructor({ Points = 0 } = {}) {
    super({
      Points: Points,
      AbsoluteMinValue: '0',
      AbsoluteMaxValue: '-1',
      MinValue: '0',
      UnderMinValueRate: '0',
      MaxValue: '50',
      OverMaxValueRate: '2',
      ValueRate: '2',
      BaseValue: '0',
      BaseValueFunction: ({ StrengthObject, ConstitutionObject }) => {
        if (StrengthObject instanceof Strength && ConstitutionObject instanceof Constitution) {
          return (StrengthObject.Value() / 5) + (ConstitutionObject.Value() / 5);
        } else {
          throw new Error('Recovery Base Value requires valid Strength and Constitution objects');
        }
      },
      Name: 'Recovery',
      ShortName: 'REC',
    });
  }
}
