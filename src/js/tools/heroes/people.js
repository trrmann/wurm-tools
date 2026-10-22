import template from '../../../../site/partials/tools/heroes-people.html?raw';
import { createHeroesClient, downloadHeroesJson, HELPER_TOKEN_KEY } from './helper-client.js';
import {
  HEROES_PAGES,
  getHeroesObjectPage,
  heroesPageHref,
  updateHeroesContext,
} from '../../modules/pages/heroes-navigation.js';
import {
  getWorldCampaign,
  getCampaignGenre,
  isObjectAvailableInWorld,
} from '../../modules/objects/heroes/campaign-management.mjs';

const sections = [
  ['profile', 'People'],
  ['world', 'Worlds'],
  ['campaign', 'Campaigns'],
  ['genre', 'Genres'],
  ['object', 'Objects'],
  ['object-scope', 'Object availability'],
  ['character', 'Characters'],
  ['note', 'GM notes'],
];

export function mountHeroesPeople(
  container,
  { section = 'profile', role = '', title = 'People' } = {}
) {
  if (!sections.some(([kind]) => kind === section))
    throw new RangeError(`Unknown management section: ${section}`);
  const controller = new AbortController();
  const { signal } = controller;
  container.innerHTML = template;
  const element = (id) => container.querySelector(`#management-${id}`);
  const form = element('form');
  const status = element('state');
  const profileSelect = element('profile');
  container.querySelector('#management-heading').textContent = title;
  element('section-heading').textContent = title;
  container.querySelector('#management-heading + p').textContent =
    'Organizational records in the shared local database; not access-controlled accounts.';
  element('roster-role').value = role;
  element('roster-field').hidden = section !== 'profile' || Boolean(role);
  let initialProfileId = new URLSearchParams(window.location.search).get('profile') || '';
  let state = { records: [], worlds: [], objects: [] };
  let editingId = null;
  let busy = false;
  let loaded = false;
  const request = createHeroesClient({
    signal,
    onUnauthorized: () => {
      loaded = false;
      element('pair').hidden = false;
      element('controls').disabled = true;
    },
  });
  const report = (message, error = false) => {
    status.textContent = message;
    status.classList.toggle('is-error', error);
  };
  const run = async (action) => {
    if (busy) return;
    busy = true;
    element('controls').disabled = true;
    try {
      await action();
    } catch (error) {
      if (error.name !== 'AbortError') report(error.message, true);
    } finally {
      busy = false;
      element('controls').disabled = !loaded || !element('pair').hidden;
    }
  };
  const on = (target, event, action) => target.addEventListener(event, action, { signal });
  const node = (tag, text, className = '') => {
    const result = document.createElement(tag);
    result.textContent = text;
    result.className = className;
    return result;
  };
  const button = (label, action) => {
    const result = node('button', label, 'btn btn-secondary');
    result.type = 'button';
    on(result, 'click', action);
    return result;
  };
  const editorLink = (worldId, object = null) => {
    const link = node('a', 'Open world editor', 'btn btn-secondary');
    const query = new URLSearchParams(window.location.search);
    query.set('world', worldId || 'all');
    if (object) query.set('object', object.id);
    link.href = heroesPageHref(object ? getHeroesObjectPage(object) : HEROES_PAGES[0], query);
    if (object) {
      const url = new URL(link.href, window.location.origin);
      url.searchParams.set('object', object.id);
      link.href = url.href;
      link.textContent = 'Open character editor';
    }
    return link;
  };
  const profiles = (role) =>
    state.records.filter(
      (record) => record.kind === 'profile' && (!role || record.data.roles.includes(role))
    );
  const profileName = (id) =>
    state.records.find((record) => record.id === id)?.data.name || 'Unassigned';
  const worldName = (id) => state.worlds.find((world) => world.id === id)?.name || 'Missing world';
  const campaignName = (worldId) =>
    getWorldCampaign(state.records, worldId)?.data.name || 'Unassigned campaign';
  const genreName = (campaignId) =>
    getCampaignGenre(state.records, campaignId)?.data.name || 'Unassigned genre';
  const recordsOfKind = (kind) => state.records.filter((record) => record.kind === kind);
  const recordName = (id) =>
    state.records.find((record) => record.id === id)?.data.name || 'Missing record';
  const objectName = (id) =>
    state.objects.find((object) => object.id === id)?.name || 'Missing object';
  const options = (select, items, value = '', empty = 'Unassigned') => {
    select.replaceChildren(new Option(empty, ''));
    for (const [id, name] of items)
      select.add(
        new Option(
          items.filter((item) => item[1] === name).length > 1
            ? `${name} (${id.slice(0, 8)})`
            : name,
          id
        )
      );
    select.value = value;
  };
  const recordOptions = (records) => records.map((record) => [record.id, record.data.name]);
  const worldLinks = () => state.records.filter((record) => record.kind === 'world');
  const visibleWorlds = () =>
    new Set([
      ...worldLinks()
        .filter(
          (record) =>
            !profileSelect.value ||
            record.data.gameMasterId === profileSelect.value ||
            record.data.playerIds.includes(profileSelect.value)
        )
        .map((record) => record.data.worldId),
      ...state.records
        .filter(
          (record) => record.kind === 'character' && record.data.playerId === profileSelect.value
        )
        .map(
          (record) =>
            record.data.worldId ||
            state.objects.find((object) => object.id === record.data.objectId)?.worldId
        ),
      ...(!profileSelect.value ? state.worlds.map((world) => world.id) : []),
    ]);
  const currentRecords = () =>
    state.records.filter((record) => {
      if (record.kind !== section) return false;
      if (
        section === 'profile' &&
        element('roster-role').value &&
        !record.data.roles.includes(element('roster-role').value)
      )
        return false;
      if (!profileSelect.value) return true;
      if (section === 'profile')
        return (
          record.id === profileSelect.value ||
          worldLinks().some(
            (world) =>
              world.data.gameMasterId === profileSelect.value &&
              world.data.playerIds.includes(record.id)
          )
        );
      if (section === 'character')
        return (
          record.data.playerId === profileSelect.value ||
          worldLinks().some(
            (world) =>
              world.data.gameMasterId === profileSelect.value &&
              state.objects.some(
                (object) =>
                  object.id === record.data.objectId &&
                  (record.data.worldId || object.worldId) === world.data.worldId
              )
          )
        );
      if (section === 'campaign')
        return worldLinks().some(
          (world) => visibleWorlds().has(world.data.worldId) && world.data.campaignId === record.id
        );
      if (section === 'genre')
        return worldLinks().some(
          (world) =>
            visibleWorlds().has(world.data.worldId) &&
            getWorldCampaign(state.records, world.data.worldId)?.data.genreId === record.id
        );
      if (section === 'object-scope') {
        const object = state.objects.find((object) => object.id === record.data.objectId);
        return (
          object &&
          [...visibleWorlds()].some((worldId) =>
            isObjectAvailableInWorld(object, worldId, state.records)
          )
        );
      }
      return visibleWorlds().has(record.data.worldId);
    });
  async function reload() {
    state = await request('/heroes/management');
    loaded = true;
    const selected = profileSelect.value || initialProfileId;
    initialProfileId = '';
    options(profileSelect, recordOptions(profiles()), selected, 'All local records');
    options(
      element('import-world'),
      state.worlds.map((world) => [world.id, world.name]),
      element('import-world').value,
      'Global (no world)'
    );
    element('pair').hidden = true;
    updateProfileUrl();
    draw();
  }
  function updateProfileUrl() {
    updateHeroesContext({ profile: profileSelect.value });
  }
  const exportCollection = (type, id = '') =>
    run(async () => {
      const data = await request(`/heroes/management/export?${new URLSearchParams({ type, id })}`);
      downloadHeroesJson(data, `heros-${type}-collection.json`);
      report('Collection exported. GM notes are included as readable JSON.');
    });
  function field(label, name, value = '', type = 'text', items = null) {
    const wrapper = node('label', label, 'heroes-field');
    const control = document.createElement(
      items ? 'select' : type === 'textarea' ? 'textarea' : 'input'
    );
    control.name = name;
    control.setAttribute('aria-label', label);
    if (items) options(control, items, value);
    else if (type === 'textarea') {
      control.value = value;
      control.maxLength = 8000;
    } else {
      control.type = type;
      control.value = value;
      control.maxLength = 120;
    }
    wrapper.append(control);
    form.append(wrapper);
    return control;
  }
  function drawForm(record = null) {
    editingId = record?.id || null;
    form.replaceChildren();
    form.hidden = section === 'object';
    if (form.hidden) return;
    const data = record?.data || {};
    if (data.migrationNotes)
      form.append(node('p', data.migrationNotes, 'heroes-management-notice'));
    form.append(
      node('h3', `${record ? 'Edit' : 'Add'} ${sections.find(([kind]) => kind === section)[1]}`)
    );
    field('Name / label', 'name', data.name).required = true;
    if (section === 'profile') {
      const roles = data.roles || [role || 'player'];
      for (const [value, label] of [
        ['game-master', 'Game Master'],
        ['player', 'Player'],
      ]) {
        const check = field(label, value, value, 'checkbox');
        check.checked = roles.includes(value);
      }
      field('Profile notes (visible to all paired clients)', 'notes', data.notes, 'textarea');
    }
    if (['world', 'character', 'note'].includes(section)) {
      field(
        'Stored world',
        'worldId',
        data.worldId,
        'text',
        state.worlds.map((world) => [world.id, world.name])
      ).required = section !== 'character';
    }
    if (section === 'world') {
      field(
        'Local Game Master',
        'gameMasterId',
        data.gameMasterId ||
          (profiles('game-master').some((profile) => profile.id === profileSelect.value)
            ? profileSelect.value
            : ''),
        'text',
        recordOptions(profiles('game-master'))
      );
      field('Or external Game Master', 'externalGameMaster', data.externalGameMaster);
      field(
        'Parent campaign',
        'campaignId',
        data.campaignId,
        'text',
        recordOptions(recordsOfKind('campaign'))
      ).required = true;
      const players = field(
        'Subscribed players (Ctrl/Cmd-click to select multiple)',
        'playerIds',
        '',
        'text',
        recordOptions(profiles('player'))
      );
      players.multiple = true;
      players.size = Math.min(Math.max(profiles('player').length, 2), 6);
      [...players.options].forEach((option) => {
        option.selected = data.playerIds?.includes(option.value) || false;
      });
    }
    if (section === 'campaign') {
      field(
        'Parent genre',
        'genreId',
        data.genreId,
        'text',
        recordOptions(recordsOfKind('genre'))
      ).required = true;
      field('Active campaign', 'active', 'active', 'checkbox').checked = data.active ?? true;
      field('Campaign notes', 'notes', data.notes, 'textarea');
    }
    if (section === 'genre')
      field('Genre notes (organizational only)', 'notes', data.notes, 'textarea');
    if (section === 'object-scope') {
      field(
        'Saved object',
        'objectId',
        data.objectId,
        'text',
        state.objects.map((object) => [object.id, object.name])
      ).required = true;
      field('Available globally', 'global', 'global', 'checkbox').checked = data.global ?? false;
      for (const [key, label, items] of [
        ['genreIds', 'Genres', recordOptions(recordsOfKind('genre'))],
        ['campaignIds', 'Campaigns', recordOptions(recordsOfKind('campaign'))],
        ['worldIds', 'Worlds', state.worlds.map((world) => [world.id, world.name])],
      ]) {
        const select = field(`${label} (select multiple)`, key, '', 'text', items);
        select.multiple = true;
        select.size = Math.min(Math.max(items.length, 2), 6);
        [...select.options].forEach((option) => {
          option.selected = data[key]?.includes(option.value) || false;
        });
      }
      form.append(
        node(
          'p',
          'All scopes link the same object: edits affect every use. Genre and campaign availability includes descendant worlds. Empty scopes leave a shared object unassigned, not global. These are availability links, not permissions.'
        )
      );
    }
    if (['character', 'note'].includes(section)) {
      field(
        'Player profile (optional for a character)',
        'playerId',
        data.playerId,
        'text',
        recordOptions(profiles('player'))
      );
      const characters = state.objects.filter((object) =>
        ['character', 'player-character', 'non-player-character'].includes(object.kind)
      );
      field(
        'Saved character',
        'objectId',
        data.objectId,
        'text',
        characters.map((object) => [object.id, `${object.name} - ${worldName(object.worldId)}`])
      ).required = section === 'character';
    }
    if (section === 'character') {
      field(
        'Or external player (leave both empty for an unowned character)',
        'externalPlayer',
        data.externalPlayer
      );
      field(
        'External Game Master (optional; local GM comes from the world)',
        'externalGameMaster',
        data.externalGameMaster
      );
      form.append(
        node(
          'p',
          'The character inherits its campaign and genre from the selected world. Leave the world empty for a shared character without world context.'
        )
      );
    }
    if (section === 'note') {
      form.append(
        node(
          'p',
          'GM notes belong to the selected world. Players must be subscribed to that world; a character can have no player profile. Notes are not private.'
        )
      );
      field('GM note', 'notes', data.notes, 'textarea').required = true;
    }
    const submit = node('button', record ? 'Save changes' : 'Add record', 'btn btn-primary');
    submit.type = 'submit';
    form.append(
      submit,
      button('Cancel / new record', () => drawForm())
    );
  }
  function draw() {
    element('section-heading').textContent = title;
    element('roster-field').hidden = section !== 'profile' || Boolean(role);
    element('workspace-description').textContent = profileSelect.value
      ? `${profileName(profileSelect.value)} workspace - profiles are records, not signed-in users.`
      : 'Showing all local records.';
    const list = element('list');
    list.replaceChildren();
    const append = (title, details, actions) => {
      const row = node('article', '', 'heroes-management-row');
      row.append(node('h4', title), node('p', details));
      const buttons = node('div', '', 'heroes-world-actions');
      buttons.append(...actions);
      row.append(buttons);
      list.append(row);
    };
    if (section === 'object') {
      state.objects
        .filter((object) => visibleWorlds().has(object.worldId))
        .forEach((object) =>
          append(object.name, `${object.kind} - ${worldName(object.worldId)}`, [
            button('Export object', () =>
              run(async () => {
                downloadHeroesJson(
                  await request(`/heroes/objects/${encodeURIComponent(object.id)}/export`),
                  `${object.name}.json`
                );
                report('Object exported.');
              })
            ),
            editorLink(object.worldId),
          ])
        );
    } else {
      for (const record of currentRecords()) {
        const data = record.data;
        let details = data.notes || '';
        if (section === 'profile')
          details = `${data.roles.map((role) => (role === 'game-master' ? 'Game Master' : 'Player')).join(' / ')}. ${details}`;
        if (section === 'world')
          details = `${worldName(data.worldId)} - ${campaignName(data.worldId)} / ${genreName(data.campaignId)}; GM: ${data.externalGameMaster || profileName(data.gameMasterId)}; players: ${data.playerIds.map(profileName).join(', ') || 'none'}${!data.campaignId ? '; ACTION REQUIRED: select a parent campaign.' : ''}`;
        if (section === 'campaign')
          details = `${genreName(record.id)} - ${data.active ? 'Active' : 'Inactive'}. ${details}${!data.genreId ? ' ACTION REQUIRED: select a parent genre.' : ''}`;
        if (section === 'genre')
          details = `Organizational genre; does not enable genre-specific rules. ${details}`;
        if (section === 'object-scope')
          details = `${objectName(data.objectId)}; ${data.global ? 'Global' : 'Selected scopes'}; genres: ${data.genreIds.map(recordName).join(', ') || 'none'}; campaigns: ${data.campaignIds.map(recordName).join(', ') || 'none'}; worlds: ${data.worldIds.map(worldName).join(', ') || 'none'}. All uses share one editable definition.`;
        if (section === 'character')
          details = `${objectName(data.objectId)} - ${data.externalPlayer || profileName(data.playerId)}${data.externalGameMaster ? `; external GM: ${data.externalGameMaster}` : ''}; ${data.worldId ? `${worldName(data.worldId)} / ${campaignName(data.worldId)}` : 'No world context'}`;
        if (section === 'note')
          details = `${worldName(data.worldId)} - ${data.playerId ? profileName(data.playerId) : objectName(data.objectId)}: ${details}`;
        if (data.migrationNotes) details += `\nMigration: ${data.migrationNotes}`;
        const actions = [
          button('Edit', () => {
            drawForm(record);
            form.scrollIntoView({ block: 'nearest' });
          }),
          button('Delete', () => {
            if (
              !window.confirm(
                `Delete "${data.name}"? Referenced profiles/campaigns cannot be deleted until their links are cleared.`
              )
            )
              return;
            run(async () => {
              await request(`/heroes/management/${encodeURIComponent(record.id)}`, {
                method: 'DELETE',
              });
              await reload();
              report('Record deleted.');
            });
          }),
          button('Export', () =>
            exportCollection(
              section === 'world'
                ? 'world'
                : section === 'character' || section === 'note' || section === 'object-scope'
                  ? 'record'
                  : section,
              section === 'world' ? data.worldId : record.id
            )
          ),
        ];
        if (section === 'object-scope') actions.splice(1, 1);
        if (section === 'profile')
          actions.unshift(
            button('Open workspace', () => {
              profileSelect.value = record.id;
              updateProfileUrl();
              const destination = HEROES_PAGES.find(
                (page) =>
                  page.section === (data.roles.includes('game-master') ? 'world' : 'character')
              );
              window.location.assign(heroesPageHref(destination, window.location.search));
            })
          );
        if (section === 'world') actions.unshift(editorLink(data.worldId));
        if (section === 'character') {
          const object = state.objects.find((object) => object.id === data.objectId);
          if (object) actions.unshift(editorLink(data.worldId || object.worldId || '', object));
        }
        append(data.name, details, actions);
      }
      if (section === 'world' && !profileSelect.value) {
        for (const world of state.worlds.filter(
          (world) => !worldLinks().some((record) => record.data.worldId === world.id)
        )) {
          append(
            world.name,
            'No management record yet. Select a parent campaign when configuring this world.',
            [
              editorLink(world.id),
              button('Configure world', () => {
                drawForm();
                form.elements.name.value = world.name;
                form.elements.worldId.value = world.id;
              }),
              button('Export world', () => exportCollection('world', world.id)),
            ]
          );
        }
      }
      if (section === 'object-scope' && !profileSelect.value) {
        for (const object of state.objects.filter(
          (object) =>
            !recordsOfKind('object-scope').some((record) => record.data.objectId === object.id)
        )) {
          append(
            object.name,
            object.worldId
              ? `World-only: ${worldName(object.worldId)}`
              : 'Unassigned shared object',
            [
              button('Configure availability', () => {
                drawForm();
                form.elements.name.value = `${object.name} availability`.slice(0, 120);
                form.elements.objectId.value = object.id;
                for (const option of form.elements.worldIds.options)
                  option.selected = option.value === object.worldId;
              }),
            ]
          );
        }
      }
    }
    if (!list.children.length)
      list.append(node('p', 'No records in this section for the selected profile.'));
    drawForm();
  }
  on(form, 'submit', (event) => {
    event.preventDefault();
    const values = new FormData(form);
    const data = Object.fromEntries(values);
    if (section === 'profile')
      data.roles = ['game-master', 'player'].filter((role) => values.has(role));
    if (section === 'world') {
      data.playerIds = values.getAll('playerIds').filter(Boolean);
    }
    if (section === 'object-scope') {
      data.global = values.has('global');
      for (const key of ['genreIds', 'campaignIds', 'worldIds'])
        data[key] = values.getAll(key).filter(Boolean);
    }
    if (section === 'campaign') data.active = values.has('active');
    const id = editingId;
    run(async () => {
      await request(`/heroes/management${id ? `/${encodeURIComponent(id)}` : ''}`, {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify({ kind: section, data }),
      });
      await reload();
      report('Record saved locally.');
    });
  });
  on(profileSelect, 'change', () => {
    updateProfileUrl();
    draw();
  });
  on(element('roster-role'), 'change', draw);
  on(element('refresh'), 'click', () =>
    run(async () => {
      await reload();
      report('Records refreshed.');
    })
  );
  on(element('export'), 'click', () =>
    exportCollection(profileSelect.value ? 'profile' : 'all', profileSelect.value)
  );
  on(element('export-all'), 'click', () => exportCollection('all'));
  on(element('import'), 'change', () => {
    const file = element('import').files[0];
    if (!file) return;
    run(async () => {
      if (file.size > 64 * 1024 * 1024) throw new Error('Import file exceeds 64 MB');
      const data = JSON.parse(await file.text());
      let route = '/heroes/management/import';
      if (data.format === 'wurm-tools-heroes-world') route = '/heroes/worlds/import';
      if (data.format === 'wurm-tools-heroes-object') {
        route = element('import-world').value
          ? `/heroes/worlds/${encodeURIComponent(element('import-world').value)}/objects/import`
          : '/heroes/objects/import';
      }
      await request(route, { method: 'POST', body: JSON.stringify(data) });
      await reload();
      element('import').value = '';
      report('Import complete; independent copies saved.');
    });
  });
  on(element('pair-form'), 'submit', (event) => {
    event.preventDefault();
    run(async () => {
      const { token } = await request('/pair', {
        method: 'POST',
        body: JSON.stringify({ code: new FormData(element('pair-form')).get('code').trim() }),
      });
      localStorage.setItem(HELPER_TOKEN_KEY, token);
      await reload();
      element('pair-form').reset();
      report('Helper paired. Local records loaded.');
    });
  });
  run(async () => {
    await reload();
    report('Local records loaded. Profile selection is not authentication.');
  });
  return () => controller.abort();
}
