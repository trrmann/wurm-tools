import { CharacteristicPrimary } from '../../characteristic-primary.mjs';
export class Intelligence extends CharacteristicPrimary {
  constructor({ Points = 0 } = {}) {
    super({
      Points: Points,
      ValueRate: '1',
      Name: 'Intelligence',
      ShortName: 'INT',
    });
  }
}
