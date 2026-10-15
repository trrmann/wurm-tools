import template from '../../../../site/partials/tools/heroes.html?raw';
import { fill, getShell } from '../../modules/template.js';
import { HerosEquation } from '../../modules/objects/heroes.mjs';
import { MixedNumber } from '../../modules/objects/mixed-numbers.mjs';

const HELPER_URL = 'http://127.0.0.1:5180';
const HELPER_TOKEN_KEY = 'wurm-tools-helper-token-v1';
const ADVANTAGE_TYPES = new Set([
  'characteristic',
  'primaryCharacteristic',
  'figuredCharacteristic',
  'skill',
  'everymanSkill',
  'talent',
  'perk',
  'power',
  'powerFramework',
  'multipower',
  'elementalControl',
  'variablePowerPool',
  'packageDeal',
]);
const DISADVANTAGE_TYPES = new Set([
  'physicalDisadvantage',
  'mentalDisadvantage',
  'socialDisadvantage',
]);
const NON_PRICED_TYPES = new Set(['specialEffect', 'event', 'action', 'description']);
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
  const typedElementList = element('#heroes-typed-elements');
  const equationReadout = element('#heroes-equation-readout');
  const pointValueInput = element('#heroes-points-value');
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

  function readEquation() {
    const applyModifiers = (item) => {
      let value = MixedNumber.from(item.value);
      for (const modifier of typedElements) {
        if (!['modifier', 'limitation'].includes(modifier.type) || modifier.target !== item.name) {
          continue;
        }
        value = value.multiply(MixedNumber.from(1).add(MixedNumber.from(modifier.detail)));
      }
      return { name: item.name, value: value.toString() };
    };
    const packageChildren = typedElements
      .filter((item) => item.type === 'packageDeal')
      .flatMap((item) => item.children || []);
    const childAdvantages = packageChildren.filter(
      (item) => item.type === 'advantage' || ADVANTAGE_TYPES.has(item.type)
    );
    const childDisadvantages = packageChildren.filter(
      (item) => item.type === 'disadvantage' || DISADVANTAGE_TYPES.has(item.type)
    );
    const advantages = [
      ...equationElements.advantages,
      ...typedElements.filter((item) => ADVANTAGE_TYPES.has(item.type) && item.value),
      ...childAdvantages,
    ].map(applyModifiers);
    const disadvantages = [
      ...equationElements.disadvantages,
      ...typedElements.filter((item) => DISADVANTAGE_TYPES.has(item.type) && item.value),
      ...childDisadvantages,
    ].map(applyModifiers);
    return new HerosEquation({
      advantages,
      points: [MixedNumber.from(pointValueInput.value)],
      disadvantages,
    });
  }

  function updateEquationReadout() {
    try {
      const equation = readEquation();
      equationReadout.textContent = `Advantages ${equation.advantagesValue} + points ${equation.pointsValue} = disadvantages ${equation.disadvantagesValue}${equation.isBalanced ? ' (balanced)' : ` (difference ${equation.difference})`}`;
      element('#heroes-object-form button[type="submit"]').disabled = !activeWorldId;
    } catch {
      equationReadout.textContent = 'Enter valid point values to calculate the equation.';
      element('#heroes-object-form button[type="submit"]').disabled = true;
    }
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

  function renderTypedElements() {
    typedElementList.replaceChildren();
    typedElements.forEach((item, index) => {
      const row = document.createElement('li');
      const label = document.createElement('span');
      const price = item.value ? `: ${item.value} points` : '';
      const nested = item.children?.length ? ` · ${item.children.length} nested` : '';
      const detail = item.detail ? ` · ${item.detail}` : '';
      const target = item.target ? ` → ${item.target}` : '';
      const traits = item.modelTypes?.length ? ` · ${item.modelTypes.join(', ')}` : ' · unassigned';
      label.textContent = `${item.type} · ${item.name}${price}${detail}${target}${nested}${traits}${item.isBase ? ' · base' : ' · extra'}`;
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'btn';
      edit.textContent = 'Edit';
      edit.setAttribute('aria-label', `Edit ${item.name}`);
      edit.addEventListener('click', () => beginTypedEdit(index));
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn';
      remove.textContent = 'Remove';
      remove.setAttribute('aria-label', `Remove ${item.name}`);
      remove.addEventListener('click', () => {
        if (editingTypedIndex === index) resetTypedForm();
        else if (editingTypedIndex > index) editingTypedIndex -= 1;
        typedElements.splice(index, 1);
        renderTypedElements();
        updateEquationReadout();
      });
      row.append(label, edit, remove);
      typedElementList.append(row);
    });
    if (!typedElementList.childElementCount) {
      const empty = document.createElement('li');
      empty.className = 'heroes-empty-list';
      empty.textContent = 'No typed elements added.';
      typedElementList.append(empty);
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
    element('#heroes-object-kind').value = object.kind;
    element('#heroes-object-shape').value = (definition.bodyShapes || []).join(', ');
    const pointLevel = definition.pointLevelClassifications?.[0];
    element('#heroes-point-level').value = pointLevel?.name || '';
    element('#heroes-point-level-value').value = pointLevel?.points ?? '';
    element('#heroes-edition').value = definition.edition || pointLevel?.edition || '5e';
    element('#heroes-object-description').value = definition.description || '';
    const selectedTraits = new Set(definition.objectModelTypes || []);
    objectForm.querySelectorAll('input[name="trait"]').forEach((input) => {
      input.checked = selectedTraits.has(input.value);
    });
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
      const packageChildren = typedElements
        .filter((item) => item.type === 'packageDeal')
        .flatMap((item) => item.children || []);
      const adjusted = (item) => {
        let value = MixedNumber.from(item.value);
        for (const modifier of typedElements) {
          if (
            !['modifier', 'limitation'].includes(modifier.type) ||
            modifier.target !== item.name
          ) {
            continue;
          }
          value = value.multiply(MixedNumber.from(1).add(MixedNumber.from(modifier.detail)));
        }
        return { name: item.name, value: value.toString() };
      };
      const equation = new HerosEquation({
        advantages: [
          ...(definition.equation?.advantages ?? []),
          ...typedElements.filter((item) => ADVANTAGE_TYPES.has(item.type) && item.value),
          ...packageChildren.filter(
            (item) => item.type === 'advantage' || ADVANTAGE_TYPES.has(item.type)
          ),
        ].map(adjusted),
        points: definition.equation?.points ?? [],
        disadvantages: [
          ...(definition.equation?.disadvantages ?? []),
          ...typedElements.filter((item) => DISADVANTAGE_TYPES.has(item.type) && item.value),
          ...packageChildren.filter(
            (item) => item.type === 'disadvantage' || DISADVANTAGE_TYPES.has(item.type)
          ),
        ].map(adjusted),
      });
      name.textContent = object.name;
      const typedCount = typedElements.length;
      detail.textContent = `${object.kind} · ${equation.leftSideValue} = ${equation.rightSideValue}${equation.isBalanced ? '' : ` · difference ${equation.difference}`}${typedCount ? ` · ${typedCount} typed element(s)` : ''}`;
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

  element('#heroes-object-kind').addEventListener('change', (event) => {
    const kind = event.target.value;
    const defaults = {
      character: ['physical', 'sentient', 'mobile'],
      vehicle: ['physical', 'mobile'],
      equipment: ['physical', 'non-sentient', 'non-mobile'],
      base: ['physical', 'non-mobile'],
      object: ['physical', 'non-sentient', 'non-mobile'],
    };
    const traits = new Set(defaults[kind]);
    objectForm.querySelectorAll('input[name="trait"]').forEach((input) => {
      input.checked = traits.has(input.value);
    });
    const available = new Set(currentModelTraits());
    for (const item of typedElements) {
      item.modelTypes = (item.modelTypes || []).filter((modelType) => available.has(modelType));
    }
    renderTypedTraitOptions();
    renderTypedElements();
    updateEquationReadout();
  });
  element('#heroes-object-kind').dispatchEvent(new Event('change'));

  function currentModelTraits() {
    return Array.from(
      objectForm.querySelectorAll('input[name="trait"]:checked'),
      (input) => input.value
    );
  }

  function selectedTypedModelTypes() {
    return Array.from(
      element('#heroes-typed-trait-options').querySelectorAll('input:checked'),
      (input) => input.value
    );
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
    const detailInput = element('#heroes-typed-detail');
    const detailLabel = element('#heroes-typed-detail-label');
    const targetInput = element('#heroes-typed-target');
    const valueInput = element('#heroes-typed-value');
    const labels = {
      primaryCharacteristic: 'Base value',
      figuredCharacteristic: 'Edition formula ID',
      variablePowerPool: 'Pool points',
      packageDeal: 'Included elements',
      powerFramework: 'Included powers',
      multipower: 'Included slots',
      elementalControl: 'Included powers',
      modifier: 'Signed price rate',
      limitation: 'Signed price rate',
      specialEffect: 'Effect description',
      event: 'Event description',
      action: 'Action description',
      description: 'Description text',
    };
    const detailName = labels[type] || 'Description or detail';
    detailLabel.textContent = detailName;
    detailInput.placeholder = type === 'modifier' || type === 'limitation' ? '-1/4 or 1/2' : '';
    detailInput.required =
      type === 'modifier' || type === 'limitation' || type === 'figuredCharacteristic';
    targetInput.disabled = !['modifier', 'limitation'].includes(type);
    targetInput.required = !targetInput.disabled;
    valueInput.disabled =
      NON_PRICED_TYPES.has(type) ||
      type === 'modifier' ||
      type === 'limitation' ||
      type === 'packageDeal';
    valueInput.required =
      (ADVANTAGE_TYPES.has(type) && type !== 'packageDeal') || DISADVANTAGE_TYPES.has(type);
    updateNestedEditor();
  }

  function updateNestedEditor() {
    const parentType = element('#heroes-typed-kind').value;
    const isFramework = [
      'powerFramework',
      'multipower',
      'elementalControl',
      'variablePowerPool',
    ].includes(parentType);
    const isPackage = parentType === 'packageDeal';
    const editor = element('#heroes-nested-editor');
    const select = element('#heroes-nested-kind');
    editor.hidden = !isFramework && !isPackage;
    const allowed = isFramework
      ? new Set(['power'])
      : new Set([
          'advantage',
          'disadvantage',
          'physicalDisadvantage',
          'mentalDisadvantage',
          'socialDisadvantage',
          'skill',
          'talent',
          'perk',
          'power',
        ]);
    for (const option of select.options) option.hidden = !allowed.has(option.value);
    if (!allowed.has(select.value)) select.value = isFramework ? 'power' : 'advantage';
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
      const item = {
        type: element('#heroes-nested-kind').value,
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
      const allowedNestedTypes = frameworkType
        ? new Set(['power'])
        : new Set([
            'advantage',
            'disadvantage',
            'physicalDisadvantage',
            'mentalDisadvantage',
            'socialDisadvantage',
            'skill',
            'talent',
            'perk',
            'power',
          ]);
      if (
        nestedElements.some((child) => !allowedNestedTypes.has(child.type)) &&
        (parentType === 'packageDeal' || frameworkType)
      ) {
        throw new Error('Remove or change nested entries that are not valid for this category.');
      }
      const item = { type, name };
      if (valueInput.required) item.value = MixedNumber.from(valueInput.value).toString();
      if (detailInput.value.trim()) item.detail = detailInput.value.trim();
      if (type === 'figuredCharacteristic') {
        item.formulaId = detailInput.value.trim();
        item.edition = element('#heroes-edition').value;
      }
      if (targetInput.required) {
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
      else typedElements[editingTypedIndex] = item;
      resetTypedForm();
      renderTypedElements();
      updateEquationReadout();
      element('#heroes-typed-name').focus();
    } catch (error) {
      setState(error.message, true);
    }
  });

  element('#heroes-cancel-typed-edit').addEventListener('click', resetTypedForm);

  element('#heroes-model-traits').addEventListener('change', () => {
    const available = new Set(currentModelTraits());
    const selected = selectedTypedModelTypes().filter((modelType) => available.has(modelType));
    for (const item of typedElements) {
      item.modelTypes = (item.modelTypes || []).filter((modelType) => available.has(modelType));
    }
    renderTypedTraitOptions(selected);
    renderTypedElements();
    updateEquationReadout();
  });

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

  objectForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!activeWorldId) return;
    const values = new FormData(objectForm);
    try {
      const wasEditing = Boolean(editingObjectId);
      const equation = readEquation();
      const bodyShape = values.get('bodyShape').trim();
      const pointLevel = values.get('pointLevel').trim();
      const pointLevelValue = values.get('pointLevelValue').trim();
      const pointLevels = pointLevel
        ? [
            {
              name: pointLevel,
              ...(pointLevelValue ? { points: MixedNumber.from(pointLevelValue).toString() } : {}),
              edition: values.get('edition'),
            },
          ]
        : [];
      const definition = {
        name: values.get('name').trim(),
        kind: values.get('kind'),
        bodyShapes: bodyShape
          ? bodyShape
              .split(',')
              .map((shape) => shape.trim())
              .filter(Boolean)
          : [],
        pointLevelClassifications: pointLevels,
        objectModelTypes: Array.from(
          objectForm.querySelectorAll('input[name="trait"]:checked'),
          (input) => input.value
        ),
        description: values.get('description').trim(),
        edition: values.get('edition'),
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
