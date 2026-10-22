import { Collection } from '../../../../collection.mjs';
import { MovementPower } from '../movement-powers.mjs';
import { CharacterElements } from '../../../character-element.mjs';
export class Swimming extends MovementPower {
  static Filter(characterElements) {
    if (characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter((element) => element instanceof Swimming);
  }
  constructor({
    BaseValue = 2,
    ValueRate = 1,
    Name = 'Swimming',
    ShortName = 'Swimming',
    ...options
  } = {}) {
    super({
      ...options,
      BaseValue,
      ValueRate,
      Name,
      ShortName,
    });
  }
  get valueUnit() {
    return '"';
  }
}
/** @extends {Collection<Swimming>} */
export class SwimmingPowers extends Collection {}
