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
import { generateHerosCharacter } from './character-generator.mjs';

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

/** Build any supported HERO world-object kind through the shared character element generator. */
export function generateHerosObject(definition = {}) {
  if (definition == null || typeof definition !== 'object' || Array.isArray(definition)) {
    throw new TypeError('Object definition must be an object');
  }

  const objectType = definition.objectType ?? definition.kind ?? 'object';
  const objectTypeDefinition = objectTypes.get(objectType);
  if (!objectTypeDefinition) {
    throw new RangeError(`Unsupported HERO object type: ${objectType}`);
  }

  const edition = normalizeHerosEdition(definition.edition);
  const character = generateHerosCharacter({
    ...definition,
    edition: edition.id,
    characterType: inferCharacterType(objectType),
  });
  const options = {
    ...definition,
    objectType,
    kind: objectType,
    edition: edition.id,
    equation: character.equation,
  };
  const object =
    objectType === 'character' ||
    objectType === 'player-character' ||
    objectType === 'non-player-character'
      ? character
      : new objectTypeDefinition.Type(options);

  object.objectType = objectType;
  object.kind = objectType;
  object.edition = edition;
  object.generatedElements = character.generatedElements;
  object.elementObjects = character.elementObjects;
  return object;
}
