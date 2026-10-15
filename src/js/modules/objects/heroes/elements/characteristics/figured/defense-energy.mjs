import { CharacteristicFigured } from '../../characteristic-figured.mjs';
import { Constitution } from '../primary/constitution.mjs';
export class EnergyDefense extends CharacteristicFigured {
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
      BaseValueFunction: ({ ConstitutionObject }) => {
        if (ConstitutionObject instanceof Constitution) {
          return ConstitutionObject.Value() / 5;
        }
        throw new Error('Energy Defense Base Value requires a valid Constitution object');
      },
      Name: 'Energy Defense',
      ShortName: 'ED',
    });
  }
}
