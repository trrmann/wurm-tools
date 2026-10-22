import {
  HerosAI,
  HerosAnimal,
  HerosAutomaton,
  HerosBase,
  HerosCharacter,
  HerosComputer,
  HerosEquipment,
  HerosGameObject,
  HerosNonPlayerCharacter,
  HerosPlant,
  HerosPlayerCharacter,
  HerosVehicle,
  normalizeHerosEdition,
} from './heroes.mjs';
import {
  generateHerosCharacter,
  getHerosCharacterElementTypes,
  withHerosObjectElements,
} from './character-generator.mjs';
import { resolveLibraryReferences } from './definition-library.mjs';

const objectTypes = new Map([
  ['object', { label: 'Generic object', Type: HerosGameObject }],
  ['character', { label: 'Character', Type: HerosCharacter }],
  ['player-character', { label: 'Player character', Type: HerosPlayerCharacter }],
  ['non-player-character', { label: 'Non-player character', Type: HerosNonPlayerCharacter }],
  ['base', { label: 'Base', Type: HerosBase }],
  ['vehicle', { label: 'Vehicle', Type: HerosVehicle }],
  ['equipment', { label: 'Equipment', Type: HerosEquipment }],
  ['animal', { label: 'Animal', Type: HerosAnimal }],
  ['plant', { label: 'Plant', Type: HerosPlant }],
  ['automaton', { label: 'Automaton', Type: HerosAutomaton }],
  ['computer', { label: 'Computer', Type: HerosComputer }],
  ['ai', { label: 'Artificial intelligence', Type: HerosAI }],
]);

export function getHerosObjectTypes() {
  return [...objectTypes].map(([type, { label, Type }]) => ({
    type,
    label,
    modelTypes: [...Type.ModelTypes],
  }));
}

function inferCharacterType(objectType) {
  if (objectType === 'player-character') return 'player';
  if (objectType === 'non-player-character') return 'nonPlayer';
  return undefined;
}

function isBodyShape(item) {
  return getHerosCharacterElementTypes().some(
    (entry) => entry.type === item.type && entry.group === 'body-shapes'
  );
}

/** Replace the shape definition, never append a second shape or keep a displaced default. */
export function replaceHerosObjectBodyShape(definition, replacement) {
  if (!replacement || !isBodyShape(replacement)) {
    throw new TypeError('Replacement must be a registered body-shape element');
  }
  return generateHerosObject({
    ...definition,
    typedElements: [
      ...(definition.typedElements ?? []).filter((item) => !isBodyShape(item)),
      { ...replacement, isBase: true },
    ],
  });
}

/** Build any supported HERO world-object kind through the shared element generator. */
export function generateHerosObject(definition = {}) {
  if (definition == null || typeof definition !== 'object' || Array.isArray(definition)) {
    throw new TypeError('Object definition must be an object');
  }
  const { libraryEntries, ...source } = definition;
  definition = resolveLibraryReferences(source, libraryEntries);
  if ('bodyShapes' in definition || 'bodyShape' in definition) {
    throw new TypeError('Define body shape only as a typedElements body-shape element');
  }
  const objectType = definition.objectType ?? definition.kind ?? 'object';
  const objectTypeDefinition = objectTypes.get(objectType);
  if (!objectTypeDefinition) throw new RangeError(`Unsupported HERO object type: ${objectType}`);
  const edition = normalizeHerosEdition(definition.edition);
  const typedElements = withHerosObjectElements(
    definition.typedElements,
    objectTypeDefinition.Type.ObjectClass
  );
  const character = generateHerosCharacter({
    ...definition,
    edition: edition.id,
    characterType: inferCharacterType(objectType),
    typedElements,
    libraryEntries,
  });
  const shape = character.bodyShape;
  const finalTypedElements = character.typedElements.map((item) =>
    isBodyShape(item)
      ? {
          ...item,
          ...shape.toJSON(),
          baseBodyShape: shape.bodyShapeBaseline,
        }
      : item
  );
  const options = {
    ...definition,
    typedElements: finalTypedElements,
    elementObjects: character.elementObjects,
    objectType,
    edition: edition.id,
    equation: character.equation,
  };
  const object =
    objectTypeDefinition.Type.prototype instanceof HerosCharacter ||
    objectTypeDefinition.Type === HerosCharacter
      ? character
      : new objectTypeDefinition.Type(options);
  object.typedElements = finalTypedElements;
  object.objectType = objectType;
  object.kind = objectType;
  object.edition = edition;
  object.generatedElements = character.generatedElements;
  for (const item of definition.containedObjects ?? []) {
    object.addObject(generateHerosObject({ ...item, libraryEntries }));
  }
  return object;
}
