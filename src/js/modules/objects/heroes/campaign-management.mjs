export const managementKinds = Object.freeze(['profile', 'world', 'campaign', 'character', 'note']);

function text(value, label, required = false, limit = 120) {
  if (value == null && !required) return '';
  if (typeof value !== 'string') throw new TypeError(`${label} must be text`);
  const result = value.trim();
  if ((required && !result) || result.length > limit) throw new RangeError(`Invalid ${label}`);
  return result;
}

export function normalizeManagementRecord(kind, source) {
  if (!managementKinds.includes(kind)) throw new RangeError('Unknown management record kind');
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new TypeError('Management record must be an object');
  }
  const data = { name: text(source.name, 'name', true) };
  const reference = (key) => {
    data[key] = text(source[key], key);
  };
  if (kind === 'profile') {
    if (
      !Array.isArray(source.roles) ||
      !source.roles.length ||
      source.roles.some((role) => !['game-master', 'player'].includes(role))
    ) {
      throw new RangeError('Select Game Master and/or Player');
    }
    data.roles = [...new Set(source.roles)];
    data.notes = text(source.notes, 'profile notes', false, 8000);
  } else if (kind === 'world') {
    for (const key of ['worldId', 'gameMasterId']) reference(key);
    data.externalGameMaster = text(source.externalGameMaster, 'external Game Master');
    if (!data.worldId) throw new RangeError('Select a stored world');
    if (data.gameMasterId && data.externalGameMaster)
      throw new RangeError('Choose a local or external Game Master, not both');
    if (
      !Array.isArray(source.playerIds) ||
      source.playerIds.some((id) => typeof id !== 'string' || !id)
    ) {
      throw new TypeError('Subscribed players must be a list of profile IDs');
    }
    data.playerIds = [...new Set(source.playerIds)];
    if (!Array.isArray(source.genres) || source.genres.length > 50)
      throw new TypeError('Genres must be a list');
    data.genres = [...new Set(source.genres.map((genre) => text(genre, 'genre', true)))];
  } else if (kind === 'campaign') {
    reference('worldId');
    if (!data.worldId) throw new RangeError('Select a stored world');
    data.genre = text(source.genre, 'genre');
    if (typeof source.active !== 'boolean')
      throw new TypeError('Campaign active state must be boolean');
    data.active = source.active;
    data.notes = text(source.notes, 'campaign notes', false, 8000);
  } else if (kind === 'character') {
    for (const key of ['objectId', 'playerId', 'campaignId']) reference(key);
    if (!data.objectId) throw new RangeError('Select a saved character');
    data.externalPlayer = text(source.externalPlayer, 'external player');
    data.externalGameMaster = text(source.externalGameMaster, 'external Game Master');
    if (data.playerId && data.externalPlayer)
      throw new RangeError('Choose a local or external player, not both');
  } else {
    for (const key of ['worldId', 'playerId', 'objectId']) reference(key);
    if (!data.worldId || (!data.playerId && !data.objectId)) {
      throw new RangeError('Notes require a world and a subscribed player or saved character');
    }
    data.notes = text(source.notes, 'note', true, 8000);
  }
  return data;
}

export function validateManagementRelations(records, worlds, objects) {
  const worldIds = new Set(worlds.map((world) => world.id));
  const objectMap = new Map(objects.map((object) => [object.id, object]));
  const profiles = new Map(
    records.filter((record) => record.kind === 'profile').map((record) => [record.id, record.data])
  );
  const campaigns = new Map(
    records.filter((record) => record.kind === 'campaign').map((record) => [record.id, record.data])
  );
  const worldRecords = records.filter((record) => record.kind === 'world');
  const worldLinks = new Map(worldRecords.map((record) => [record.data.worldId, record.data]));
  if (worldLinks.size !== worldRecords.length)
    throw new RangeError('A world already has a management record');
  const assigned = new Set();
  const profile = (id, role) => {
    if (id && !profiles.get(id)?.roles.includes(role))
      throw new RangeError(`Select an existing ${role} profile`);
  };
  for (const { kind, data } of records) {
    if (data.worldId && !worldIds.has(data.worldId))
      throw new RangeError('Stored world no longer exists');
    if (kind === 'world') {
      profile(data.gameMasterId, 'game-master');
      data.playerIds.forEach((id) => profile(id, 'player'));
    }
    if (kind === 'character' || kind === 'note') {
      profile(data.playerId, 'player');
      const object = objectMap.get(data.objectId);
      if (data.objectId && !object) throw new RangeError('Stored character no longer exists');
      if (
        object &&
        !['character', 'player-character', 'non-player-character'].includes(
          object.definition?.objectType ?? object.kind
        )
      ) {
        throw new RangeError('Select a character object');
      }
      if (kind === 'character') {
        if (assigned.has(data.objectId))
          throw new RangeError('Character already has an assignment');
        assigned.add(data.objectId);
        if (data.campaignId && campaigns.get(data.campaignId)?.worldId !== object.worldId) {
          throw new RangeError('Character and campaign must belong to the same world');
        }
      } else {
        if (!worldLinks.get(data.worldId)?.gameMasterId)
          throw new RangeError('Assign a local Game Master before adding GM notes');
        if (data.playerId && !worldLinks.get(data.worldId)?.playerIds.includes(data.playerId)) {
          throw new RangeError('GM notes may only target players subscribed to that world');
        }
        if (object && object.worldId !== data.worldId)
          throw new RangeError('Note character must belong to the selected world');
      }
    }
  }
}
