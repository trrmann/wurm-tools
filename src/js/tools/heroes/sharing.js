import { createHeroesClient } from './helper-client.js';
import { heroesSessionToken } from './session.js';

export function mountHeroesSharing(container, { publicOnly = false } = {}) {
  const controller = new AbortController();
  const request = createHeroesClient({ signal: controller.signal });
  const node = (tag, text = '') => {
    const value = document.createElement(tag);
    value.textContent = text;
    return value;
  };
  container.classList.add('heroes-workspace');
  const title = node('h2', publicOnly ? 'Public content on this helper' : 'Publishing & editors');
  const status = node('p', 'Loading content…');
  status.setAttribute('role', 'status');
  const body = node('div');
  container.replaceChildren(title, status, body);
  const field = (label, input) => {
    const wrapper = node('label', label);
    wrapper.className = 'heroes-field';
    wrapper.append(input);
    return wrapper;
  };
  async function load() {
    const data = await request(publicOnly ? '/heroes/public' : '/heroes/sharing');
    if (controller.signal.aborted) return;
    status.textContent = '';
    body.replaceChildren();
    if (publicOnly) {
      const login = node('a', 'Log in / register');
      login.href = '/';
      const profile = node('a', 'Profile / switch role');
      profile.href = '/site/heroes/account/';
      body.append(
        node(
          'p',
          'Only content explicitly published as Public is shown. Content with private linked dependencies is omitted. This is not a central internet directory.'
        ),
        ...(heroesSessionToken() ? [] : [login]),
        profile
      );
      const resources = [
        ...data.worlds.map((item) => ({ name: item.name, value: item })),
        ...data.objects.map((item) => ({ name: item.name, value: item.definition })),
        ...data.records.map((item) => ({ name: item.data.name, value: item.data })),
        ...data.entries.map((item) => ({ name: item.name, value: item.definition })),
      ];
      for (const item of resources) {
        const details = node('details');
        details.className = 'heroes-editor-panel';
        details.append(
          node('summary', item.name),
          node('pre', JSON.stringify(item.value, null, 2))
        );
        body.append(details);
      }
      if (!resources.length)
        body.append(node('p', 'No content has been published publicly on this helper.'));
      return;
    }
    body.append(
      node(
        'p',
        'Only the owner or an active system administrator can change publication and editors. Publication grants viewing only. Linked content must also be readable by the audience; private dependencies can prevent a published item from appearing. Scope audiences follow approved subscriptions or linked profiles with an approved Player–GM relationship. Creator identity remains unchanged when ownership changes. Role-specific notes are not publishable here.'
      )
    );
    const form = node('form');
    const resource = node('select');
    resource.required = true;
    resource.append(new Option('Choose owned content', ''));
    data.resources.forEach((item, index) =>
      resource.append(new Option(`${item.name} (${item.type})`, String(index)))
    );
    const provenance = node('p');
    const adopt = node('input');
    adopt.type = 'checkbox';
    const adoptField = field(
      'Adopt legacy content as owner (original creator remains unknown)',
      adopt
    );
    adoptField.hidden = true;
    const audience = node('select');
    for (const [value, label] of [
      ['private', 'Private'],
      ['public', 'Public (including signed-out visitors)'],
      ['player-group', 'Selected approved Players'],
      ['gm-group', 'Selected approved Game Masters'],
      ['campaign', 'Campaign subscribers'],
      ['campaign-group', 'Selected campaign subscribers'],
      ['world', 'World subscribers'],
      ['world-group', 'Selected world subscribers'],
      ['genre', 'Genre subscribers'],
      ['genre-group', 'Selected genre subscribers'],
    ])
      audience.append(new Option(label, value));
    const scope = node('select');
    const viewers = node('select');
    const editors = node('select');
    viewers.multiple = editors.multiple = true;
    viewers.size = editors.size = 5;
    for (const account of data.accounts) {
      editors.append(new Option(account.username, account.id));
      viewers.append(new Option(account.username, account.id));
    }
    const scopeField = field('Publication scope', scope);
    const viewersField = field('Group viewers (Ctrl/Cmd-click to select multiple)', viewers);
    const updateViewers = () => {
      const item = resource.value === '' ? null : data.resources[Number(resource.value)];
      const members = ['player-group', 'gm-group'].includes(audience.value)
        ? item?.groupMembers?.[audience.value] || []
        : data.scopes.find((item) => item.id === scope.value)?.members || [];
      for (const option of viewers.options) {
        option.disabled = !members.includes(option.value);
        option.hidden = option.disabled;
        if (option.disabled) option.selected = false;
      }
    };
    const updateScope = (selected = '') => {
      const kind = audience.value.replace(/-group$/, '');
      scope.replaceChildren(new Option('Choose a scope', ''));
      data.scopes
        .filter((item) => item.type === kind)
        .forEach((item) => scope.append(new Option(item.name, item.id)));
      scope.value = selected;
      scopeField.hidden = !['world', 'campaign', 'genre'].includes(kind);
      scope.required = !scopeField.hidden;
      viewersField.hidden = !audience.value.endsWith('-group');
      updateViewers();
    };
    scope.addEventListener('change', updateViewers);
    audience.addEventListener('change', () => updateScope());
    resource.addEventListener('change', () => {
      const item = data.resources[Number(resource.value)];
      if (!item || resource.value === '') return;
      const accountName = (id) =>
        data.accounts.find((account) => account.id === id)?.username || 'Unknown legacy identity';
      provenance.textContent = `Owner: ${accountName(item.ownerId)}. Original creator: ${accountName(item.creatorId)}.`;
      adoptField.hidden = Boolean(item.ownerId);
      adopt.checked = false;
      adopt.required = !item.ownerId;
      audience.value = item.publication.audience;
      updateScope(item.publication.scopeId);
      for (const option of editors.options) option.selected = item.editors.includes(option.value);
      for (const option of viewers.options)
        option.selected = !option.disabled && item.publication.viewers.includes(option.value);
    });
    const save = node('button', 'Save publication & editors');
    save.className = 'btn btn-primary';
    save.type = 'submit';
    form.append(
      field('Owned content', resource),
      provenance,
      adoptField,
      field('Publication audience', audience),
      scopeField,
      viewersField,
      field('Editors (independent of the viewing audience)', editors),
      save
    );
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const item = data.resources[Number(resource.value)];
      if (!item || resource.value === '') return;
      save.disabled = true;
      try {
        const result = await request('/heroes/sharing', {
          method: 'POST',
          body: JSON.stringify({
            resourceType: item.type,
            resourceId: item.id,
            audience: audience.value,
            scopeId: scope.value,
            viewers: [...viewers.selectedOptions].map((option) => option.value),
            editors: [...editors.selectedOptions].map((option) => option.value),
            adopt: !item.ownerId && adopt.checked,
          }),
        });
        item.publication = {
          audience: audience.value,
          scopeId: scope.value,
          viewers: [...viewers.selectedOptions].map((option) => option.value),
        };
        item.editors = [...editors.selectedOptions].map((option) => option.value);
        item.ownerId = result.ownerId;
        adoptField.hidden = true;
        adopt.required = false;
        const accountName = (id) =>
          data.accounts.find((account) => account.id === id)?.username || 'Unknown legacy identity';
        provenance.textContent = `Owner: ${accountName(item.ownerId)}. Original creator: ${accountName(item.creatorId)}.`;
        status.textContent = 'Publication and editor permissions saved.';
      } catch (error) {
        if (!controller.signal.aborted) status.textContent = error.message;
      } finally {
        save.disabled = false;
      }
    });
    updateScope();
    body.append(form);
  }
  load().catch((error) => {
    if (!controller.signal.aborted) status.textContent = `Unable to load content: ${error.message}`;
  });
  return () => controller.abort();
}
