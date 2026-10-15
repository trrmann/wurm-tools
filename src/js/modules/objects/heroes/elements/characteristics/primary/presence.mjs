import { CharacteristicPrimary } from '../../characteristic-primary.mjs';
export class Presence extends CharacteristicPrimary {
  constructor({ Points = 0 } = {}) {
    super({
      Points: Points,
      ValueRate: '1',
      Name: 'Presence',
      ShortName: 'PRE',
    });
  }
}
