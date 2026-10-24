import { expect, it } from 'vitest';
import {
  getAnatomyTypes,
  createAnatomy,
} from '../src/js/modules/objects/heroes/anatomy-catalog.mjs';
import { HEROS_BODY_SHAPE_TYPES } from '../src/js/modules/objects/heroes/body-shape-structure.mjs';
import {
  Bipedal,
  Canine,
  Equestrian,
  Feline,
  Limbless,
  SurfaceArea,
  Vehicle,
} from '../src/js/modules/objects/heroes/elements/body-shapes/named-shapes.mjs';
import { Humanoid } from '../src/js/modules/objects/heroes/elements/body-shapes/humanoid-shapes.mjs';
import { Quadruped } from '../src/js/modules/objects/heroes/elements/body-shapes/quadruped-shapes.mjs';
import { Serpentine } from '../src/js/modules/objects/heroes/elements/body-shapes/serpentine-shapes.mjs';
import { RectangularParallelepiped } from '../src/js/modules/objects/heroes/elements/body-shapes/rectangular-parallelepiped-shapes.mjs';
import { Sphere } from '../src/js/modules/objects/heroes/elements/body-shapes/sphere-shapes.mjs';
import { Cylinder } from '../src/js/modules/objects/heroes/elements/body-shapes/cylinder-shapes.mjs';
import { CompoundShape } from '../src/js/modules/objects/heroes/elements/body-shapes/compound-shapes.mjs';
import { getHerosCharacterElementTypes } from '../src/js/modules/objects/heroes/character-generator.mjs';
import '../src/js/modules/objects/heroes/element-catalog.mjs';

it('provides model-owned defaults for requested body-shape categories', () => {
  expect(HEROS_BODY_SHAPE_TYPES).toMatchObject({
    humanoid: 'humanoid',
    bipedal: 'bipedal',
    equestrian: 'equestrian',
    canine: 'canine',
    feline: 'feline',
    quadrupedal: 'quadrupedal',
    nonpedal: 'nonpedal',
    limbless: 'limbless',
    vehicle: 'vehicle',
    surface: 'surface',
    surfaceArea: 'surface-area',
    base: 'base',
    cityTown: 'city/town',
    box: 'box',
    sphere: 'sphere',
    rod: 'rod',
    compound: 'compound',
  });

  const expected = [
    [Humanoid, ['humanoid', 'bipedal']],
    [Bipedal, ['bipedal']],
    [Equestrian, ['equestrian']],
    [Canine, ['quadrupedal', 'canine']],
    [Feline, ['quadrupedal', 'feline']],
    [Quadruped, ['quadrupedal']],
    [Serpentine, ['limbless']],
    [Limbless, ['limbless']],
    [Vehicle, ['vehicle', 'box']],
    [SurfaceArea, ['surface-area', 'base', 'city/town']],
    [RectangularParallelepiped, ['box']],
    [Sphere, ['sphere']],
    [Cylinder, ['rod']],
    [CompoundShape, ['compound']],
  ];

  for (const [Type, tags] of expected) {
    const shape = new Type();
    expect(shape.shapeTypes.map(String), Type.name).toEqual(tags);
    expect(shape.generalShape, Type.name).not.toBe('Unspecified');
  }
});

it('catalogs and round-trips named body shapes by their registered model types', () => {
  const expectedTypes = [
    'Bipedal',
    'Canine',
    'Equestrian',
    'Feline',
    'Limbless',
    'SurfaceArea',
    'Vehicle',
  ];
  const catalog = getAnatomyTypes();
  const editorTypes = getHerosCharacterElementTypes();
  for (const name of expectedTypes) {
    const entry = catalog.find((type) => type.type.endsWith(`#${name}`));
    const editorEntry = editorTypes.find((type) => type.type.endsWith(`#${name}`));
    expect(entry, name).toBeDefined();
    expect(entry.kind).toBe('shape');
    expect(editorEntry, name).toMatchObject({
      group: 'body-shapes',
      field: 'bodyShapes',
      priced: false,
    });
    const restored = createAnatomy(JSON.parse(JSON.stringify(new entry.Type().toJSON())));
    expect(restored).toBeInstanceOf(entry.Type);
  }
});

it('keeps the prior nonpedal tag available for saved definitions', () => {
  const restored = createAnatomy({
    anatomyType: getAnatomyTypes().find((type) => type.type.endsWith('#Limbless')).type,
    name: 'Legacy shape',
    generalShape: 'Unspecified',
    shapeTypes: [HEROS_BODY_SHAPE_TYPES.nonpedal],
  });
  expect(restored.shapeTypes.map(String)).toEqual(['nonpedal']);
});
