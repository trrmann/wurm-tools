import { describe, expect, it } from 'vitest';
import { Collection, CollectionOfStrings } from '../src/js/modules/objects/collection.mjs';
import { Name, Names } from '../src/js/modules/objects/names.mjs';
import {
  ActionName,
  ActionNames,
  CategorizationName,
  CategorizationNames,
  ClassificationName,
  ClassificationNames,
  DescriptionName,
  DescriptionNames,
  EventName,
  EventNames,
  SpecificationName,
  SpecificationNames,
  ThingName,
  ThingNames,
} from '../src/js/modules/objects/things.mjs';
import {
  CredentialName,
  CredentialNames,
  FamilyName,
  FamilyNames,
  FirstName,
  FirstNames,
  LastName,
  LastNames,
  MaternalName,
  MaternalNames,
  MatronymicName,
  MatronymicNames,
  MiddleName,
  MiddleNames,
  NameParticle,
  NameParticles,
  PaternalName,
  PaternalNames,
  PatronymicName,
  PatronymicNames,
  PersonName,
  PersonNames,
  PrefixName,
  PrefixNames,
  PreferredName,
  PreferredNames,
  SirName,
  SirNames,
  SuffixName,
  SuffixNames,
  SurnameName,
  SurnameNames,
  TitleName,
  TitleNames,
} from '../src/js/modules/objects/person-names.mjs';
import {
  Address,
  Addresses,
  AddressLineName,
  AddressLineNames,
  BlockName,
  BlockNames,
  BuildingNumber,
  BuildingNumbers,
  BunkNumber,
  BunkNumbers,
  CampusName,
  CampusNames,
  CityName,
  CityNames,
  EntranceName,
  EntranceNames,
  GalaxyName,
  GalaxyNames,
  GalaxyClusterName,
  GalaxyClusterNames,
  LandmarkName,
  LandmarkNames,
  MunicipalityName,
  MunicipalityNames,
  ParcelName,
  ParcelNames,
  PlaceName,
  PlaceNames,
  PostOfficeBoxNumber,
  PostOfficeBoxNumbers,
  PostalCodeName,
  PostalCodeNames,
  StarClusterName,
  StarClusterNames,
  SuperclusterName,
  SuperclusterNames,
  RoomName,
  RoomNames,
  StairwellName,
  StairwellNames,
  TownName,
  TownNames,
  UniverseName,
  UniverseNames,
  VillageName,
  VillageNames,
  WardName,
  WardNames,
  StateName,
  StateNames,
  StreetNumber,
  StreetNumbers,
} from '../src/js/modules/objects/place-names.mjs';

describe('Name and string collections', () => {
  it('wraps string values with the native String API', () => {
    const name = new Name('Aria Vale');

    expect(name).toBeInstanceOf(String);
    expect(String(name)).toBe('Aria Vale');
    expect(name.toUpperCase()).toBe('ARIA VALE');
    expect(name.equals('Aria Vale')).toBe(true);
    expect(name.equals('aria vale')).toBe(false);
    expect(() => new Name(12)).toThrow(TypeError);
  });

  it('accepts primitive and boxed strings while rejecting non-strings', () => {
    const strings = new CollectionOfStrings(['hello', new String('world')]);

    expect(strings.toArray().map(String)).toEqual(['hello', 'world']);
    expect(() => strings.add(1)).toThrow(TypeError);
    expect(() => strings.push('valid', null)).toThrow(TypeError);
    expect(() => (strings[0] = 4)).toThrow(TypeError);
    expect(() => strings.splice(0, 0, false)).toThrow(TypeError);
  });

  it('supports shared ThingName metadata and event, action, and description names', () => {
    const thing = new ThingName({
      name: 'Arc reactor',
      classifications: ['device'],
      specifications: ['portable'],
      categorizations: ['equipment'],
    });

    expect(thing.classificationNames).toBeInstanceOf(ClassificationNames);
    expect(thing.classificationNames.first).toBeInstanceOf(ClassificationName);
    expect(thing.specificationNames).toBeInstanceOf(SpecificationNames);
    expect(thing.specificationNames.first).toBeInstanceOf(SpecificationName);
    expect(thing.categorizationNames).toBeInstanceOf(CategorizationNames);
    expect(thing.categorizationNames.first).toBeInstanceOf(CategorizationName);
    expect(new EventNames(['Origin']).first).toBeInstanceOf(EventName);
    expect(new ActionNames(['Fly']).first).toBeInstanceOf(ActionName);
    expect(new DescriptionNames(['Bright blue energy']).first).toBeInstanceOf(DescriptionName);
  });

  it('preserves inherited collection features for Names', () => {
    const names = new Names([new Name('Zoe'), new Name('Ada'), new Name('Mia')]);

    expect(names).toBeInstanceOf(Collection);
    expect(names).toBeInstanceOf(CollectionOfStrings);
    expect(names.where((name) => name.startsWith('A'))).toBeInstanceOf(Names);
    expect(names.map((name) => name.toUpperCase())).toBeInstanceOf(Collection);
    expect(names.map((name) => name.toUpperCase()).toArray()).toEqual(['ZOE', 'ADA', 'MIA']);
    expect(names.sortBy((name) => name.toString())).toBe(names);
    expect(names.map((name) => name.toString()).toArray()).toEqual(['Ada', 'Mia', 'Zoe']);
    expect(names.groupBy((name) => name.toString().slice(0, 1)).get('A')).toBeInstanceOf(Names);
    expect(names.join(', ')).toBe('Ada, Mia, Zoe');
    expect(names.remove(new Name('Mia'))).toBe(false);
    expect(names.removeWhere((name) => name.equals('Mia'))).toHaveLength(1);
    expect(names.toArray().map(String)).toEqual(['Ada', 'Zoe']);
  });

  it('joins and splits strings into flattened collections', () => {
    const strings = new CollectionOfStrings(['red,green', 'blue']);

    expect(strings.join(' | ')).toBe('red,green | blue');
    expect(strings.split(',').toArray()).toEqual(['red', 'green', 'blue']);
    expect(strings.splitEach(/[,\s]+/).toArray()).toEqual(['red', 'green', 'blue']);
    expect(strings.split(',')).toBeInstanceOf(CollectionOfStrings);
  });

  it('sorts naturally, by locale, and without case sensitivity', () => {
    const files = new CollectionOfStrings(['file10', 'File2', 'file1']);

    expect(files.sortNatural().toArray()).toEqual(['file1', 'File2', 'file10']);
    expect(files.sortIgnoreCase().toArray()).toEqual(['file1', 'file10', 'File2']);
    expect(files.sortLocale('en', { numeric: true }).toArray()).toEqual([
      'file1',
      'File2',
      'file10',
    ]);
  });

  it('transforms and filters strings with common predicates', () => {
    const strings = new CollectionOfStrings(['  Alpha.TXT ', 'beta.txt', 'Gamma.log']);

    expect(strings.lowercase().toArray()).toEqual(['  alpha.txt ', 'beta.txt', 'gamma.log']);
    expect(strings.uppercase().toArray()).toEqual(['  ALPHA.TXT ', 'BETA.TXT', 'GAMMA.LOG']);
    expect(strings.trimAll().toArray()).toEqual(['Alpha.TXT', 'beta.txt', 'Gamma.log']);
    expect(strings.filterStartsWith('  alpha', { caseInsensitive: true }).toArray()).toEqual([
      '  Alpha.TXT ',
    ]);
    expect(strings.filterEndsWith('.TXT', { caseInsensitive: true }).toArray()).toEqual([
      'beta.txt',
    ]);
    expect(strings.filterContains('AM', { caseInsensitive: true }).toArray()).toEqual([
      'Gamma.log',
    ]);
    expect(strings.filterRegex(/\.txt\s*$/i).toArray()).toEqual(['  Alpha.TXT ', 'beta.txt']);
  });

  it('deduplicates and measures string lengths', () => {
    const strings = new CollectionOfStrings(['Apple', 'apple', 'pear', 'kiwi']);

    expect(strings.unique().toArray()).toEqual(['Apple', 'apple', 'pear', 'kiwi']);
    expect(strings.unique({ caseInsensitive: true }).toArray()).toEqual(['Apple', 'pear', 'kiwi']);
    expect(strings.longest()).toBe('Apple');
    expect(strings.shortest()).toBe('pear');
    expect(strings.totalCharacters).toBe(18);
  });

  it('provides typed string-name collections for people, places, and things', () => {
    const people = new PersonNames(['Ada', new PersonName('Mia')]);
    const places = new PlaceNames([new PlaceName('Mount Rushmore')]);
    const addresses = new Addresses([new Address({ cityName: 'Provo' })]);
    const things = new ThingNames(['Sword', new ThingName('Shield')]);

    expect(people).toBeInstanceOf(Names);
    expect(people).toBeInstanceOf(CollectionOfStrings);
    expect(people.first).toBeInstanceOf(PersonName);
    expect(places.first).toBeInstanceOf(PlaceName);
    expect(places.first.toString()).toBe('Mount Rushmore');
    expect(addresses.first).toBeInstanceOf(Address);
    expect(addresses.first).toBeInstanceOf(PlaceName);
    expect(addresses).toBeInstanceOf(Names);
    expect(things.first).toBeInstanceOf(ThingName);
    expect(people.filter((name) => name.startsWith('A'))).toBeInstanceOf(PersonNames);
    expect(people.split(' ')).toBeInstanceOf(PersonNames);
    expect(places.map((name) => name.toUpperCase())).toBeInstanceOf(Collection);
    expect(people.join(', ')).toBe('Ada, Mia');
    expect(() => people.add(new PlaceName('Wrong type'))).toThrow(TypeError);
    expect(() => new PersonNames([new Name('Unspecified type')])).toThrow(TypeError);
  });

  it('structures place names from galaxy down to room and bunk', () => {
    const place = new Address({
      culture: { code: 'en-US', nameOrder: 'outside-in' },
      galaxyName: 'Milky Way',
      starSystemName: 'Sol',
      planetName: 'Earth',
      continentName: 'North America',
      countryName: 'United States',
      stateName: 'Utah',
      countyName: 'Utah County',
      cityName: 'Provo',
      neighborhoodName: 'North Park',
      streetNumber: '42',
      streetName: 'Oak Street',
      buildingName: 'Cedar Hall',
      floorName: '3',
      roomName: '314',
      bunkNumber: 2,
    });

    expect(place).toBeInstanceOf(Name);
    expect(place.galaxyName).toBeInstanceOf(GalaxyName);
    expect(place.galaxyNames).toBeInstanceOf(GalaxyNames);
    expect(place.stateProvinceName).toBeInstanceOf(StateName);
    expect(place.cityNames).toBeInstanceOf(CityNames);
    expect(place.streetNumber).toBeInstanceOf(StreetNumber);
    expect(place.streetNumbers).toBeInstanceOf(StreetNumbers);
    expect(place.roomName).toBeInstanceOf(RoomName);
    expect(place.roomNames).toBeInstanceOf(RoomNames);
    expect(place.roomNumber).toBe(place.roomName);
    expect(place.bunkNumber).toBeInstanceOf(BunkNumber);
    expect(place.bunkNumbers).toBeInstanceOf(BunkNumbers);
    expect(place.fullName).toBe(
      'Milky Way, Sol, Earth, North America, United States, Utah, Utah County, Provo, North Park, Oak Street, 42, Cedar Hall, 3, 314, 2'
    );
    expect(place.formatInsideOut()).toBe(
      '2, 314, 3, Cedar Hall, 42, Oak Street, North Park, Provo, Utah County, Utah, United States, North America, Earth, Sol, Milky Way'
    );
    expect(() => new BunkNumber(-1)).toThrow(RangeError);
    expect(() => new BunkNumber(1.5)).toThrow(RangeError);
    expect(
      place.format(
        '{cityName}, {stateName} {streetNumber} {streetName}, room {roomName}, bunk {bunkNumber}'
      )
    ).toBe('Provo, Utah 42 Oak Street, room 314, bunk 2');
  });

  it('defaults culture-free addresses to inside-out hierarchy', () => {
    const place = new Address({ galaxyName: 'Milky Way', planetName: 'Earth' });

    expect(place.fullName).toBe('Earth, Milky Way');
  });

  it('represents named places with grid or geographic coordinates', () => {
    const mountRushmore = new PlaceName({
      name: 'Mount Rushmore',
      latitude: 43.8791,
      longitude: -103.4591,
      altitude: 1745,
    });
    const gridPlace = PlaceName.fromGrid(120, 85, {
      gridSystem: 'local',
      depth: 12.5,
    });
    const oceanPoint = PlaceName.fromLatitudeLongitude(-12.5, 144.25, { depth: 4300 });

    expect(mountRushmore).toBeInstanceOf(PlaceName);
    expect(mountRushmore.fullName).toBe('Mount Rushmore (43.8791, -103.4591, altitude 1745)');
    expect(mountRushmore.coordinates).toEqual({
      type: 'geographic',
      latitude: 43.8791,
      longitude: -103.4591,
      altitude: 1745,
      depth: undefined,
    });
    expect(gridPlace.coordinates).toMatchObject({ type: 'grid', x: 120, y: 85, depth: 12.5 });
    expect(gridPlace.fullName).toBe('local Grid 120, 85, depth 12.5');
    expect(oceanPoint.fullName).toBe('-12.5, 144.25, depth 4300');
    expect(() => new PlaceName({ latitude: 91, longitude: 0 })).toThrow(RangeError);
    expect(() => new PlaceName({ gridX: 1, gridY: 2, latitude: 10, longitude: 10 })).toThrow(
      TypeError
    );
    expect(() => new PlaceName({ latitude: 1, longitude: 2, altitude: 10, depth: 10 })).toThrow(
      RangeError
    );
  });

  it('covers extended cosmic, municipal, postal, parcel, and access components', () => {
    const place = new Address({
      universe: 'Observable Universe',
      superclusterName: 'Laniakea',
      galaxyClusterName: 'Local Group',
      galaxy: 'Milky Way',
      starCluster: 'Pleiades',
      solarSystemNames: ['Sol', 'Alpha Centauri'],
      planet: 'Earth',
      municipality: 'Rexburg',
      town: 'Rexburg',
      village: 'Sugar City',
      ward: 'North Ward',
      landmark: 'Clock Tower',
      postalCode: '83440',
      addressLine: 'Campus Housing',
      campus: 'BYU-Idaho',
      parcel: 'Parcel 8',
      block: 'Block C',
      building: 'Cedar Hall',
      buildingNumber: '12',
      entrance: 'East Entrance',
      stairwell: 'Stairwell B',
    });

    expect(place.universeName).toBeInstanceOf(UniverseName);
    expect(place.universeNames).toBeInstanceOf(UniverseNames);
    expect(place.superclusterName).toBeInstanceOf(SuperclusterName);
    expect(place.superclusterNames).toBeInstanceOf(SuperclusterNames);
    expect(place.galaxyClusterName).toBeInstanceOf(GalaxyClusterName);
    expect(place.galaxyClusterNames).toBeInstanceOf(GalaxyClusterNames);
    expect(place.starClusterName).toBeInstanceOf(StarClusterName);
    expect(place.starClusterNames).toBeInstanceOf(StarClusterNames);
    expect(place.solarSystemNames).toHaveLength(2);
    expect(place.municipalityName).toBeInstanceOf(MunicipalityName);
    expect(place.townNames).toBeInstanceOf(TownNames);
    expect(place.townName).toBeInstanceOf(TownName);
    expect(place.villageName).toBeInstanceOf(VillageName);
    expect(place.wardName).toBeInstanceOf(WardName);
    expect(place.landmarkName).toBeInstanceOf(LandmarkName);
    expect(place.landmarkNames).toBeInstanceOf(LandmarkNames);
    expect(place.postcode).toBeInstanceOf(PostalCodeName);
    expect(place.postalCodeNames).toBeInstanceOf(PostalCodeNames);
    expect(place.addressLineName).toBeInstanceOf(AddressLineName);
    expect(place.addressLineNames).toBeInstanceOf(AddressLineNames);
    expect(place.siteName).toBeInstanceOf(CampusName);
    expect(place.parcelNames).toBeInstanceOf(ParcelNames);
    expect(place.lotName).toBeInstanceOf(ParcelName);
    expect(place.blockName).toBeInstanceOf(BlockName);
    expect(place.buildingNumber).toBeInstanceOf(BuildingNumber);
    expect(place.entranceName).toBeInstanceOf(EntranceName);
    expect(place.stairwellName).toBeInstanceOf(StairwellName);
    expect(place.campusNames).toBeInstanceOf(CampusNames);
    expect(place.blockNames).toBeInstanceOf(BlockNames);
    expect(place.buildingNumbers).toBeInstanceOf(BuildingNumbers);
    expect(place.entranceNames).toBeInstanceOf(EntranceNames);
    expect(place.stairwellNames).toBeInstanceOf(StairwellNames);
    expect(place.municipalityNames).toBeInstanceOf(MunicipalityNames);
    expect(place.villageNames).toBeInstanceOf(VillageNames);
    expect(place.wardNames).toBeInstanceOf(WardNames);
  });

  it('formats post office boxes and preserves them in address collections', () => {
    const address = new Address({
      culture: { nameOrder: ['cityNames', 'postOfficeBoxNumbers'] },
      cityName: 'Northfield',
      poBoxNumber: 481,
    });
    const addresses = new Addresses([address]);

    expect(address.postOfficeBoxNumber).toBeInstanceOf(PostOfficeBoxNumber);
    expect(address.postOfficeBoxNumbers).toBeInstanceOf(PostOfficeBoxNumbers);
    expect(address.fullName).toBe('Northfield, PO Box 481');
    expect(address.format('{cityName}, {poBoxNumber}')).toBe('Northfield, PO Box 481');
    expect(addresses.first).toBe(address);
    expect(addresses.filter((value) => value.cityName?.equals('Northfield'))).toBeInstanceOf(
      Addresses
    );
  });

  it('supports typed place collections and culture formatting and validation', () => {
    const place = new Address({
      culture: {
        code: 'sample',
        nameOrder: ['cityNames', 'stateProvinceNames', 'countryNames'],
        requiredComponents: ['cityName', 'countryName'],
        validateComponent: ({ component, value }) =>
          component !== 'bunkNumbers' || /^\d+$/.test(value),
      },
      cityName: 'Tokyo',
      stateName: 'Tokyo',
      countryName: 'Japan',
      bunkNumber: 2,
    });

    expect(place.fullName).toBe('Tokyo, Tokyo, Japan');
    expect(place.validate()).toEqual({ valid: true, errors: [] });
    expect(place.stateNames).toBeInstanceOf(StateNames);
    expect(place.cityName).toBeInstanceOf(CityName);
    expect(() => place.cityNames.add(new Name('Wrong type'))).toThrow(TypeError);
    expect(new Address({ culture: { requiredComponents: ['galaxyName'] } }).isValid).toBe(false);
  });

  it('structures person-name components, aliases, component collections, and formats', () => {
    const person = new PersonName({
      title: 'Dr.',
      givenName: 'Ada',
      middleNames: ['Augusta', 'Byron'],
      paternalName: 'Noel',
      maternalName: 'Milbanke',
      sirName: 'Lovelace',
      suffixName: 'Jr.',
    });

    expect(person).toBeInstanceOf(String);
    expect(person.title).toBeInstanceOf(TitleName);
    expect(person.titles).toBeInstanceOf(TitleNames);
    expect(person.firstName).toBeInstanceOf(FirstName);
    expect(person.firstNames).toBeInstanceOf(FirstNames);
    expect(person.middleName).toBeInstanceOf(MiddleName);
    expect(person.middleNames).toBeInstanceOf(MiddleNames);
    expect(person.patronymicName).toBeInstanceOf(PatronymicName);
    expect(person.patronymicNames).toBeInstanceOf(PatronymicNames);
    expect(person.matronymicName).toBeInstanceOf(MatronymicName);
    expect(person.matronymicNames).toBeInstanceOf(MatronymicNames);
    expect(MaternalName).toBe(MatronymicName);
    expect(MaternalNames).toBe(MatronymicNames);
    expect(person.maternalName).toBe(person.matronymicName);
    expect(person.maternalNames).toBe(person.matronymicNames);
    expect(person.familyName).toBeInstanceOf(FamilyName);
    expect(person.familyNames).toBeInstanceOf(FamilyNames);
    expect(person.suffixName).toBeInstanceOf(SuffixName);
    expect(person.suffixNames).toBeInstanceOf(SuffixNames);
    expect(person.lastName).toBe(person.familyName);
    expect(person.surname).toBe(person.familyName);
    expect(person.sirName).toBe(person.familyName);
    expect(person.fullName).toBe('Dr. Ada Augusta Byron Noel Milbanke Lovelace Jr.');
    expect(String(person)).toBe(person.fullName);
    expect(person.formatFullName()).toBe(person.fullName);
    expect(person.formatFirstLast()).toBe('Ada Augusta Byron Lovelace');
    expect(person.formatLastFirst()).toBe('Lovelace, Ada Augusta Byron Noel Milbanke, Jr.');
    expect(person.formatFormal()).toBe('Dr. Lovelace Jr.');
    expect(person.format('{surname}, {givenName} ({maternalName})')).toBe(
      'Lovelace, Ada (Milbanke)'
    );
  });

  it('updates formatted names when component collections change', () => {
    const person = new PersonName({ firstName: 'Ada', familyName: 'Lovelace' });

    person.middleNames.add('Augusta');
    person.lastName = 'Byron';

    expect(person.fullName).toBe('Ada Augusta Byron');
    expect(String(person)).toBe('Ada Augusta Byron');
    expect(person.format('First: {firstName}; Last: {lastName}')).toBe('First: Ada; Last: Byron');
  });

  it('keeps component aliases and collections reusable independently', () => {
    expect(LastName).toBe(FamilyName);
    expect(LastNames).toBe(FamilyNames);
    expect(SurnameName).toBe(FamilyName);
    expect(SurnameNames).toBe(FamilyNames);
    expect(SirName).toBe(FamilyName);
    expect(SirNames).toBe(FamilyNames);
    expect(PaternalName).toBe(PatronymicName);
    expect(PaternalNames).toBe(PatronymicNames);
    expect(MaternalName).toBe(MatronymicName);
    expect(MaternalNames).toBe(MatronymicNames);
    expect(new FamilyNames(['Lovelace']).first).toBeInstanceOf(FamilyName);
    expect(new FirstNames(['Ada']).first).toBeInstanceOf(FirstName);
    expect(new MiddleNames(['Augusta']).first).toBeInstanceOf(MiddleName);
    expect(new MatronymicNames(['Milbanke']).first).toBeInstanceOf(MatronymicName);
    expect(new PatronymicNames(['Noel']).first).toBeInstanceOf(PatronymicName);
    expect(new SuffixNames(['Jr.']).first).toBeInstanceOf(SuffixName);
    expect(new TitleNames(['Dr.']).first).toBeInstanceOf(TitleName);
    expect(new PrefixNames(['Dr.']).first).toBeInstanceOf(PrefixName);
    expect(new NameParticles(['de']).first).toBeInstanceOf(NameParticle);
    expect(new PreferredNames(['Alex']).first).toBeInstanceOf(PreferredName);
    expect(new CredentialNames(['PhD']).first).toBeInstanceOf(CredentialName);
  });

  it('uses culture metadata for order, preferred display, and validity', () => {
    const familyFirst = new PersonName({
      culture: 'ja-JP',
      firstName: 'Taro',
      familyName: 'Yamada',
      preferredName: 'Taro',
      prefix: 'Dr.',
      nameParticle: 'de',
      credentialName: 'PhD',
    });

    expect(familyFirst.fullName).toBe('Dr. Yamada Taro de PhD');
    expect(familyFirst.culture.code).toBe('ja-JP');
    expect(familyFirst.locale).toBe('ja-JP');
    expect(familyFirst.formatDisplayName()).toBe('Taro');
    expect(familyFirst.isValid).toBe(true);

    const configured = new PersonName({
      culture: {
        code: 'sample',
        nameOrder: ['familyNames', 'nameParticles', 'firstNames'],
        separator: ' ',
        requiredComponents: ['firstNames', 'familyNames'],
        validateComponent: ({ component, value }) =>
          component !== 'firstNames' || /^[A-Z]/.test(value),
      },
      firstName: 'Ada',
      familyName: 'Lovelace',
      nameParticle: 'van',
    });

    expect(configured.fullName).toBe('Lovelace van Ada');
    expect(configured.validate()).toEqual({ valid: true, errors: [] });
    configured.firstName = 'ada';
    expect(configured.isValid).toBe(false);
    expect(() => configured.assertValid()).toThrow(RangeError);
    expect(
      new PersonName({
        culture: { requiredComponents: ['firstNames', 'familyNames'] },
        firstName: 'Ada',
      }).validate().errors
    ).toContain('familyNames is required by culture metadata');
  });
});
