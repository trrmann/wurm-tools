import { CharacteristicPrimary } from '../../characteristic-primary.mjs';
export class Dexterity extends CharacteristicPrimary {
  constructor({ Points = 0 } = {}) {
    super({
      Points: Points,
      ValueRate: '3',
      Name: 'Dexterity',
      ShortName: 'DEX',
    });
  }
}
