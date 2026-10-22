export const managementKinds = Object.freeze([
  'profile',
  'genre',
  'campaign',
  'world',
  'object-scope',
  'character',
  'note',
]);

function text(value, label, required = false, limit = 120) {
  if (value == null && !required) return '';
  if (typeof value !== 'string') throw new TypeError(`${label} must be text`);
  const result = value.trim();
  if ((required && !result) || result.length > limit) throw new RangeError(`Invalid ${label}`);
  return result;
}

export function isObjectAvailableInWorld(object, worldId, records) {
  const scope = records.find(
    (record) => record.kind === 'object-scope' && record.data.objectId === object.id
  )?.data;
  if (!scope) return object.worldId === worldId;
  const campaign = getWorldCampaign(records, worldId);
  return (
    scope.global ||
    scope.worldIds.includes(worldId) ||
    scope.campaignIds.includes(campaign?.id) ||
    scope.genreIds.includes(campaign?.data.genreId)
  );
}

export function normalizeManagementRecord(kind, source) {
  if (!managementKinds.includes(kind)) throw new RangeError('Unknown management record kind');
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new TypeError('Management record must be an object');
  }
  const data = { name: text(source.name, 'name', true) };
  if (source.migrationNotes)
    data.migrationNotes = text(source.migrationNotes, 'migration notes', false, 8000);
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
    if ('genres' in source) throw new RangeError('World genres come from the parent campaign');
    for (const key of ['worldId', 'campaignId', 'gameMasterId']) reference(key);
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
  } else if (kind === 'genre') {
    data.notes = text(source.notes, 'genre notes', false, 8000);
  } else if (kind === 'campaign') {
    if ('worldId' in source || 'genre' in source)
      throw new RangeError('Campaigns belong to a genre; worlds select their parent campaign');
    reference('genreId');
    if (typeof source.active !== 'boolean')
      throw new TypeError('Campaign active state must be boolean');
    data.active = source.active;
    data.notes = text(source.notes, 'campaign notes', false, 8000);
  } else if (kind === 'object-scope') {
    reference('objectId');
    if (!data.objectId) throw new RangeError('Select a saved object');
    if (typeof source.global !== 'boolean')
      throw new TypeError('Global availability must be boolean');
    data.global = source.global;
    for (const key of ['genreIds', 'campaignIds', 'worldIds']) {
      if (!Array.isArray(source[key]) || source[key].some((id) => typeof id !== 'string' || !id))
        throw new TypeError(`${key} must be a list of IDs`);
      data[key] = [...new Set(source[key])];
    }
  } else if (kind === 'character') {
    if ('campaignId' in source)
      throw new RangeError('A character inherits its campaign from its world');
    for (const key of ['objectId', 'playerId', 'worldId']) reference(key);
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
  const genres = new Set(
    records.filter((record) => record.kind === 'genre').map((record) => record.id)
  );
  const worldRecords = records.filter((record) => record.kind === 'world');
  const worldLinks = new Map(worldRecords.map((record) => [record.data.worldId, record.data]));
  if (worldLinks.size !== worldRecords.length)
    throw new RangeError('A world already has a management record');
  const assigned = new Set();
  const scoped = new Set();
  const profile = (id, role) => {
    if (id && !profiles.get(id)?.roles.includes(role))
      throw new RangeError(`Select an existing ${role} profile`);
  };
  for (const { kind, data } of records) {
    if (data.worldId && !worldIds.has(data.worldId))
      throw new RangeError('Stored world no longer exists');
    if (kind === 'world') {
      if (!data.campaignId && !data.migrationNotes)
        throw new RangeError('Select a parent campaign');
      if (data.campaignId && !campaigns.has(data.campaignId))
        throw new RangeError('Select an existing parent campaign');
      profile(data.gameMasterId, 'game-master');
      data.playerIds.forEach((id) => profile(id, 'player'));
    }
    if (kind === 'campaign') {
      if (!data.genreId && !data.migrationNotes) throw new RangeError('Select a parent genre');
      if (data.genreId && !genres.has(data.genreId))
        throw new RangeError('Select an existing parent genre');
    }
    if (kind === 'object-scope') {
      if (!objectMap.has(data.objectId)) throw new RangeError('Stored object no longer exists');
      if (scoped.has(data.objectId))
        throw new RangeError('Object already has an availability record');
      scoped.add(data.objectId);
      if (
        data.worldIds.some((id) => !worldIds.has(id)) ||
        data.campaignIds.some((id) => !campaigns.has(id)) ||
        data.genreIds.some((id) => !genres.has(id))
      )
        throw new RangeError('Select existing genre, campaign, and world scopes');
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
        const context = data.worldId || object.worldId || '';
        const key = `${data.objectId}:${context}`;
        if (assigned.has(key)) throw new RangeError('Character already has an assignment');
        assigned.add(key);
        if (context && !isObjectAvailableInWorld(object, context, records))
          throw new RangeError('Character is not available in the selected world');
      } else {
        if (!worldLinks.get(data.worldId)?.gameMasterId)
          throw new RangeError('Assign a local Game Master before adding GM notes');
        if (data.playerId && !worldLinks.get(data.worldId)?.playerIds.includes(data.playerId)) {
          throw new RangeError('GM notes may only target players subscribed to that world');
        }
        if (object && !isObjectAvailableInWorld(object, data.worldId, records))
          throw new RangeError('Note character must be available in the selected world');
      }
    }
  }
}

export function getWorldCampaign(records, worldId) {
  const world = records.find(
    (record) => record.kind === 'world' && record.data.worldId === worldId
  );
  return records.find(
    (record) => record.kind === 'campaign' && record.id === world?.data.campaignId
  );
}

export function getCampaignGenre(records, campaignId) {
  const campaign = records.find((record) => record.kind === 'campaign' && record.id === campaignId);
  return records.find((record) => record.kind === 'genre' && record.id === campaign?.data.genreId);
}

// Version 1 stored the relationship in the opposite direction. Never pick among multiple parents.
export function migrateManagementHierarchy(records, worlds, createId, objects = []) {
  const result = structuredClone(records);
  const genres = new Map();
  const genreId = (name) => {
    if (typeof name !== 'string') throw new TypeError('Legacy genre must be text');
    name = name.trim();
    if (!name) return '';
    text(name, 'genre', true);
    if (!genres.has(name)) {
      const id = createId();
      genres.set(name, id);
      result.push({ id, kind: 'genre', data: { name, notes: '' } });
    }
    return genres.get(name);
  };
  const legacyCampaigns = records.filter((record) => record.kind === 'campaign');
  if (legacyCampaigns.some((record) => !worlds.some((world) => world.id === record.data.worldId)))
    throw new RangeError('Legacy campaign world is missing');
  for (const record of records.filter((record) => record.kind === 'character')) {
    if (
      record.data.campaignId &&
      !legacyCampaigns.some((campaign) => campaign.id === record.data.campaignId)
    )
      throw new RangeError('Legacy character campaign is missing');
  }
  for (const record of result.filter((record) => record.kind === 'campaign')) {
    record.data.genreId = genreId(record.data.genre ?? '');
    delete record.data.genre;
    delete record.data.worldId;
    if (!record.data.genreId)
      record.data.migrationNotes = 'Legacy campaign had no genre. Select a parent genre.';
  }
  for (const world of worlds) {
    const parents = legacyCampaigns.filter((record) => record.data.worldId === world.id);
    let link = result.find((record) => record.kind === 'world' && record.data.worldId === world.id);
    if (!link && parents.length) {
      link = {
        id: createId(),
        kind: 'world',
        data: {
          name: world.name,
          worldId: world.id,
          gameMasterId: '',
          externalGameMaster: '',
          playerIds: [],
        },
      };
      result.push(link);
    }
    if (!link) continue;
    const oldGenres = link.data.genres ?? [];
    if (!Array.isArray(oldGenres)) throw new TypeError('Legacy genres must be a list');
    oldGenres.forEach(genreId);
    link.data.campaignId = parents.length === 1 ? parents[0].id : '';
    const notes = [];
    if (!parents.length) notes.push('Legacy world had no campaign. Select a parent campaign.');
    if (oldGenres.length) notes.push(`Previous world genre labels: ${oldGenres.join(', ')}.`);
    if (parents.length > 1)
      notes.push(
        `Multiple legacy campaigns: ${parents.map((record) => `${record.data.name} (${record.id})`).join(', ')}. Select the parent campaign manually.`
      );
    if (notes.length) link.data.migrationNotes = notes.join('\n');
    delete link.data.genres;
  }
  for (const record of result.filter((record) => record.kind === 'character')) {
    record.data.worldId =
      objects.find((object) => object.id === record.data.objectId)?.worldId || '';
    if (record.data.campaignId) {
      const oldCampaign = legacyCampaigns.find(
        (campaign) => campaign.id === record.data.campaignId
      );
      record.data.migrationNotes = `Previous character campaign: ${oldCampaign?.data.name ?? record.data.campaignId}. Campaign is now inherited from the world.`;
    }
    delete record.data.campaignId;
  }
  return result;
}
