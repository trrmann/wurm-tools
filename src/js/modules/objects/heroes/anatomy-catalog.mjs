import { BodyShape } from './elements/body-shapes/body-shapes.mjs';
import { BodyPart } from './elements/body-shapes/body-parts.mjs/body-parts.mjs';
import { registerAnatomyType, restoreAnatomy } from './anatomy-registry.mjs';

const modules =
  typeof import.meta.env === 'object'
    ? import.meta.glob('./elements/body-shapes/**/*.mjs', { eager: true })
    : {};
const catalog = [];
const registered = new Set();
for (const [modulePath, exports] of Object.entries(modules)) {
  for (const [exportName, Type] of Object.entries(exports)) {
    if (typeof Type !== 'function' || registered.has(Type)) continue;
    const kind =
      Type === BodyShape || Type.prototype instanceof BodyShape
        ? 'shape'
        : Type === BodyPart || Type.prototype instanceof BodyPart
          ? 'part'
          : null;
    if (!kind) continue;
    const type = `element:${modulePath.slice('./elements/'.length, -4)}#${exportName}`;
    registerAnatomyType(type, Type);
    catalog.push(
      Object.freeze({
        type,
        kind,
        Type,
        label: exportName.replace(/([a-z0-9])([A-Z])/g, '$1 $2'),
        requiresLibrary: Boolean(Type.requiresLibrary),
      })
    );
    registered.add(Type);
  }
}

export function getAnatomyTypes() {
  return [...catalog];
}

export function createAnatomy(definition) {
  const entry = catalog.find((entry) => entry.type === (definition.anatomyType ?? definition.type));
  if (!entry) throw new RangeError('Select a registered anatomy type');
  return restoreAnatomy(
    { ...definition, anatomyType: entry.type },
    entry.kind === 'shape' ? BodyShape : BodyPart
  );
}
