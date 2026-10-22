function definitionMap(entries) {
  return new Map(entries.map((entry) => [entry.id, entry]));
}

function placeDefinition(definition, id) {
  if (!id) return definition;
  const prefix = `${id}::`;
  const identifiers = new Map();
  function collect(item) {
    if (item == null || typeof item !== 'object') return;
    if (typeof item.id === 'string') {
      identifiers.set(item.id, item.id.startsWith(prefix) ? item.id : `${prefix}${item.id}`);
    }
    Object.values(item).forEach(collect);
  }
  collect(definition);
  function remap(item) {
    if (typeof item === 'string') return identifiers.get(item) ?? item;
    if (Array.isArray(item)) return item.map(remap);
    if (item == null || typeof item !== 'object') return item;
    if (Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null)
      return item;
    return Object.fromEntries(Object.entries(item).map(([key, child]) => [key, remap(child)]));
  }
  return { ...remap(definition), id };
}

export function placeAnatomyDefinition(definition, id) {
  return placeDefinition(definition, id);
}

export function resolveLibraryReferences(value, entries = []) {
  const library = definitionMap(entries);
  function resolve(item, path = [], depth = 0) {
    if (depth > 64) throw new RangeError('Saved definition nesting exceeds 64 levels');
    if (Array.isArray(item)) return item.map((child) => resolve(child, path, depth + 1));
    if (item == null || typeof item !== 'object') return item;
    if (Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null)
      return item;
    if (item.libraryRef != null) {
      const id = item.libraryRef;
      if (typeof id !== 'string' || !library.has(id)) {
        throw new RangeError(`Saved definition not found: ${id}`);
      }
      if (path.includes(id))
        throw new RangeError('Saved definitions cannot contain circular references');
      const entry = library.get(id);
      const resolved = placeDefinition(
        resolve(entry.definition, [...path, id], depth + 1),
        item.id
      );
      return {
        ...resolved,
        libraryRef: id,
        ...(item.id == null ? {} : { id: item.id }),
        ...(item.isBase == null ? {} : { isBase: item.isBase }),
      };
    }
    return Object.fromEntries(
      Object.entries(item).map(([key, child]) => [key, resolve(child, path, depth + 1)])
    );
  }
  return resolve(value);
}

export function copyLibraryDefinition(value, entries = []) {
  function copy(item) {
    if (Array.isArray(item)) return item.map(copy);
    if (item == null || typeof item !== 'object') return item;
    return Object.fromEntries(
      Object.entries(item)
        .filter(([key]) => key !== 'libraryRef')
        .map(([key, child]) => [key, copy(child)])
    );
  }
  return copy(JSON.parse(JSON.stringify(resolveLibraryReferences(value, entries))));
}

export function detachLibraryReference(value, id, entries) {
  if (Array.isArray(value)) return value.map((item) => detachLibraryReference(item, id, entries));
  if (value == null || typeof value !== 'object') return value;
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
    return value;
  if (value.libraryRef === id) return copyLibraryDefinition(value, entries);
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, detachLibraryReference(item, id, entries)])
  );
}
