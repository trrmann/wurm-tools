import { CharacteristicFigured } from '../../characteristic-figured.mjs';
import { Dexterity } from '../primary/dexterity.mjs';
export class DefensiveCombatValue extends CharacteristicFigured {
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
      BaseValueFunction: ({ DexterityObject }) => {
        if (DexterityObject instanceof Dexterity) {
          return DexterityObject.Value() / 3;
        }
        throw new Error('Defensive Combat Value Base Value requires a valid Dexterity object');
      },
      Name: 'Defensive Combat Value',
      ShortName: 'DCV',
    });
  }
}
