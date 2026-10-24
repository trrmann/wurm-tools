import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalizeObjectParticipants } from '../src/js/modules/objects/heroes/object-participants.mjs';
import {
  createHeroesObject,
  exportHeroesObject,
  importHeroesObject,
} from '../scripts/heroes-store.js';

describe('registered object participant selections', () => {
  it('requires a Player for PCs and permits an unassigned GM', () => {
    expect(normalizeObjectParticipants('player-character', { playerId: 'player' })).toEqual({
      playerId: 'player',
      gameMasterId: '',
    });
    expect(() => normalizeObjectParticipants('player-character', {})).toThrow('Select a Player');
  });

  it('keeps NPCs player-free with an optional GM', () => {
    expect(normalizeObjectParticipants('non-player-character', {})).toEqual({
      playerId: '',
      gameMasterId: '',
    });
    expect(() =>
      normalizeObjectParticipants('non-player-character', { playerId: 'player' })
    ).toThrow('cannot have a Player');
  });

  it.each(['object', 'character', 'equipment', 'vehicle', 'base'])(
    'requires a GM and permits an optional Player for %s',
    (type) => {
      expect(normalizeObjectParticipants(type, { gameMasterId: 'gm' })).toEqual({
        gameMasterId: 'gm',
        playerId: '',
      });
      expect(() => normalizeObjectParticipants(type, {})).toThrow('Select a Game Master');
    }
  );

  it.each([null, [], 'person', { gameMasterId: 1 }, { playerId: ' private ' }])(
    'rejects malformed account selections %j',
    (value) => {
      expect(() => normalizeObjectParticipants('player-character', value)).toThrow();
    }
  );

  it('round trips participant IDs through object backups and validates imported selections', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'heroes-participants-'));
    const database = path.join(root, 'heroes.db');
    try {
      const object = await createHeroesObject(
        null,
        {
          name: 'Assigned PC',
          kind: 'player-character',
          participants: { gameMasterId: '', playerId: 'registered-player' },
        },
        database
      );
      const backup = await exportHeroesObject(object.id, database);
      const copied = await importHeroesObject(null, backup, database);
      expect(copied.id).not.toBe(object.id);
      expect(copied.definition.participants).toEqual(object.definition.participants);
      backup.object.definition.participants = {};
      expect(() => importHeroesObject(null, backup, database)).toThrow('Select a Player account');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
