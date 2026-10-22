import { expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  saveHeroesLibrary,
  listHeroesLibrary,
  deleteHeroesLibrary,
  exportHeroesLibrary,
  importHeroesLibrary,
  createHeroesWorld,
  createHeroesObject,
  listHeroesObjects,
  exportHeroesWorld,
  exportHeroesObject,
} from '../scripts/heroes-store.js';
import { resolveLibraryReferences } from '../src/js/modules/objects/heroes/definition-library.mjs';

it('persists a shared library, refreshes cross-world references and detaches them before deletion', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'heroes-library-'));
  const file = path.join(root, 'heroes.db');
  try {
    let part = await saveHeroesLibrary(
      {
        name: 'Grip',
        kind: 'part',
        definition: { anatomyType: 'part', name: 'Grip', components: [{ name: 'Pad' }] },
      },
      null,
      file
    );
    const shape = await saveHeroesLibrary(
      {
        name: 'Shell',
        kind: 'shape',
        definition: { anatomyType: 'shape', type: 'shape', parts: [{ libraryRef: part.id }] },
      },
      null,
      file
    );
    const worlds = await Promise.all(['One', 'Two'].map((name) => createHeroesWorld(name, file)));
    await expect(
      saveHeroesLibrary(
        { ...shape, definition: { ...shape.definition, parts: [{ libraryRef: shape.id }] } },
        shape.id,
        file
      )
    ).rejects.toMatchObject({ status: 400 });
    expect(
      (await listHeroesLibrary(file)).find((entry) => entry.id === shape.id).definition
    ).toEqual(shape.definition);
    for (const world of worlds) {
      await createHeroesObject(
        world.id,
        {
          name: 'User',
          kind: 'character',
          typedElements: [{ libraryRef: shape.id }],
        },
        file
      );
    }
    part = await saveHeroesLibrary(
      { ...part, definition: { ...part.definition, components: [{ name: 'Updated pad' }] } },
      part.id,
      file
    );
    for (const world of worlds) {
      const object = (await listHeroesObjects(world.id, file))[0];
      expect(
        resolveLibraryReferences(object.definition, await listHeroesLibrary(file)).typedElements[0]
          .parts[0].components[0].name
      ).toBe('Updated pad');
    }
    const exported = await exportHeroesLibrary(file);
    expect(JSON.stringify(exported)).not.toContain('libraryRef');
    expect((await importHeroesLibrary(exported, file)).imported).toBe(2);
    const backup = await exportHeroesWorld(worlds[0].id, file);
    expect(JSON.stringify(backup)).not.toContain('libraryRef');
    const object = (await listHeroesObjects(worlds[0].id, file))[0];
    expect(JSON.stringify(await exportHeroesObject(object.id, file))).not.toContain('libraryRef');
    await deleteHeroesLibrary(part.id, file);
    const changedShape = (await listHeroesLibrary(file)).find((entry) => entry.id === shape.id);
    expect(changedShape.definition.parts[0].libraryRef).toBeUndefined();
    expect(changedShape.definition.parts[0].components[0].name).toBe('Updated pad');
    await deleteHeroesLibrary(shape.id, file);
    for (const world of worlds) {
      const definition = (await listHeroesObjects(world.id, file))[0].definition;
      expect(JSON.stringify(definition)).not.toContain('libraryRef');
      expect(definition.typedElements[0].parts[0].components[0].name).toBe('Updated pad');
    }
    await expect(
      saveHeroesLibrary(
        {
          name: 'Missing',
          kind: 'shape',
          definition: { anatomyType: 'shape', parts: [{ libraryRef: 'missing' }] },
        },
        null,
        file
      )
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      saveHeroesLibrary(
        {
          ...changedShape,
          definition: { ...changedShape.definition, parts: [{ libraryRef: changedShape.id }] },
        },
        changedShape.id,
        file
      )
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      createHeroesObject(
        worlds[0].id,
        {
          name: 'Broken',
          kind: 'character',
          containedObjects: [{ libraryRef: 'missing' }],
        },
        file
      )
    ).rejects.toMatchObject({ status: 400 });
    await expect(async () =>
      importHeroesLibrary(
        {
          format: 'wurm-tools-heroes-library',
          version: 1,
          entries: [{ name: 'Missing', kind: 'shape', definition: { libraryRef: 'missing' } }],
        },
        file
      )
    ).rejects.toMatchObject({ status: 400 });
  } finally {
    fs.rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});
