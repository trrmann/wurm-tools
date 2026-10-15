import { CharacteristicPrimary } from '../../characteristic-primary.mjs';
export class Constitution extends CharacteristicPrimary {
  constructor({ Points = 0 } = {}) {
    super({
      Points: Points,
      ValueRate: '2',
      Name: 'Constitution',
      ShortName: 'CON',
    });
  }
}
