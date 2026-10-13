import { describe, it, expect } from 'vitest';
import { parseLibraryPaths, matchProcess, TARGETS, allowedOrigins } from '../scripts/wurm-local.js';
import { describeTarget } from '../src/js/modules/pages/ServerStatusPage.js';

describe('wurm-local helper', () => {
  it('parses Steam library paths', () => {
    const vdf = '"libraryfolders"\n{\n "0"\n {\n "path"\t\t"D:\\\\SteamLibrary"\n }\n}';
    expect(parseLibraryPaths(vdf)).toEqual(['D:\\SteamLibrary']);
  });

  it('matches a running server process and returns its pid', () => {
    const listing = '10 explorer.exe\n4242 java -cp x com.wurmonline.server.ServerLauncher';
    expect(matchProcess(listing, TARGETS.server.processPattern)).toBe(4242);
    expect(matchProcess('10 explorer.exe', TARGETS.server.processPattern)).toBe(false);
  });

  it('allows the dev and preview origins', () => {
    expect(allowedOrigins({})).toContain('http://localhost:3000');
  });
});

describe('ServerStatusPage.describeTarget', () => {
  it('disables start when not installed or already running', () => {
    expect(describeTarget('server', { label: 'S', installed: false }).disabled).toBe('disabled');
    expect(
      describeTarget('server', { label: 'S', installed: true, running: true, path: 'p' }).badge
    ).toContain('Running');
    expect(
      describeTarget('client', { label: 'C', installed: true, running: false, path: 'p' }).disabled
    ).toBe('');
  });
});
