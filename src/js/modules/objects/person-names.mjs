import { CollectionOfStrings } from './collection.mjs';
import { Name, Names } from './names.mjs';

export class TitleName extends Name {}
/** @extends {Names<TitleName>} */
export class TitleNames extends Names {
  static NameType = TitleName;
}

export class FirstName extends Name {}
/** @extends {Names<FirstName>} */
export class FirstNames extends Names {
  static NameType = FirstName;
}

export class MiddleName extends Name {}
/** @extends {Names<MiddleName>} */
export class MiddleNames extends Names {
  static NameType = MiddleName;
}

export class PrefixName extends Name {}
/** @extends {Names<PrefixName>} */
export class PrefixNames extends Names {
  static NameType = PrefixName;
}

export class NameParticle extends Name {}
/** @extends {Names<NameParticle>} */
export class NameParticles extends Names {
  static NameType = NameParticle;
}

export class FamilyName extends Name {}
/** @extends {Names<FamilyName>} */
export class FamilyNames extends Names {
  static NameType = FamilyName;
}

export class PatronymicName extends Name {}
/** @extends {Names<PatronymicName>} */
export class PatronymicNames extends Names {
  static NameType = PatronymicName;
}

export class MatronymicName extends Name {}
/** @extends {Names<MatronymicName>} */
export class MatronymicNames extends Names {
  static NameType = MatronymicName;
}

export class SuffixName extends Name {}
/** @extends {Names<SuffixName>} */
export class SuffixNames extends Names {
  static NameType = SuffixName;
}

export class PreferredName extends Name {}
/** @extends {Names<PreferredName>} */
export class PreferredNames extends Names {
  static NameType = PreferredName;
}

export class CredentialName extends Name {}
/** @extends {Names<CredentialName>} */
export class CredentialNames extends Names {
  static NameType = CredentialName;
}

export { FamilyName as LastName, FamilyNames as LastNames };
export { FamilyName as SurnameName, FamilyNames as SurnameNames };
export { FamilyName as SirName, FamilyNames as SirNames };
export { PatronymicName as PaternalName, PatronymicNames as PaternalNames };
export { MatronymicName as MaternalName, MatronymicNames as MaternalNames };

function valuesFrom(single, multiple) {
  const values = single == null ? [] : [single];
  if (multiple == null) return values;
  if (CollectionOfStrings.isString(multiple)) return values.concat(multiple);
  if (typeof multiple[Symbol.iterator] === 'function') return values.concat(Array.from(multiple));
  return values.concat(multiple);
}

function joinNameParts(...collections) {
  return collections
    .filter((collection) => collection != null)
    .flatMap((collection) => Array.from(collection, String))
    .filter(Boolean)
    .join(' ');
}

function normalizeCulture(culture) {
  if (culture == null) return undefined;
  if (typeof culture === 'string') {
    const language = culture.split(/[-_]/, 1)[0].toLowerCase();
    const familyFirst = ['hu', 'ja', 'ko', 'vi', 'zh'].includes(language);
    return {
      code: culture,
      locale: culture,
      nameOrder: familyFirst ? 'family-first' : 'given-first',
    };
  }
  if (typeof culture !== 'object' || Array.isArray(culture)) {
    throw new TypeError('Culture metadata must be a culture code or an object');
  }

  const code = culture.code ?? culture.locale;
  const language = typeof code === 'string' ? code.split(/[-_]/, 1)[0].toLowerCase() : '';
  const familyFirst = ['hu', 'ja', 'ko', 'vi', 'zh'].includes(language);
  const nameOrder = culture.nameOrder ?? (familyFirst ? 'family-first' : 'given-first');
  if (typeof nameOrder !== 'string' && !Array.isArray(nameOrder)) {
    throw new TypeError('Culture nameOrder must be a string or an array of component names');
  }
  return { ...culture, code, locale: culture.locale ?? code, nameOrder };
}

export class PersonName extends Name {
  #unstructuredName;

  constructor(value = {}) {
    const isUnstructured = CollectionOfStrings.isString(value);
    const components = isUnstructured ? undefined : PersonName.createComponents(value);
    const culture = isUnstructured ? undefined : normalizeCulture(value.culture);
    super(isUnstructured ? String(value) : PersonName.compose(components, culture));
    this.#unstructuredName = isUnstructured ? String(value) : undefined;
    this.culture = culture;
    if (components) Object.assign(this, components);
  }

  static createComponents(options = {}) {
    if (options == null || typeof options !== 'object') {
      throw new TypeError('PersonName components must be provided as an object');
    }

    const familyName = options.familyName ?? options.lastName ?? options.surname ?? options.sirName;
    const familyNames =
      options.familyNames ?? options.lastNames ?? options.surnameNames ?? options.sirNames;
    const givenName = options.firstName ?? options.givenName;
    const givenNames = options.firstNames ?? options.givenNames;
    const patronymicName = options.patronymicName ?? options.paternalName;
    const patronymicNames = options.patronymicNames ?? options.paternalNames;
    const matronymicName = options.matronymicName ?? options.maternalName;
    const matronymicNames = options.matronymicNames ?? options.maternalNames;

    return {
      titles: new TitleNames(valuesFrom(options.title, options.titles)),
      prefixes: new PrefixNames(valuesFrom(options.prefix, options.prefixes)),
      firstNames: new FirstNames(valuesFrom(givenName, givenNames)),
      middleNames: new MiddleNames(valuesFrom(options.middleName, options.middleNames)),
      patronymicNames: new PatronymicNames(valuesFrom(patronymicName, patronymicNames)),
      matronymicNames: new MatronymicNames(valuesFrom(matronymicName, matronymicNames)),
      nameParticles: new NameParticles(valuesFrom(options.nameParticle, options.nameParticles)),
      familyNames: new FamilyNames(valuesFrom(familyName, familyNames)),
      suffixNames: new SuffixNames(valuesFrom(options.suffixName, options.suffixNames)),
      preferredNames: new PreferredNames(valuesFrom(options.preferredName, options.preferredNames)),
      credentialNames: new CredentialNames(
        valuesFrom(
          options.credentialName ?? options.credential,
          options.credentialNames ?? options.credentials
        )
      ),
    };
  }

  static compose(components, culture) {
    if (!components) return '';
    if (typeof culture?.formatName === 'function') return String(culture.formatName(components));

    const familyFirstOrder = [
      'prefixes',
      'titles',
      'familyNames',
      'firstNames',
      'middleNames',
      'patronymicNames',
      'matronymicNames',
      'nameParticles',
      'suffixNames',
      'credentialNames',
    ];
    const givenFirstOrder = [
      'prefixes',
      'titles',
      'firstNames',
      'middleNames',
      'patronymicNames',
      'matronymicNames',
      'nameParticles',
      'familyNames',
      'suffixNames',
      'credentialNames',
    ];
    const order = Array.isArray(culture?.nameOrder)
      ? culture.nameOrder
      : culture?.nameOrder === 'family-first'
        ? familyFirstOrder
        : givenFirstOrder;
    const parts = order.flatMap((component) => {
      const value = components[component];
      if (value == null) return [];
      if (CollectionOfStrings.isString(value)) return [String(value)];
      if (typeof value[Symbol.iterator] === 'function') return Array.from(value, String);
      return [String(value)];
    });
    return parts.filter(Boolean).join(culture?.separator ?? ' ');
  }

  get fullName() {
    return PersonName.compose(this, this.culture) || this.#unstructuredName || '';
  }

  get culture() {
    return this._culture;
  }

  set culture(value) {
    this._culture = normalizeCulture(value);
  }

  get locale() {
    return this.culture?.locale;
  }

  get isValid() {
    return this.validate().valid;
  }

  validate() {
    const errors = [];
    const culture = this.culture;
    if (!culture) return { valid: true, errors };

    for (const component of culture.requiredComponents ?? []) {
      const value = this[component];
      if (value == null || (typeof value.size === 'number' && value.size === 0)) {
        errors.push(
          `${component} is required by culture ${culture.code ?? culture.locale ?? 'metadata'}`
        );
      }
    }

    if (typeof culture.validateComponent === 'function') {
      const componentNames = [
        'titles',
        'prefixes',
        'firstNames',
        'middleNames',
        'patronymicNames',
        'matronymicNames',
        'nameParticles',
        'familyNames',
        'suffixNames',
        'preferredNames',
        'credentialNames',
      ];
      for (const component of componentNames) {
        for (const value of this[component] ?? []) {
          const result = culture.validateComponent({
            component,
            value: String(value),
            person: this,
            culture,
          });
          if (result === false) errors.push(`${component} value is invalid for this culture`);
          else if (typeof result === 'string' && result) errors.push(result);
        }
      }
    }

    if (typeof culture.validateName === 'function') {
      const result = culture.validateName(this);
      if (result === false) errors.push('Person name is invalid for this culture');
      else if (typeof result === 'string' && result) errors.push(result);
      else if (Array.isArray(result)) {
        errors.push(...result.filter((error) => typeof error === 'string'));
      }
    }

    return { valid: errors.length === 0, errors };
  }

  assertValid() {
    const result = this.validate();
    if (!result.valid) throw new RangeError(result.errors.join('; '));
    return this;
  }

  get title() {
    return this.titles?.first;
  }

  set title(value) {
    this.titles = new TitleNames(valuesFrom(value));
  }

  get prefix() {
    return this.prefixes?.first;
  }

  set prefix(value) {
    this.prefixes = new PrefixNames(valuesFrom(value));
  }

  get firstName() {
    return this.firstNames?.first;
  }

  set firstName(value) {
    this.firstNames = new FirstNames(valuesFrom(value));
  }

  get givenName() {
    return this.firstName;
  }

  set givenName(value) {
    this.firstName = value;
  }

  get middleName() {
    return this.middleNames?.first;
  }

  set middleName(value) {
    this.middleNames = new MiddleNames(valuesFrom(value));
  }

  get familyName() {
    return this.familyNames?.first;
  }

  set familyName(value) {
    this.familyNames = new FamilyNames(valuesFrom(value));
  }

  get lastName() {
    return this.familyName;
  }

  set lastName(value) {
    this.familyName = value;
  }

  get surname() {
    return this.familyName;
  }

  set surname(value) {
    this.familyName = value;
  }

  get sirName() {
    return this.familyName;
  }

  set sirName(value) {
    this.familyName = value;
  }

  get paternalName() {
    return this.patronymicName;
  }

  set paternalName(value) {
    this.patronymicName = value;
  }

  get maternalName() {
    return this.matronymicName;
  }

  set maternalName(value) {
    this.matronymicName = value;
  }

  get patronymicName() {
    return this.patronymicNames?.first;
  }

  set patronymicName(value) {
    this.patronymicNames = new PatronymicNames(valuesFrom(value));
  }

  get paternalNames() {
    return this.patronymicNames;
  }

  set paternalNames(value) {
    this.patronymicNames = new PatronymicNames(value);
  }

  get matronymicName() {
    return this.matronymicNames?.first;
  }

  set matronymicName(value) {
    this.matronymicNames = new MatronymicNames(valuesFrom(value));
  }

  get maternalNames() {
    return this.matronymicNames;
  }

  set maternalNames(value) {
    this.matronymicNames = new MatronymicNames(value);
  }

  get nameParticle() {
    return this.nameParticles?.first;
  }

  set nameParticle(value) {
    this.nameParticles = new NameParticles(valuesFrom(value));
  }

  get preferredName() {
    return this.preferredNames?.first;
  }

  set preferredName(value) {
    this.preferredNames = new PreferredNames(valuesFrom(value));
  }

  get credentialName() {
    return this.credentialNames?.first;
  }

  set credentialName(value) {
    this.credentialNames = new CredentialNames(valuesFrom(value));
  }

  get suffixName() {
    return this.suffixNames?.first;
  }

  set suffixName(value) {
    this.suffixNames = new SuffixNames(valuesFrom(value));
  }

  formatFullName() {
    return this.fullName;
  }

  formatFirstLast() {
    const given = joinNameParts(
      this.firstNames ?? new FirstNames(),
      this.middleNames ?? new MiddleNames()
    );
    const family = joinNameParts(this.familyNames ?? new FamilyNames());
    return [given, family].filter(Boolean).join(' ') || this.fullName;
  }

  formatLastFirst() {
    const family = joinNameParts(this.familyNames ?? new FamilyNames());
    const given = joinNameParts(
      this.firstNames ?? new FirstNames(),
      this.middleNames ?? new MiddleNames(),
      this.patronymicNames ?? new PatronymicNames(),
      this.matronymicNames ?? new MatronymicNames()
    );
    const main = family && given ? `${family}, ${given}` : family || given;
    const suffix = joinNameParts(this.suffixNames ?? new SuffixNames());
    const credentials = joinNameParts(this.credentialNames ?? new CredentialNames());
    return [main, suffix, credentials].filter(Boolean).join(', ') || this.fullName;
  }

  formatFormal() {
    return (
      joinNameParts(
        this.titles ?? new TitleNames(),
        this.prefixes ?? new PrefixNames(),
        this.familyNames ?? new FamilyNames(),
        this.suffixNames ?? new SuffixNames(),
        this.credentialNames ?? new CredentialNames()
      ) || this.fullName
    );
  }

  format(template = '{fullName}') {
    const aliases = {
      fullName: this.fullName,
      title: this.title,
      prefix: this.prefix,
      firstName: this.firstName,
      givenName: this.givenName,
      middleName: this.middleName,
      patronymicName: this.patronymicName,
      paternalName: this.paternalName,
      matronymicName: this.matronymicName,
      maternalName: this.maternalName,
      nameParticle: this.nameParticle,
      familyName: this.familyName,
      lastName: this.lastName,
      surname: this.surname,
      sirName: this.sirName,
      suffixName: this.suffixName,
      preferredName: this.preferredName,
      credentialName: this.credentialName,
    };
    return String(template).replace(/\{([^}]+)\}/g, (token, key) => {
      const value = aliases[key] ?? this[key];
      return value == null ? '' : String(value);
    });
  }

  formatPreferredName() {
    return this.preferredName == null ? this.fullName : String(this.preferredName);
  }

  formatDisplayName() {
    return this.formatPreferredName();
  }

  toString() {
    return this.fullName;
  }

  valueOf() {
    return this.fullName;
  }

  [Symbol.toPrimitive]() {
    return this.fullName;
  }
}

/** @extends {Names<PersonName>} */
export class PersonNames extends Names {
  /** @type {typeof PersonName} */
  static NameType = PersonName;
}
