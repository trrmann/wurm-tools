import { MixedNumber } from '../mixed-numbers.mjs';
import { ThingName, ThingNames } from '../things.mjs';

function asNamedConfig(options, fallbackName = '') {
  if (typeof options === 'string' || options instanceof String) {
    return { name: String(options) };
  }
  if (options == null || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('Expected a name or named configuration object');
  }
  return { ...options, name: options.name ?? options.label ?? fallbackName };
}

function namedValues(items) {
  if (items == null) return [];
  if (typeof items === 'string' || items instanceof String) return [items];
  if (typeof items === 'object' && !Array.isArray(items)) return [items];
  if (typeof items[Symbol.iterator] !== 'function') {
    throw new TypeError('Expected a name or iterable of named values');
  }
  return Array.from(items);
}

function nameMetadata(thing) {
  return {
    name: String(thing),
    classifications: [...thing.classificationNames].map(String),
    specifications: [...thing.specificationNames].map(String),
    categorizations: [...thing.categorizationNames].map(String),
  };
}

let nextBodyShapeComponentId = 0;

export class HerosBodyShapeComponent extends ThingName {
  constructor(options = {}) {
    const config = asNamedConfig(options);
    super(config);
    this.id = String(config.id ?? `body-component-${++nextBodyShapeComponentId}`);
    if (!this.id) throw new TypeError('Body-shape component id cannot be empty');
    this.kind = String(config.kind ?? 'component');
    this.location = config.location == null ? null : String(config.location);
    this.detail = String(config.detail ?? '');
    this.isPresent = config.isPresent ?? true;
    if (typeof this.isPresent !== 'boolean') {
      throw new TypeError('Body-shape component presence must be a boolean');
    }
    this.components = new HerosBodyShapeComponents(config.components ?? []);
  }

  toJSON() {
    return {
      ...nameMetadata(this),
      id: this.id,
      kind: this.kind,
      ...(this.location == null ? {} : { location: this.location }),
      ...(this.detail ? { detail: this.detail } : {}),
      isPresent: this.isPresent,
      components: [...this.components],
    };
  }
}

/** @extends {ThingNames<HerosBodyShapeComponent>} */
export class HerosBodyShapeComponents extends ThingNames {
  static NameType = HerosBodyShapeComponent;
}

export class HerosHitLocation extends HerosBodyShapeComponent {
  #damage = MixedNumber.from(0);

  constructor(options = {}) {
    const config = asNamedConfig(options);
    super(config);
    this.damage = config.damage ?? config.damageTaken ?? 0;
    this.disabled = config.disabled ?? false;
    if (typeof this.disabled !== 'boolean') {
      throw new TypeError('Hit-location disabled state must be a boolean');
    }
    this.disabilityDescription = String(config.disabilityDescription ?? '');
  }

  get damage() {
    return this.#damage;
  }

  set damage(value) {
    const amount = MixedNumber.from(value);
    if (amount.compare(0) < 0) throw new RangeError('Hit-location damage cannot be negative');
    this.#damage = amount;
  }

  recordDamage(amount) {
    const addedDamage = MixedNumber.from(amount);
    if (addedDamage.compare(0) < 0) {
      throw new RangeError('Recorded hit-location damage cannot be negative');
    }
    this.damage = this.damage.add(addedDamage);
    return this;
  }

  disable(description = '') {
    this.disabled = true;
    this.disabilityDescription = String(description);
    return this;
  }

  enable() {
    this.disabled = false;
    this.disabilityDescription = '';
    return this;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      damage: this.damage.toString(),
      disabled: this.disabled,
      ...(this.disabilityDescription ? { disabilityDescription: this.disabilityDescription } : {}),
    };
  }
}

/** @extends {ThingNames<HerosHitLocation>} */
export class HerosHitLocations extends ThingNames {
  static NameType = HerosHitLocation;
}

export class HerosExtraLimb extends HerosBodyShapeComponent {
  constructor(options = {}) {
    const config = asNamedConfig(options);
    super(config);
    const count = config.count ?? 1;
    if (!Number.isSafeInteger(count) || count < 1) {
      throw new RangeError('Extra-limb count must be a positive safe integer');
    }
    this.count = count;
  }

  toJSON() {
    return { ...super.toJSON(), count: this.count };
  }
}

/** @extends {ThingNames<HerosExtraLimb>} */
export class HerosExtraLimbs extends ThingNames {
  static NameType = HerosExtraLimb;
}

export class HerosBodyShapeLimitation extends ThingName {
  constructor(options = {}) {
    const config = asNamedConfig(options);
    super(config);
    this.detail = String(config.detail ?? '');
    this.active = config.active ?? true;
    if (typeof this.active !== 'boolean') {
      throw new TypeError('Body-shape limitation active state must be a boolean');
    }
    this.removedComponents = new HerosBodyShapeComponents(config.removedComponents ?? []);
  }

  toJSON() {
    return {
      ...nameMetadata(this),
      detail: this.detail,
      active: this.active,
      removedComponentIds: [...this.removedComponents].map((component) => component.id),
    };
  }
}

/** @extends {ThingNames<HerosBodyShapeLimitation>} */
export class HerosBodyShapeLimitations extends ThingNames {
  static NameType = HerosBodyShapeLimitation;
}

export class HerosCalledShot extends ThingName {
  constructor(options = {}) {
    const config = asNamedConfig(options);
    super(config);
    const target = config.targetLocation ?? config.target;
    if (!(target instanceof HerosHitLocation)) {
      throw new TypeError('A called shot must reference a HERO hit-location instance');
    }
    this.target = target;
  }

  toJSON() {
    return {
      ...nameMetadata(this),
      targetLocation: String(this.target),
    };
  }
}

/** @extends {ThingNames<HerosCalledShot>} */
export class HerosCalledShots extends ThingNames {
  static NameType = HerosCalledShot;
}

export const HEROS_BODY_SHAPE_TYPES = Object.freeze({
  humanoid: 'humanoid',
  bipedal: 'bipedal',
  equestrian: 'equestrian',
  canine: 'canine',
  feline: 'feline',
  quadrupedal: 'quadrupedal',
  nonpedal: 'nonpedal',
  vehicle: 'vehicle',
  surface: 'surface',
  cityTown: 'city/town',
  box: 'box',
  sphere: 'sphere',
  rod: 'rod',
  compound: 'compound',
});

export class HerosBodyShapeType extends ThingName {}

/** @extends {ThingNames<HerosBodyShapeType>} */
export class HerosBodyShapeTypes extends ThingNames {
  static NameType = HerosBodyShapeType;
}

export class HerosBodyShape extends ThingName {
  constructor(options = '') {
    const config = asNamedConfig(options);
    super(config.name ?? config.generalShape ?? '', config);
    this.generalShape = String(config.generalShape ?? config.name ?? '');
    this.shapeTypes = new HerosBodyShapeTypes(
      namedValues(config.shapeTypes ?? config.shapeType ?? this.generalShape)
    );
    this.components = new HerosBodyShapeComponents(namedValues(config.components));
    this.hitLocations = new HerosHitLocations(namedValues(config.hitLocations));
    this.extraLimbs = new HerosExtraLimbs(namedValues(config.extraLimbs));
    this.calledShots = new HerosCalledShots();
    this.physicalLimitations = new HerosBodyShapeLimitations();

    for (const shotDefinition of namedValues(config.calledShots)) {
      if (shotDefinition instanceof HerosCalledShot) {
        this.addCalledShot(shotDefinition, shotDefinition.target);
        continue;
      }
      const shot = asNamedConfig(shotDefinition);
      const targetName = shot.targetLocation ?? shot.target;
      const target = this.getHitLocation(targetName);
      if (!target) {
        throw new RangeError(
          `Called-shot target is not a hit location in this body shape: ${targetName}`
        );
      }
      this.addCalledShot(shot.name, target);
    }

    for (const limitationDefinition of namedValues(
      config.physicalLimitations ?? config.limitations
    )) {
      if (limitationDefinition instanceof HerosBodyShapeLimitation) {
        this.addPhysicalLimitation(limitationDefinition);
        continue;
      }
      const limitation = asNamedConfig(limitationDefinition);
      const removedReferences = namedValues(
        limitation.removedComponentIds ?? limitation.removedComponents
      );
      const removedComponents = removedReferences.map((reference) => {
        const component =
          reference instanceof HerosBodyShapeComponent
            ? this.getComponent(reference.id)
            : this.getComponent(reference);
        if (!component) {
          throw new RangeError(
            `Physical limitation references an unknown body component: ${reference}`
          );
        }
        return component;
      });
      this.addPhysicalLimitation({ ...limitation, removedComponents });
    }
  }

  getComponent(reference) {
    const value = String(
      reference instanceof HerosBodyShapeComponent ? reference.id : (reference ?? '')
    );
    const components = [...this.components, ...this.hitLocations, ...this.extraLimbs];
    const visit = (component) => {
      if (component.id === value || String(component) === value) return component;
      for (const child of component.components) {
        const found = visit(child);
        if (found) return found;
      }
      return undefined;
    };
    for (const component of components) {
      const found = visit(component);
      if (found) return found;
    }
    return undefined;
  }

  getHitLocation(location) {
    if (location instanceof HerosHitLocation) {
      return this.hitLocations.includes(location) ? location : undefined;
    }
    const name = String(location ?? '');
    return this.hitLocations.find((item) => String(item) === name);
  }

  addHitLocation(location) {
    const hitLocation =
      location instanceof HerosHitLocation ? location : new HerosHitLocation(location);
    this.hitLocations.add(hitLocation);
    return hitLocation;
  }

  removeHitLocation(location) {
    const hitLocation = this.getHitLocation(location);
    if (!hitLocation) return false;
    this.hitLocations.remove(hitLocation);
    this.calledShots.removeWhere((calledShot) => calledShot.target === hitLocation);
    return true;
  }

  addComponent(component, parent = null) {
    const bodyComponent =
      component instanceof HerosBodyShapeComponent
        ? component
        : new HerosBodyShapeComponent(component);
    if (parent == null) {
      this.components.add(bodyComponent);
      return bodyComponent;
    }
    const parentComponent = this.getComponent(parent);
    if (!parentComponent) {
      throw new RangeError(`Unknown parent body component: ${parent}`);
    }
    parentComponent.components.add(bodyComponent);
    return bodyComponent;
  }

  removeComponent(reference) {
    const target = this.getComponent(reference);
    if (!target) return false;

    const removed = new Set();
    const collect = (component) => {
      removed.add(component);
      component.components.forEach(collect);
    };
    collect(target);

    const removeFrom = (components) => {
      const index = components.indexOf(target);
      if (index >= 0) {
        components.splice(index, 1);
        return true;
      }
      return components.some((component) => removeFrom(component.components));
    };
    const wasRemoved = [this.components, this.hitLocations, this.extraLimbs].some(removeFrom);
    if (!wasRemoved) return false;

    this.physicalLimitations.forEach((limitation) =>
      limitation.removedComponents.removeWhere((component) => removed.has(component))
    );
    this.calledShots.removeWhere((calledShot) => removed.has(calledShot.target));
    return true;
  }

  removeExtraLimb(limb) {
    const extraLimb =
      limb instanceof HerosExtraLimb
        ? this.extraLimbs.includes(limb)
          ? limb
          : undefined
        : this.extraLimbs.find(
            (item) => item.id === String(limb ?? '') || String(item) === String(limb ?? '')
          );
    if (!extraLimb) return false;
    return this.removeComponent(extraLimb);
  }

  addCalledShot(name, target) {
    const hitLocation = this.getHitLocation(target);
    if (!hitLocation) {
      throw new RangeError('Called-shot targets must belong to this body shape');
    }
    const calledShot =
      name instanceof HerosCalledShot ? name : new HerosCalledShot({ name, target: hitLocation });
    if (calledShot.target !== hitLocation) {
      throw new RangeError('Called-shot targets must belong to this body shape');
    }
    this.calledShots.add(calledShot);
    return calledShot;
  }

  removeCalledShot(calledShot) {
    return this.calledShots.remove(calledShot);
  }

  addPhysicalLimitation(limitation) {
    const bodyLimitation =
      limitation instanceof HerosBodyShapeLimitation
        ? limitation
        : new HerosBodyShapeLimitation(limitation);
    for (const component of bodyLimitation.removedComponents) {
      if (this.getComponent(component.id) !== component) {
        throw new RangeError('Physical limitations must reference components in this body shape');
      }
    }
    this.physicalLimitations.add(bodyLimitation);
    return bodyLimitation;
  }

  isComponentPresent(component) {
    const bodyComponent = this.getComponent(component);
    if (!bodyComponent) return false;

    const containsComponent = (root, target) =>
      root === target || [...root.components].some((child) => containsComponent(child, target));
    const isPresentInHierarchy = (root, target, ancestorsPresent = true) => {
      const present = ancestorsPresent && root.isPresent;
      if (root === target) return present;
      return [...root.components].some((child) => isPresentInHierarchy(child, target, present));
    };
    const roots = [...this.components, ...this.hitLocations, ...this.extraLimbs];
    const presentInHierarchy = roots.some((root) => isPresentInHierarchy(root, bodyComponent));
    if (!presentInHierarchy) return false;

    return !this.physicalLimitations.some(
      (limitation) =>
        limitation.active &&
        [...limitation.removedComponents].some((removed) =>
          containsComponent(removed, bodyComponent)
        )
    );
  }

  removePhysicalLimitation(limitation) {
    return this.physicalLimitations.remove(limitation);
  }

  addExtraLimb(limb) {
    const extraLimb = limb instanceof HerosExtraLimb ? limb : new HerosExtraLimb(limb);
    this.extraLimbs.add(extraLimb);
    return extraLimb;
  }

  recordLocationDamage(location, amount) {
    const hitLocation = this.getHitLocation(location);
    if (!hitLocation) throw new RangeError(`Unknown hit location: ${location}`);
    return hitLocation.recordDamage(amount);
  }

  toJSON() {
    return {
      ...nameMetadata(this),
      generalShape: this.generalShape,
      shapeTypes: [...this.shapeTypes].map(String),
      components: [...this.components],
      hitLocations: [...this.hitLocations],
      calledShots: [...this.calledShots],
      extraLimbs: [...this.extraLimbs],
      physicalLimitations: [...this.physicalLimitations],
    };
  }
}
/** @extends {ThingNames<HerosBodyShape>} */
export class HerosBodyShapes extends ThingNames {
  static NameType = HerosBodyShape;
}
