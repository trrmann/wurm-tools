import { createHeroesClient } from './helper-client.js';
import { heroesAccountLabel } from './session.js';

export function mountHeroesSubscriptions(container, { user, role = user.roles[0] }) {
  const controller = new AbortController();
  const { signal } = controller;
  const request = createHeroesClient({ signal });
  const gm = role === 'game-master' && user.roles.includes(role);
  const player = role === 'player' && user.roles.includes(role);
  const admin = role === 'admin' && user.roles.includes(role);
  let disposed = false;
  let busy = false;
  const node = (tag, text = '') => {
    const result = document.createElement(tag);
    result.textContent = text;
    return result;
  };
  const status = node('p');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const controls = node('fieldset');
  controls.append(node('legend', 'Campaign, world, and owned-object controls'));
  const content = node('div');
  controls.append(content);
  container.className = 'heroes-editor-panel heroes-subscriptions';
  container.replaceChildren(node('h2', 'Campaigns, worlds & owned objects'), status, controls);
  const post = (data) =>
    request('/heroes/subscriptions', { method: 'POST', body: JSON.stringify(data) });
  const button = (text, action) => {
    const result = node('button', text);
    result.type = 'button';
    result.className = 'btn btn-secondary';
    result.addEventListener('click', () => run(action), { signal });
    return result;
  };
  const field = (text, input) => {
    const result = node('label', text);
    result.className = 'heroes-field';
    result.append(input);
    return result;
  };
  const select = (placeholder, values) => {
    const result = node('select');
    result.required = true;
    result.append(new Option(placeholder, ''));
    for (const [value, text] of values) result.append(new Option(text, value));
    return result;
  };
  const form = (title, fields, text, action) => {
    const result = node('form');
    result.append(node('h4', title), ...fields);
    const submit = node('button', text);
    submit.type = 'submit';
    submit.className = 'btn btn-primary';
    result.append(submit);
    result.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
        run(action);
      },
      { signal }
    );
    return result;
  };
  async function run(action) {
    if (busy || disposed) return;
    busy = true;
    controls.disabled = true;
    status.classList.remove('is-error');
    status.setAttribute('role', 'status');
    status.textContent = 'Loading campaign and object subscriptions…';
    try {
      await action();
      await load();
      if (!disposed) status.textContent = '';
    } catch (error) {
      if (!disposed && error.name !== 'AbortError') {
        status.textContent = error.message;
        status.classList.add('is-error');
        status.setAttribute('role', 'alert');
      }
    } finally {
      busy = false;
      if (!disposed) controls.disabled = false;
    }
  }
  async function load() {
    const data = await request('/heroes/subscriptions');
    if (disposed) return;
    const accountName = (id) => {
      const account = data.accounts.find((entry) => entry.id === id);
      return account ? heroesAccountLabel(account) : 'Former or private account';
    };
    const scopeName = (entry) => {
      const scope = data.scopes.find(
        (scope) => scope.scopeType === entry.scopeType && scope.scopeId === entry.scopeId
      );
      return scope ? `${scope.name} (${scope.scopeType})` : 'Unavailable scope';
    };
    const target = ({ scopeType, scopeId }) => ({ scopeType, scopeId });
    const sameScope = (a, b) => a.scopeType === b.scopeType && a.scopeId === b.scopeId;
    content.replaceChildren(
      node(
        'p',
        'Scope visibility and subscriptions require an approved account relationship. Object use never transfers ownership.'
      ),
      button('Refresh campaigns, worlds & objects', async () => {})
    );
    if (!(gm || player || admin)) {
      content.append(
        node(
          'p',
          'Switch to your Player, Game Master, or system administrator role to manage subscriptions.'
        )
      );
      return;
    }
    const scopes = node('section');
    scopes.append(
      node(
        'h3',
        gm
          ? 'My campaigns & worlds'
          : admin
            ? 'All GM campaigns & worlds'
            : 'Available campaigns & worlds'
      )
    );
    if (!data.scopes.length)
      scopes.append(
        node(
          'p',
          gm
            ? 'No owned campaigns or worlds. Create one in the world or campaign editor.'
            : 'No scopes are visible. Ask an approved Game Master to make a scope visible or invite you.'
        )
      );
    for (const scope of data.scopes) {
      const row = node('article');
      row.className = 'heroes-management-row';
      row.append(
        node('h4', scopeName(scope)),
        node('p', `Game Master: ${accountName(scope.gameMasterId)}`)
      );
      if (gm && scope.gameMasterId === user.id) {
        const players = data.accounts.filter(
          (account) => account.roles.includes('player') && account.id !== user.id
        );
        const choices = select(
          'Choose an approved Player',
          players.map((account) => [account.id, heroesAccountLabel(account)])
        );
        row.append(
          form('Invite a Player', [field('Player account', choices)], 'Send scope invitation', () =>
            post({ action: 'invite', ...target(scope), playerId: choices.value })
          )
        );
        const visibility = node('fieldset');
        visibility.append(node('legend', 'Players allowed to discover this scope'));
        const checkboxes = players.map((account) => {
          const input = node('input');
          input.type = 'checkbox';
          input.value = account.id;
          input.checked = scope.playerIds.includes(account.id);
          visibility.append(field(heroesAccountLabel(account), input));
          return input;
        });
        if (!players.length) visibility.append(node('p', 'No approved Player relationships yet.'));
        row.append(
          form('Scope visibility', [visibility], 'Save scope visibility', () =>
            post({
              action: 'visibility',
              ...target(scope),
              playerIds: checkboxes.filter((input) => input.checked).map((input) => input.value),
            })
          )
        );
      } else if (player) {
        const subscription = data.subscriptions.find(
          (entry) =>
            sameScope(entry, scope) &&
            entry.playerId === user.id &&
            ['pending', 'approved'].includes(entry.status)
        );
        if (!subscription)
          row.append(
            button('Request subscription', () => post({ action: 'request', ...target(scope) }))
          );
        else row.append(node('p', `Subscription: ${subscription.status}`));
      }
      scopes.append(row);
    }
    content.append(scopes);
    const workflow = (entries, objectRequest) => {
      const section = node('section');
      section.append(
        node(
          'h3',
          objectRequest ? 'Object-use requests & permissions' : 'Scope invitations & subscriptions'
        )
      );
      if (!entries.length) section.append(node('p', 'No requests or subscriptions yet.'));
      for (const entry of entries) {
        const row = node('article');
        row.className = 'heroes-management-row';
        const object = data.ownedObjects.find((object) => object.id === entry.objectId);
        row.append(
          node(
            'h4',
            `${scopeName(entry)}${objectRequest ? ` — ${object?.name || entry.objectName || 'Requested object'}` : ''}`
          ),
          node('p', `${accountName(entry.playerId)} · ${entry.status}`)
        );
        const owningGM = gm && entry.gameMasterId === user.id;
        const owningPlayer = (player || (objectRequest && gm)) && entry.playerId === user.id;
        const requester = objectRequest || entry.initiatedBy === 'player' ? owningPlayer : owningGM;
        const recipient = objectRequest || entry.initiatedBy === 'player' ? owningGM : owningPlayer;
        const decisions = [];
        if (entry.status === 'pending') {
          if (recipient) decisions.push(['Accept / approve', 'approve'], ['Reject', 'reject']);
          if (requester) decisions.push(['Cancel request / invitation', 'cancel']);
          if (admin)
            decisions.push(
              ['Reject pending request', 'reject'],
              ['Cancel pending request', 'cancel']
            );
        } else if (entry.status === 'approved' && (owningGM || owningPlayer || admin))
          decisions.push([
            objectRequest
              ? owningPlayer
                ? 'Withdraw object'
                : 'Remove object permission'
              : 'Revoke / leave subscription',
            'revoke',
          ]);
        for (const [text, decision] of decisions)
          row.append(
            button(text, () =>
              post({ action: objectRequest ? 'object-respond' : 'respond', id: entry.id, decision })
            )
          );
        section.append(row);
      }
      return section;
    };
    content.append(workflow(data.subscriptions, false), workflow(data.objectPermissions, true));
    if (admin) return;
    const eligibleScopes = data.scopes.filter(
      (scope) =>
        (gm && scope.gameMasterId === user.id) ||
        (player &&
          data.subscriptions.some(
            (entry) =>
              sameScope(entry, scope) && entry.playerId === user.id && entry.status === 'approved'
          ))
    );
    for (const [title, pc] of [
      ['My player characters', true],
      ['My other objects', false],
    ]) {
      const section = node('section');
      section.append(node('h3', title));
      const objects = data.ownedObjects.filter(
        (object) => ((object.objectType ?? object.kind) === 'player-character') === pc
      );
      if (!objects.length) section.append(node('p', 'No owned objects in this category.'));
      for (const object of objects) {
        const row = node('article');
        row.className = 'heroes-management-row';
        row.append(
          node('h4', object.name),
          node('p', `Type: ${object.objectType ?? object.kind}. You retain ownership.`)
        );
        const memberships = data.objectPermissions.filter(
          (entry) => entry.objectId === object.id && ['pending', 'approved'].includes(entry.status)
        );
        for (const entry of memberships) {
          const membership = node('p', `${scopeName(entry)}: ${entry.status}`);
          membership.append(
            button(entry.status === 'pending' ? 'Cancel enrollment' : 'Withdraw from scope', () =>
              post({
                action: 'object-respond',
                id: entry.id,
                decision: entry.status === 'pending' ? 'cancel' : 'revoke',
              })
            )
          );
          row.append(membership);
        }
        if ((player || gm) && object.readable) {
          const available = eligibleScopes.filter(
            (scope) => !memberships.some((entry) => sameScope(entry, scope))
          );
          const choices = select(
            'Choose an approved scope',
            available.map((scope) => [JSON.stringify(target(scope)), scopeName(scope)])
          );
          row.append(
            form(
              'Enroll owned object in a scope',
              [field('Campaign or world', choices)],
              gm ? 'Add owned object' : 'Request object use',
              () => post({ action: 'enroll', objectId: object.id, ...JSON.parse(choices.value) })
            )
          );
        }
        row.append(
          button('Delete owned object', async () => {
            if (
              !window.confirm(
                `Permanently delete your owned object “${object.name}”? This cannot be undone.`
              )
            )
              return;
            await request(`/heroes/objects/${encodeURIComponent(object.id)}`, { method: 'DELETE' });
          })
        );
        section.append(row);
      }
      content.append(section);
    }
  }
  if (gm || player || admin) run(async () => {});
  else content.append(node('p', 'Select an assigned Player, Game Master, or administrator role.'));
  return () => {
    disposed = true;
    controller.abort();
  };
}
