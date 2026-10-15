import { CharacteristicFigured } from '../../characteristic-figured.mjs';
import { Dexterity } from '../primary/dexterity.mjs';
export class Speed extends CharacteristicFigured {
  constructor({ Points = 0 } = {}) {
    super({
      Points: Points,
      AbsoluteMinValue: '0',
      AbsoluteMaxValue: '12',
      MinValue: '0',
      UnderMinValueRate: '0',
      MaxValue: '12',
      OverMaxValueRate: '2',
      ValueRate: '10',
      BaseValue: '0',
      BaseValueFunction: ({ DexterityObject }) => {
        if (DexterityObject instanceof Dexterity) {
          return ( 1 +(DexterityObject.Value() / 10));
        }
        throw new Error('Speed Base Value requires a valid Dexterity object');
      },
      Name: 'Speed',
      ShortName: 'SPD',
    });
  }
}
