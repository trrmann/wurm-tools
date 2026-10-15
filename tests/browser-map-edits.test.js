import { describe, expect, it } from 'vitest';
import {
  applyEditsToLocalRecord,
  editedLayerBytes,
  localEditReport,
  resetEditsFromLocalRecord,
} from '../src/js/tools/map-explorer/browser-store.js';

function makeRecord() {
  const surface = new Uint8Array(8);
  const view = new DataView(surface.buffer);
  surface.set([2, 0], 0);
  view.setInt16(2, 10, false);
  surface.set([2, 0], 4);
  view.setInt16(6, 20, false);
  return {
    id: 'baseline-1',
    world: 'Adventure',
    createdAt: '2026-10-14T00:00:00.000Z',
    bounds: { x0: 5, y0: 8, width: 2, height: 1 },
    layers: {
      surface,
      rock: new Uint8Array(8),
      cave: new Uint8Array(8),
      resources: new Uint8Array(8),
      flags: new Uint8Array(8),
    },
  };
}

describe('browser-only map working-copy edits', () => {
  it('stores brush edits separately, previews them, and reports work without changing baseline bytes', () => {
    const record = makeRecord();
    const original = Uint8Array.from(record.layers.surface);

    expect(
      applyEditsToLocalRecord(record, {
        layer: 'surface',
        x0: 5,
        y0: 8,
        x1: 6,
        y1: 8,
        set: { type: 5, heightDm: 30 },
      })
    ).toMatchObject({ changed: 2, reverted: 0 });
    expect(record.layers.surface).toEqual(original);

    const preview = editedLayerBytes(record, 'surface');
    expect(preview[0]).toBe(5);
    expect(new DataView(preview.buffer).getInt16(2, false)).toBe(30);
    expect(localEditReport(record).totalChanges).toBe(2);
    expect(localEditReport(record).byLayer.surface).toMatchObject({ tiles: 2, minX: 5, maxX: 6 });
  });

  it('restores baseline values per edit and removes remaining layer edits', () => {
    const record = makeRecord();
    applyEditsToLocalRecord(record, {
      layer: 'surface',
      x0: 5,
      y0: 8,
      x1: 6,
      y1: 8,
      set: { heightDm: 40 },
    });

    const reverted = applyEditsToLocalRecord(record, {
      layer: 'surface',
      x0: 5,
      y0: 8,
      set: { heightDm: 10 },
    });
    expect(reverted).toMatchObject({ reverted: 1 });
    expect(resetEditsFromLocalRecord(record, 'surface')).toEqual({ removed: 1 });
    expect(record.edits).toEqual({});
    expect(localEditReport(record).totalChanges).toBe(0);
  });

  it('rejects edits outside the imported baseline bounds', () => {
    const record = makeRecord();
    expect(() =>
      applyEditsToLocalRecord(record, {
        layer: 'surface',
        x0: 2,
        y0: 2,
        set: { heightDm: 15 },
      })
    ).toThrow('Edit area is outside this baseline');
  });
});
