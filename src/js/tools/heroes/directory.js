import { identityRequest, heroesAccountLabel } from './session.js';

export function mountHeroesDirectory(container, { user, role = '' }) {
  let disposed = false;
  let busy = false;
  const element = (tag, text = '') => {
    const node = document.createElement(tag);
    node.textContent = text;
    return node;
  };
  const heading = element('h2', 'Account directory & messages');
  const status = element('p');
  status.setAttribute('role', 'status');
  const body = element('div');
  container.className = 'heroes-editor-panel heroes-directory';
  container.replaceChildren(heading, status, body);
  const label = (account) => heroesAccountLabel(account);
  const button = (text, action, refresh = true) => {
    const node = element('button', text);
    node.type = 'button';
    node.className = 'btn';
    node.addEventListener('click', () => (refresh ? run(action) : action()));
    return node;
  };
  async function run(action) {
    if (busy || disposed) return;
    busy = true;
    status.textContent = 'Updating account directory…';
    try {
      await action();
      if (!disposed) await load();
    } catch (error) {
      if (!disposed) status.textContent = error.message;
    } finally {
      busy = false;
    }
  }
  async function load() {
    const [directory, inbox] = await Promise.all([
      identityRequest('directory/status'),
      identityRequest('messages/list'),
    ]);
    if (disposed) return;
    body.replaceChildren();
    status.textContent = '';
    const accounts = new Map(directory.users.map((account) => [account.id, account]));
    const accountName = (id) =>
      accounts.has(id) ? label(accounts.get(id)) : 'Former or private account';
    body.append(
      element(
        'p',
        'These are registered system accounts, not manually entered organizational profiles. Relationships do not grant access to campaigns, worlds, or objects.'
      )
    );
    body.append(button('Refresh accounts and messages', async () => {}));
    if (
      role === 'player' &&
      user.roles.some((value) => ['admin', 'game-master', 'player'].includes(value))
    ) {
      const assignments = element('a', 'Manage character assignments');
      assignments.className = 'btn';
      assignments.href = '/site/heroes/assignments/';
      body.append(assignments);
    }
    if (user.roles.includes(role) && ['player', 'game-master'].includes(role)) {
      const listingLabel = element('label');
      listingLabel.className = 'heroes-field';
      const listing = element('input');
      listing.type = 'checkbox';
      listing.checked = role === 'player' ? directory.listing.player : directory.listing.gameMaster;
      listing.addEventListener('change', () =>
        run(() => identityRequest('directory/listing', { role, visible: listing.checked }))
      );
      listingLabel.append(
        listing,
        element(
          'span',
          `List my ${role === 'player' ? 'Player' : 'Game Master'} name publicly to signed-in accounts`
        )
      );
      body.append(listingLabel);
      const onlineLabel = element('label');
      onlineLabel.className = 'heroes-field';
      const online = element('input');
      online.type = 'checkbox';
      online.checked = directory.listing.online === true;
      online.addEventListener('change', () =>
        run(() => identityRequest('directory/online', { visible: online.checked }))
      );
      onlineLabel.append(
        online,
        element('span', 'Publish whether I have an active login (not a presence/last-seen tracker)')
      );
      body.append(onlineLabel);
    }
    const rows = element('div');
    rows.className = 'heroes-management-list';
    const contacts = directory.users.filter((account) => account.id !== user.id);
    for (const account of contacts.filter((account) => !role || account.roles.includes(role))) {
      const row = element('article');
      row.className = 'heroes-management-row';
      row.append(element('h3', label(account)));
      if (account.online !== null && account.online !== undefined)
        row.append(element('p', account.online ? 'Active login' : 'No active login'));
      if (user.roles.includes('admin') && !user.impersonation)
        row.append(
          button('Sign out all sessions', () => {
            if (!window.confirm(`Sign out every active session for ${label(account)}?`)) return;
            return identityRequest('admin/sessions/revoke', { userId: account.id });
          })
        );
      if (user.roles.includes('admin') && !user.impersonation)
        row.append(
          button('Impersonate account', async () => {
            await identityRequest('impersonation/start', { userId: account.id });
            window.location.replace('/site/heroes/account/');
          })
        );
      const relationship = directory.relationships.find(
        (item) =>
          (item.playerId === user.id && item.gameMasterId === account.id) ||
          (item.gameMasterId === user.id && item.playerId === account.id)
      );
      row.append(
        element('p', relationship ? `Relationship: ${relationship.status}` : 'Directory account')
      );
      if (relationship?.status === 'pending') {
        const requester =
          relationship.initiatedBy === 'game-master'
            ? relationship.gameMasterId
            : relationship.playerId;
        const isRecipient =
          requester !== user.id &&
          user.roles.includes(relationship.playerId === user.id ? 'player' : 'game-master');
        const decisions =
          requester === user.id
            ? [['Cancel invitation/request', 'cancel']]
            : isRecipient
              ? [
                  ['Accept', 'approve'],
                  ['Decline', 'reject'],
                ]
              : [];
        for (const [text, decision] of decisions)
          row.append(
            button(text, () => identityRequest('play/respond', { id: relationship.id, decision }))
          );
      } else if (relationship?.status === 'approved') {
        row.append(
          button('End relationship', () =>
            identityRequest('play/respond', { id: relationship.id, decision: 'end' })
          )
        );
      } else if (user.roles.includes('player') && account.roles.includes('game-master')) {
        row.append(
          button('Request relationship', () =>
            identityRequest('play/request', { username: account.username })
          )
        );
      } else if (user.roles.includes('game-master') && account.roles.includes('player')) {
        row.append(
          button('Invite Player', () =>
            identityRequest('play/invite', { username: account.username })
          )
        );
      }
      rows.append(row);
    }
    if (!rows.children.length)
      rows.append(
        element('p', 'No accounts are publicly listed or connected to you in this category.')
      );
    body.append(rows);
    if (user.roles.includes('admin') && !user.impersonation) {
      const requests = element('details');
      requests.append(element('summary', 'All relationship invitations and approvals'));
      for (const relationship of directory.relationships) {
        const row = element(
          'p',
          `${accountName(relationship.playerId)} ↔ ${accountName(relationship.gameMasterId)}: ${relationship.status} `
        );
        row.append(
          button('Revoke relationship or invitation', () =>
            identityRequest('admin/play/revoke', { id: relationship.id })
          )
        );
        requests.append(row);
      }
      body.append(requests);
    }
    const compose = element('form');
    compose.append(element('h3', 'Send a private message'));
    const recipientLabel = element('label', 'Recipient');
    recipientLabel.className = 'heroes-field';
    const recipient = element('select');
    recipient.required = true;
    recipient.append(new Option('Choose an account', ''));
    for (const account of contacts) recipient.append(new Option(label(account), account.id));
    recipientLabel.append(recipient);
    const textLabel = element('label', 'Message (up to 4,000 characters)');
    textLabel.className = 'heroes-field';
    const text = element('textarea');
    text.required = true;
    text.maxLength = 4000;
    text.rows = 3;
    textLabel.append(text);
    const send = element('button', 'Send message');
    send.type = 'submit';
    send.className = 'btn btn-primary';
    compose.append(recipientLabel, textLabel, send);
    compose.addEventListener('submit', (event) => {
      event.preventDefault();
      run(() => identityRequest('messages/send', { to: recipient.value, text: text.value }));
    });
    body.append(compose, element('h3', 'Your messages'));
    const messages = element('div');
    messages.className = 'heroes-management-list';
    for (const message of inbox.messages) {
      const row = element('article');
      row.className = 'heroes-management-row';
      row.append(
        element('h4', `${accountName(message.from)} → ${accountName(message.to)}`),
        element('p', message.text),
        element('small', new Date(message.createdAt).toLocaleString()),
        button('Remove from my messages', () =>
          identityRequest('messages/remove', { id: message.id })
        )
      );
      const other = message.from === user.id ? message.to : message.from;
      if (accounts.has(other))
        row.append(
          button(
            'Reply',
            () => {
              recipient.value = other;
              text.focus();
            },
            false
          )
        );
      messages.append(row);
    }
    if (!inbox.messages.length) messages.append(element('p', 'No messages yet.'));
    body.append(messages);
  }
  run(async () => {});
  return () => {
    disposed = true;
  };
}
