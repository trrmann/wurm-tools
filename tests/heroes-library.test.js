import { describe, expect, it } from 'vitest';
import {
  generateHerosObject,
  replaceHerosObjectBodyShape,
} from '../src/js/modules/objects/heroes.mjs';
import {
  createAnatomy,
  getAnatomyTypes,
} from '../src/js/modules/objects/heroes/anatomy-catalog.mjs';
import {
  resolveLibraryReferences,
  copyLibraryDefinition,
  detachLibraryReference,
  placeAnatomyDefinition,
} from '../src/js/modules/objects/heroes/definition-library.mjs';
import { Hands } from '../src/js/modules/objects/heroes/elements/body-shapes/body-parts.mjs/hands-parts.mjs';

const typeFor = (name) => getAnatomyTypes().find((entry) => entry.type.endsWith(`#${name}`)).type;
const anatomy = (name, definition = {}) => ({
  anatomyType: typeFor(name),
  type: typeFor(name),
  ...definition,
});
const entries = () => [
  {
    id: 'grip',
    kind: 'part',
    name: 'Grip',
    definition: anatomy('CustomBodyPart', {
      id: 'grip-root',
      name: 'Grip',
      components: [{ id: 'pad', name: 'Pad' }],
    }),
  },
  {
    id: 'shell',
    kind: 'shape',
    name: 'Shell',
    definition: anatomy('CustomShape', {
      name: 'Shell',
      parts: [{ libraryRef: 'grip', id: 'placement' }],
    }),
  },
];

describe('reusable HERO anatomy and definitions', () => {
  it('discovers every anatomy class with stable types and separates standalone builders', () => {
    expect(getAnatomyTypes().filter((entry) => entry.kind === 'part').length).toBeGreaterThan(30);
    expect(getAnatomyTypes().find((entry) => entry.Type === Hands).requiresLibrary).toBe(false);
    for (const name of ['CustomBodyPart', 'CompoundBodyPart', 'CustomShape', 'CompoundShape']) {
      expect(getAnatomyTypes().find((entry) => entry.type === typeFor(name)).requiresLibrary).toBe(
        true
      );
    }
  });

  it('round trips custom and compound parts with concrete nested types and presence', () => {
    const part = createAnatomy(
      anatomy('CompoundBodyPart', {
        name: 'Tool grip',
        parts: [
          createAnatomy(anatomy('Hands')).toJSON(),
          resolveLibraryReferences({ libraryRef: 'grip', id: 'grip-placement' }, entries()),
        ],
      })
    );
    part.parts[0].parts[0].isPresent = false;
    const restored = createAnatomy(JSON.parse(JSON.stringify(part)));
    expect(restored.parts[0]).toBeInstanceOf(Hands);
    expect(restored.parts[0].parts).toHaveLength(2);
    expect(restored.parts[0].parts[0].isPresent).toBe(false);
    expect(restored.isComponentPresent(restored.parts[0].parts[0])).toBe(false);
    expect(restored.parts[1].libraryRef).toBe('grip');
    expect(restored.toJSON()).toEqual(part.toJSON());
  });

  it('composes shapes without duplicating anatomy and replays changes on one authoritative root', () => {
    const child = placeAnatomyDefinition(createAnatomy(anatomy('Humanoid')).toJSON(), 'human');
    const shape = createAnatomy(
      anatomy('CompoundShape', {
        name: 'Composite',
        shapes: [child],
        parts: [
          createAnatomy(anatomy('CustomBodyPart', { name: 'Antenna', id: 'antenna' })).toJSON(),
        ],
      })
    );
    expect(shape.parts).toHaveLength(11);
    const restored = createAnatomy(JSON.parse(JSON.stringify(shape)));
    expect(restored.parts).toHaveLength(11);
    const hand = restored.parts.find((part) => part instanceof Hands).parts[0];
    restored.applyChange({ action: 'set-present', componentId: hand.id, isPresent: false });
    expect(restored.isComponentPresent(hand)).toBe(false);
    restored.removeComponent('antenna');
    expect(restored.parts).toHaveLength(10);
    const generated = replaceHerosObjectBodyShape(
      { objectType: 'character' },
      {
        ...restored.toJSON(),
        type: typeFor('CompoundShape'),
        name: 'Composite',
      }
    );
    expect(generated.bodyShape.parts).toHaveLength(10);
    expect(
      generated.typedElements.filter((item) => item.type === typeFor('CompoundShape'))
    ).toHaveLength(1);
    expect(createAnatomy(JSON.parse(JSON.stringify(generated.bodyShape))).parts).toHaveLength(10);
  });

  it('keeps copies static while refreshing live shape and object references', () => {
    const library = entries();
    const staticShape = copyLibraryDefinition({ libraryRef: 'shell' }, library);
    const definition = { objectType: 'character', typedElements: [{ libraryRef: 'shell' }] };
    const first = generateHerosObject({ ...definition, libraryEntries: library });
    const regenerated = generateHerosObject({
      objectType: 'character',
      typedElements: first.typedElements,
      libraryEntries: library,
    });
    expect(regenerated.bodyShape.name).toBe('Shell');
    const afterDeletion = detachLibraryReference(regenerated.typedElements, 'shell', library);
    expect(
      generateHerosObject({ objectType: 'character', typedElements: afterDeletion }).bodyShape.name
    ).toBe('Shell');
    expect(first.bodyShape.name).toBe('Shell');
    expect(String(first.bodyShape.parts[0].components[0])).toBe('Pad');
    library[0].definition.components[0].name = 'Updated pad';
    expect(
      String(
        generateHerosObject({ ...definition, libraryEntries: library }).bodyShape.parts[0]
          .components[0]
      )
    ).toBe('Updated pad');
    expect(
      String(
        generateHerosObject({ objectType: 'character', typedElements: [staticShape] }).bodyShape
          .parts[0].components[0]
      )
    ).toBe('Pad');
    library.push({
      id: 'kit',
      kind: 'object',
      definition: {
        name: 'Kit',
        kind: 'equipment',
        typedElements: [{ libraryRef: 'shell' }],
      },
    });
    const parent = generateHerosObject({
      objectType: 'character',
      containedObjects: [{ libraryRef: 'kit' }],
      libraryEntries: library,
    });
    expect(String(parent.objects[0])).toBe('Kit');
    expect(parent.objects[0].bodyShape.name).toBe('Shell');
  });

  it('detaches deleted definitions at their latest value and rejects missing and cyclic references', () => {
    const library = entries();
    const detached = detachLibraryReference({ parts: [{ libraryRef: 'grip' }] }, 'grip', library);
    expect(detached.parts[0].libraryRef).toBeUndefined();
    expect(detached.parts[0].name).toBe('Grip');
    expect(() => resolveLibraryReferences({ libraryRef: 'missing' }, library)).toThrow(/not found/);
    library[0].definition.parts = [{ libraryRef: 'shell' }];
    expect(() => resolveLibraryReferences({ libraryRef: 'shell' }, library)).toThrow(/circular/);
  });

  it('assigns distinct stable anatomy IDs for repeated placements and retains nested shape components', () => {
    const library = entries();
    const composed = resolveLibraryReferences(
      anatomy('CompoundShape', {
        shapes: [
          { libraryRef: 'shell', id: 'left' },
          { libraryRef: 'shell', id: 'right' },
        ],
      }),
      library
    );
    const shape = createAnatomy(composed);
    const leftPad = shape.shapes[0].parts[0].components[0];
    const rightPad = shape.shapes[1].parts[0].components[0];
    expect(leftPad.id).not.toBe(rightPad.id);
    expect(shape.getComponent(leftPad.id)).toBe(leftPad);
    expect(shape.getComponent(rightPad.id)).toBe(rightPad);
    const regenerated = createAnatomy(
      resolveLibraryReferences(JSON.parse(JSON.stringify(shape)), library)
    );
    expect(regenerated.shapes[0].parts[0].components[0].id).toBe(leftPad.id);
    expect(regenerated.shapes[1].parts[0].components[0].id).toBe(rightPad.id);
  });
});
