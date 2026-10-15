import { CharacteristicFigured } from '../../characteristic-figured.mjs';
import { PhysicalDefense } from './defense-physical.mjs';
import { EnergyDefense } from './defense-energy.mjs';
export class Defense extends CharacteristicFigured {
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
      BaseValueFunction: ({ Composition = null, PhysicalDefenseObject = null, EnergyDefenseObject = null}) => {
        if ((typeof Composition === 'number') || PhysicalDefenseObject instanceof PhysicalDefense || EnergyDefenseObject instanceof EnergyDefense) {
          if(PhysicalDefenseObject instanceof PhysicalDefense && EnergyDefenseObject instanceof EnergyDefense) {
            return (( PhysicalDefenseObject.Value() + EnergyDefenseObject.Value() ) / 2);
          } else if (PhysicalDefenseObject instanceof PhysicalDefense) {
            return PhysicalDefenseObject.Value();
          } else if (EnergyDefenseObject instanceof EnergyDefense) {
            return EnergyDefenseObject.Value();
          }
          else {
            return Composition;
          }
        }
        throw new Error('Defense Base Value requires either a valid Physical Defense object, Energy Defense objects, or Composition numeric value');
      },
      Name: 'Defense',
      ShortName: 'DEF',
    });
  }
}
