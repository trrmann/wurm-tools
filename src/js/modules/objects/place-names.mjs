import { CollectionOfStrings } from './collection.mjs';
import { Name, Names } from './names.mjs';

export class UniverseName extends Name {}
/** @extends {Names<UniverseName>} */
export class UniverseNames extends Names {
  static NameType = UniverseName;
}

export class SuperclusterName extends Name {}
/** @extends {Names<SuperclusterName>} */
export class SuperclusterNames extends Names {
  static NameType = SuperclusterName;
}

export class GalaxyClusterName extends Name {}
/** @extends {Names<GalaxyClusterName>} */
export class GalaxyClusterNames extends Names {
  static NameType = GalaxyClusterName;
}

export class GalaxyName extends Name {}
/** @extends {Names<GalaxyName>} */
export class GalaxyNames extends Names {
  static NameType = GalaxyName;
}

export class StarClusterName extends Name {}
/** @extends {Names<StarClusterName>} */
export class StarClusterNames extends Names {
  static NameType = StarClusterName;
}

export class StarSystemName extends Name {}
/** @extends {Names<StarSystemName>} */
export class StarSystemNames extends Names {
  static NameType = StarSystemName;
}

export class PlanetName extends Name {}
/** @extends {Names<PlanetName>} */
export class PlanetNames extends Names {
  static NameType = PlanetName;
}

export class SatelliteName extends Name {}
/** @extends {Names<SatelliteName>} */
export class SatelliteNames extends Names {
  static NameType = SatelliteName;
}

export class ContinentName extends Name {}
/** @extends {Names<ContinentName>} */
export class ContinentNames extends Names {
  static NameType = ContinentName;
}

export class CountryName extends Name {}
/** @extends {Names<CountryName>} */
export class CountryNames extends Names {
  static NameType = CountryName;
}

export class StateProvinceName extends Name {}
/** @extends {Names<StateProvinceName>} */
export class StateProvinceNames extends Names {
  static NameType = StateProvinceName;
}

export class RegionName extends Name {}
/** @extends {Names<RegionName>} */
export class RegionNames extends Names {
  static NameType = RegionName;
}

export class CountyName extends Name {}
/** @extends {Names<CountyName>} */
export class CountyNames extends Names {
  static NameType = CountyName;
}

export class MunicipalityName extends Name {}
/** @extends {Names<MunicipalityName>} */
export class MunicipalityNames extends Names {
  static NameType = MunicipalityName;
}

export class TownName extends Name {}
/** @extends {Names<TownName>} */
export class TownNames extends Names {
  static NameType = TownName;
}

export class VillageName extends Name {}
/** @extends {Names<VillageName>} */
export class VillageNames extends Names {
  static NameType = VillageName;
}

export class CityName extends Name {}
/** @extends {Names<CityName>} */
export class CityNames extends Names {
  static NameType = CityName;
}

export class DistrictName extends Name {}
/** @extends {Names<DistrictName>} */
export class DistrictNames extends Names {
  static NameType = DistrictName;
}

export class WardName extends Name {}
/** @extends {Names<WardName>} */
export class WardNames extends Names {
  static NameType = WardName;
}

export class NeighborhoodName extends Name {}
/** @extends {Names<NeighborhoodName>} */
export class NeighborhoodNames extends Names {
  static NameType = NeighborhoodName;
}

export class LandmarkName extends Name {}
/** @extends {Names<LandmarkName>} */
export class LandmarkNames extends Names {
  static NameType = LandmarkName;
}

export class PostalCodeName extends Name {}
/** @extends {Names<PostalCodeName>} */
export class PostalCodeNames extends Names {
  static NameType = PostalCodeName;
}

export class AddressLineName extends Name {}
/** @extends {Names<AddressLineName>} */
export class AddressLineNames extends Names {
  static NameType = AddressLineName;
}

export class StreetName extends Name {}
/** @extends {Names<StreetName>} */
export class StreetNames extends Names {
  static NameType = StreetName;
}

export class StreetNumber extends Name {}
/** @extends {Names<StreetNumber>} */
export class StreetNumbers extends Names {
  static NameType = StreetNumber;
}

export class CampusName extends Name {}
/** @extends {Names<CampusName>} */
export class CampusNames extends Names {
  static NameType = CampusName;
}

export class ParcelName extends Name {}
/** @extends {Names<ParcelName>} */
export class ParcelNames extends Names {
  static NameType = ParcelName;
}

export class BlockName extends Name {}
/** @extends {Names<BlockName>} */
export class BlockNames extends Names {
  static NameType = BlockName;
}

export class BuildingName extends Name {}
/** @extends {Names<BuildingName>} */
export class BuildingNames extends Names {
  static NameType = BuildingName;
}

export class BuildingNumber extends Name {}
/** @extends {Names<BuildingNumber>} */
export class BuildingNumbers extends Names {
  static NameType = BuildingNumber;
}

export class EntranceName extends Name {}
/** @extends {Names<EntranceName>} */
export class EntranceNames extends Names {
  static NameType = EntranceName;
}

export class StairwellName extends Name {}
/** @extends {Names<StairwellName>} */
export class StairwellNames extends Names {
  static NameType = StairwellName;
}

export class FloorName extends Name {}
/** @extends {Names<FloorName>} */
export class FloorNames extends Names {
  static NameType = FloorName;
}

export class UnitName extends Name {}
/** @extends {Names<UnitName>} */
export class UnitNames extends Names {
  static NameType = UnitName;
}

export class RoomName extends Name {}
/** @extends {Names<RoomName>} */
export class RoomNames extends Names {
  static NameType = RoomName;
}

export class BunkNumber extends Name {
  constructor(value = '') {
    if (typeof value === 'number') {
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new RangeError('Bunk number must be a non-negative safe integer');
      }
      super(String(value));
      return;
    }
    super(value);
  }
}
/** @extends {Names<BunkNumber>} */
export class BunkNumbers extends Names {
  static NameType = BunkNumber;
}

export class PostOfficeBoxNumber extends Name {
  constructor(value = '') {
    if (typeof value === 'number') {
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new RangeError('Post office box number must be a non-negative safe integer');
      }
      super(String(value));
      return;
    }
    super(value);
  }
}
/** @extends {Names<PostOfficeBoxNumber>} */
export class PostOfficeBoxNumbers extends Names {
  static NameType = PostOfficeBoxNumber;
}

export { StarSystemName as SolarSystemName, StarSystemNames as SolarSystemNames };
export { StateProvinceName as StateName, StateProvinceNames as StateNames };
export { StateProvinceName as ProvinceName, StateProvinceNames as ProvinceNames };
export { MunicipalityName as LocalityName, MunicipalityNames as LocalityNames };
export { NeighborhoodName as SuburbName, NeighborhoodNames as SuburbNames };
export { PostalCodeName as PostcodeName, PostalCodeNames as PostcodeNames };
export { PostalCodeName as ZipCodeName, PostalCodeNames as ZipCodeNames };
export { CampusName as SiteName, CampusNames as SiteNames };
export { ParcelName as LotName, ParcelNames as LotNames };
export { StreetNumber as HouseNumber, StreetNumbers as HouseNumbers };
export { UnitName as ApartmentName, UnitNames as ApartmentNames };
export { UnitName as SuiteName, UnitNames as SuiteNames };
export { RoomName as RoomNumber, RoomNames as RoomNumbers };
export { BunkNumber as BunkName, BunkNumbers as BunkNames };
export { PostOfficeBoxNumber as POBoxNumber, PostOfficeBoxNumbers as POBoxNumbers };

function normalizeCulture(culture) {
  if (culture == null) return undefined;
  if (typeof culture === 'string') {
    const language = culture.split(/[-_]/, 1)[0].toLowerCase();
    const outsideIn = ['ja', 'ko', 'zh'].includes(language);
    return {
      code: culture,
      locale: culture,
      nameOrder: outsideIn ? 'outside-in' : 'inside-out',
    };
  }
  if (typeof culture !== 'object' || Array.isArray(culture)) {
    throw new TypeError('Culture metadata must be a culture code or an object');
  }

  const code = culture.code ?? culture.locale;
  const language = typeof code === 'string' ? code.split(/[-_]/, 1)[0].toLowerCase() : '';
  const outsideIn = ['ja', 'ko', 'zh'].includes(language);
  const nameOrder = culture.nameOrder ?? (outsideIn ? 'outside-in' : 'inside-out');
  if (typeof nameOrder !== 'string' && !Array.isArray(nameOrder)) {
    throw new TypeError('Culture nameOrder must be a string or an array of place components');
  }
  return { ...culture, code, locale: culture.locale ?? code, nameOrder };
}

function normalizeCoordinate(value, label) {
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate)) throw new TypeError(`${label} must be a finite number`);
  return coordinate;
}

function normalizeCoordinates(options = {}) {
  const coordinates = {
    ...options,
    ...(options.coordinates && typeof options.coordinates === 'object' ? options.coordinates : {}),
  };
  const grid =
    coordinates.grid ??
    (coordinates.gridX !== undefined || coordinates.gridY !== undefined
      ? { x: coordinates.gridX, y: coordinates.gridY, system: coordinates.gridSystem }
      : undefined);
  const latitude = coordinates.latitude ?? coordinates.lat;
  const longitude = coordinates.longitude ?? coordinates.lon ?? coordinates.lng;
  const hasGeographic = latitude !== undefined || longitude !== undefined;
  const altitude =
    coordinates.altitude == null
      ? undefined
      : normalizeCoordinate(coordinates.altitude, 'Altitude');
  const depth =
    coordinates.depth == null ? undefined : normalizeCoordinate(coordinates.depth, 'Depth');

  if (altitude !== undefined && depth !== undefined) {
    throw new RangeError('A place coordinate cannot have both altitude and depth');
  }
  if (grid && hasGeographic)
    throw new TypeError('Choose either grid or latitude/longitude coordinates');

  if (grid) {
    const x = normalizeCoordinate(grid.x ?? grid.gridX, 'Grid X');
    const y = normalizeCoordinate(grid.y ?? grid.gridY, 'Grid Y');
    return Object.freeze({
      type: 'grid',
      x,
      y,
      system: grid.system ?? coordinates.gridSystem,
      altitude,
      depth,
    });
  }

  if (hasGeographic) {
    if (latitude === undefined || longitude === undefined) {
      throw new TypeError('Latitude and longitude must be provided together');
    }
    const lat = normalizeCoordinate(latitude, 'Latitude');
    const lon = normalizeCoordinate(longitude, 'Longitude');
    if (lat < -90 || lat > 90) throw new RangeError('Latitude must be between -90 and 90');
    if (lon < -180 || lon > 180) throw new RangeError('Longitude must be between -180 and 180');
    return Object.freeze({ type: 'geographic', latitude: lat, longitude: lon, altitude, depth });
  }

  if (altitude !== undefined || depth !== undefined) {
    throw new TypeError('Altitude or depth requires coordinates');
  }
  return undefined;
}

function formatCoordinates(coordinates) {
  if (!coordinates) return '';
  const location =
    coordinates.type === 'grid'
      ? `${coordinates.system ? `${coordinates.system} ` : ''}Grid ${coordinates.x}, ${coordinates.y}`
      : `${coordinates.latitude}, ${coordinates.longitude}`;
  const vertical =
    coordinates.altitude !== undefined
      ? `altitude ${coordinates.altitude}`
      : coordinates.depth !== undefined
        ? `depth ${coordinates.depth}`
        : '';
  return [location, vertical].filter(Boolean).join(', ');
}

/** General place name, landmark, or coordinate-based location. */
export class PlaceName extends Name {
  #label;

  constructor(value = '') {
    const isString = CollectionOfStrings.isString(value);
    const options = isString ? { name: String(value) } : value;
    if (options == null || typeof options !== 'object') {
      throw new TypeError('PlaceName requires a string or a place descriptor');
    }

    const label = String(options.name ?? options.placeName ?? options.landmarkName ?? '');
    const coordinates = normalizeCoordinates(options);
    const culture = normalizeCulture(options.culture);
    super(label || formatCoordinates(coordinates));
    this.#label = label;
    this.coordinates = coordinates;
    this.culture = culture;
    this.category = options.category;
  }

  static fromGrid(x, y, options = {}) {
    return new PlaceName({
      ...options,
      coordinates: {
        grid: { x, y, system: options.gridSystem },
        altitude: options.altitude,
        depth: options.depth,
      },
    });
  }

  static fromLatitudeLongitude(latitude, longitude, options = {}) {
    return new PlaceName({
      ...options,
      coordinates: { latitude, longitude, altitude: options.altitude, depth: options.depth },
    });
  }

  get name() {
    return this.#label;
  }

  get fullName() {
    if (typeof this.culture?.formatPlace === 'function') {
      return String(this.culture.formatPlace(this));
    }
    const coordinates = formatCoordinates(this.coordinates);
    return [this.#label, coordinates && this.#label ? `(${coordinates})` : coordinates]
      .filter(Boolean)
      .join(' ');
  }

  get isValid() {
    return this.validate().valid;
  }

  validate() {
    const errors = [];
    if (this.coordinates?.type === 'geographic') {
      if (this.coordinates.latitude < -90 || this.coordinates.latitude > 90) {
        errors.push('Latitude must be between -90 and 90');
      }
      if (this.coordinates.longitude < -180 || this.coordinates.longitude > 180) {
        errors.push('Longitude must be between -180 and 180');
      }
    }
    const result = this.culture?.validatePlace?.(this);
    if (result === false) errors.push('Place name is invalid for this culture');
    else if (typeof result === 'string' && result) errors.push(result);
    else if (Array.isArray(result))
      errors.push(...result.filter((error) => typeof error === 'string'));
    return { valid: errors.length === 0, errors };
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

/** @extends {Names<PlaceName>} */
export class PlaceNames extends Names {
  static NameType = PlaceName;
}

const ADDRESS_COMPONENTS = [
  { singular: 'universeName', plural: 'universeNames', Type: UniverseNames, options: ['universe'] },
  {
    singular: 'superclusterName',
    plural: 'superclusterNames',
    Type: SuperclusterNames,
    options: ['supercluster'],
  },
  {
    singular: 'galaxyClusterName',
    plural: 'galaxyClusterNames',
    Type: GalaxyClusterNames,
    options: ['galaxyCluster'],
  },
  { singular: 'galaxyName', plural: 'galaxyNames', Type: GalaxyNames, options: ['galaxy'] },
  {
    singular: 'starClusterName',
    plural: 'starClusterNames',
    Type: StarClusterNames,
    options: ['starCluster'],
  },
  {
    singular: 'starSystemName',
    plural: 'starSystemNames',
    Type: StarSystemNames,
    options: ['starSystem', 'solarSystemName', 'solarSystemNames'],
  },
  { singular: 'planetName', plural: 'planetNames', Type: PlanetNames, options: ['planet'] },
  {
    singular: 'satelliteName',
    plural: 'satelliteNames',
    Type: SatelliteNames,
    options: ['satellite', 'moonName'],
  },
  {
    singular: 'continentName',
    plural: 'continentNames',
    Type: ContinentNames,
    options: ['continent'],
  },
  { singular: 'countryName', plural: 'countryNames', Type: CountryNames, options: ['country'] },
  {
    singular: 'stateProvinceName',
    plural: 'stateProvinceNames',
    Type: StateProvinceNames,
    options: ['state', 'stateName', 'stateNames', 'province', 'provinceName', 'provinceNames'],
  },
  { singular: 'regionName', plural: 'regionNames', Type: RegionNames, options: ['region'] },
  { singular: 'countyName', plural: 'countyNames', Type: CountyNames, options: ['county'] },
  {
    singular: 'municipalityName',
    plural: 'municipalityNames',
    Type: MunicipalityNames,
    options: ['municipality', 'locality'],
  },
  { singular: 'townName', plural: 'townNames', Type: TownNames, options: ['town'] },
  { singular: 'villageName', plural: 'villageNames', Type: VillageNames, options: ['village'] },
  { singular: 'cityName', plural: 'cityNames', Type: CityNames, options: ['city'] },
  { singular: 'districtName', plural: 'districtNames', Type: DistrictNames, options: ['district'] },
  { singular: 'wardName', plural: 'wardNames', Type: WardNames, options: ['ward'] },
  {
    singular: 'neighborhoodName',
    plural: 'neighborhoodNames',
    Type: NeighborhoodNames,
    options: ['neighborhood', 'suburb'],
  },
  { singular: 'landmarkName', plural: 'landmarkNames', Type: LandmarkNames, options: ['landmark'] },
  {
    singular: 'postalCodeName',
    plural: 'postalCodeNames',
    Type: PostalCodeNames,
    options: ['postalCode', 'postcode', 'zipCode', 'zip'],
  },
  {
    singular: 'addressLineName',
    plural: 'addressLineNames',
    Type: AddressLineNames,
    options: ['addressLine'],
  },
  {
    singular: 'postOfficeBoxNumber',
    plural: 'postOfficeBoxNumbers',
    Type: PostOfficeBoxNumbers,
    options: ['postOfficeBox', 'poBox', 'poBoxNumber'],
  },
  { singular: 'streetName', plural: 'streetNames', Type: StreetNames, options: ['street'] },
  {
    singular: 'streetNumber',
    plural: 'streetNumbers',
    Type: StreetNumbers,
    options: ['houseNumber', 'streetAddressNumber'],
  },
  {
    singular: 'campusName',
    plural: 'campusNames',
    Type: CampusNames,
    options: ['campus', 'site', 'siteName', 'siteNames'],
  },
  {
    singular: 'parcelName',
    plural: 'parcelNames',
    Type: ParcelNames,
    options: ['parcel', 'lot', 'lotName', 'lotNames'],
  },
  { singular: 'blockName', plural: 'blockNames', Type: BlockNames, options: ['block'] },
  { singular: 'buildingName', plural: 'buildingNames', Type: BuildingNames, options: ['building'] },
  {
    singular: 'buildingNumber',
    plural: 'buildingNumbers',
    Type: BuildingNumbers,
    options: ['buildingNo'],
  },
  { singular: 'entranceName', plural: 'entranceNames', Type: EntranceNames, options: ['entrance'] },
  {
    singular: 'stairwellName',
    plural: 'stairwellNames',
    Type: StairwellNames,
    options: ['stairwell', 'staircase'],
  },
  { singular: 'floorName', plural: 'floorNames', Type: FloorNames, options: ['floor'] },
  {
    singular: 'unitName',
    plural: 'unitNames',
    Type: UnitNames,
    options: ['unit', 'apartment', 'suite'],
  },
  { singular: 'roomName', plural: 'roomNames', Type: RoomNames, options: ['room', 'roomNumber'] },
  {
    singular: 'bunkNumber',
    plural: 'bunkNumbers',
    Type: BunkNumbers,
    options: ['bunk', 'bunkName'],
  },
];

function componentValues(options, { singular, plural, options: aliases }) {
  const values = [];
  for (const key of [singular, plural, ...aliases]) {
    const value = options[key];
    if (value == null) continue;
    if (CollectionOfStrings.isString(value)) values.push(value);
    else if (typeof value[Symbol.iterator] === 'function') values.push(...Array.from(value));
    else values.push(value);
  }
  return values;
}

function formatAddressComponent(plural, value) {
  const text = String(value);
  return plural === 'postOfficeBoxNumbers' ? `PO Box ${text}` : text;
}

/** An address is a place name with structured hierarchy/address components. */
export class Address extends PlaceName {
  constructor(value = {}) {
    const isUnstructured = CollectionOfStrings.isString(value);
    const options = isUnstructured ? { addressLine: String(value) } : value;
    if (options == null || typeof options !== 'object') {
      throw new TypeError('Address requires a string or an address descriptor');
    }
    const label = options.name ?? options.placeName ?? '';
    super({ ...options, name: label });
    for (const component of ADDRESS_COMPONENTS) {
      const { plural, Type } = component;
      this[plural] = new Type(componentValues(options, component));
    }
  }

  get fullName() {
    const order = Array.isArray(this.culture?.nameOrder)
      ? this.culture.nameOrder
      : this.culture?.nameOrder === 'outside-in'
        ? ADDRESS_COMPONENTS.map(({ plural }) => plural)
        : [...ADDRESS_COMPONENTS].reverse().map(({ plural }) => plural);
    const parts = order.flatMap((key) => {
      const value = this[key];
      if (value == null) return [];
      if (CollectionOfStrings.isString(value)) return [formatAddressComponent(key, value)];
      if (typeof value[Symbol.iterator] === 'function') {
        return Array.from(value, (entry) => formatAddressComponent(key, entry));
      }
      return [formatAddressComponent(key, value)];
    });
    if (this.name) parts.push(this.name);
    const address = parts.filter(Boolean).join(this.culture?.separator ?? ', ');
    if (address) return address;
    return super.fullName;
  }

  validate() {
    const errors = [...super.validate().errors];
    const culture = this.culture;
    if (!culture) return { valid: errors.length === 0, errors };

    for (const required of culture.requiredComponents ?? []) {
      const component = ADDRESS_COMPONENTS.find(
        ({ singular, plural, options }) =>
          singular === required || plural === required || options.includes(required)
      );
      const value = component ? this[component.plural] : this[required];
      if (value == null || (typeof value.size === 'number' && value.size === 0)) {
        errors.push(
          `${required} is required by culture ${culture.code ?? culture.locale ?? 'metadata'}`
        );
      }
    }

    for (const { plural } of ADDRESS_COMPONENTS) {
      for (const value of this[plural] ?? []) {
        const result = culture.validateComponent?.({
          component: plural,
          value: String(value),
          address: this,
          culture,
        });
        if (result === false) errors.push(`${plural} value is invalid for this culture`);
        else if (typeof result === 'string' && result) errors.push(result);
      }
    }

    const result = culture.validateAddress?.(this);
    if (result === false) errors.push('Address is invalid for this culture');
    else if (typeof result === 'string' && result) errors.push(result);
    else if (Array.isArray(result))
      errors.push(...result.filter((error) => typeof error === 'string'));
    return { valid: errors.length === 0, errors };
  }

  formatAddress() {
    return this.fullName;
  }

  format(template = '{fullName}') {
    const values = {
      fullName: this.fullName,
      address: this.address,
      name: this.name,
      latitude: this.coordinates?.latitude,
      longitude: this.coordinates?.longitude,
      gridX: this.coordinates?.x,
      gridY: this.coordinates?.y,
      altitude: this.coordinates?.altitude,
      depth: this.coordinates?.depth,
    };
    for (const { singular, plural, options } of ADDRESS_COMPONENTS) {
      const value = this[plural];
      values[singular] = value == null ? undefined : formatAddressComponent(plural, value.first);
      values[plural] =
        value == null
          ? undefined
          : Array.from(value, (entry) => formatAddressComponent(plural, entry)).join(', ');
      for (const alias of options) {
        values[alias] =
          alias.endsWith('Names') || alias.endsWith('Numbers') ? values[plural] : values[singular];
      }
    }
    return String(template).replace(/\{([^}]+)\}/g, (token, key) => {
      const value = values[key] ?? this[key];
      return value == null ? '' : String(value);
    });
  }

  formatInsideOut() {
    return Address.composeWithOrder(
      this,
      [...ADDRESS_COMPONENTS].reverse().map(({ plural }) => plural)
    );
  }

  formatOutsideIn() {
    return Address.composeWithOrder(
      this,
      ADDRESS_COMPONENTS.map(({ plural }) => plural)
    );
  }

  static composeWithOrder(address, order) {
    const parts = order.flatMap((key) => {
      const value = address[key];
      if (value == null) return [];
      if (CollectionOfStrings.isString(value)) return [String(value)];
      if (typeof value[Symbol.iterator] === 'function') return Array.from(value, String);
      return [String(value)];
    });
    if (address.name) parts.push(address.name);
    return parts.filter(Boolean).join(address.culture?.separator ?? ', ');
  }
}

/** @extends {Names<Address>} */
export class Addresses extends Names {
  static NameType = Address;
}

for (const { singular, plural, Type } of ADDRESS_COMPONENTS) {
  Object.defineProperty(Address.prototype, singular, {
    configurable: true,
    enumerable: true,
    get() {
      return this[plural]?.first;
    },
    set(value) {
      this[plural] = new Type(
        componentValues({ [singular]: value }, { singular, plural, options: [] })
      );
    },
  });
}

for (const { singular, plural, Type, options } of ADDRESS_COMPONENTS) {
  for (const alias of options) {
    if (alias === singular || alias === plural) continue;
    Object.defineProperty(Address.prototype, alias, {
      configurable: true,
      enumerable: true,
      get() {
        return alias.endsWith('Names') || alias.endsWith('Numbers')
          ? this[plural]
          : this[plural]?.first;
      },
      set(value) {
        this[plural] = new Type(
          componentValues({ [alias]: value }, { singular, plural, options: [alias] })
        );
      },
    });
  }
}
