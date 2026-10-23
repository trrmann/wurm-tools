import template from '../../../../site/partials/tools/heroes-library.html?raw';
import { getAnatomyTypes, createAnatomy } from '../../modules/objects/heroes/anatomy-catalog.mjs';
import {
  resolveLibraryReferences,
  copyLibraryDefinition,
  placeAnatomyDefinition,
  detachLibraryReference,
} from '../../modules/objects/heroes/definition-library.mjs';
import { generateHerosObject } from '../../modules/objects/heroes.mjs';

export function mountDefinitionLibrary(
  container,
  { request, onChange, downloadJson, signal, accountRoles = [], writable = {}, deletable = {} }
) {
  container.innerHTML = template;
  const administrator = accountRoles.includes('admin');
  const creator =
    administrator || accountRoles.some((role) => ['game-master', 'player'].includes(role));
  const element = (id) => container.querySelector(`#heroes-${id}`);
  element('anatomy-form').hidden = !creator;
  element('library-export').hidden = !administrator;
  element('library-import').closest('label').hidden = !administrator;
  const types = getAnatomyTypes();
  const typeSelect = element('anatomy-type');
  for (const type of types) typeSelect.add(new Option(`${type.label} (${type.kind})`, type.type));
  let entries = [];
  let editingId = null;
  let editingObjectId = null;
  let draft;
  const state = (message, error = false) => {
    element('library-state').textContent = message;
    element('library-state').classList.toggle('is-error', error);
  };
  const selectedType = () => types.find((type) => type.type === typeSelect.value);
  const childKey = () => (selectedType().Type.childKind === 'shape' ? 'shapes' : 'parts');
  function readFields() {
    draft.name = element('anatomy-name').value.trim();
    draft.generalShape = element('anatomy-general').value.trim();
    draft.shapeTypes = element('anatomy-tags')
      .value.split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  function render() {
    element('anatomy-name').value = draft.name;
    element('anatomy-general').value = draft.generalShape;
    element('anatomy-tags').value = (draft.shapeTypes ?? []).join(', ');
    element('anatomy-json').value = JSON.stringify(draft, null, 2);
    const kind = selectedType().Type.childKind;
    element('anatomy-children-title').textContent = kind === 'shape' ? 'Composed shapes' : 'Parts';
    const select = element('anatomy-child');
    select.replaceChildren();
    for (const type of types.filter((type) => type.kind === kind && !type.requiresLibrary)) {
      select.add(new Option(type.label, type.type));
    }
    for (const entry of entries.filter((entry) => entry.kind === kind && entry.id !== editingId)) {
      select.add(new Option(`Saved: ${entry.name}`, `saved:${entry.id}`));
    }
    element('anatomy-children').replaceChildren();
    (draft[childKey()] ?? []).forEach((child, index) => {
      const row = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = `${child.name ?? entries.find((entry) => entry.id === child.libraryRef)?.name ?? 'Unnamed'}${child.libraryRef ? ' (live reference)' : ' (copy)'}`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn';
      remove.textContent = 'Remove';
      remove.setAttribute('aria-label', `Remove anatomy ${index + 1}`);
      remove.addEventListener('click', () => {
        readFields();
        draft[childKey()].splice(index, 1);
        render();
      });
      row.append(label, remove);
      element('anatomy-children').append(row);
    });
    element('anatomy-heading').textContent = editingId
      ? 'Edit saved anatomy'
      : 'Create reusable anatomy';
  }
  function reset() {
    editingId = null;
    draft = {
      ...createAnatomy({ anatomyType: typeSelect.value }).toJSON(),
      type: typeSelect.value,
    };
    render();
  }
  async function refresh() {
    const { entries: nextEntries } = await request('/heroes/library');
    for (const entry of entries.filter(
      (entry) => !nextEntries.some((next) => next.id === entry.id)
    )) {
      draft = detachLibraryReference(draft, entry.id, entries);
    }
    entries = nextEntries;
    renderList();
    render();
    await onChange(entries);
    state(`Loaded ${entries.length} shared definition(s).`);
  }
  function renderList() {
    const list = element('library-list');
    list.replaceChildren();
    for (const entry of entries) {
      const row = document.createElement('li');
      const title = document.createElement('strong');
      title.textContent = `${entry.name} · ${entry.kind}`;
      row.append(title);
      const editable = administrator || writable.library?.includes(entry.id);
      const preview = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = 'View definition';
      const definition = document.createElement('pre');
      definition.textContent = JSON.stringify(entry.definition, null, 2);
      preview.append(summary, definition);
      row.append(preview);
      if (editable && entry.kind !== 'object') {
        const edit = document.createElement('button');
        edit.className = 'btn';
        edit.textContent = 'Edit';
        edit.type = 'button';
        edit.setAttribute('aria-label', `Edit library ${entry.name}`);
        edit.addEventListener('click', () => {
          editingId = entry.id;
          draft = structuredClone(entry.definition);
          typeSelect.value = draft.anatomyType;
          render();
        });
        row.append(edit);
      } else if (editable) {
        const edit = document.createElement('button');
        edit.className = 'btn';
        edit.type = 'button';
        edit.textContent = 'Edit saved object';
        edit.setAttribute('aria-label', `Edit library ${entry.name}`);
        edit.addEventListener('click', () => {
          editingObjectId = entry.id;
          element('library-object-json').value = JSON.stringify(entry.definition, null, 2);
          element('library-object-form').hidden = false;
        });
        row.append(edit);
      }
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn';
      remove.textContent = 'Delete (convert references to copies)';
      remove.setAttribute('aria-label', `Delete library ${entry.name}`);
      remove.hidden = !administrator && !deletable.library?.includes(entry.id);
      remove.addEventListener('click', async () => {
        try {
          await request(`/heroes/library/${encodeURIComponent(entry.id)}`, { method: 'DELETE' });
          if (editingId === entry.id) reset();
          if (editingObjectId === entry.id) {
            editingObjectId = null;
            element('library-object-form').hidden = true;
          }
          await refresh();
          state(`Deleted ${entry.name}; saved uses are now independent copies.`);
        } catch (error) {
          state(error.message, true);
        }
      });
      row.append(remove);
      list.append(row);
    }
  }
  typeSelect.addEventListener('change', reset);
  element('library-object-cancel').addEventListener('click', () => {
    editingObjectId = null;
    element('library-object-form').hidden = true;
  });
  element('library-object-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const definition = JSON.parse(element('library-object-json').value);
      generateHerosObject({ ...definition, libraryEntries: entries });
      await request(`/heroes/library/${encodeURIComponent(editingObjectId)}`, {
        method: 'PUT',
        body: JSON.stringify({ name: definition.name, kind: 'object', definition }),
      });
      await refresh();
      state(`Updated saved object ${definition.name}.`);
    } catch (error) {
      state(error.message, true);
    }
  });
  for (const id of ['anatomy-name', 'anatomy-general', 'anatomy-tags']) {
    element(id).addEventListener('change', () => {
      readFields();
      element('anatomy-json').value = JSON.stringify(draft, null, 2);
    });
  }
  element('anatomy-reset').addEventListener('click', reset);
  element('anatomy-add').addEventListener('click', () => {
    try {
      readFields();
      const value = element('anatomy-child').value;
      if (!value) throw new Error('Select an anatomy definition');
      const reference = value.startsWith('saved:');
      const entry = reference ? entries.find((entry) => entry.id === value.slice(6)) : null;
      let child = reference
        ? { libraryRef: entry.id }
        : createAnatomy({ anatomyType: value }).toJSON();
      if (reference && element('anatomy-mode').value === 'copy')
        child = copyLibraryDefinition(child, entries);
      const id = `anatomy-${crypto.randomUUID()}`;
      child = placeAnatomyDefinition(child, id);
      draft[childKey()] ??= [];
      draft[childKey()].push(child);
      createAnatomy(resolveLibraryReferences(draft, entries));
      render();
    } catch (error) {
      state(error.message, true);
    }
  });
  element('anatomy-apply').addEventListener('click', () => {
    try {
      const definition = JSON.parse(element('anatomy-json').value);
      if (definition.anatomyType !== typeSelect.value)
        throw new Error('Choose the anatomy type before editing its JSON');
      createAnatomy(resolveLibraryReferences(definition, entries));
      draft = definition;
      render();
      state('Model definition applied.');
    } catch (error) {
      state(error.message, true);
    }
  });
  element('anatomy-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      readFields();
      if (element('anatomy-json').value !== JSON.stringify(draft, null, 2)) {
        throw new Error('Apply the edited model JSON before saving.');
      }
      createAnatomy(resolveLibraryReferences(draft, entries));
      if (
        selectedType().Type.requiresLibrary &&
        !(draft[childKey()]?.length || draft.components?.length)
      ) {
        throw new Error('Custom or compound anatomy needs at least one part, shape, or component.');
      }
      const route = editingId
        ? `/heroes/library/${encodeURIComponent(editingId)}`
        : '/heroes/library';
      const { entry } = await request(route, {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify({ name: draft.name, kind: selectedType().kind, definition: draft }),
      });
      if (!editingId) {
        writable.library ||= [];
        writable.library.push(entry.id);
        deletable.library ||= [];
        deletable.library.push(entry.id);
      }
      editingId = entry.id;
      await refresh();
      state(`Saved ${entry.name}. Live uses refresh when loaded or regenerated.`);
    } catch (error) {
      state(error.message, true);
    }
  });
  element('library-refresh').addEventListener(
    'click',
    () =>
      refresh()
        .then(() => state('Library refreshed.'))
        .catch((error) => state(error.message, true)),
    { signal }
  );
  element('library-export').addEventListener('click', async () => {
    try {
      downloadJson(await request('/heroes/library/export'), 'heroes-library.json');
    } catch (error) {
      state(error.message, true);
    }
  });
  element('library-import').addEventListener('change', async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      const result = await request('/heroes/library/import', {
        method: 'POST',
        body: await file.text(),
      });
      await refresh();
      state(`Imported ${result.imported} independent definitions.`);
    } catch (error) {
      state(error.message, true);
    } finally {
      event.target.value = '';
    }
  });
  reset();
  return { refresh };
}
