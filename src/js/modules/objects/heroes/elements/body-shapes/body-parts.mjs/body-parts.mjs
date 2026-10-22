import { Collection } from '../../../../collection.mjs';
import { CharacterElement } from '../../character-elements.mjs';
import { HerosBodyShape } from '../../../body-shape-structure.mjs';
import { anatomyTypeId, restoreAnatomy } from '../../../anatomy-registry.mjs';

export class BodyPart extends CharacterElement {
  #parts;
  static childKind = 'part';
  static defaultName = 'Body Part';
  static defaultDefinition = Object.freeze({
    name: 'Body Part',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });

  constructor(options = {}) {
    const name = options.name ?? options.Name ?? new.target.defaultName;
    super({
      Points: 0,
      BaseValue: 0,
      ValueFunction: ({ BaseValue }) => BaseValue,
      Name: name,
      ShortName: options.shortName ?? options.ShortName ?? 'BSHP',
    });
    this.shape = new HerosBodyShape({ ...new.target.defaultDefinition, ...options, name });
    this.id = options.id ?? `body-part-${new.target.defaultName}`;
    this.isPresent = options.isPresent !== false;
    if (typeof options.isPresent !== 'undefined' && typeof options.isPresent !== 'boolean') {
      throw new TypeError('Body-part presence must be a boolean');
    }
    this.libraryRef = options.libraryRef;
    this.#parts = new BodyParts(
      (options.parts ?? []).map((part) => restoreAnatomy(part, BodyPart))
    );
  }
  get parts() {
    return this.#parts;
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
    return this.shape.getComponent(reference);
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

  toJSON() {
    return {
      ...this.shape.toJSON(),
      id: this.id,
      isPresent: this.isPresent,
      shortName: this.shortName,
      ...(anatomyTypeId(this.constructor) ? { anatomyType: anatomyTypeId(this.constructor) } : {}),
      ...(this.libraryRef ? { libraryRef: this.libraryRef } : {}),
      parts: this.parts.map((part) => part.toJSON()),
    };
  }
}

/** @extends {Collection<BodyPart>} */
export class BodyParts extends Collection {}
