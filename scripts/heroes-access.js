import { canAccess, recordHeroesResources } from './heroes-identity.js';
import { listHeroesManagement, listHeroesLibrary } from './heroes-store.js';
import { httpError } from './wurm-db.js';

export async function handleAuthorizedHeroes(req, url, file, principal, identityFile, dispatch) {
  const admin = principal.roles.includes('admin');
  const state = await listHeroesManagement(file);
  const library = await listHeroesLibrary(file);
  const parts = url.pathname.split('/').filter(Boolean).slice(1).map(decodeURIComponent);
  const read = (type, id) => Boolean(id) && canAccess(principal, type, id);
  const write = (type, id) => Boolean(id) && canAccess(principal, type, id, true);
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
  const recordReadable = (record) => read('record', record.id) && referencesReadable(record.data);

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
          if (!previous.has(item.id)) created.push({ resourceType: type, resourceId: item.id });
        for (const item of before)
          if (!remaining.has(item.id)) removed.push({ resourceType: type, resourceId: item.id });
      }
      if (created.length || removed.length)
        await recordHeroesResources(principal, created, removed, identityFile);
    }
    return result;
  };
  if (admin) return dispatchOwned(req);
  if (req.method === 'GET') {
    if (parts[0] === 'management' && parts.length === 1)
      return {
        records: state.records.filter(recordReadable),
        worlds: state.worlds.filter((world) => read('world', world.id)),
        objects: state.objects.filter(objectReadable),
      };
    if (parts[0] === 'worlds' && parts.length === 1)
      return { worlds: state.worlds.filter((world) => read('world', world.id)) };
    if (parts[0] === 'objects' && parts.length === 1)
      return { objects: state.objects.filter(objectReadable) };
    if (parts[0] === 'library' && parts.length === 1)
      return {
        entries: library.filter(
          (entry) => read('library', entry.id) && definitionsReadable(entry.definition)
        ),
      };
    if (parts[0] === 'worlds' && parts[2] === 'objects' && parts.length === 3) {
      require(read('world', parts[1]));
      const result = await dispatch(req, url, file);
      return { objects: result.objects.filter(objectReadable) };
    }
    if (parts[0] === 'objects' && parts[2] === 'export' && parts.length === 3) {
      require(objectReadable(state.objects.find((object) => object.id === parts[1])));
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
  if (creating) require(principal.roles.some((role) => ['player', 'game-master'].includes(role)));
  let type;
  let id;
  let requestBody;
  if (
    parts[0] === 'objects' &&
    parts.length === 2 &&
    parts[1] !== 'import' &&
    (editing || deleting)
  ) {
    type = 'object';
    id = parts[1];
    require(write(type, id));
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
  } else if (parts[0] === 'worlds' && parts.length === 1 && creating) {
    require(principal.roles.includes('game-master'));
    type = 'world';
  } else if (
    parts[0] === 'library' &&
    ((parts.length === 1 && creating) ||
      (parts.length === 2 && editing && library.some((entry) => entry.id === parts[1])))
  ) {
    type = 'library';
    id = parts[1];
    if (editing) {
      require(write(type, id));
      // Live references can modify other objects on regeneration; require access to every live use.
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
      require(
        state.objects
          .filter((object) => uses(object.definition))
          .every((object) => write('object', object.id))
      );
      require([...impacted].every((entryId) => write('library', entryId)));
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
    if (type === 'record') {
      require(referencesReadable(requestBody.data || {}));
      if (['genre', 'campaign', 'world', 'note', 'profile'].includes(requestBody.kind))
        require(principal.roles.includes('game-master'));
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
