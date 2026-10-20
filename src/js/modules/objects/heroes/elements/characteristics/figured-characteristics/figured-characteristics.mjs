import { Collection } from '../../../../collection.mjs';
import { Characteristic } from '../../characteristic.mjs';
import { CharacterElements } from '../../../character-element.mjs';
export class FiguredCharacteristic extends Characteristic {
  static Filter(characterElements) {
    if (characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter((element) => element instanceof FiguredCharacteristic);
  }
  constructor({
    Points = 0,
    RoundingMode = 'nearest',
    AbsoluteMinValue,
    AbsoluteMaxValue,
    MinValue,
    UnderMinValueRate,
    MaxValue,
    OverMaxValueRate,
    ValueRate,
    BaseValue,
    BaseValueFunction,
    OptionFlagCollection,
    ValueFunction,
    characterElements,
    Composition,
    Name = 'Figured Characteristic',
    ShortName = 'FCHR',
  } = {}) {
    super({
      Points: Points,
      RoundingMode: RoundingMode,
      AbsoluteMinValue: AbsoluteMinValue,
      AbsoluteMaxValue: AbsoluteMaxValue,
      MinValue: MinValue,
      UnderMinValueRate: UnderMinValueRate,
      MaxValue: MaxValue,
      OverMaxValueRate: OverMaxValueRate,
      ValueRate: ValueRate,
      BaseValue: BaseValue,
      BaseValueFunction: BaseValueFunction,
      OptionFlagCollection: OptionFlagCollection,
      ValueFunction: ValueFunction,
      characterElements,
      Composition,
      Name: Name,
      ShortName: ShortName,
    });
  }
}
/** @extends {Collection<FiguredCharacteristic>} */
export class FiguredCharacteristics extends Collection {}
