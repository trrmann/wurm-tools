// this still needs to be designated as non-standard
import { CharacteristicFigured } from '../../characteristic-figured.mjs';
import { Ego } from '../primary/ego.mjs';
export class MentalDefense extends CharacteristicFigured {
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
      BaseValueFunction: ({ EgoObject }) => {
        if (EgoObject instanceof Ego) {
          return EgoObject.Value() / 5;
        }
        throw new Error('Mental Defense Base Value requires a valid Ego object');
      },
      Name: 'Mental Defense',
      ShortName: 'MD',
    });
  }
}
