import { CharacteristicPrimary } from '../../characteristic-primary.mjs';
export class Ego extends CharacteristicPrimary {
  constructor({ Points = 0 } = {}) {
    super({
      Points: Points,
      ValueRate: '2',
      Name: 'Ego',
      ShortName: 'EGO',
    });
  }
}
