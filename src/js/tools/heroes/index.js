import template from '../../../../site/partials/tools/heroes.html?raw';
import { fill, getShell } from '../../modules/template.js';
import {
  generateHerosObject,
  generateHerosCharacter,
  getHerosObjectTypes,
  getHerosCharacterElementTypes,
  HerosEquation,
  HerosPointLevelClassification,
} from '../../modules/objects/heroes.mjs';
import { MixedNumber } from '../../modules/objects/mixed-numbers.mjs';

const HELPER_URL = 'http://127.0.0.1:5180';
const HELPER_TOKEN_KEY = 'wurm-tools-helper-token-v1';
let controller;

export function unmount() {
  controller?.abort();
  controller = null;
}

export function mount(container) {
  unmount();
  controller = new AbortController();
  const { signal } = controller;
  container.innerHTML = fill(getShell(template), {});

  const characterElementTypes = getHerosCharacterElementTypes();
  const objectTypes = getHerosObjectTypes();
  const objectTypeById = new Map(objectTypes.map((type) => [type.type, type]));
  const objectKindSelect = container.querySelector('#heroes-object-kind');
  const pointLevelSelect = container.querySelector('#heroes-point-level');
  objectKindSelect.replaceChildren();
  for (const type of objectTypes) {
    const option = document.createElement('option');
    option.value = type.type;
    option.textContent = type.label;
    objectKindSelect.append(option);
  }
  objectKindSelect.value = 'character';
  for (const preset of HerosPointLevelClassification.Presets) {
    const option = document.createElement('option');
    option.value = preset.id;
    option.textContent = `${preset.name} (${preset.points} points)`;
    pointLevelSelect.append(option);
  }
  const characterElementTypeById = new Map(
    characterElementTypes.map((definition) => [definition.type, definition])
  );
  const NON_PRICED_TYPES = new Set(
    characterElementTypes
      .filter((definition) => !definition.priced)
      .map((definition) => definition.type)
  );
  const typedKindSelect = container.querySelector('#heroes-typed-kind');
  const nestedKindSelect = container.querySelector('#heroes-nested-kind');
  for (const definition of characterElementTypes) {
    if (![...typedKindSelect.options].some((option) => option.value === definition.type)) {
      const option = document.createElement('option');
      option.value = definition.type;
      option.textContent = definition.label;
      typedKindSelect.append(option);
    }
    if (
      definition.nestedIn.length &&
      ![...nestedKindSelect.options].some((option) => option.value === definition.type)
    ) {
      const option = document.createElement('option');
      option.value = definition.type;
      option.textContent = definition.label;
      nestedKindSelect.append(option);
    }
  }

  const element = (selector) => container.querySelector(selector);
  const state = element('#heroes-state');
  const pairingPanel = element('#heroes-pair-panel');
  const pairingForm = element('#heroes-pair-form');
  const worldForm = element('#heroes-world-form');
  const worldSelect = element('#heroes-world-select');
  const worldExportButton = element('#heroes-world-export');
  const worldDeleteButton = element('#heroes-world-delete');
  const worldImportInput = element('#heroes-world-import-file');
  const objectImportInput = element('#heroes-object-import-file');
  const objectForm = element('#heroes-object-form');
  const objectList = element('#heroes-object-list');
  const objectCount = element('#heroes-object-count');
  const equationElementList = element('#heroes-equation-elements');
  const typedElementList = element('#heroes-sheet-sections');
  const equationReadout = element('#heroes-equation-readout');
  const pointValueInput = element('#heroes-points-value');
  const pointLevelCustomField = element('#heroes-point-level-custom-field');
  const pointLevelCustomInput = element('#heroes-point-level-custom');
  const pointLevelValueInput = element('#heroes-point-level-value');
  const equationElements = { advantages: [], disadvantages: [] };
  const typedElements = [];
  const nestedElements = [];
  let activeWorldId = null;
  let editingObjectId = null;
  let editingTypedIndex = null;
  let editingNestedIndex = null;
  let editingEquationElement = null;

  function setState(message, isError = false) {
    state.textContent = message;
    state.classList.toggle('is-error', isError);
  }

  async function request(route, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = localStorage.getItem(HELPER_TOKEN_KEY);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (options.body) headers.set('Content-Type', 'application/json');
    const response = await fetch(`${HELPER_URL}${route}`, {
      ...options,
      headers,
      signal,
    });
    const body = response.headers.get('content-type')?.includes('application/json')
      ? await response.json()
      : null;
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem(HELPER_TOKEN_KEY);
        pairingPanel.hidden = false;
      }
      throw new Error(body?.error || `Local helper returned ${response.status}`);
    }
    return body;
  }

  function setEditorEnabled(enabled) {
    worldForm.querySelectorAll('input, button').forEach((control) => {
      control.disabled = !enabled;
    });
    worldSelect.disabled = !enabled;
    worldExportButton.disabled = !enabled || !activeWorldId;
    worldDeleteButton.disabled = !enabled || !activeWorldId;
    worldImportInput.disabled = !enabled;
    objectImportInput.disabled = !enabled || !activeWorldId;
    objectForm.querySelectorAll('input, select, textarea, button').forEach((control) => {
      control.disabled = !enabled || !activeWorldId;
    });
    element('#heroes-typed-trait-fieldset').disabled = !enabled || !activeWorldId;
  }

  function updatePointLevelFields() {
    const selectedPreset = HerosPointLevelClassification.Presets.find(
      (preset) => preset.id === pointLevelSelect.value
    );
    const isCustom = pointLevelSelect.value === 'custom';
    pointLevelCustomField.hidden = !isCustom;
    pointLevelCustomInput.required = isCustom;
    pointLevelValueInput.required = isCustom;
    pointLevelValueInput.disabled = !selectedPreset && !isCustom;
    pointLevelValueInput.readOnly = Boolean(selectedPreset);
    if (selectedPreset) {
      pointLevelValueInput.value = String(selectedPreset.points);
    } else if (!isCustom) {
      pointLevelValueInput.value = '';
    }
  }

  updatePointLevelFields();

  function readEquation() {
    return generateHerosCharacter({
      name: element('#heroes-object-name').value,
      edition: element('#heroes-edition').value,
      characterType: currentCharacterType(),
      equation: {
        advantages: equationElements.advantages,
        points: [MixedNumber.from(pointValueInput.value)],
        disadvantages: equationElements.disadvantages,
      },
      typedElements,
    }).equation;
  }

  function currentCharacterType() {
    const objectType = element('#heroes-object-kind').value;
    if (objectType === 'player-character') return 'player';
    if (objectType === 'non-player-character') return 'nonPlayer';
    return undefined;
  }

  function updateEquationReadout() {
    try {
      const equation = readEquation();
      equationReadout.textContent = `Advantages ${equation.advantagesValue} + points ${equation.pointsValue} = disadvantages ${equation.disadvantagesValue}${equation.isBalanced ? ' (balanced)' : ` (difference ${equation.difference})`}`;
      element('#heroes-object-form button[type="submit"]').disabled = !activeWorldId;
    } catch (error) {
      equationReadout.textContent =
        error instanceof Error ? error.message : 'Unable to generate this character equation.';
      element('#heroes-object-form button[type="submit"]').disabled = true;
    }
    renderTypedElements();
  }

  function renderEquationElements() {
    equationElementList.replaceChildren();
    for (const side of ['advantages', 'disadvantages']) {
      equationElements[side].forEach((item, index) => {
        const row = document.createElement('li');
        const label = document.createElement('span');
        label.textContent = `${side === 'advantages' ? '+' : '-'} ${item.name}: ${item.value}`;
        const edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'btn';
        edit.textContent = 'Edit';
        edit.setAttribute('aria-label', `Edit ${item.name}`);
        edit.addEventListener('click', () => beginEquationEdit(side, index));
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'btn';
        remove.textContent = 'Remove';
        remove.setAttribute('aria-label', `Remove ${item.name}`);
        remove.addEventListener('click', () => {
          if (editingEquationElement?.side === side && editingEquationElement.index === index) {
            resetEquationForm();
          }
          equationElements[side].splice(index, 1);
          renderEquationElements();
          updateEquationReadout();
        });
        row.append(label, edit, remove);
        equationElementList.append(row);
      });
    }
    if (!equationElementList.childElementCount) {
      const empty = document.createElement('li');
      empty.className = 'heroes-empty-list';
      empty.textContent = 'No equation elements added.';
      equationElementList.append(empty);
    }
  }

  function resetEquationForm() {
    editingEquationElement = null;
    element('#heroes-element-name').value = '';
    element('#heroes-element-value').value = '';
    element('#heroes-add-element').textContent = 'Add element';
    element('#heroes-cancel-equation-edit').hidden = true;
  }

  function beginEquationEdit(side, index) {
    const item = equationElements[side][index];
    if (!item) return;
    editingEquationElement = { side, index };
    element('#heroes-element-side').value = side;
    element('#heroes-element-name').value = item.name;
    element('#heroes-element-value').value = MixedNumber.from(item.value).toString();
    element('#heroes-add-element').textContent = 'Update element';
    element('#heroes-cancel-equation-edit').hidden = false;
    element('#heroes-element-name').focus();
  }

  function typedElementSheetSection(item, objectType) {
    const definition = characterElementTypeById.get(item.type);
    const typeName = item.type.split('#').at(-1).toLowerCase();
    const shortName = String(item.shortName ?? item.name ?? '').toUpperCase();
    const isCharacter = ['character', 'player-character', 'non-player-character'].includes(
      objectType
    );

    if (objectType === 'base') {
      if (item.type === 'description') return 'description';
      if (definition?.group === 'characteristics') return 'characteristics';
      if (definition?.group === 'advantages') return 'abilities';
      return 'other';
    }
    if (!isCharacter) {
      if (definition?.group === 'characteristics') return 'characteristics';
      if (definition?.group === 'disadvantages') return 'disadvantages';
      if (definition?.group === 'advantages') return 'abilities';
      return 'other';
    }
    if (['description', 'event', 'action', 'specialEffect'].includes(item.type)) {
      return 'identity';
    }
    if (
      definition?.group === 'characteristics' &&
      (['OCV', 'DCV', 'END', 'DEF'].includes(shortName) || /combatvalue/i.test(typeName))
    ) {
      return 'combat';
    }
    if (definition?.group === 'characteristics') return 'characteristics';
    if (definition?.group === 'disadvantages') return 'disadvantages';
    if (/skill|talent|perk/i.test(typeName)) return 'skills';
    if (definition?.group === 'advantages') return 'powers';
    return 'other';
  }

  function renderTypedElements() {
    typedElementList.replaceChildren();
    const objectType = element('#heroes-object-kind').value;
    const isBase = objectType === 'base';
    const isCharacter = ['character', 'player-character', 'non-player-character'].includes(
      objectType
    );
    const sections = isBase
      ? [
          { id: 'description', title: 'Narrative description' },
          { id: 'characteristics', title: 'Characteristics' },
          { id: 'abilities', title: 'Abilities & equipment' },
          { id: 'costs', title: 'Construction & acquisition costs' },
          { id: 'other', title: 'Other model entries' },
        ]
      : isCharacter
        ? [
            { id: 'identity', title: 'Identity & character/campaign information' },
            { id: 'characteristics', title: 'Characteristics' },
            { id: 'combat', title: 'Combat information' },
            { id: 'skills', title: 'Skills, perks & talents' },
            { id: 'powers', title: 'Powers & equipment' },
            { id: 'disadvantages', title: 'Disadvantages' },
            { id: 'other', title: 'Other model entries' },
            { id: 'totals', title: 'Totals' },
          ]
        : [
            { id: 'characteristics', title: 'Characteristics' },
            { id: 'abilities', title: 'Advantages & abilities' },
            { id: 'disadvantages', title: 'Disadvantages' },
            { id: 'other', title: 'Other model entries' },
            { id: 'totals', title: 'Totals' },
          ];
    element('#heroes-model-entry-title').textContent = isBase
      ? 'Add or edit base model entries'
      : isCharacter
        ? 'Add or edit character model entries'
        : 'Add or edit model entries';
    const groupedElements = new Map(sections.map(({ id }) => [id, []]));
    typedElements.forEach((item, index) => {
      const section = typedElementSheetSection(item, objectType);
      if (!groupedElements.has(section)) groupedElements.set(section, []);
      groupedElements.get(section).push({ item, index });
    });

    for (const section of sections) {
      const panel = document.createElement('section');
      panel.className = 'heroes-sheet-section';
      const heading = document.createElement('h4');
      heading.textContent = section.title;
      panel.append(heading);

      if (section.id === 'identity') {
        const identity = document.createElement('p');
        const worldName = worldSelect.selectedOptions[0]?.textContent;
        identity.className = 'heroes-sheet-summary';
        identity.textContent = [
          element('#heroes-object-name').value.trim() || 'Unnamed object',
          worldName && worldName !== 'Choose a world' ? worldName : '',
          element('#heroes-edition').selectedOptions[0]?.textContent,
        ]
          .filter(Boolean)
          .join(' · ');
        panel.append(identity);
      } else if (section.id === 'description') {
        const description = element('#heroes-object-description').value.trim();
        if (description) {
          const summary = document.createElement('p');
          summary.className = 'heroes-sheet-summary';
          summary.textContent = description;
          panel.append(summary);
        }
      } else if (section.id === 'costs' || section.id === 'totals') {
        const summary = document.createElement('p');
        summary.className = 'heroes-sheet-summary';
        summary.textContent = equationReadout.textContent;
        panel.append(summary);
        if (section.id === 'costs') {
          const amount = element('#heroes-acquisition-amount').value.trim();
          const notes = element('#heroes-acquisition-notes').value.trim();
          if (amount || notes) {
            const acquisition = document.createElement('p');
            acquisition.className = 'heroes-sheet-summary';
            acquisition.textContent = `Acquisition: ${[amount, notes].filter(Boolean).join(' · ')}`;
            panel.append(acquisition);
          }
        }
      }

      const list = document.createElement('ul');
      list.className = 'heroes-sheet-element-list';
      for (const { item, index } of groupedElements.get(section.id) || []) {
        const row = document.createElement('li');
        const label = document.createElement('span');
        const shortName = item.shortName ? `${item.shortName} · ` : '';
        const price = item.value == null ? '' : ` · ${item.value} points`;
        const detail = item.detail ? ` · ${item.detail}` : '';
        const nested = item.children?.length ? ` · ${item.children.length} nested` : '';
        const labelText = characterElementTypeById.get(item.type)?.label ?? item.type;
        label.textContent = `${shortName}${item.name} · ${labelText}${price}${detail}${nested}${item.isBase ? ' · base' : ' · extra'}`;
        const edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'btn';
        edit.textContent = 'Edit';
        edit.setAttribute('aria-label', `Edit ${item.shortName || item.name}`);
        edit.addEventListener('click', () => beginTypedEdit(index));
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'btn';
        remove.textContent = 'Remove';
        remove.setAttribute('aria-label', `Remove ${item.shortName || item.name}`);
        remove.addEventListener('click', () => {
          if (editingTypedIndex === index) resetTypedForm();
          else if (editingTypedIndex > index) editingTypedIndex -= 1;
          typedElements.splice(index, 1);
          renderTypedElements();
          updateEquationReadout();
        });
        row.append(label, edit, remove);
        list.append(row);
      }
      if (!list.childElementCount) {
        const empty = document.createElement('li');
        empty.className = 'heroes-empty-list';
        empty.textContent = 'No model entries in this section yet.';
        list.append(empty);
      }
      panel.append(list);
      typedElementList.append(panel);
    }
  }

  function renderNestedElements() {
    const list = element('#heroes-nested-elements');
    list.replaceChildren();
    nestedElements.forEach((item, index) => {
      const row = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = `${item.type} · ${item.name}: ${item.value}`;
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'btn';
      edit.textContent = 'Edit';
      edit.addEventListener('click', () => {
        editingNestedIndex = index;
        element('#heroes-nested-kind').value = item.type;
        element('#heroes-nested-name').value = item.name;
        element('#heroes-nested-value').value = item.value;
        element('#heroes-add-nested').textContent = 'Update child';
        element('#heroes-cancel-nested-edit').hidden = false;
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        if (editingNestedIndex === index) resetNestedForm();
        else if (editingNestedIndex > index) editingNestedIndex -= 1;
        nestedElements.splice(index, 1);
        renderNestedElements();
        updateEquationReadout();
      });
      row.append(label, edit, remove);
      list.append(row);
    });
    if (!list.childElementCount) {
      const empty = document.createElement('li');
      empty.className = 'heroes-empty-list';
      empty.textContent = 'No nested elements added.';
      list.append(empty);
    }
  }

  function resetNestedForm() {
    editingNestedIndex = null;
    element('#heroes-nested-name').value = '';
    element('#heroes-nested-value').value = '';
    element('#heroes-add-nested').textContent = 'Add child';
    element('#heroes-cancel-nested-edit').hidden = true;
  }

  function resetEditor() {
    editingObjectId = null;
    objectForm.reset();
    objectKindSelect.value = 'character';
    pointLevelSelect.value = '';
    pointLevelCustomInput.value = '';
    updatePointLevelFields();
    equationElements.advantages.length = 0;
    equationElements.disadvantages.length = 0;
    typedElements.length = 0;
    resetEquationForm();
    pointValueInput.value = '0';
    element('#heroes-editor-title').textContent = 'Create object';
    element('.heroes-save-object').textContent = 'Save object';
    element('#heroes-cancel-edit').hidden = true;
    element('#heroes-object-kind').dispatchEvent(new Event('change'));
    resetTypedForm();
    renderEquationElements();
    renderTypedElements();
    updateEquationReadout();
  }

  function beginEditing(object) {
    const definition = object.definition || {};
    resetEquationForm();
    editingObjectId = object.id;
    objectForm.reset();
    element('#heroes-object-name').value = object.name;
    element('#heroes-object-kind').value =
      definition.objectType ?? definition.kind ?? object.kind ?? 'object';
    element('#heroes-object-shape').value = (definition.bodyShapes || []).join(', ');
    const pointLevel = definition.pointLevelClassifications?.[0];
    const pointLevelPreset = HerosPointLevelClassification.Presets.find(
      (preset) =>
        preset.name === pointLevel?.name &&
        pointLevel.points != null &&
        MixedNumber.from(pointLevel.points).equals(preset.points)
    );
    pointLevelSelect.value = pointLevelPreset?.id ?? (pointLevel?.name ? 'custom' : '');
    pointLevelCustomInput.value = pointLevelPreset ? '' : (pointLevel?.name ?? '');
    pointLevelValueInput.value = pointLevel?.points ?? '';
    updatePointLevelFields();
    element('#heroes-edition').value = '5e';
    element('#heroes-object-description').value = definition.description || '';
    element('#heroes-acquisition-amount').value = definition.acquisition?.amount ?? '';
    element('#heroes-acquisition-notes').value = definition.acquisition?.notes ?? '';
    equationElements.advantages.splice(
      0,
      equationElements.advantages.length,
      ...(definition.equation?.advantages || [])
    );
    equationElements.disadvantages.splice(
      0,
      equationElements.disadvantages.length,
      ...(definition.equation?.disadvantages || [])
    );
    const equation = new HerosEquation({ points: definition.equation?.points || [] });
    pointValueInput.value = equation.pointsValue.toString();
    typedElements.splice(0, typedElements.length, ...(definition.typedElements || []));
    objectKindSelect.dispatchEvent(new Event('change'));
    resetTypedForm();
    renderTypedTraitOptions();
    element('#heroes-editor-title').textContent = `Edit ${object.name}`;
    element('.heroes-save-object').textContent = 'Update object';
    element('#heroes-cancel-edit').hidden = false;
    renderEquationElements();
    renderTypedElements();
    updateEquationReadout();
    element('#heroes-object-name').focus();
  }

  async function loadObjects(worldId) {
    objectList.replaceChildren();
    if (!worldId) {
      objectCount.value = '0';
      return;
    }
    const { objects } = await request(`/heroes/worlds/${encodeURIComponent(worldId)}/objects`);
    objectCount.value = String(objects.length);
    if (!objects.length) {
      const empty = document.createElement('li');
      empty.className = 'heroes-empty-list';
      empty.textContent = 'No objects in this world yet.';
      objectList.append(empty);
      return;
    }
    for (const object of objects) {
      const row = document.createElement('li');
      const content = document.createElement('div');
      const name = document.createElement('strong');
      const detail = document.createElement('small');
      const definition = object.definition;
      const typedElements = definition.typedElements || [];
      const objectType = definition.objectType ?? definition.kind ?? object.kind ?? 'object';
      const generatedObject = generateHerosObject({
        ...definition,
        name: object.name,
        objectType,
      });
      const equation = generatedObject.equation;
      name.textContent = object.name;
      const typedCount = typedElements.length;
      const typeLabel = objectTypeById.get(objectType)?.label ?? objectType;
      detail.textContent = `${typeLabel} · ${equation.leftSideValue} = ${equation.rightSideValue}${equation.isBalanced ? '' : ` · difference ${equation.difference}`}${typedCount ? ` · ${typedCount} typed element(s)` : ''}`;
      content.append(name, detail);
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'btn';
      edit.textContent = 'Edit';
      edit.setAttribute('aria-label', `Edit ${object.name}`);
      edit.addEventListener('click', () => beginEditing(object));
      const exportButton = document.createElement('button');
      exportButton.type = 'button';
      exportButton.className = 'btn';
      exportButton.textContent = 'Export';
      exportButton.setAttribute('aria-label', `Export ${object.name}`);
      exportButton.addEventListener('click', async () => {
        try {
          const backup = await request(`/heroes/objects/${encodeURIComponent(object.id)}/export`);
          downloadJson(backup, `${safeFileName(object.name)}.heroes-object.json`);
          setState(`Exported ${object.name}.`);
        } catch (error) {
          setState(error.message, true);
        }
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn';
      remove.textContent = 'Delete';
      remove.setAttribute('aria-label', `Delete ${object.name}`);
      remove.addEventListener('click', async () => {
        try {
          await request(`/heroes/objects/${encodeURIComponent(object.id)}`, { method: 'DELETE' });
          if (editingObjectId === object.id) resetEditor();
          await loadObjects(activeWorldId);
          setState(`Deleted ${object.name}.`);
        } catch (error) {
          setState(error.message, true);
        }
      });
      row.append(content, edit, exportButton, remove);
      objectList.append(row);
    }
  }

  async function loadWorlds(selectedId) {
    const { worlds } = await request('/heroes/worlds');
    worldSelect.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = worlds.length ? 'Choose a world' : 'Create a world to begin';
    worldSelect.append(placeholder);
    for (const world of worlds) {
      const option = document.createElement('option');
      option.value = world.id;
      option.textContent = world.name;
      worldSelect.append(option);
    }
    const selected = worlds.find((world) => world.id === selectedId) || worlds[0];
    worldSelect.value = selected?.id || '';
    activeWorldId = selected?.id || null;
    setEditorEnabled(true);
    await loadObjects(activeWorldId);
    setState(
      selected
        ? `Connected. ${worlds.length} world(s) stored locally.`
        : 'Connected. Create a world to begin.'
    );
  }

  function safeFileName(value) {
    return (
      String(value)
        .trim()
        .replace(/[^a-z0-9._-]+/gi, '-')
        .replace(/^-+|-+$/g, '') || 'heroes'
    );
  }

  function downloadJson(value, fileName) {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  pairingForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const code = new FormData(pairingForm).get('code').trim();
    try {
      const { token } = await request('/pair', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      localStorage.setItem(HELPER_TOKEN_KEY, token);
      pairingPanel.hidden = true;
      setEditorEnabled(true);
      await loadWorlds();
      pairingForm.reset();
    } catch (error) {
      setState(error.message, true);
    }
  });

  worldForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = new FormData(worldForm).get('name').trim();
    try {
      const { world } = await request('/heroes/worlds', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      worldForm.reset();
      await loadWorlds(world.id);
      setState(`Created world ${world.name}.`);
    } catch (error) {
      setState(error.message, true);
    }
  });

  worldSelect.addEventListener('change', async () => {
    resetEditor();
    activeWorldId = worldSelect.value || null;
    setEditorEnabled(true);
    await loadObjects(activeWorldId);
  });

  worldExportButton.addEventListener('click', async () => {
    if (!activeWorldId) return;
    try {
      const backup = await request(`/heroes/worlds/${encodeURIComponent(activeWorldId)}/export`);
      downloadJson(backup, `${safeFileName(backup.world.name)}.heroes-world.json`);
      setState(`Exported world ${backup.world.name}.`);
    } catch (error) {
      setState(error.message, true);
    }
  });

  worldDeleteButton.addEventListener('click', async () => {
    const worldName = worldSelect.selectedOptions[0]?.textContent;
    if (!activeWorldId || !window.confirm(`Delete ${worldName} and all of its objects?`)) return;
    try {
      const result = await request(`/heroes/worlds/${encodeURIComponent(activeWorldId)}`, {
        method: 'DELETE',
      });
      resetEditor();
      await loadWorlds();
      setState(`Deleted world ${worldName} and ${result.objectsDeleted} object(s).`);
    } catch (error) {
      setState(error.message, true);
    }
  });

  worldImportInput.addEventListener('change', async () => {
    const [file] = worldImportInput.files || [];
    worldImportInput.value = '';
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      const result = await request('/heroes/worlds/import', {
        method: 'POST',
        body: JSON.stringify(backup),
      });
      await loadWorlds(result.world.id);
      setState(`Imported world ${result.world.name} with ${result.objectCount} object(s).`);
    } catch (error) {
      setState(
        error instanceof SyntaxError ? 'World file is not valid JSON.' : error.message,
        true
      );
    }
  });

  objectImportInput.addEventListener('change', async () => {
    const [file] = objectImportInput.files || [];
    objectImportInput.value = '';
    if (!file || !activeWorldId) return;
    try {
      const backup = JSON.parse(await file.text());
      const { object } = await request(
        `/heroes/worlds/${encodeURIComponent(activeWorldId)}/objects/import`,
        { method: 'POST', body: JSON.stringify(backup) }
      );
      await loadObjects(activeWorldId);
      setState(`Imported ${object.name} into ${worldSelect.selectedOptions[0].textContent}.`);
    } catch (error) {
      setState(
        error instanceof SyntaxError ? 'Object file is not valid JSON.' : error.message,
        true
      );
    }
  });

  element('#heroes-object-kind').addEventListener('change', () => {
    const available = new Set(currentModelTraits());
    for (const item of typedElements) {
      item.modelTypes = (item.modelTypes || []).filter((modelType) => available.has(modelType));
    }
    renderObjectModelTraits();
    renderTypedTraitOptions();
    renderTypedElements();
    updateEquationReadout();
  });
  element('#heroes-object-kind').dispatchEvent(new Event('change'));

  function currentModelTraits() {
    return objectTypeById.get(objectKindSelect.value)?.modelTypes ?? [];
  }

  function renderObjectModelTraits() {
    const available = new Set(currentModelTraits());
    for (const checkbox of element('#heroes-model-traits').querySelectorAll(
      'input[type="checkbox"]'
    )) {
      checkbox.checked = available.has(checkbox.value);
    }
  }

  function renderTypedTraitOptions(selected = []) {
    const container = element('#heroes-typed-trait-options');
    container.replaceChildren();
    const available = currentModelTraits();
    if (!available.length) {
      const empty = document.createElement('span');
      empty.className = 'heroes-empty-list';
      empty.textContent = 'Select an object model trait to associate elements.';
      container.append(empty);
      return;
    }
    for (const modelType of available) {
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'typed-model-type';
      checkbox.value = modelType;
      checkbox.checked = selected.includes(modelType);
      label.append(checkbox, document.createTextNode(modelType));
      container.append(label);
    }
  }

  function resetTypedForm() {
    editingTypedIndex = null;
    element('#heroes-typed-kind').value = 'characteristic';
    updateTypedFields();
    element('#heroes-typed-name').value = '';
    element('#heroes-typed-short-name').value = '';
    element('#heroes-typed-value').value = '';
    element('#heroes-typed-detail').value = '';
    element('#heroes-typed-target').value = '';
    element('#heroes-typed-base').checked = false;
    nestedElements.length = 0;
    resetNestedForm();
    renderNestedElements();
    element('#heroes-add-typed').textContent = 'Add typed element';
    element('#heroes-cancel-typed-edit').hidden = true;
    renderTypedTraitOptions();
  }

  function beginTypedEdit(index) {
    const item = typedElements[index];
    if (!item) return;
    editingTypedIndex = index;
    element('#heroes-typed-kind').value = item.type;
    updateTypedFields();
    element('#heroes-typed-name').value = item.name;
    element('#heroes-typed-short-name').value = item.shortName ?? '';
    element('#heroes-typed-value').value = item.value ?? '';
    element('#heroes-typed-detail').value = item.detail ?? '';
    element('#heroes-typed-target').value = item.target ?? '';
    element('#heroes-typed-base').checked = Boolean(item.isBase);
    nestedElements.splice(
      0,
      nestedElements.length,
      ...(item.children || []).map((child) => ({ ...child }))
    );
    renderNestedElements();
    renderTypedTraitOptions(item.modelTypes || []);
    element('#heroes-add-typed').textContent = 'Update typed element';
    element('#heroes-cancel-typed-edit').hidden = false;
    element('#heroes-typed-name').focus();
  }

  function updateTypedFields() {
    const type = element('#heroes-typed-kind').value;
    const definition = characterElementTypeById.get(type);
    const detailInput = element('#heroes-typed-detail');
    const detailLabel = element('#heroes-typed-detail-label');
    const targetInput = element('#heroes-typed-target');
    const valueInput = element('#heroes-typed-value');
    element('#heroes-typed-value-label').textContent = definition?.valueLabel || 'Point value';
    detailLabel.textContent = definition?.detailLabel || 'Description or detail';
    detailInput.placeholder = definition?.isModifier ? '-1/4 or 1/2' : '';
    detailInput.required = false;
    targetInput.disabled = !definition?.isModifier;
    targetInput.required = false;
    valueInput.disabled = definition ? !definition.priced : NON_PRICED_TYPES.has(type);
    valueInput.required = false;
    updateNestedEditor();
  }

  function updateNestedEditor() {
    const parentType = element('#heroes-typed-kind').value;
    const parentDefinition = characterElementTypeById.get(parentType);
    const isFramework =
      parentDefinition?.field === 'powerFrameworks' ||
      parentDefinition?.field === 'variablePowerPools';
    const isPackage = parentDefinition?.field === 'packageDeals';
    const editor = element('#heroes-nested-editor');
    const select = element('#heroes-nested-kind');
    editor.hidden = !isFramework && !isPackage;
    const context = isFramework ? 'framework' : 'package';
    const allowed = new Set(
      characterElementTypes
        .filter((definition) => definition.nestedIn.includes(context))
        .map((definition) => definition.type)
    );
    for (const option of select.options) option.hidden = !allowed.has(option.value);
    if (!allowed.has(select.value)) {
      select.value = isFramework
        ? (characterElementTypes.find((definition) => definition.nestedIn.includes('framework'))
            ?.type ?? '')
        : (characterElementTypes.find((definition) => definition.nestedIn.includes('package'))
            ?.type ?? '');
    }
    element('#heroes-nested-title').textContent = isFramework
      ? 'Framework powers'
      : 'Package elements';
  }

  element('#heroes-typed-kind').addEventListener('change', updateTypedFields);
  updateTypedFields();

  element('#heroes-add-nested').addEventListener('click', () => {
    const name = element('#heroes-nested-name').value.trim();
    try {
      if (!name) throw new Error('Enter a nested element name.');
      const type = element('#heroes-nested-kind').value;
      const item = {
        type,
        name,
        value: MixedNumber.from(element('#heroes-nested-value').value).toString(),
      };
      if (editingNestedIndex === null) nestedElements.push(item);
      else nestedElements[editingNestedIndex] = item;
      resetNestedForm();
      renderNestedElements();
      updateEquationReadout();
    } catch (error) {
      setState(error.message, true);
    }
  });

  element('#heroes-cancel-nested-edit').addEventListener('click', resetNestedForm);

  element('#heroes-add-typed').addEventListener('click', () => {
    const type = element('#heroes-typed-kind').value;
    const nameInput = element('#heroes-typed-name');
    const valueInput = element('#heroes-typed-value');
    const detailInput = element('#heroes-typed-detail');
    const targetInput = element('#heroes-typed-target');
    const name = nameInput.value.trim();
    try {
      if (!name) throw new Error('Enter a typed element name.');
      const parentType = element('#heroes-typed-kind').value;
      const frameworkType = [
        'powerFramework',
        'multipower',
        'elementalControl',
        'variablePowerPool',
      ].includes(parentType);
      const nestedContext = frameworkType
        ? 'framework'
        : parentType === 'packageDeal'
          ? 'package'
          : null;
      const allowedNestedTypes = new Set(
        nestedContext
          ? characterElementTypes
              .filter((definition) => definition.nestedIn.includes(nestedContext))
              .map((definition) => definition.type)
          : []
      );
      if (
        nestedElements.some((child) => !allowedNestedTypes.has(child.type)) &&
        (parentType === 'packageDeal' || frameworkType)
      ) {
        throw new Error('Remove or change nested entries that are not valid for this category.');
      }
      const item = { type, name };
      const shortName = element('#heroes-typed-short-name').value.trim();
      if (shortName) item.shortName = shortName;
      const definition = characterElementTypeById.get(type);
      if (!valueInput.disabled) {
        if (!valueInput.value.trim()) throw new Error('Enter a point value.');
        item.value = MixedNumber.from(valueInput.value).toString();
      }
      if (definition?.detailRequired && !detailInput.value.trim()) {
        throw new Error(`Enter ${definition.detailLabel.toLowerCase()}.`);
      }
      if (detailInput.value.trim()) item.detail = detailInput.value.trim();
      if (type === 'figuredCharacteristic') {
        item.formulaId = detailInput.value.trim();
        item.edition = element('#heroes-edition').value;
      }
      if (!targetInput.disabled) {
        item.target = targetInput.value.trim();
        if (!item.target) throw new Error('Enter the equation element this modifier affects.');
        MixedNumber.from(item.detail);
      }
      if (element('#heroes-nested-editor').hidden && nestedElements.length) {
        throw new Error('Nested elements can only be saved inside a package or power framework.');
      }
      if (nestedElements.length) item.children = nestedElements.map((child) => ({ ...child }));
      item.isBase = element('#heroes-typed-base').checked;
      item.modelTypes = Array.from(
        element('#heroes-typed-trait-options').querySelectorAll('input:checked'),
        (input) => input.value
      );
      if (editingTypedIndex === null) typedElements.push(item);
      else {
        typedElements[editingTypedIndex] = item;
      }
      resetTypedForm();
      renderTypedElements();
      updateEquationReadout();
      element('#heroes-typed-name').focus();
    } catch (error) {
      setState(error.message, true);
    }
  });

  element('#heroes-cancel-typed-edit').addEventListener('click', resetTypedForm);

  element('#heroes-remove-extras').addEventListener('click', () => {
    const extras = typedElements.filter((item) => !item.isBase);
    if (!extras.length) {
      setState('No non-base elements to remove.');
      return;
    }
    if (
      !window.confirm(`Remove ${extras.length} element(s) not in the base trait specification?`)
    ) {
      return;
    }
    resetTypedForm();
    typedElements.splice(0, typedElements.length, ...typedElements.filter((item) => item.isBase));
    renderTypedElements();
    updateEquationReadout();
    setState(`Removed ${extras.length} non-base element(s).`);
  });

  element('#heroes-cancel-edit').addEventListener('click', resetEditor);

  element('#heroes-add-element').addEventListener('click', () => {
    const nameInput = element('#heroes-element-name');
    const valueInput = element('#heroes-element-value');
    const name = nameInput.value.trim();
    try {
      if (!name) throw new Error('Enter an equation element name.');
      const value = MixedNumber.from(valueInput.value).toString();
      const side = element('#heroes-element-side').value;
      const item = { name, value };
      if (editingEquationElement) {
        const { side: previousSide, index } = editingEquationElement;
        equationElements[previousSide].splice(index, 1);
        equationElements[side].splice(Math.min(index, equationElements[side].length), 0, item);
      } else {
        equationElements[side].push(item);
      }
      resetEquationForm();
      renderEquationElements();
      updateEquationReadout();
      nameInput.focus();
    } catch (error) {
      setState(error.message, true);
    }
  });

  element('#heroes-cancel-equation-edit').addEventListener('click', resetEquationForm);

  pointValueInput.addEventListener('input', updateEquationReadout);
  pointLevelSelect.addEventListener('change', updatePointLevelFields);
  element('#heroes-edition').value = '5e';
  for (const selector of [
    '#heroes-object-name',
    '#heroes-object-description',
    '#heroes-acquisition-amount',
    '#heroes-acquisition-notes',
  ]) {
    element(selector).addEventListener('input', renderTypedElements);
  }
  objectForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!activeWorldId) return;
    const values = new FormData(objectForm);
    try {
      const wasEditing = Boolean(editingObjectId);
      const equation = readEquation();
      const bodyShape = values.get('bodyShape').trim();
      const pointLevelId = values.get('pointLevel');
      const pointLevelPreset = HerosPointLevelClassification.Presets.find(
        (preset) => preset.id === pointLevelId
      );
      const isCustomPointLevel = pointLevelId === 'custom';
      const pointLevel = isCustomPointLevel ? values.get('customPointLevel').trim() : '';
      const pointLevelValue = pointLevelValueInput.value.trim();
      let pointLevels = [];
      if (pointLevelPreset) {
        const classification = HerosPointLevelClassification.fromPreset(pointLevelPreset.id);
        pointLevels = [
          {
            name: String(classification),
            points: classification.points.toString(),
            edition: '5e',
          },
        ];
      } else if (isCustomPointLevel) {
        if (!pointLevel) throw new Error('Enter a custom point-level classification name.');
        if (!pointLevelValue) throw new Error('Enter the custom point-level value.');
        pointLevels = [
          {
            name: pointLevel,
            ...(pointLevelValue ? { points: MixedNumber.from(pointLevelValue).toString() } : {}),
            edition: '5e',
          },
        ];
      }
      const definition = {
        name: values.get('name').trim(),
        kind: values.get('kind'),
        objectType: values.get('kind'),
        characterType: currentCharacterType(),
        bodyShapes: bodyShape
          ? bodyShape
              .split(',')
              .map((shape) => shape.trim())
              .filter(Boolean)
          : [],
        pointLevelClassifications: pointLevels,
        objectModelTypes: currentModelTraits(),
        description: values.get('description').trim(),
        acquisition:
          values.get('acquisitionAmount').trim() || values.get('acquisitionNotes').trim()
            ? {
                amount: values.get('acquisitionAmount').trim(),
                notes: values.get('acquisitionNotes').trim(),
              }
            : null,
        edition: '5e',
        equation: {
          advantages: equationElements.advantages.map(({ name, value }) => ({
            name: String(name),
            value: MixedNumber.from(value).toString(),
          })),
          points: [equation.pointsValue.toString()],
          disadvantages: equationElements.disadvantages.map(({ name, value }) => ({
            name: String(name),
            value: MixedNumber.from(value).toString(),
          })),
        },
        typedElements: typedElements.map((item) => ({ ...item })),
      };
      const generatedObject = generateHerosObject(definition);
      definition.objectModelTypes = generatedObject.objectModelTypes.map(String);
      const route = editingObjectId
        ? `/heroes/objects/${encodeURIComponent(editingObjectId)}`
        : `/heroes/worlds/${encodeURIComponent(activeWorldId)}/objects`;
      const { object } = await request(route, {
        method: editingObjectId ? 'PUT' : 'POST',
        body: JSON.stringify(definition),
      });
      resetEditor();
      await loadObjects(activeWorldId);
      setState(`${wasEditing ? 'Updated' : 'Saved'} ${object.name} in this local database.`);
    } catch (error) {
      setState(error.message, true);
    }
  });

  renderEquationElements();
  updateEquationReadout();
  const hasToken = Boolean(localStorage.getItem(HELPER_TOKEN_KEY));
  pairingPanel.hidden = hasToken;
  setEditorEnabled(hasToken);
  if (hasToken) {
    loadWorlds().catch((error) => setState(error.message, true));
  } else {
    setState('Pair this browser with the local helper to use Heroes SQLite storage.');
  }
}
