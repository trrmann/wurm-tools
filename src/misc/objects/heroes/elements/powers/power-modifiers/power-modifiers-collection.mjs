import { Collection } from '../../../../collection.mjs';

export class PowerModifiers extends Collection {
  get Names() {
    return this.map((modifier) => modifier.name ?? modifier.Name);
  }

  get PowerAdvantages() {
    return this.filter((modifier) => modifier.kind === 'advantage');
  }

  get PowerAdvantageNames() {
    return this.PowerAdvantages.map((modifier) => modifier.name ?? modifier.Name);
  }

  get PowerLimitations() {
    return this.filter((modifier) => modifier.kind === 'limitation');
  }

  get PowerLimitationNames() {
    return this.PowerLimitations.map((modifier) => modifier.name ?? modifier.Name);
  }

  Add(modifier) {
    return this.add(modifier);
  }

  Get(modifierName) {
    return this.find((modifier) => (modifier.name ?? modifier.Name) === modifierName);
  }

  Remove(modifierName) {
    const modifier = this.Get(modifierName);
    return modifier ? this.remove(modifier) : false;
  }
}
