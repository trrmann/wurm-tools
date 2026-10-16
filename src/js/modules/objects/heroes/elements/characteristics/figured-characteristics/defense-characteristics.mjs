import { FiguredCharacteristic } from '../../figured-characteristics.mjs';
import { PhysicalDefense } from './defense-physical.mjs';
import { EnergyDefense } from './defense-energy.mjs';
import { CharacterElements } from '../../character-elements.mjs';
export class Defense extends FiguredCharacteristic {
  static Filter(characterElements) {
    if(characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter(element => element instanceof Defense);
  }
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
      BaseValueFunction: ({ Composition = null, characterElements = null}) => {
        if ((typeof Composition === 'number') || characterElements instanceof CharacterElements) {
          const PhysicalDefenseCharacteristic = PhysicalDefense.Filter(characterElements)[0] ?? null;
          const EnergyDefenseCharacteristic = EnergyDefense.Filter(characterElements)[0] ?? null;
          if(PhysicalDefenseCharacteristic instanceof PhysicalDefense && EnergyDefenseCharacteristic instanceof EnergyDefense) {
            return (( PhysicalDefenseCharacteristic.Value() + EnergyDefenseCharacteristic.Value() ) / 2);
          } else if (PhysicalDefenseCharacteristic instanceof PhysicalDefense) {
            return PhysicalDefenseCharacteristic.Value();
          } else if (EnergyDefenseCharacteristic instanceof EnergyDefense) {
            return EnergyDefenseCharacteristic.Value();
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
import { Collection } from '../../../../collection.mjs';
/** @extends {Collection<Defense>} */
export class DefenseCharacteristics extends Collection {}