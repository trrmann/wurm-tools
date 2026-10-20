import { FiguredCharacteristic } from '../../figured-characteristics.mjs';
import { Body } from '../primary-characteristics/body-characteristics.mjs';
import { Strength } from '../primary-characteristics/strength-characteristics.mjs';
import { Constitution } from '../primary-characteristics/constitution-characteristics.mjs';
import { Collection } from '../../../../collection.mjs';
import { CharacterElements } from '../../../character-element.mjs';
import { MixedNumber } from '../../../../mixed-numbers.mjs';
export class Stun extends FiguredCharacteristic {
  static Filter(characterElements) {
    if (characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter((element) => element instanceof Stun);
  }

  constructor({ Points = 0, characterElements = null } = {}) {
    super({
      Points: Points,
      AbsoluteMinValue: '0',
      MinValue: '0',
      UnderMinValueRate: '0',
      MaxValue: '50',
      OverMaxValueRate: '2',
      ValueRate: '1',
      BaseValue: '0',
      BaseValueFunction: ({ characterElements = null }) => {
        if (characterElements instanceof CharacterElements) {
          const ConstitutionCharacteristic = Constitution.Filter(characterElements)[0] || null;
          const StrengthCharacteristic = Strength.Filter(characterElements)[0] || null;
          const BodyCharacteristic = Body.Filter(characterElements)[0] || null;
          if (
            StrengthCharacteristic instanceof Strength &&
            BodyCharacteristic instanceof Body &&
            ConstitutionCharacteristic instanceof Constitution
          ) {
            return MixedNumber.from(BodyCharacteristic.Value())
              .add(StrengthCharacteristic.Value())
              .add(ConstitutionCharacteristic.Value())
              .divide(2);
          } else if (
            StrengthCharacteristic instanceof Strength &&
            BodyCharacteristic instanceof Body
          ) {
            return MixedNumber.from(BodyCharacteristic.Value()).add(
              MixedNumber.from(StrengthCharacteristic.Value()).divide(2)
            );
          } else if (
            StrengthCharacteristic instanceof Strength &&
            ConstitutionCharacteristic instanceof Constitution
          ) {
            return MixedNumber.from(StrengthCharacteristic.Value())
              .add(ConstitutionCharacteristic.Value())
              .divide(2);
          } else if (
            BodyCharacteristic instanceof Body &&
            ConstitutionCharacteristic instanceof Constitution
          ) {
            return MixedNumber.from(BodyCharacteristic.Value()).add(
              MixedNumber.from(ConstitutionCharacteristic.Value()).divide(2)
            );
          } else if (StrengthCharacteristic instanceof Strength) {
            return MixedNumber.from(StrengthCharacteristic.Value()).divide(2);
          } else if (BodyCharacteristic instanceof Body) {
            return BodyCharacteristic.Value();
          } else if (ConstitutionCharacteristic instanceof Constitution) {
            return MixedNumber.from(ConstitutionCharacteristic.Value()).divide(2);
          }
        }
        throw new Error('Stun Base Value requires valid Strength, Body, and Constitution objects');
      },
      Name: 'Stun',
      ShortName: 'STUN',
      characterElements,
    });
  }
}
/** @extends {Collection<Stun>} */
export class StunCharacteristics extends Collection {}
