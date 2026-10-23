import { PersonName } from '../person-names.mjs';

export const DEFAULT_NAME_CULTURES = Object.freeze([
  { code: '', label: 'Unspecified culture', nameOrder: 'given-first' },
  ...[
    ['en-US', 'English (United States)', 'given-first'],
    ['en-GB', 'English (United Kingdom)', 'given-first'],
    ['es', 'Spanish', 'given-first'],
    ['fr', 'French', 'given-first'],
    ['de', 'German', 'given-first'],
    ['pt', 'Portuguese', 'given-first'],
    ['ar', 'Arabic', 'given-first'],
    ['hi', 'Hindi', 'given-first'],
    ['hu', 'Hungarian', 'family-first'],
    ['ja-JP', 'Japanese', 'family-first'],
    ['ko', 'Korean', 'family-first'],
    ['vi', 'Vietnamese', 'family-first'],
    ['zh', 'Chinese', 'family-first'],
  ].map(([code, label, nameOrder]) => ({ code, label, nameOrder })),
]);

export function normalizeNameCultures(source) {
  if (!Array.isArray(source) || !source.length || source.length > 100)
    throw new TypeError('Configure between 1 and 100 cultures');
  const codes = new Set();
  const cultures = source.map((entry) => {
    if (!entry || typeof entry.code !== 'string' || typeof entry.label !== 'string')
      throw new TypeError('Each culture requires a code, label and name order');
    const normalized = normalizeAccountName({ culture: entry.code, nameOrder: entry.nameOrder });
    if (
      !['given-first', 'family-first'].includes(entry.nameOrder) ||
      !entry.label.trim() ||
      entry.label.length > 120 ||
      codes.has(normalized.culture)
    )
      throw new RangeError('Culture codes must be unique and labels and name order valid');
    codes.add(normalized.culture);
    return { code: normalized.culture, label: entry.label.trim(), nameOrder: normalized.nameOrder };
  });
  if (!codes.has('')) throw new RangeError('Keep an unspecified culture with an empty code');
  return cultures;
}

export const ACCOUNT_NAME_FIELDS = Object.freeze([
  ['title', 'Title'],
  ['prefix', 'Prefix'],
  ['firstName', 'Given name(s)'],
  ['middleName', 'Middle name(s)'],
  ['patronymicName', 'Patronymic name(s)'],
  ['matronymicName', 'Matronymic name(s)'],
  ['nameParticle', 'Name particle(s)'],
  ['familyName', 'Family name(s)'],
  ['suffixName', 'Suffix'],
  ['preferredName', 'Preferred name'],
  ['credentialName', 'Credentials'],
]);

export function normalizeAccountName(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source))
    throw new TypeError('Personal name must be a structured object');
  const result = {};
  for (const key of [...ACCOUNT_NAME_FIELDS.map(([key]) => key), 'culture', 'nameOrder']) {
    const value = source[key] ?? '';
    if (
      typeof value !== 'string' ||
      value.length > 120 ||
      Array.from(value).some(
        (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
      )
    )
      throw new TypeError(
        'Name components must be text of at most 120 characters without control characters'
      );
    result[key] = value.trim();
  }
  if (result.culture) {
    try {
      result.culture = Intl.getCanonicalLocales(result.culture)[0];
    } catch {
      throw new RangeError('Enter a valid culture/language tag, such as en-US or ja-JP');
    }
  }
  result.nameOrder ||= 'auto';
  if (!['auto', 'given-first', 'family-first'].includes(result.nameOrder))
    throw new RangeError('Choose automatic, given-name-first, or family-name-first ordering');
  return result;
}

export function accountPersonName(source, cultures) {
  const normalized = normalizeAccountName(source);
  const configured = cultures?.find((entry) => entry.code === normalized.culture);
  const culture = configured
    ? { code: configured.code || undefined, nameOrder: configured.nameOrder }
    : normalized.nameOrder === 'auto'
      ? normalized.culture || undefined
      : { code: normalized.culture || undefined, nameOrder: normalized.nameOrder };
  return new PersonName({ ...normalized, culture }).assertValid();
}

export function accountDisplayName(source, cultures) {
  const person = accountPersonName(source, cultures);
  return String(person.preferredName || '') || person.fullName;
}
