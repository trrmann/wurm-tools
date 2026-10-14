import { describe, expect, it } from 'vitest';
import {
  mixWaterColor,
  playerPositionToTile,
  zoomByStep,
} from '../src/js/tools/map-explorer/index.js';

describe('map water rendering', () => {
  it('leaves above-water terrain unchanged and tints submerged terrain blue', () => {
    const terrain = [190, 166, 105];

    expect(mixWaterColor(terrain, 0)).toEqual(terrain);
    expect(mixWaterColor(terrain, 10)).not.toEqual(terrain);
    expect(mixWaterColor(terrain, 10)[2]).toBeGreaterThan(terrain[2]);
  });

  it('uses lighter royal blue for shallows and dark navy for deeper water', () => {
    const terrain = [190, 166, 105];
    const shallow = mixWaterColor(terrain, 1);
    const deep = mixWaterColor(terrain, 255);

    expect(shallow[2]).toBeGreaterThan(shallow[0]);
    expect(deep[2]).toBeGreaterThan(deep[0]);
    expect(deep[2]).toBeLessThan(shallow[2]);
    expect(deep.reduce((sum, channel) => sum + channel, 0)).toBeLessThan(
      shallow.reduce((sum, channel) => sum + channel, 0)
    );
    expect(shallow).not.toEqual([65, 105, 225]);
    expect(deep).not.toEqual([4, 16, 52]);
  });

  it('converts character world coordinates into map tiles', () => {
    expect(playerPositionToTile({ POSX: 6.5, POSY: 11.9 })).toEqual({ x: 1, y: 2 });
    expect(playerPositionToTile({ POSX: -4, POSY: 0 })).toEqual({ x: -1, y: 0 });
    expect(playerPositionToTile({ POSX: 'bad', POSY: 0 })).toBeNull();
  });

  it('steps and clamps zoom through the extended range', () => {
    expect(zoomByStep(1, 1)).toBe(1.25);
    expect(zoomByStep(16, 1)).toBe(16);
    expect(zoomByStep(0.25, -1)).toBe(0.25);
  });
});
