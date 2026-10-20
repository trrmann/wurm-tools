import { PrimaryCharacteristic } from '../../primary-characteristics.mjs';
import { Collection } from '../../../../collection.mjs';
import { CharacterElements } from '../../../character-element.mjs';
export class Presence extends PrimaryCharacteristic {
  static Filter(characterElements) {
    if (characterElements instanceof CharacterElements === false) {
      throw new Error('Filter expects a CharacterElements object');
    }
    return characterElements.filter((element) => element instanceof Presence);
  }
  #attackDice(score) {
    if (score < 3) return '0';
    // Breaks down values cleanly into whole numbers and standard fractions
    const baseValue = (score - 0) / 5;
    const whole = Math.floor(baseValue);
    const fraction = baseValue - whole;
    if (fraction === 0) return `${whole}`;
    if (fraction === 0.6) return `${whole} 1/2`; // Handles the off-step offsets (3, 8, 13, 18, 23, 28)
    return `${whole}`;
  }
  constructor({ Points = 0 } = {}) {
    super({
      Points: Points,
      ValueRate: '1',
      Name: 'Presence',
      ShortName: 'PRE',
    });
  }
  PresenceRoll() {
    return this.CharacteristicRoll();
  }
  EffectivePresenceRoll() {
    return this.EffectiveCharacteristicRoll();
  }
  EffectivePresence() {
    return this.EffectiveCharacteristic();
  }
  BasePresenceAttack() {
    return this.#attackDice(this.Value());
  }
  BaseEffectivePresenceAttack() {
    return this.#attackDice(this.EffectivePresence());
  }
}
/** @extends {Collection<Presence>} */
export class PresenceCharacteristics extends Collection {}
