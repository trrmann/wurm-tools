import { expect, it } from 'vitest';
import { Humanoid } from '../src/js/modules/objects/heroes/elements/body-shapes/humanoid-shapes.mjs';
import { PhysicalDefense } from '../src/js/modules/objects/heroes/elements/characteristics/figured-characteristics/physical-defense-characteristics.mjs';
import { EnergyDefense } from '../src/js/modules/objects/heroes/elements/characteristics/figured-characteristics/energy-defense-characteristics.mjs';
import { Running } from '../src/js/modules/objects/heroes/elements/powers/movement-powers/running-powers.mjs';

it('keeps catalog labels and dependency priorities stable when class names are minified', async () => {
  const classes = [Humanoid, PhysicalDefense, EnergyDefense, Running];
  const descriptors = classes.map((Type) => Object.getOwnPropertyDescriptor(Type, 'name'));
  classes.forEach((Type, index) => Object.defineProperty(Type, 'name', { value: `a${index}` }));
  try {
    const { getHerosCharacterElementTypes, generateHerosObject } =
      await import('../src/js/modules/objects/heroes.mjs');
    const catalog = getHerosCharacterElementTypes();
    for (const [Type, label, constructionPriority] of [
      [Humanoid, 'Humanoid', 0],
      [PhysicalDefense, 'Physical Defense', 1],
      [EnergyDefense, 'Energy Defense', 1],
      [Running, 'Running', 0],
    ]) {
      expect(catalog.find((entry) => entry.elementClass === Type)).toMatchObject({
        label,
        constructionPriority,
      });
    }
    const object = generateHerosObject({ objectType: 'character' });
    expect(object.bodyShape.name).toBe('Humanoid');
    const running = catalog.find((entry) => entry.elementClass === Running);
    expect(object.typedElements.find((item) => item.type === running.type).name).toBe('Running');
    expect(object.generatedElements.get(running.type)[0].Value()).toBe(6);
    const defense = catalog.find((entry) => entry.type.endsWith('#Defense'));
    expect(object.generatedElements.get(defense.type)[0].Value()).toBe(2);
  } finally {
    classes.forEach((Type, index) => Object.defineProperty(Type, 'name', descriptors[index]));
  }
}, 60000);
