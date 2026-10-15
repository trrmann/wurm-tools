import { CharacteristicPrimary } from '../../characteristic-primary.mjs';
export class Comeliness extends CharacteristicPrimary {
  constructor({ Points = 0 } = {}) {
    super({
      Points: Points,
      ValueRate: '1/2',
      Name: 'Comeliness',
      ShortName: 'COM',
    });
  }
}
