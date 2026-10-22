import { Collection } from '../../../../collection.mjs';
import { MovementPower } from '../movement-powers.mjs';
import { CharacterElements } from '../../../character-element.mjs';
import { Strength } from '../../characteristics/primary-characteristics/strength-characteristics.mjs';
import { MixedNumber } from '../../../../mixed-numbers.mjs';
export class Leaping extends MovementPower {
  static Filter(characterElements) {
    if (characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter((element) => element instanceof Leaping);
  }
  constructor({
    BaseValue,
    ValueRate = 1,
    Name = 'Leaping',
    ShortName = 'Leaping',
    BaseValueFunction = ({ characterElements }) => {
      if (BaseValue != null) return BaseValue;
      if (characterElements instanceof CharacterElements) {
        const strength = Strength.Filter(characterElements)[0];
        if (strength instanceof Strength) {
          return MixedNumber.from(strength.Value()).divide(5);
        }
      }
      throw new Error('Leaping Base Value requires a valid Strength characteristic');
    },
    ...options
  } = {}) {
    super({
      ...options,
      BaseValue,
      ValueRate,
      Name,
      ShortName,
      BaseValueFunction,
    });
  }
  get valueUnit() {
    return '"';
  }
}
/** @extends {Collection<Leaping>} */
export class LeapingPowers extends Collection {}
