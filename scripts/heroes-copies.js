import { randomUUID } from 'node:crypto';
import { updateHeroesIdentity } from './heroes-identity.js';
import { httpError } from './wurm-db.js';
import {
  listHeroesManagement,
  listHeroesLibrary,
  exportHeroesManagement,
  importHeroesManagement,
  createHeroesObject,
  saveHeroesLibrary,
} from './heroes-store.js';
import { copyLibraryDefinition } from '../src/js/modules/objects/heroes/definition-library.mjs';

const mutationRoles = ['admin', 'game-master', 'player'];
const contentRoles = ['game-master', 'player'];
const ownership = (state, type, id) =>
  state.ownership.find((item) => item.resourceType === type && item.resourceId === id);
const active = (user) => user && !user.disabled && !user.closure;
const authorizedRole = (principal, user) =>
  active(user) &&
  principal.roles.some((role) => mutationRoles.includes(role) && user.roles.includes(role));
const canReceiveContent = (principal, user) =>
  active(user) &&
  !principal.roles.includes('admin') &&
  principal.roles.some((role) => contentRoles.includes(role) && user.roles.includes(role));
const switchRoleMessage =
  'Switch to an actually assigned Game Master or Player role to request copies or accept revisions. Administrator mode supports owner review and stewardship only.';
const nameOf = (item) => item.name || item.data?.name || '';
const publicRequest = ({ snapshot: _snapshot, sources: _sources, ...request }) => request;
const copyStillOwned = (state, copy) =>
  ownership(state, copy.resourceType, copy.resourceId)?.userId === copy.recipientId;

async function jsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    if (size > 16 * 1024) throw httpError(413, 'Copy request exceeds 16 KB');
    chunks.push(Buffer.from(chunk));
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new SyntaxError();
    return body;
  } catch {
    throw httpError(400, 'Invalid copy request JSON');
  }
}

function resourceList(management, library, context) {
  return [
    ...management.worlds
      .filter((item) => context.read('world', item.id))
      .map((item) => ({ type: 'world', item })),
    ...management.objects.filter(context.objectReadable).map((item) => ({ type: 'object', item })),
    ...management.records.filter(context.recordReadable).map((item) => ({ type: 'record', item })),
    ...library.map((item) => ({ type: 'library', item })),
  ];
}

async function snapshotResource(resource, file, management, library, context) {
  const { type, item } = resource;
  let snapshot;
  let sources = [{ resourceType: type, resourceId: item.id, originalName: nameOf(item) }];
  if (type === 'object' || type === 'library') {
    snapshot = {
      kind: type,
      value: { ...item, definition: copyLibraryDefinition(item.definition, library) },
    };
  } else {
    const graph = await exportHeroesManagement({ type, id: item.id }, file);
    // The export may include private dependencies or role-specific notes. Check every node,
    // not just the requested root, before keeping any snapshot in the identity store.
    const records = new Map(management.records.map((record) => [record.id, record]));
    const objects = new Map(management.objects.map((object) => [object.id, object]));
    if (
      graph.worlds.some((world) => !context.read('world', world.id)) ||
      graph.objects.some((object) => !context.objectReadable(objects.get(object.id))) ||
      graph.records.some((record) => !context.recordReadable(records.get(record.id)))
    )
      throw httpError(403, 'Every dependency must be readable before requesting a graph copy');
    sources = [
      ...graph.worlds.map((value) => ({
        resourceType: 'world',
        resourceId: value.id,
        originalName: nameOf(value),
      })),
      ...graph.objects.map((value) => ({
        resourceType: 'object',
        resourceId: value.id,
        originalName: nameOf(value),
      })),
      ...graph.records.map((value) => ({
        resourceType: 'record',
        resourceId: value.id,
        originalName: nameOf(value),
      })),
    ];
    snapshot = { kind: 'graph', value: graph };
  }
  // Library dependencies are embedded, not live links. Their owners must also have
  // consented (be the approving owner or the requester); reading alone is not consent.
  const byId = new Map(library.map((entry) => [entry.id, entry]));
  const included = new Set(sources.map((source) => `${source.resourceType}:${source.resourceId}`));
  function dependencies(value) {
    if (!value || typeof value !== 'object') return;
    if (value.libraryRef) {
      const entry = byId.get(value.libraryRef);
      if (!entry) throw httpError(403, 'A saved definition dependency is not readable');
      const key = `library:${entry.id}`;
      if (!included.has(key)) {
        included.add(key);
        sources.push({
          resourceType: 'library',
          resourceId: entry.id,
          originalName: entry.name,
          embedded: true,
        });
        dependencies(entry.definition);
      }
    }
    for (const child of Object.values(value)) dependencies(child);
  }
  if (type === 'object' || type === 'library') dependencies(item.definition);
  else
    for (const source of sources.filter((source) => source.resourceType === 'object'))
      dependencies(
        management.objects.find((object) => object.id === source.resourceId)?.definition
      );
  if (Buffer.byteLength(JSON.stringify(snapshot)) > 8 * 1024 * 1024)
    throw httpError(413, 'Copy snapshot exceeds 8 MB; choose a smaller scope');
  return { snapshot, sources };
}

async function objectScope(id, file) {
  return (await listHeroesManagement(file)).records.find(
    (record) => record.kind === 'object-scope' && record.data.objectId === id
  );
}

/**
 * context is the same request-scoped read/type and dependency predicates used by
 * heroes-access, plus permittedLibrary(). Unmatched routes return undefined.
 */
export async function handleHeroesCopies(req, url, file, principal, identityFile, context) {
  if (url.pathname !== '/heroes/copies') return undefined;
  if (!principal.id) throw httpError(401, 'Sign in to request or review independent copies');
  if (!['GET', 'POST'].includes(req.method)) throw httpError(405, 'Use GET or POST for copies');
  const body = req.method === 'POST' ? await jsonBody(req) : null;
  return updateHeroesIdentity(identityFile, async (state) => {
    state.ownership ||= [];
    state.copyRequests ||= [];
    state.copies ||= [];
    state.copyAudit ||= [];
    const user = state.users.find((item) => item.id === principal.id);
    if (!active(user)) throw httpError(403, 'This account is no longer active');
    if (body && !authorizedRole(principal, user))
      throw httpError(403, 'Select an assigned Player, Game Master, or administrator role');
    const canReceive = canReceiveContent(principal, user);
    if (body?.action === 'request' && !canReceive) throw httpError(403, switchRoleMessage);
    const management = await listHeroesManagement(file);
    const allLibrary = await listHeroesLibrary(file);
    const library = context.permittedLibrary();
    const resources = resourceList(management, library, context);
    const allResources = [
      ...management.worlds.map((item) => ({ type: 'world', item })),
      ...management.objects.map((item) => ({ type: 'object', item })),
      ...management.records.map((item) => ({ type: 'record', item })),
      ...allLibrary.map((item) => ({ type: 'library', item })),
    ];
    const visibleRequests = () =>
      state.copyRequests
        .filter((item) => item.requesterId === principal.id || item.ownerId === principal.id)
        .map(publicRequest);
    if (!body)
      return {
        canMutate: authorizedRole(principal, user),
        canRequest: canReceive,
        canAccept: canReceive,
        accountId: principal.id,
        resources: resources
          .filter(({ type, item }) => ownership(state, type, item.id))
          .map(({ type, item }) => ({
            type,
            id: item.id,
            name: nameOf(item),
            ownerId: ownership(state, type, item.id).userId,
          })),
        requests: visibleRequests(),
        copies: state.copies.filter((item) => item.recipientId === principal.id),
        proposalTargets: state.copies
          .filter(
            (copy) =>
              copy.recipientId !== principal.id &&
              copyStillOwned(state, copy) &&
              ownership(state, copy.sourceType, copy.sourceId)?.userId === principal.id &&
              resources.some(
                ({ type, item }) => type === copy.sourceType && item.id === copy.sourceId
              )
          )
          .map(({ id, recipientId, originalName, sourceType, sourceId }) => ({
            copyId: id,
            recipientId,
            originalName,
            sourceType,
            sourceId,
          })),
      };
    const now = new Date().toISOString();
    const audit = (request, action) =>
      state.copyAudit.push({
        id: randomUUID(),
        requestId: request.id,
        actorId: principal.id,
        action,
        at: now,
      });
    if (body.action === 'propose') {
      const copy = state.copies.find(
        (item) =>
          item.id === body.copyId &&
          item.recipientId !== principal.id &&
          ownership(state, item.sourceType, item.sourceId)?.userId === principal.id
      );
      if (!copy) throw httpError(404, 'Owned source and existing copy recipient not found');
      const recipient = state.users.find((item) => item.id === copy.recipientId);
      if (
        !copyStillOwned(state, copy) ||
        !active(recipient) ||
        !recipient.roles.some((role) => contentRoles.includes(role))
      )
        throw httpError(409, 'The existing copy must still belong to an active content recipient');
      if (
        state.copyRequests.some(
          (item) =>
            item.kind === 'revision' &&
            item.status === 'pending' &&
            item.revisionOfCopyId === copy.id
        )
      )
        throw httpError(409, 'An update proposal is already pending for this copy');
      if (
        state.copyRequests.filter(
          (item) =>
            item.kind === 'revision' && item.status === 'pending' && item.ownerId === principal.id
        ).length >= 25
      )
        throw httpError(409, 'Resolve pending update proposals before creating more');
      const resource = resources.find(
        ({ type, item }) => type === copy.sourceType && item.id === copy.sourceId
      );
      if (!resource)
        throw httpError(403, 'The current source and its dependencies must be readable');
      const captured = await snapshotResource(resource, file, management, library, context);
      const sources = captured.sources.map((source) => {
        const owner = ownership(state, source.resourceType, source.resourceId);
        if (!owner || ![principal.id, copy.recipientId].includes(owner.userId))
          throw httpError(409, 'Every update dependency needs its owner consent before delivery');
        const previous = state.copies.find(
          (item) =>
            item.requestId === copy.requestId &&
            item.sourceType === source.resourceType &&
            item.sourceId === source.resourceId
        );
        return {
          ...source,
          originalName: previous?.originalName ?? source.originalName,
          creatorId: previous?.creatorId ?? owner.creatorId ?? '',
          ownerId: owner.userId,
        };
      });
      const proposal = {
        id: randomUUID(),
        kind: 'revision',
        revisionOfCopyId: copy.id,
        revisionOfResourceId: copy.resourceId,
        requesterId: copy.recipientId,
        ownerId: principal.id,
        resourceType: copy.sourceType,
        resourceId: copy.sourceId,
        originalName: copy.originalName,
        creatorId: copy.creatorId,
        status: 'pending',
        requestedAt: now,
        snapshot: captured.snapshot,
        sources,
      };
      state.copyRequests.push(proposal);
      audit(proposal, 'revision-proposed');
      return { request: publicRequest(proposal) };
    }
    if (body.action === 'request') {
      const resource = resources.find(
        ({ type, item }) => type === body.resourceType && item.id === body.resourceId
      );
      if (!resource) throw httpError(404, 'Readable copy source not found');
      const owner = ownership(state, resource.type, resource.item.id);
      if (!owner || !active(state.users.find((item) => item.id === owner.userId)))
        throw httpError(409, 'The source needs an active owner before copies can be approved');
      if (
        state.copyRequests.some(
          (item) =>
            item.status === 'pending' &&
            item.requesterId === principal.id &&
            item.resourceType === resource.type &&
            item.resourceId === resource.item.id
        )
      )
        throw httpError(409, 'An independent copy request is already pending for this source');
      if (
        state.copyRequests.filter(
          (item) => item.requesterId === principal.id && item.status === 'pending'
        ).length >= 25
      )
        throw httpError(409, 'Review or cancel pending copy requests before creating more');
      const captured = await snapshotResource(resource, file, management, library, context);
      const request = {
        id: randomUUID(),
        requesterId: principal.id,
        ownerId: owner.userId,
        resourceType: resource.type,
        resourceId: resource.item.id,
        originalName: nameOf(resource.item),
        creatorId: owner.creatorId || '',
        status: 'pending',
        requestedAt: now,
        ...captured,
      };
      request.sources = request.sources.map((source) => {
        const sourceOwner = ownership(state, source.resourceType, source.resourceId);
        return {
          ...source,
          ownerId: sourceOwner?.userId || '',
          creatorId: sourceOwner?.creatorId || '',
        };
      });
      state.copyRequests.push(request);
      audit(request, 'requested');
      return { request: publicRequest(request) };
    }
    if (!['approve', 'decline', 'cancel'].includes(body.action))
      throw httpError(400, 'Choose request, propose, approve, decline, or cancel');
    const request = state.copyRequests.find(
      (item) =>
        item.id === body.requestId &&
        (item.requesterId === principal.id || item.ownerId === principal.id)
    );
    if (!request) throw httpError(404, 'Copy request not found');
    const revision = request.kind === 'revision';
    const reviewerId = revision ? request.requesterId : request.ownerId;
    const cancellerId = revision ? request.ownerId : request.requesterId;
    if ((body.action === 'cancel' ? cancellerId : reviewerId) !== principal.id)
      throw httpError(
        403,
        revision
          ? 'Only the recipient can accept or decline; only the proposer can cancel'
          : 'Only the requester can cancel; only the addressed owner can review'
      );
    if (request.status !== 'pending')
      throw httpError(409, 'This copy request is no longer pending');
    if (body.action !== 'cancel' && (!revision || body.action === 'approve')) {
      const owner = ownership(state, request.resourceType, request.resourceId);
      if (owner?.userId !== request.ownerId)
        throw httpError(403, 'Only the current source owner can approve or decline this request');
    }
    if (body.action === 'approve') {
      if (request.requesterId === principal.id && !canReceive)
        throw httpError(403, switchRoleMessage);
      if (revision) {
        const previous = state.copies.find((item) => item.id === request.revisionOfCopyId);
        const proposer = state.users.find((item) => item.id === request.ownerId);
        if (
          !previous ||
          previous.recipientId !== principal.id ||
          !copyStillOwned(state, previous) ||
          !active(proposer) ||
          !proposer.roles.some((role) => mutationRoles.includes(role))
        )
          throw httpError(
            409,
            'This update no longer has an active source owner and copy recipient'
          );
      }
      const recipient = state.users.find((item) => item.id === request.requesterId);
      if (!active(recipient) || !recipient.roles.some((role) => contentRoles.includes(role)))
        throw httpError(409, 'The requester no longer has an active content role');
      for (const source of request.sources) {
        const current = ownership(state, source.resourceType, source.resourceId);
        if (
          !allResources.some(
            ({ type, item }) => type === source.resourceType && item.id === source.resourceId
          ) ||
          !current ||
          ![request.ownerId, request.requesterId].includes(current.userId) ||
          current.userId !== source.ownerId
        )
          throw httpError(
            409,
            'A dependency is missing, changed owner, or needs its own owner approval; request a self-contained scope'
          );
      }
      let created;
      if (request.snapshot.kind === 'graph') {
        const imported = await importHeroesManagement(request.snapshot.value, file, {
          includeResources: true,
        });
        created = imported.resources;
      } else {
        const value = request.snapshot.value;
        const copy =
          request.snapshot.kind === 'object'
            ? await createHeroesObject(null, value.definition, file)
            : await saveHeroesLibrary(
                { name: value.name, kind: value.kind, definition: value.definition },
                null,
                file
              );
        created = [
          { resourceType: request.resourceType, sourceId: request.resourceId, resourceId: copy.id },
        ];
        if (request.snapshot.kind === 'object') {
          const scope = await objectScope(copy.id, file);
          created.push({
            resourceType: 'record',
            resourceId: scope.id,
            sourceId: request.resourceId,
            sourceType: 'object',
            internal: true,
          });
        }
      }
      for (const resource of created) {
        const source = request.sources.find(
          (item) =>
            item.resourceType === (resource.sourceType || resource.resourceType) &&
            item.resourceId === resource.sourceId
        );
        if (!source) throw new Error('Graph import returned an unknown source');
        const provenance = {
          requestId: request.id,
          sourceType: resource.sourceType || resource.resourceType,
          sourceId: source.resourceId,
          originalName: source.originalName,
          creatorId: source.creatorId,
          sourceOwnerId: source.ownerId,
          requestedAt: request.requestedAt,
          approvedAt: now,
          approvedBy: principal.id,
          ...(revision
            ? {
                proposalId: request.id,
                proposedBy: request.ownerId,
                revisionOfCopyId: request.revisionOfCopyId,
                revisionOfResourceId: request.revisionOfResourceId,
              }
            : {}),
        };
        state.ownership.push({
          userId: recipient.id,
          creatorId: source.creatorId,
          resourceType: resource.resourceType,
          resourceId: resource.resourceId,
          editors: [],
          publication: { audience: 'private', scopeId: '', viewers: [] },
          provenance,
        });
        if (!resource.internal)
          state.copies.push({
            id: randomUUID(),
            recipientId: recipient.id,
            resourceType: resource.resourceType,
            resourceId: resource.resourceId,
            ...provenance,
          });
      }
      request.status = 'approved';
    } else request.status = body.action === 'cancel' ? 'cancelled' : 'declined';
    request.resolvedAt = now;
    request.resolvedBy = principal.id;
    delete request.snapshot;
    delete request.sources;
    audit(request, revision ? `revision-${request.status}` : request.status);
    return { request: publicRequest(request) };
  });
}
