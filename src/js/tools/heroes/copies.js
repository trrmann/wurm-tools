import { createHeroesClient } from './helper-client.js';

export function mountHeroesCopies(container) {
  const controller = new AbortController();
  const request = createHeroesClient({ signal: controller.signal });
  const node = (tag, text = '') => {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
  };
  container.classList.add('heroes-workspace');
  const status = node('p', 'Loading copy requests…');
  status.setAttribute('role', 'status');
  const content = node('div');
  container.replaceChildren(node('h2', 'Approved independent copies'), status, content);
  async function mutate(body, button) {
    button.disabled = true;
    try {
      await request('/heroes/copies', { method: 'POST', body: JSON.stringify(body) });
      if (!controller.signal.aborted) await load();
    } catch (error) {
      if (!controller.signal.aborted) {
        status.textContent = error.message;
        button.disabled = false;
      }
    }
  }
  async function load() {
    const data = await request('/heroes/copies');
    if (controller.signal.aborted) return;
    content.replaceChildren(
      node(
        'p',
        'Request an independent private snapshot. Only the current owner can approve it. Original creator, source, and name are preserved. Changes never propagate in either direction. World and management copies include their readable dependency graph; all dependency owners must consent. Linked saved definitions are embedded. Updates are not automatically accepted or applied. Source owners can offer a new revision to existing copy recipients, even when the source is now private. Accepting imports a separate private snapshot and keeps your existing copy and edits unchanged. A proposal never grants live-source access.'
      )
    );
    status.textContent = data.canMutate
      ? data.canRequest && data.canAccept
        ? ''
        : 'Switch to an actually assigned Game Master or Player role to request copies or accept revisions. Administrator mode supports owner review and stewardship only.'
      : 'Select an assigned Player, Game Master, or administrator role to request or review copies.';
    const form = node('form');
    const label = node('label', 'Readable source ');
    const source = node('select');
    source.required = true;
    source.append(new Option('Choose content to request', ''));
    data.resources.forEach((item, index) =>
      source.append(new Option(`${item.name} (${item.type})`, String(index)))
    );
    const submit = node('button', 'Request owner approval');
    submit.type = 'submit';
    submit.className = 'btn btn-primary';
    source.disabled = submit.disabled = !data.canRequest;
    label.append(source);
    form.append(label, submit);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!data.canRequest || source.value === '') return;
      const resource = data.resources[Number(source.value)];
      void mutate(
        { action: 'request', resourceType: resource.type, resourceId: resource.id },
        submit
      );
    });
    content.append(form, node('h3', 'Requests and owner review'));
    const targets = data.proposalTargets || [];
    if (targets.length) {
      const proposalForm = node('form');
      const proposalLabel = node('label', 'Existing copy recipient ');
      const target = node('select');
      target.required = true;
      target.append(new Option('Choose an existing copy', ''));
      targets.forEach((item, index) =>
        target.append(
          new Option(`${item.originalName} — recipient ${item.recipientId}`, String(index))
        )
      );
      const propose = node('button', 'Offer new independent revision');
      propose.type = 'submit';
      propose.className = 'btn btn-secondary';
      target.disabled = propose.disabled = !data.canMutate;
      proposalLabel.append(target);
      proposalForm.append(proposalLabel, propose);
      proposalForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (target.value === '') return;
        void mutate({ action: 'propose', copyId: targets[Number(target.value)].copyId }, propose);
      });
      content.append(node('h3', 'Offer updates to existing recipients'), proposalForm);
    }
    if (!data.requests.length) content.append(node('p', 'No copy requests.'));
    for (const item of data.requests) {
      const card = node('section');
      card.className = 'heroes-editor-panel';
      card.append(
        node(
          'h4',
          `${item.originalName} (${item.resourceType})${item.kind === 'revision' ? ' — new revision proposal' : ''}`
        ),
        node(
          'p',
          `Status: ${item.status}. ${item.kind === 'revision' ? 'Recipient' : 'Requester'}: ${item.requesterId}. Original creator: ${item.creatorId || 'Unknown legacy identity'}. Source: ${item.resourceType}:${item.resourceId}. Requested: ${item.requestedAt}.${item.kind === 'revision' ? ' Acceptance creates a new private copy; your existing copy is never overwritten.' : ''}`
        )
      );
      if (item.status === 'pending' && data.canMutate) {
        const actions = [];
        if (item.kind === 'revision') {
          if (item.requesterId === data.accountId) {
            if (data.canAccept) actions.push(['approve', 'Accept new revision']);
            actions.push(['decline', 'Decline revision']);
          }
          if (item.ownerId === data.accountId) actions.push(['cancel', 'Cancel update proposal']);
        } else {
          if (item.ownerId === data.accountId) {
            if (item.requesterId !== data.accountId || data.canAccept)
              actions.push(['approve', 'Approve private copy']);
            actions.push(['decline', 'Decline']);
          }
          if (item.requesterId === data.accountId) actions.push(['cancel', 'Cancel request']);
        }
        for (const [action, text] of actions) {
          const button = node('button', text);
          button.type = 'button';
          button.className = 'btn btn-secondary';
          button.addEventListener(
            'click',
            () => void mutate({ action, requestId: item.id }, button)
          );
          card.append(button);
        }
      }
      content.append(card);
    }
    content.append(node('h3', 'Your independent copies and provenance'));
    if (!data.copies.length) content.append(node('p', 'No approved copies yet.'));
    for (const copy of data.copies)
      content.append(
        node(
          'p',
          `${copy.originalName} — private ${copy.resourceType}:${copy.resourceId}. Original creator: ${copy.creatorId || 'Unknown legacy identity'}. Original source: ${copy.sourceType}:${copy.sourceId}. Approved ${copy.approvedAt}.${copy.revisionOfResourceId ? ` New independent revision of ${copy.revisionOfResourceId}; previous copy retained.` : ''}`
        )
      );
  }
  load().catch((error) => {
    if (!controller.signal.aborted) status.textContent = error.message;
  });
  return { destroy: () => controller.abort() };
}
