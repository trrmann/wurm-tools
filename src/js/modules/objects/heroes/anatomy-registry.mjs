const types = new Map();
const ids = new Map();

export function registerAnatomyType(id, Type) {
  types.set(id, Type);
  ids.set(Type, id);
}

export function anatomyTypeId(Type) {
  return ids.get(Type);
}

export function restoreAnatomy(definition, Base, fallback = Base) {
  const Type = definition.anatomyType ? types.get(definition.anatomyType) : fallback;
  if (!Type || !(Type === Base || Type.prototype instanceof Base)) {
    throw new TypeError(`Unknown or invalid anatomy type: ${definition.anatomyType}`);
  }
  return new Type(definition);
}
