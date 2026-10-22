import { Collection } from '../../../collection.mjs';
import { BodyShape, BodyShapes } from './body-shapes.mjs';
import { BodyParts } from './body-parts.mjs/body-parts.mjs';
import { restoreAnatomy } from '../../anatomy-registry.mjs';

export class CompoundShape extends BodyShape {
  static childKind = 'shape';
  static requiresLibrary = true;
  static defaultName = 'CompoundShape';
  static defaultDefinition = Object.freeze({
    name: 'CompoundShape',
    generalShape: 'Unspecified',
    shapeTypes: [],
  });
  #shapes;
  constructor(options = {}) {
    super(options);
    this.#shapes = new BodyShapes(
      (options.shapes ?? []).map((shape) => restoreAnatomy(shape, BodyShape))
    );
  }
  get shapes() {
    return this.#shapes;
  }
  get parts() {
    return new BodyParts([
      ...super.parts,
      ...(this.#shapes ?? []).flatMap((shape) => [...shape.parts]),
    ]);
  }
  getComponent(reference) {
    const key = typeof reference === 'object' ? reference.id : reference;
    for (const shape of this.#shapes ?? []) {
      if (shape.id === key || shape.name === key) return shape;
      const component = shape.getComponent(key);
      if (component) return component;
    }
    return super.getComponent(reference);
  }
  addComponent(component, parent) {
    for (const shape of this.#shapes ?? []) {
      if (shape.id === parent || shape.name === parent) return shape.addComponent(component);
      if (shape.getComponent(parent)) return shape.addComponent(component, parent);
    }
    return super.addComponent(component, parent);
  }
  isComponentPresent(component) {
    const key = typeof component === 'object' ? component.id : component;
    for (const shape of this.#shapes) {
      if (shape.getComponent(key)) return shape.isComponentPresent(key);
    }
    return super.isComponentPresent(component);
  }
  getHitLocation(location) {
    for (const shape of this.#shapes) {
      const found = shape.getHitLocation(location);
      if (found) return found;
    }
    return super.getHitLocation(location);
  }
  recordLocationDamage(location, amount) {
    for (const shape of this.#shapes) {
      if (shape.getHitLocation(location)) return shape.recordLocationDamage(location, amount);
    }
    return super.recordLocationDamage(location, amount);
  }
  removeComponent(component) {
    const key = typeof component === 'object' ? component.id : component;
    for (const shape of this.#shapes) {
      if (shape.id === key || shape.name === key) return this.#shapes.remove(shape);
      if (shape.getComponent(key)) return shape.removeComponent(key);
    }
    const part = super.parts.find((part) => part.id === key || part.name === key);
    if (part) return super.parts.remove(part);
    return super.removeComponent(component);
  }
  toJSON() {
    return {
      ...super.toJSON(),
      parts: super.parts.map((part) => part.toJSON()),
      shapes: this.#shapes.map((shape) => shape.toJSON()),
    };
  }
}

/** @extends {Collection<CompoundShape>} */
export class CompoundShapes extends Collection {}
