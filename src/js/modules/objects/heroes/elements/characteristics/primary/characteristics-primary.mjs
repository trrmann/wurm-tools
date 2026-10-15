import { Characteristic } from '../../characteristic.mjs';
export class CharacteristicPrimary extends Characteristic {
  constructor({
    Points = 0,
    ValueRate,
    Name='Primary Characteristic',
    ShortName='PCHR',
  } = {}) {
    super({
      Points: Points,
      AbsoluteMinValue: '-45',
      AbsoluteMaxValue: '-46',
      MinValue: '-45',
      UnderMinValueRate: '0',
      MaxValue: '20',
      OverMaxValueRate: '2',
      ValueRate: ValueRate,
      BaseValue: '10',
      BaseValueFunction: () => { return this.BaseValue },
      OptionFlagCollection: {},
      ValueFunction: null,
      Name: Name,
      ShortName: ShortName,
    });
  }
}
