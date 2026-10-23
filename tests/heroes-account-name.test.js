import { describe, expect, it } from 'vitest';
import {
  normalizeAccountName,
  accountPersonName,
  accountDisplayName,
} from '../src/js/modules/objects/heroes/account-name.mjs';
import { PersonName } from '../src/js/modules/objects/person-names.mjs';
import { heroesAccountLabel } from '../src/js/tools/heroes/session.js';

describe('structured HERO account names', () => {
  it('uses the existing PersonName model and preserves structured components through JSON', () => {
    const source = normalizeAccountName({
      title: 'Dr.',
      firstName: 'Ada',
      middleName: 'Augusta',
      familyName: 'Lovelace',
      preferredName: 'Ada',
      culture: 'en-us',
    });
    const saved = JSON.parse(JSON.stringify(source));
    expect(saved.culture).toBe('en-US');
    expect(accountPersonName(saved)).toBeInstanceOf(PersonName);
    expect(accountDisplayName(saved)).toBe('Ada');
    expect(saved.preferredName).toBe('Ada');
    expect(heroesAccountLabel({ username: 'ada', displayName: accountDisplayName(saved) })).toBe(
      'Ada (@ada)'
    );
  });

  it('supports culture-derived family-first ordering and explicit overrides without requiring a surname', () => {
    expect(accountDisplayName({ firstName: 'Hana', familyName: 'Tanaka', culture: 'ja-JP' })).toBe(
      'Tanaka Hana'
    );
    expect(
      accountDisplayName({
        firstName: 'Hana',
        familyName: 'Tanaka',
        culture: 'ja-JP',
        nameOrder: 'given-first',
      })
    ).toBe('Hana Tanaka');
    expect(accountDisplayName({ firstName: 'Sukarno' })).toBe('Sukarno');
    expect(accountDisplayName({ preferredName: 'River' })).toBe('River');
    expect(accountDisplayName({})).toBe('');
    expect(heroesAccountLabel({ username: 'unchanged' })).toBe('unchanged');
  });

  it('retains patronymic, matronymic, particle, suffix and credential components', () => {
    const source = {
      firstName: 'Alex',
      patronymicName: 'Patronymic',
      matronymicName: 'Matronymic',
      nameParticle: 'de',
      familyName: 'Vale',
      suffixName: 'Jr.',
      credentialName: 'PhD',
    };
    expect(accountDisplayName(source)).toBe('Alex Patronymic Matronymic de Vale Jr. PhD');
  });

  it('rejects malformed inputs and drops unrelated account properties', () => {
    for (const source of [
      null,
      [],
      'name',
      { firstName: 42 },
      { firstName: 'x'.repeat(121) },
      { firstName: 'bad\nname' },
      { culture: 'not a tag' },
      { nameOrder: 'invented' },
    ]) {
      expect(() => normalizeAccountName(source)).toThrow();
    }
    expect(normalizeAccountName({ firstName: ' Alex ', roles: ['admin'] })).toMatchObject({
      firstName: 'Alex',
    });
    expect(normalizeAccountName({ roles: ['admin'] })).not.toHaveProperty('roles');
  });
});
