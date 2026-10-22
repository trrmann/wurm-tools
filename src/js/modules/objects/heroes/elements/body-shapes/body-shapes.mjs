import { Collection } from '../../../collection.mjs';
import { CharacterElement } from '../character-elements.mjs';
import { BodyPart, BodyParts } from './body-parts.mjs/body-parts.mjs';
import { HerosBodyShape } from '../../body-shape-structure.mjs';
import { anatomyTypeId, restoreAnatomy } from '../../anatomy-registry.mjs';

export class BodyShape extends CharacterElement {
  static childKind = 'part';
  static defaultName = 'Body Shape';
  static defaultDefinition = Object.freeze({
    name: 'Body Shape',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  #parts;

  constructor(options = {}) {
    const name = options.name ?? options.Name ?? new.target.defaultName;
    super({
      Points: 0,
      BaseValue: 0,
      ValueFunction: ({ BaseValue }) => BaseValue,
      Name: name,
      ShortName: options.shortName ?? options.ShortName ?? 'BSHP',
    });
    this.#parts = new BodyParts();
    this.libraryRef = options.libraryRef;
    this.id = options.id;
    this.shape = new HerosBodyShape({
      ...new.target.defaultDefinition,
      ...options,
      name,
    });
    this.restoreParts(options.parts);
  }

  restoreParts(definitions) {
    if (definitions === undefined) return;
    const partTypes = new Map(this.#parts.map((part) => [part.id, part.constructor]));
    const restored = Array.from(definitions, (part) => {
      const Type = partTypes.get(part.id) ?? BodyPart;
      return restoreAnatomy(part, BodyPart, Type);
    });
    this.#parts.splice(0, this.#parts.length, ...restored);
  }

  get generalShape() {
    return this.shape.generalShape;
  }

  get shapeTypes() {
    return this.shape.shapeTypes;
  }

  get components() {
    return this.shape.components;
  }

  get hitLocations() {
    return this.shape.hitLocations;
  }

  get calledShots() {
    return this.shape.calledShots;
  }
  get parts() {
    return this.#parts;
  }
  get extraLimbs() {
    return this.shape.extraLimbs;
  }

  get physicalLimitations() {
    return this.shape.physicalLimitations;
  }

  getComponent(reference) {
    const key = typeof reference === 'object' ? reference.id : reference;
    for (const part of this.parts) {
      if (part.id === key || part.name === key) return part;
      const component = part.getComponent(key);
      if (component) return component;
    }
    return this.shape.getComponent(key);
  }

  addComponent(component, parent) {
    if (parent) {
      for (const part of this.parts) {
        if (part.id === parent || part.name === parent) return part.addComponent(component);
        if (part.getComponent(parent)) return part.addComponent(component, parent);
      }
    }
    return this.shape.addComponent(component, parent);
  }

  removeComponent(component) {
    const target = this.getComponent(component);
    if (this.parts.includes(target)) return this.parts.remove(target);
    for (const part of this.parts) {
      if (part.getComponent(target?.id)) return part.removeComponent(target);
    }
    return this.shape.removeComponent(component);
  }

  addHitLocation(location) {
    return this.shape.addHitLocation(location);
  }

  removeHitLocation(location) {
    return this.shape.removeHitLocation(location);
  }

  getHitLocation(location) {
    return this.shape.getHitLocation(location);
  }

  addCalledShot(name, target) {
    return this.shape.addCalledShot(name, target);
  }

  removeCalledShot(calledShot) {
    return this.shape.removeCalledShot(calledShot);
  }

  addExtraLimb(limb) {
    return this.shape.addExtraLimb(limb);
  }

  removeExtraLimb(limb) {
    return this.shape.removeExtraLimb(limb);
  }

  addPhysicalLimitation(limitation) {
    return this.shape.addPhysicalLimitation(limitation);
  }

  removePhysicalLimitation(limitation) {
    return this.shape.removePhysicalLimitation(limitation);
  }

  isComponentPresent(component) {
    const target = this.getComponent(component);
    for (const part of this.parts) {
      if (part === target) return part.isPresent;
      if (part.getComponent(target?.id)) return part.isPresent && part.isComponentPresent(target);
    }
    return this.shape.isComponentPresent(component);
  }

  recordLocationDamage(location, amount) {
    return this.shape.recordLocationDamage(location, amount);
  }

  applyChange(change) {
    const { action, componentType = 'component' } = change;
    if (action === 'add') {
      if (!change.componentId || !change.componentName) {
        throw new TypeError('Adding a body component requires an id and name');
      }
      const existing = this.getComponent(change.componentId);
      if (existing) return existing;
      const component = {
        id: change.componentId,
        name: change.componentName,
        kind: componentType,
        detail: change.description ?? '',
      };
      if (componentType === 'hit-location') return this.shape.addHitLocation(component);
      if (componentType === 'extra-limb') return this.shape.addExtraLimb(component);
      return this.addComponent(component, change.parentComponentId ?? null);
    }

    const target = this.getComponent(change.componentId);
    if (!target)
      throw new RangeError(`Unknown body component for linked change: ${change.componentId}`);
    if (action === 'remove') return this.removeComponent(target);
    if (action === 'set-present') {
      target.isPresent = Boolean(change.isPresent);
      return target;
    }
    throw new RangeError(`Unsupported body-shape change operation: ${action}`);
  }

  toJSON() {
    return {
      ...this.shape.toJSON(),
      shortName: this.shortName,
      ...(anatomyTypeId(this.constructor) ? { anatomyType: anatomyTypeId(this.constructor) } : {}),
      ...(this.libraryRef ? { libraryRef: this.libraryRef } : {}),
      ...(this.id ? { id: this.id } : {}),
      parts: this.parts.map((part) => part.toJSON()),
    };
  }
}

/** @extends {Collection<BodyShape>} */
export class BodyShapes extends Collection {}
