import { canAccess, recordHeroesResources, saveHeroesSharing } from './heroes-identity.js';
import { listHeroesManagement, listHeroesLibrary } from './heroes-store.js';
import { httpError } from './wurm-db.js';
import { heroesWorkspaceRoutes } from '../src/js/modules/pages/heroes-navigation.js';
import {
  handleHeroesSubscriptions,
  heroesSubscriptionReadGrants,
  heroesSubscriptionMembers,
  heroesSubscriptionWorldObjects,
} from './heroes-subscriptions.js';
import { handleHeroesCopies } from './heroes-copies.js';
import { normalizeObjectParticipants } from '../src/js/modules/objects/heroes/object-participants.mjs';

export async function handleAuthorizedHeroes(req, url, file, principal, identityFile, dispatch) {
  const admin = principal.roles.includes('admin');
  const state = await listHeroesManagement(file);
  const library = await listHeroesLibrary(file);
  principal = {
    ...principal,
    grants: [...principal.grants, ...heroesSubscriptionReadGrants(principal, state)],
  };
  const profileAccount = (id) =>
    state.records.find((record) => record.kind === 'profile' && record.id === id)?.data.accountId;
  const scopeMembers = (kind, id) => {
    const worlds = state.records.filter(
      (record) =>
        record.kind === 'world' &&
        (kind === 'world'
          ? record.data.worldId === id
          : kind === 'campaign'
            ? record.data.campaignId === id
            : state.records.some(
                (campaign) =>
                  campaign.id === record.data.campaignId &&
                  campaign.kind === 'campaign' &&
                  campaign.data.genreId === id
              ))
    );
    const subscriptionMembers =
      kind === 'genre'
        ? state.records
            .filter((record) => record.kind === 'campaign' && record.data.genreId === id)
            .flatMap((record) => heroesSubscriptionMembers(principal, state, 'campaign', record.id))
        : heroesSubscriptionMembers(principal, state, kind, id);
    return [
      ...new Set([
        ...subscriptionMembers,
        ...worlds.flatMap((record) => {
          const gameMasterId = profileAccount(record.data.gameMasterId);
          const players = record.data.playerIds
            .map(profileAccount)
            .filter((playerId) =>
              principal.relationships?.some(
                (relationship) =>
                  relationship.gameMasterId === gameMasterId && relationship.playerId === playerId
              )
            );
          return [gameMasterId, ...players].filter(Boolean);
        }),
      ]),
    ];
  };
  principal = {
    ...principal,
    ownership: principal.ownership?.map((item) => {
      const publication = item.publication;
      if (!publication) return item;
      const kind = publication.audience.replace(/-group$/, '');
      let members = [];
      if (['world', 'campaign', 'genre'].includes(kind))
        members = scopeMembers(kind, publication.scopeId);
      else if (['player-group', 'gm-group'].includes(publication.audience)) {
        const counterpart = publication.audience === 'player-group' ? 'playerId' : 'gameMasterId';
        const ownSide = counterpart === 'playerId' ? 'gameMasterId' : 'playerId';
        members = (principal.relationships || [])
          .filter((relationship) => relationship[ownSide] === item.userId)
          .map((relationship) => relationship[counterpart]);
      }
      return {
        ...item,
        readers: publication.audience.endsWith('-group')
          ? members.filter((id) => publication.viewers.includes(id))
          : members,
      };
    }),
  };
  const parts = url.pathname.split('/').filter(Boolean).slice(1).map(decodeURIComponent);
  const noteRole = { note: 'game-master', 'player-note': 'player', 'admin-note': 'admin' };
  const roleReadable = (record) =>
    !noteRole[record.kind] || principal.roles.includes(noteRole[record.kind]);
  const read = (type, id) => Boolean(id) && canAccess(principal, type, id);
  const write = (type, id) =>
    principal.roles.some((role) => ['admin', 'game-master', 'player'].includes(role)) &&
    (!admin ||
      (type === 'record' &&
        state.records.some(
          (record) => record.id === id && ['profile', 'admin-note'].includes(record.kind)
        ))) &&
    Boolean(id) &&
    canAccess(principal, type, id, true);
  const owned = (type, id) =>
    principal.ownership?.some(
      (item) => item.resourceType === type && item.resourceId === id && item.userId === principal.id
    );
  const require = (allowed) => {
    if (!allowed) throw httpError(403, 'You do not have permission for this HERO resource');
  };
  const definitionsReadable = (value) => {
    if (!value || typeof value !== 'object') return true;
    if (value.libraryRef && !read('library', value.libraryRef)) return false;
    return Object.values(value).every(definitionsReadable);
  };
  const objectReadable = (object) =>
    object && read('object', object.id) && definitionsReadable(object.definition);
  const referencesReadable = (data) => {
    for (const [key, type] of [
      ['worldId', 'world'],
      ['campaignId', 'record'],
      ['genreId', 'record'],
      ['gameMasterId', 'record'],
      ['playerId', 'record'],
      ['objectId', 'object'],
    ])
      if (data[key] && !read(type, data[key])) return false;
    for (const [key, type] of [
      ['worldIds', 'world'],
      ['campaignIds', 'record'],
      ['genreIds', 'record'],
      ['playerIds', 'record'],
    ])
      if (data[key]?.some((id) => !read(type, id))) return false;
    return true;
  };
  const recordReadable = (record) =>
    roleReadable(record) && read('record', record.id) && referencesReadable(record.data);
  const participantAccounts = (principal.accounts || []).filter((account) => account.discoverable);
  if (req.method === 'GET' && parts[0] === 'object-participants' && parts.length === 1)
    return {
      accounts: participantAccounts.map(({ id, username, displayName, roles }) => ({
        id,
        username,
        displayName,
        roles,
      })),
    };
  const permittedLibrary = () =>
    library.filter((entry) => read('library', entry.id) && definitionsReadable(entry.definition));
  const permittedState = () => ({
    records: state.records.filter(recordReadable),
    worlds: state.worlds.filter((world) => read('world', world.id)),
    objects: state.objects.filter(objectReadable),
  });
  const libraryUsesWritable = (id) => {
    const impacted = new Set([id]);
    const uses = (value) =>
      value &&
      typeof value === 'object' &&
      (impacted.has(value.libraryRef) || Object.values(value).some(uses));
    let count;
    do {
      count = impacted.size;
      for (const entry of library) if (uses(entry.definition)) impacted.add(entry.id);
    } while (impacted.size !== count);
    return (
      state.objects
        .filter((object) => uses(object.definition))
        .every((object) => write('object', object.id)) &&
      [...impacted].every((entryId) => write('library', entryId))
    );
  };
  const worldDeletable = (id) => {
    if (!principal.roles.includes('game-master') || !owned('world', id)) return false;
    const objects = state.objects.filter((object) => object.worldId === id);
    const ids = new Set(objects.map((object) => object.id));
    return (
      objects.every((object) => write('object', object.id)) &&
      state.records
        .filter(
          (record) =>
            record.data.worldId === id ||
            ids.has(record.data.objectId) ||
            record.data.worldIds?.includes(id)
        )
        .every((record) => roleReadable(record) && write('record', record.id))
    );
  };
  const subscriptions = await handleHeroesSubscriptions(req, url, file, principal, identityFile, {
    read,
    write,
    objectReadable,
    recordReadable,
  });
  if (subscriptions !== undefined) return subscriptions;
  const copies = await handleHeroesCopies(req, url, file, principal, identityFile, {
    read,
    write,
    objectReadable,
    recordReadable,
    permittedLibrary,
  });
  if (copies !== undefined) return copies;
  if (req.method === 'GET' && parts[0] === 'public' && parts.length === 1)
    return { ...permittedState(), entries: permittedLibrary() };
  if (parts[0] === 'sharing' && parts.length === 1) {
    require(Boolean(principal.id));
    const resources = [
      ...state.worlds.map((item) => ({ type: 'world', id: item.id, name: item.name })),
      ...state.objects.map((item) => ({ type: 'object', id: item.id, name: item.name })),
      ...state.records
        .filter((item) => !noteRole[item.kind])
        .map((item) => ({ type: 'record', id: item.id, name: item.data.name })),
      ...library.map((item) => ({ type: 'library', id: item.id, name: item.name })),
    ];
    if (req.method === 'GET')
      return {
        resources: resources
          .filter((resource) => {
            const owner = principal.ownership?.find(
              (item) => item.resourceType === resource.type && item.resourceId === resource.id
            );
            return admin || owner?.userId === principal.id;
          })
          .map((resource) => {
            const owner = principal.ownership?.find(
              (item) => item.resourceType === resource.type && item.resourceId === resource.id
            );
            return {
              ...resource,
              ownerId: owner?.userId || '',
              creatorId: owner?.creatorId || '',
              editors: owner?.editors || [],
              publication: owner?.publication || { audience: 'private', scopeId: '', viewers: [] },
              groupMembers: {
                'player-group': (principal.relationships || [])
                  .filter((relationship) => relationship.gameMasterId === owner?.userId)
                  .map((relationship) => relationship.playerId),
                'gm-group': (principal.relationships || [])
                  .filter((relationship) => relationship.playerId === owner?.userId)
                  .map((relationship) => relationship.gameMasterId),
              },
            };
          }),
        accounts: (principal.accounts || [])
          .filter((account) => account.discoverable)
          .map(({ id, username, roles }) => ({ id, username, roles })),
        scopes: [
          ...state.worlds
            .filter((world) => read('world', world.id))
            .map((world) => ({
              type: 'world',
              id: world.id,
              name: world.name,
              members: scopeMembers('world', world.id),
            })),
          ...state.records
            .filter(
              (record) => ['campaign', 'genre'].includes(record.kind) && recordReadable(record)
            )
            .map((record) => ({
              type: record.kind,
              id: record.id,
              name: record.data.name,
              members: scopeMembers(record.kind, record.id),
            })),
        ],
      };
    require(
      req.method === 'POST' &&
        principal.roles.some((role) => ['admin', 'player', 'game-master'].includes(role))
    );
    let raw = '';
    for await (const chunk of req) {
      raw += chunk.toString('utf8');
      if (Buffer.byteLength(raw) > 16 * 1024)
        throw httpError(413, 'Publication request exceeds 16 KB');
    }
    let body;
    try {
      body = JSON.parse(raw);
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      throw httpError(400, 'Invalid publication JSON');
    }
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      typeof body.audience !== 'string' ||
      !Array.isArray(body.viewers) ||
      !Array.isArray(body.editors)
    )
      throw httpError(400, 'Choose an audience and account lists for viewers and editors');
    const resource = resources.find(
      (item) => item.type === body.resourceType && item.id === body.resourceId
    );
    if (!resource) throw httpError(404, 'Publishable resource not found');
    const kind = typeof body.audience === 'string' ? body.audience.replace(/-group$/, '') : '';
    if (['world', 'campaign', 'genre'].includes(kind)) {
      const scope =
        kind === 'world'
          ? state.worlds.find((world) => world.id === body.scopeId && read('world', world.id))
          : state.records.find(
              (record) =>
                record.kind === kind && record.id === body.scopeId && recordReadable(record)
            );
      if (!scope) throw httpError(400, 'Select a readable publication scope');
      if (
        body.audience.endsWith('-group') &&
        body.viewers?.some((id) => !scopeMembers(kind, body.scopeId).includes(id))
      )
        throw httpError(400, 'Group viewers must be approved subscribers of the selected scope');
    }
    if (['player-group', 'gm-group'].includes(body.audience)) {
      const ownSide = body.audience === 'player-group' ? 'gameMasterId' : 'playerId';
      const otherSide = ownSide === 'gameMasterId' ? 'playerId' : 'gameMasterId';
      const owner = principal.ownership?.find(
        (item) => item.resourceType === resource.type && item.resourceId === resource.id
      );
      const members = (principal.relationships || [])
        .filter((relationship) => relationship[ownSide] === owner?.userId)
        .map((relationship) => relationship[otherSide]);
      if (body.viewers?.some((id) => !members.includes(id)))
        throw httpError(400, 'Select approved relationship members for this group');
    }
    return saveHeroesSharing(principal, resource, body, identityFile);
  }
  if (req.method === 'GET' && parts[0] === 'access' && parts.length === 1)
    return {
      routes: heroesWorkspaceRoutes(principal.roles, permittedState(), permittedLibrary()),
      writable: Object.fromEntries(
        [
          ['world', state.worlds],
          ['object', state.objects],
          ['record', state.records.filter(roleReadable)],
          ['library', library],
        ].map(([type, items]) => [
          type,
          items
            .filter(
              (item) => write(type, item.id) && (type !== 'library' || libraryUsesWritable(item.id))
            )
            .map((item) => item.id),
        ])
      ),
      owned: Object.fromEntries(
        ['world', 'object', 'record', 'library'].map((type) => [
          type,
          (principal.ownership || [])
            .filter((item) => item.resourceType === type && item.userId === principal.id)
            .map((item) => item.resourceId),
        ])
      ),
      deletable: {
        world: state.worlds.filter((world) => worldDeletable(world.id)).map((world) => world.id),
        library: library
          .filter((entry) => (admin || owned('library', entry.id)) && libraryUsesWritable(entry.id))
          .map((entry) => entry.id),
        object: state.objects
          .filter(
            (object) =>
              write('object', object.id) &&
              state.records
                .filter((record) => record.data.objectId === object.id)
                .every((record) => write('record', record.id))
          )
          .map((object) => object.id),
      },
    };

  let requestBody;
  const dispatchOwned = async (request) => {
    const result = await dispatch(request, url, file);
    if (['POST', 'DELETE'].includes(request.method)) {
      const current = await listHeroesManagement(file);
      const currentLibrary = await listHeroesLibrary(file);
      const created = [];
      const removed = [];
      for (const [type, before, after] of [
        ['world', state.worlds, current.worlds],
        ['object', state.objects, current.objects],
        ['record', state.records, current.records],
        ['library', library, currentLibrary],
      ]) {
        const previous = new Set(before.map((item) => item.id));
        const remaining = new Set(after.map((item) => item.id));
        for (const item of after)
          if (!previous.has(item.id)) {
            const source =
              type === 'library' && requestBody?.sourceObjectId
                ? principal.ownership?.find(
                    (owner) =>
                      owner.resourceType === 'object' &&
                      owner.resourceId === requestBody.sourceObjectId
                  ) || {}
                : null;
            created.push({
              resourceType: type,
              resourceId: item.id,
              ...(source
                ? {
                    creatorId: source.creatorId || '',
                    provenance: {
                      ...(source.provenance || {
                        sourceType: 'object',
                        sourceId: requestBody.sourceObjectId,
                        originalName: state.objects.find(
                          (object) => object.id === requestBody.sourceObjectId
                        )?.name,
                      }),
                      savedFromObjectId: requestBody.sourceObjectId,
                    },
                  }
                : {}),
            });
          }
        for (const item of before)
          if (!remaining.has(item.id)) removed.push({ resourceType: type, resourceId: item.id });
      }
      if (created.length || removed.length)
        await recordHeroesResources(principal, created, removed, identityFile);
    }
    return result;
  };
  if (admin && req.method === 'GET' && parts[0] === 'management' && parts.length === 1)
    return permittedState();
  if (['PUT', 'DELETE'].includes(req.method) && parts[0] === 'management' && parts.length === 2) {
    const record = state.records.find((item) => item.id === parts[1]);
    require(record && roleReadable(record));
  }
  if (admin) {
    if (req.method === 'GET') return dispatchOwned(req);
    if (req.method === 'POST' && parts.at(-1) === 'import') return dispatchOwned(req);
    if (parts[0] !== 'management')
      throw httpError(
        403,
        'Switch to an assigned Game Master or Player role to use game-content editors'
      );
  }
  if (req.method === 'GET') {
    if (parts[0] === 'management' && parts.length === 1) return permittedState();
    if (parts[0] === 'worlds' && parts.length === 1)
      return { worlds: state.worlds.filter((world) => read('world', world.id)) };
    if (parts[0] === 'objects' && parts.length === 1)
      return { objects: state.objects.filter(objectReadable) };
    if (parts[0] === 'library' && parts.length === 1)
      return {
        entries: permittedLibrary(),
      };
    if (parts[0] === 'worlds' && parts[2] === 'objects' && parts.length === 3) {
      require(read('world', parts[1]));
      const result = await dispatch(req, url, file);
      const extra = heroesSubscriptionWorldObjects(principal, state, parts[1]);
      const objects = [
        ...result.objects,
        ...state.objects.filter(
          (object) =>
            extra.includes(object.id) &&
            !result.objects.some((existing) => existing.id === object.id)
        ),
      ];
      return { objects: objects.filter(objectReadable) };
    }
    if (parts[0] === 'objects' && parts[2] === 'export' && parts.length === 3) {
      require(
        owned('object', parts[1]) &&
          objectReadable(state.objects.find((object) => object.id === parts[1]))
      );
      return dispatch(req, url, file);
    }
    throw httpError(
      403,
      'Collection backups require administrator access; export individual permitted objects instead'
    );
  }
  const creating = req.method === 'POST';
  const editing = req.method === 'PUT';
  const deleting = req.method === 'DELETE';
  if (creating || editing || deleting)
    require(principal.roles.some((role) => ['admin', 'player', 'game-master'].includes(role)));
  let type;
  let id;
  if (
    parts[0] === 'objects' &&
    parts.length === 2 &&
    parts[1] !== 'import' &&
    (editing || deleting)
  ) {
    type = 'object';
    id = parts[1];
    require(write(type, id));
    if (deleting)
      require(
        state.records
          .filter((record) => record.data.objectId === id)
          .every((record) => write('record', record.id))
      );
  } else if (
    parts[0] === 'worlds' &&
    parts[2] === 'objects' &&
    ((parts.length === 3 && creating) || (parts.length === 4 && parts[3] === 'import' && creating))
  ) {
    type = 'object';
    require(write('world', parts[1]));
  } else if (
    parts[0] === 'objects' &&
    creating &&
    (parts.length === 1 || (parts.length === 2 && parts[1] === 'import'))
  ) {
    type = 'object';
  } else if (parts[0] === 'worlds' && parts.length === 2 && deleting) {
    require(worldDeletable(parts[1]));
    type = 'world';
    id = parts[1];
  } else if (parts[0] === 'worlds' && parts.length === 1 && creating) {
    require(principal.roles.includes('game-master'));
    type = 'world';
  } else if (
    parts[0] === 'library' &&
    ((parts.length === 1 && creating) ||
      (parts.length === 2 &&
        (editing || deleting) &&
        library.some((entry) => entry.id === parts[1])))
  ) {
    type = 'library';
    id = parts[1];
    if (editing || deleting) {
      require(write(type, id));
      if (deleting) require(owned('library', id));
      require(libraryUsesWritable(id));
    }
  } else if (
    parts[0] === 'management' &&
    ((parts.length === 1 && creating) || (parts.length === 2 && (editing || deleting)))
  ) {
    type = 'record';
    id = parts[1];
    if (id) {
      require(write(type, id));
      const record = state.records.find((record) => record.id === id);
      require(record && referencesReadable(record.data));
    }
  } else {
    throw httpError(403, 'This bulk or destructive operation requires administrator access');
  }
  if (creating || editing) {
    // Bound and inspect exactly the same body subsequently passed to the trusted store handler.
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 300 * 1024) throw httpError(413, 'HERO request exceeds 300 KB');
      chunks.push(chunk);
    }
    try {
      requestBody = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      throw httpError(400, 'Invalid JSON');
    }
    require(definitionsReadable(requestBody));
    if (type === 'object' && parts.at(-1) !== 'import') {
      const previous = state.objects.find((object) => object.id === id)?.definition.participants;
      if (previous && !Object.hasOwn(requestBody, 'participants'))
        throw httpError(400, 'Keep or update the registered GM and Player assignments');
      if (Object.hasOwn(requestBody, 'participants')) {
        try {
          requestBody.participants = normalizeObjectParticipants(
            requestBody.objectType ?? requestBody.kind,
            requestBody.participants
          );
        } catch (error) {
          if (!(error instanceof TypeError || error instanceof RangeError)) throw error;
          throw httpError(400, error.message);
        }
        for (const [field, role] of [
          ['gameMasterId', 'game-master'],
          ['playerId', 'player'],
        ]) {
          const selected = requestBody.participants[field];
          if (
            selected &&
            selected !== previous?.[field] &&
            !participantAccounts.some(
              (account) => account.id === selected && account.roles.includes(role)
            )
          )
            throw httpError(403, 'Select a permitted registered account with the matching role');
        }
      }
    }
    if (admin && type === 'record' && !['profile', 'admin-note'].includes(requestBody.kind))
      throw httpError(
        403,
        'Switch to the matching Game Master or Player role to edit game content'
      );
    if (type === 'library' && creating && requestBody.sourceObjectId) {
      const source = state.objects.find((object) => object.id === requestBody.sourceObjectId);
      require(source && (admin || owned('object', source.id)) && objectReadable(source));
      if (
        requestBody.name !== source.name ||
        requestBody.kind !== 'object' ||
        JSON.stringify(requestBody.definition) !== JSON.stringify(source.definition)
      )
        throw httpError(
          400,
          'Save the unchanged owned object as a library definition; edit it afterward'
        );
    }
    if (type === 'record') {
      require(referencesReadable(requestBody.data || {}));
      if (!admin) {
        const previous = state.records.find((record) => record.id === id)?.data || {};
        for (const field of ['externalPlayer', 'externalGameMaster'])
          if (requestBody.data?.[field] && requestBody.data[field] !== previous[field])
            throw httpError(403, 'Only system administrators can add unconfirmed external people');
      }
      if (noteRole[requestBody.kind]) require(principal.roles.includes(noteRole[requestBody.kind]));
      if (requestBody.kind === 'profile') require(admin);
      if (requestBody.kind === 'profile' && requestBody.data?.accountId)
        require(
          principal.accounts?.some(
            (account) =>
              account.id === requestBody.data.accountId &&
              requestBody.data.roles?.every((role) => account.roles.includes(role))
          )
        );
      if (['genre', 'campaign', 'world'].includes(requestBody.kind))
        require(admin || principal.roles.includes('game-master'));
      if (requestBody.kind === 'object-scope') {
        require(write('object', requestBody.data?.objectId));
        if (requestBody.data?.global) require(principal.roles.includes('game-master'));
      }
      if (['character', 'note'].includes(requestBody.kind))
        require(
          write('object', requestBody.data?.objectId) ||
            (requestBody.kind === 'note' && !requestBody.data?.objectId)
        );
    }
    const { Readable } = await import('node:stream');
    req = Object.assign(Readable.from([Buffer.from(JSON.stringify(requestBody))]), {
      method: req.method,
    });
  }
  const result = await dispatchOwned(req);
  if (creating) {
    const body = result?.body || result;
    const created = body?.object || body?.world || body?.entry || body?.record;
    if (!created?.id) throw new Error('Creation did not return a resource identity');
  }
  return result;
}
