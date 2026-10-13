import { describe, it, expect } from 'vitest';
import { ironToCoins, calculateDeedMetrics } from '../src/tools/deed-calculator/index.js';
import {
  getCompassHeading,
  formatDuration,
  calculateDistanceMetrics,
} from '../src/tools/distance-calc/index.js';

describe('Deed Calculator & Currency Math', () => {
  it('converts iron denominations correctly', () => {
    // 0 iron
    expect(ironToCoins(0).iron).toBe(0);

    // 50 iron
    const copperTest = ironToCoins(150);
    expect(copperTest.copper).toBe(1);
    expect(copperTest.iron).toBe(50);

    // 1 Silver = 10,000 iron
    const silverTest = ironToCoins(25320);
    expect(silverTest.silver).toBe(2);
    expect(silverTest.copper).toBe(53);
    expect(silverTest.iron).toBe(20);

    // 1 Gold = 1,000,000 iron
    const goldTest = ironToCoins(1234567);
    expect(goldTest.gold).toBe(1);
    expect(goldTest.silver).toBe(23);
    expect(goldTest.copper).toBe(45);
    expect(goldTest.iron).toBe(67);
  });

  it('calculates base homestead metrics', () => {
    const metrics = calculateDeedMetrics({
      width: 5,
      height: 5,
      perimeter: 5,
      guards: 1,
      currentBankSilver: 10,
      serverMultiplier: 1.0,
    });

    expect(metrics.deedTiles).toBe(25);
    expect(metrics.totalWithPerim).toBe(15 * 15);
    expect(metrics.perimTiles).toBe(225 - 25);
    expect(metrics.totalMonthlyIron).toBeGreaterThan(0);
    expect(metrics.runwayDays).toBeGreaterThan(0);
  });

  it('handles 0.0x free upkeep servers correctly', () => {
    const metrics = calculateDeedMetrics({
      width: 21,
      height: 21,
      perimeter: 5,
      guards: 2,
      currentBankSilver: 0,
      serverMultiplier: 0.0,
    });

    expect(metrics.totalMonthlyIron).toBe(0);
  });
});

describe('Coordinate Distance & Navigation Math', () => {
  it('computes euclidean tile distance and metric conversion', () => {
    // (0,0) to (30, 40) => 50 tiles, 200 meters, 0.2 km
    const res = calculateDistanceMetrics(0, 0, 30, 40);
    expect(res.tiles).toBe(50);
    expect(res.meters).toBe(200);
    expect(res.km).toBe(0.2);
  });

  it('computes compass headings correctly', () => {
    // North: dy < 0, dx = 0
    const north = getCompassHeading(0, -100);
    expect(north.dir).toContain('North');

    // South: dy > 0, dx = 0
    const south = getCompassHeading(0, 100);
    expect(south.dir).toContain('South');

    // East: dx > 0, dy = 0
    const east = getCompassHeading(100, 0);
    expect(east.dir).toContain('East');

    // West: dx < 0, dy = 0
    const west = getCompassHeading(-100, 0);
    expect(west.dir).toContain('West');
  });

  it('formats travel durations human-readably', () => {
    expect(formatDuration(45)).toBe('45 sec');
    expect(formatDuration(125)).toBe('2m 5s');
    expect(formatDuration(3665)).toBe('1h 1m');
  });
});
