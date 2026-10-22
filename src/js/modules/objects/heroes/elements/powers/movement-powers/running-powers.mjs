import { Collection } from '../../../../collection.mjs';
import { MovementPower } from '../movement-powers.mjs';
import { CharacterElements } from '../../../character-element.mjs';
export class Running extends MovementPower {
  static Filter(characterElements) {
    if (characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter((element) => element instanceof Running);
  }
  constructor({
    BaseValue = 6,
    ValueRate = 2,
    Name = 'Running',
    ShortName = 'Running',
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
/** @extends {Collection<Running>} */
export class RunningPowers extends Collection {}
