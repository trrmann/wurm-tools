import { Collection } from '../../../../collection.mjs';
import { HerosBodyShape } from '../../../body-shape-structure.mjs';
import { BodyPart, BodyParts } from './body-parts.mjs';

export class CompoundBodyPart extends BodyPart {
  static defaultName = 'Compound Body Part';
  static defaultDefinition = Object.freeze({
    name: 'Compound Body Part',
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
    this.shape = new HerosBodyShape({ ...options, name });
    this.id = options.id ?? `body-part-${new.target.name}`;
    this.isPresent = options.isPresent !== false;
    this.#parts = new BodyParts();
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

  get parts() {
    return this.#parts;
  }

  getComponent(reference) {
    return this.shape.getComponent(reference);
  }

  addComponent(component, parent) {
    return this.shape.addComponent(component, parent);
  }

  removeComponent(component) {
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
    };
  }
}

/** @extends {Collection<CompoundBodyPart>} */
export class CompoundBodyParts extends Collection {}
