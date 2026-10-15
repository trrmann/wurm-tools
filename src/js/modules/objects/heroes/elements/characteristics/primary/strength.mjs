import { CharacteristicPrimary } from '../../characteristic-primary.mjs';
export class Strength extends CharacteristicPrimary {
  constructor({ Points = 0 } = {}) {
    super({
      Points: Points,
      ValueRate: '1',
      Name: 'Strength',
      ShortName: 'STR',
    });
  }
}
