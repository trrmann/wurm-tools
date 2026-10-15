import { CharacteristicPrimary } from '../../characteristic-primary.mjs';
export class Body extends CharacteristicPrimary {
  constructor({ Points = 0 } = {}) {
    super({
      Points: Points,
      ValueRate: '2',
      Name: 'Body',
      ShortName: 'BODY',
    });
  }
}
