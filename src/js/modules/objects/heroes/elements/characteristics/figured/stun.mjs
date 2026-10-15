import { CharacteristicFigured } from '../../characteristic-figured.mjs';
import { Body } from '../primary/body.mjs';
import { Strength } from '../primary/strength.mjs';
import { Constitution } from '../primary/constitution.mjs';
export class Stun extends CharacteristicFigured {
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
      BaseValueFunction: ({ BodyObject, StrengthObject, ConstitutionObject }) => {
        if (StrengthObject instanceof Strength && BodyObject instanceof Body && ConstitutionObject instanceof Constitution) {
          return BodyObject.Value() + (StrengthObject.Value() / 2) + (ConstitutionObject.Value() / 2);
        }
        throw new Error('Stun Base Value requires valid Strength, Body, and Constitution objects');
      },
      Name: 'Stun',
      ShortName: 'STUN',
    });
  }
}
