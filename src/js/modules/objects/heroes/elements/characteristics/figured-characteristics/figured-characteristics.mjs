import { Collection } from '../../../../collection.mjs'
import { Characteristic } from '../../characteristic.mjs';
import { CharacterElements } from '../../../character-element.mjs';
export class FiguredCharacteristic extends Characteristic{
  static Filter(characterElements) {
    if(characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter(element => element instanceof FiguredCharacteristic);
  }
  constructor({
    Points = 0,
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
    Name='Figured Characteristic',
    ShortName='FCHR',
  } = {}) {
    super({
      Points: Points,
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
      Name: Name,
      ShortName: ShortName,
    });
  }
}
/** @extends {Collection<FiguredCharacteristic>} */
export class FiguredCharacteristics extends Collection {

}