import { randomUUID } from 'node:crypto';
import { updateHeroesIdentity } from './heroes-identity.js';
import { listHeroesManagement } from './heroes-store.js';
import { httpError } from './wurm-db.js';

const sameScope = (a, b) => a.scopeType === b.scopeType && a.scopeId === b.scopeId;
const active = (account, role) => account && !account.disabled && account.roles.includes(role);
const ownerOf = (principal, type, id) =>
  principal.ownership?.find((item) => item.resourceType === type && item.resourceId === id)?.userId;
const related = (principal, gm, player) =>
  principal.relationships?.some(
    (item) =>
      item.status !== 'ended' &&
      (!item.status || item.status === 'approved') &&
      item.gameMasterId === gm &&
      item.playerId === player
  );

function scopesFor(principal, state) {
  return [
    ...state.worlds.map((world) => ({
      scopeType: 'world',
      scopeId: world.id,
      name: world.name,
      gameMasterId: ownerOf(principal, 'world', world.id),
    })),
    ...state.records
      .filter((record) => record.kind === 'campaign')
      .map((record) => ({
        scopeType: 'campaign',
        scopeId: record.id,
        name: record.data.name,
        gameMasterId: ownerOf(principal, 'record', record.id),
      })),
  ].filter((scope) =>
    principal.accounts?.some(
      (account) => account.id === scope.gameMasterId && active(account, 'game-master')
    )
  );
}

function visible(principal, scope, playerId) {
  return (
    principal.accounts?.some((account) => account.id === playerId && active(account, 'player')) &&
    related(principal, scope.gameMasterId, playerId) &&
    (principal.scopeInvitations || []).some(
      (entry) =>
        sameScope(entry, scope) &&
        entry.gameMasterId === scope.gameMasterId &&
        entry.playerIds.includes(playerId)
    )
  );
}

function subscribed(principal, scope, playerId) {
  return (
    visible(principal, scope, playerId) &&
    (principal.subscriptions || []).some(
      (entry) =>
        sameScope(entry, scope) &&
        entry.gameMasterId === scope.gameMasterId &&
        entry.playerId === playerId &&
        entry.status === 'approved'
    )
  );
}

const validObjectMember = (principal, scope, ownerId) =>
  ownerId === scope.gameMasterId || subscribed(principal, scope, ownerId);

export function heroesSubscriptionMembers(principal, state, scopeType, scopeId) {
  const scope = scopesFor(principal, state).find(
    (entry) => entry.scopeType === scopeType && entry.scopeId === scopeId
  );
  if (!scope) return [];
  return [
    ...new Set([
      scope.gameMasterId,
      ...(principal.subscriptions || [])
        .filter((entry) => sameScope(entry, scope) && subscribed(principal, scope, entry.playerId))
        .map((entry) => entry.playerId),
    ]),
  ];
}

/** Recompute on every request; these are read-only grants, never persisted ACL entries. */
export function heroesSubscriptionReadGrants(principal, state) {
  if (!principal.id || !principal.roles.some((role) => ['player', 'game-master'].includes(role)))
    return [];
  const scopes = scopesFor(principal, state);
  const player = principal.roles.includes('player');
  const gm = principal.roles.includes('game-master');
  const grants = [];
  for (const scope of scopes) {
    if (player && subscribed(principal, scope, principal.id))
      grants.push({
        resourceType: scope.scopeType === 'world' ? 'world' : 'record',
        resourceId: scope.scopeId,
        access: 'read',
      });
    for (const permission of principal.objectPermissions || []) {
      if (
        permission.status !== 'approved' ||
        !sameScope(permission, scope) ||
        permission.gameMasterId !== scope.gameMasterId ||
        ownerOf(principal, 'object', permission.objectId) !== permission.playerId ||
        !state.objects.some((object) => object.id === permission.objectId) ||
        !validObjectMember(principal, scope, permission.playerId)
      )
        continue;
      if (
        (gm && principal.id === scope.gameMasterId) ||
        (player && subscribed(principal, scope, principal.id))
      )
        grants.push({
          resourceType: 'object',
          resourceId: permission.objectId,
          access: 'read',
        });
    }
  }
  return grants;
}

export function heroesSubscriptionWorldObjects(principal, state, worldId) {
  if (!state.worlds.some((world) => world.id === worldId)) return [];
  const campaignId = state.records.find(
    (record) => record.kind === 'world' && record.data.worldId === worldId
  )?.data.campaignId;
  const scopes = scopesFor(principal, state).filter(
    (scope) =>
      (scope.scopeType === 'world' && scope.scopeId === worldId) ||
      (scope.scopeType === 'campaign' && scope.scopeId === campaignId)
  );
  const readable = new Set(
    heroesSubscriptionReadGrants(principal, state)
      .filter((grant) => grant.resourceType === 'object')
      .map((grant) => grant.resourceId)
  );
  return [
    ...new Set(
      (principal.objectPermissions || [])
        .filter((permission) => {
          const scope = scopes.find((scope) => sameScope(permission, scope));
          return (
            scope &&
            permission.status === 'approved' &&
            permission.gameMasterId === scope.gameMasterId &&
            ownerOf(principal, 'object', permission.objectId) === permission.playerId &&
            validObjectMember(principal, scope, permission.playerId) &&
            ((principal.roles.includes('game-master') && principal.id === scope.gameMasterId) ||
              (principal.roles.includes('player') && subscribed(principal, scope, principal.id))) &&
            readable.has(permission.objectId)
          );
        })
        .map((permission) => permission.objectId)
    ),
  ];
}

async function bodyOf(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    if (size > 16 * 1024) throw httpError(413, 'Subscription request exceeds 16 KB');
    chunks.push(Buffer.from(chunk));
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new SyntaxError();
    return body;
  } catch {
    throw httpError(400, 'Invalid subscription JSON');
  }
}

export async function handleHeroesSubscriptions(req, url, file, principal, identityFile, context) {
  if (url.pathname !== '/heroes/subscriptions') return undefined;
  if (
    !principal.id ||
    !principal.roles.some((role) => ['player', 'game-master', 'admin'].includes(role))
  )
    throw httpError(403, 'Select a Player, Game Master, or administrator role');
  const management = await listHeroesManagement(file);
  const admin = principal.roles.includes('admin');
  const gm = principal.roles.includes('game-master');
  const player = principal.roles.includes('player');
  const permitted = (condition, message) => {
    if (!condition) throw httpError(403, message);
  };
  if (req.method === 'GET') {
    const scopes = scopesFor(principal, management).filter(
      (scope) =>
        admin ||
        (gm && scope.gameMasterId === principal.id) ||
        (player && visible(principal, scope, principal.id))
    );
    const entries = (items) =>
      (items || []).filter(
        (item) =>
          admin || item.playerId === principal.id || (gm && item.gameMasterId === principal.id)
      );
    const accounts = (principal.accounts || []).filter(
      (account) =>
        account.id === principal.id ||
        (admin && account.discoverable) ||
        (gm && related(principal, principal.id, account.id)) ||
        (player && related(principal, account.id, principal.id))
    );
    return {
      scopes: scopes.map((scope) => ({
        ...scope,
        playerIds:
          admin || scope.gameMasterId === principal.id
            ? (principal.scopeInvitations || []).find((entry) => sameScope(entry, scope))
                ?.playerIds || []
            : [],
      })),
      accounts: accounts.map(({ id, username, roles, displayName }) => ({
        id,
        username,
        roles,
        displayName,
      })),
      subscriptions: entries(principal.subscriptions),
      objectPermissions: entries(principal.objectPermissions).map((permission) => ({
        ...permission,
        objectName:
          management.objects.find((object) => object.id === permission.objectId)?.name ||
          'Deleted object',
      })),
      ownedObjects: management.objects
        .filter((object) => ownerOf(principal, 'object', object.id) === principal.id)
        .map((object) => ({
          id: object.id,
          name: object.name,
          kind: object.kind,
          objectType: object.definition?.objectType ?? object.definition?.kind ?? object.kind,
          readable: Boolean(context.objectReadable(object)),
        }))
        .sort(
          (a, b) =>
            Number(b.objectType === 'player-character') -
              Number(a.objectType === 'player-character') || a.name.localeCompare(b.name)
        ),
    };
  }
  if (req.method !== 'POST') throw httpError(405, 'Use GET or POST for subscriptions');
  const body = await bodyOf(req);
  return updateHeroesIdentity(identityFile, (state) => {
    state.scopeInvitations ||= [];
    state.subscriptions ||= [];
    state.objectPermissions ||= [];
    const account = state.users.find((item) => item.id === principal.id && !item.disabled);
    permitted(
      account && principal.roles.every((role) => account.roles.includes(role)),
      'Account role is no longer active'
    );
    const current = {
      ...principal,
      ownership: state.ownership || [],
      accounts: state.users,
      relationships: state.playRelationships || [],
      scopeInvitations: state.scopeInvitations,
      subscriptions: state.subscriptions,
      objectPermissions: state.objectPermissions,
    };
    const scopes = scopesFor(current, management);
    const requireScope = (target) => {
      const scope = scopes.find((entry) => sameScope(entry, target));
      permitted(scope, 'Scope is unavailable');
      return scope;
    };
    const availablePlayer = (scope, id) =>
      active(
        state.users.find((item) => item.id === id),
        'player'
      ) && related(current, scope.gameMasterId, id);
    const now = new Date().toISOString();
    if (body.action === 'visibility') {
      const scope = requireScope(body);
      permitted(
        gm && scope.gameMasterId === principal.id,
        'Only the owning Game Master can change scope visibility'
      );
      if (
        !Array.isArray(body.playerIds) ||
        body.playerIds.some((id) => !availablePlayer(scope, id))
      )
        throw httpError(400, 'Choose Players with approved account relationships');
      const previous = state.scopeInvitations.find((entry) => sameScope(entry, scope));
      const invitation = { ...scope, playerIds: [...new Set(body.playerIds)] };
      delete invitation.name;
      if (previous) Object.assign(previous, invitation);
      else state.scopeInvitations.push(invitation);
      for (const entry of [...state.subscriptions, ...state.objectPermissions])
        if (
          sameScope(entry, scope) &&
          entry.playerId !== scope.gameMasterId &&
          !invitation.playerIds.includes(entry.playerId) &&
          ['pending', 'approved'].includes(entry.status)
        ) {
          entry.status = 'revoked';
          entry.resolvedAt = now;
        }
      return { saved: true };
    }
    if (body.action === 'request' || body.action === 'invite') {
      const scope = requireScope(body);
      const invite = body.action === 'invite';
      const playerId = invite ? body.playerId : principal.id;
      permitted(
        invite
          ? gm && scope.gameMasterId === principal.id && availablePlayer(scope, playerId)
          : player && availablePlayer(scope, playerId) && visible(current, scope, playerId),
        'An approved relationship and visible scope are required'
      );
      if (
        state.subscriptions.some(
          (entry) =>
            sameScope(entry, scope) &&
            entry.playerId === playerId &&
            ['pending', 'approved'].includes(entry.status)
        )
      )
        throw httpError(409, 'A subscription or invitation is already active');
      if (invite) {
        let visibility = state.scopeInvitations.find((entry) => sameScope(entry, scope));
        if (!visibility) {
          visibility = {
            scopeType: scope.scopeType,
            scopeId: scope.scopeId,
            gameMasterId: scope.gameMasterId,
            playerIds: [],
          };
          state.scopeInvitations.push(visibility);
        }
        if (!visibility.playerIds.includes(playerId)) visibility.playerIds.push(playerId);
      }
      const subscription = {
        id: randomUUID(),
        scopeType: scope.scopeType,
        scopeId: scope.scopeId,
        gameMasterId: scope.gameMasterId,
        playerId,
        initiatedBy: invite ? 'game-master' : 'player',
        status: 'pending',
        createdAt: now,
      };
      state.subscriptions.push(subscription);
      return { subscription };
    }
    if (body.action === 'enroll') {
      const scope = requireScope(body);
      const ownScope = gm && scope.gameMasterId === principal.id;
      permitted(
        ownScope || (player && subscribed(current, scope, principal.id)),
        'An approved subscription to a visible scope is required'
      );
      permitted(
        ownerOf(current, 'object', body.objectId) === principal.id &&
          management.objects.some(
            (object) => object.id === body.objectId && context.objectReadable(object)
          ),
        'Only the owner may enroll a readable owned object'
      );
      if (
        state.objectPermissions.some(
          (entry) =>
            sameScope(entry, scope) &&
            entry.objectId === body.objectId &&
            ['pending', 'approved'].includes(entry.status)
        )
      )
        throw httpError(409, 'This object already has an active use request');
      const permission = {
        id: randomUUID(),
        scopeType: scope.scopeType,
        scopeId: scope.scopeId,
        gameMasterId: scope.gameMasterId,
        playerId: principal.id,
        objectId: body.objectId,
        status: ownScope ? 'approved' : 'pending',
        createdAt: now,
      };
      state.objectPermissions.push(permission);
      return { permission };
    }
    if (body.action === 'respond' || body.action === 'object-respond') {
      const objectRequest = body.action === 'object-respond';
      const entry = (objectRequest ? state.objectPermissions : state.subscriptions).find(
        (item) => item.id === body.id
      );
      permitted(entry, 'Request is unavailable');
      const owningGM = gm && entry.gameMasterId === principal.id;
      const owningPlayer = (player || (objectRequest && gm)) && entry.playerId === principal.id;
      const requester = objectRequest || entry.initiatedBy === 'player' ? owningPlayer : owningGM;
      const recipient = objectRequest || entry.initiatedBy === 'player' ? owningGM : owningPlayer;
      const transitions = {
        approve: entry.status === 'pending' && recipient,
        reject: entry.status === 'pending' && (recipient || admin),
        cancel: entry.status === 'pending' && (requester || admin),
        revoke: entry.status === 'approved' && (owningGM || owningPlayer || admin),
      };
      permitted(transitions[body.decision], 'This role cannot make that decision for this request');
      if (body.decision === 'approve') {
        const scope = requireScope(entry);
        permitted(
          scope.gameMasterId === entry.gameMasterId &&
            availablePlayer(scope, entry.playerId) &&
            visible(current, scope, entry.playerId),
          'The relationship or scope visibility is no longer approved'
        );
        if (objectRequest)
          permitted(
            validObjectMember(current, scope, entry.playerId) &&
              ownerOf(current, 'object', entry.objectId) === entry.playerId &&
              management.objects.some((object) => object.id === entry.objectId),
            'Object ownership or subscription is no longer valid'
          );
      }
      entry.status = {
        approve: 'approved',
        reject: 'rejected',
        cancel: 'cancelled',
        revoke: 'revoked',
      }[body.decision];
      entry.resolvedAt = now;
      if (!objectRequest && entry.status !== 'approved')
        for (const permission of state.objectPermissions)
          if (
            sameScope(permission, entry) &&
            permission.playerId === entry.playerId &&
            ['pending', 'approved'].includes(permission.status)
          ) {
            permission.status = 'revoked';
            permission.resolvedAt = now;
          }
      return { saved: true };
    }
    throw httpError(400, 'Unknown subscription action');
  });
}
