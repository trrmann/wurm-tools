import template from '../../../../site/partials/tools/heroes.html?raw';
import { fill, getShell } from '../../modules/template.js';
import {
  generateHerosObject,
  generateHerosCharacter,
  getHerosObjectTypes,
  getHerosCharacterElementTypes,
  HerosEquation,
  replaceHerosObjectBodyShape,
  HerosPointLevelClassification,
} from '../../modules/objects/heroes.mjs';
import { MixedNumber } from '../../modules/objects/mixed-numbers.mjs';
import { mountDefinitionLibrary } from './library.js';
import { createHeroesClient, downloadHeroesJson, HELPER_TOKEN_KEY } from './helper-client.js';
import {
  getHeroesObjectPage,
  heroesPageHref,
  isObjectForHeroesPage,
  updateHeroesContext,
} from '../../modules/pages/heroes-navigation.js';
import {
  copyLibraryDefinition,
  detachLibraryReference,
} from '../../modules/objects/heroes/definition-library.mjs';
import {
  getHerosSheetEntries,
  getHerosSheetLayout,
  getHerosSheetSection,
} from '../../modules/objects/heroes/sheet-layout.mjs';

const CHARACTERISTIC_SHORT_NAMES = new Map([
  ['strength', 'STR'],
  ['dexterity', 'DEX'],
  ['constitution', 'CON'],
  ['body', 'BODY'],
  ['intelligence', 'INT'],
  ['ego', 'EGO'],
  ['presence', 'PRE'],
  ['comeliness', 'COM'],
]);
let controller;

export function unmount() {
  controller?.abort();
  controller = null;
}

export function mount(container, { page = null } = {}) {
  unmount();
  controller = new AbortController();
  const { signal } = controller;
  container.innerHTML = fill(getShell(template), {});
  if (page) {
    container.querySelector('#heroes-page-title').textContent = page.title;
    const libraryOnly = page.editor === 'library';
    const worldsOnly = page.editor === 'worlds';
    container.querySelector('.heroes-workspace').classList.toggle('heroes-worlds-page', worldsOnly);
    container.querySelector('#heroes-page-title + p').textContent = libraryOnly
      ? 'Author and reuse shared anatomy and object templates across worlds.'
      : worldsOnly
        ? 'Create, import, and manage worlds; open objects on their dedicated pages.'
        : 'Build and edit this category in the selected world. Other categories have separate pages.';
    container.querySelector('#heroes-library').hidden = !libraryOnly;
    container.querySelector('.heroes-workspace-grid').hidden = libraryOnly;
    container.querySelector('.heroes-editor-panel').hidden = worldsOnly;
    container.querySelector('#heroes-world-form').hidden = !worldsOnly;
    container.querySelector('.heroes-world-actions').hidden = !worldsOnly;
  }

  const characterElementTypes = getHerosCharacterElementTypes();
  const objectTypes = getHerosObjectTypes();
  const availableObjectTypes =
    page && !['worlds', 'library'].includes(page.editor)
      ? objectTypes.filter((type) => isObjectForHeroesPage({ kind: type.type }, page))
      : objectTypes;
  const objectTypeById = new Map(objectTypes.map((type) => [type.type, type]));
  const objectKindSelect = container.querySelector('#heroes-object-kind');
  const pointLevelSelect = container.querySelector('#heroes-point-level');
  objectKindSelect.replaceChildren();
  for (const type of availableObjectTypes) {
    const option = document.createElement('option');
    option.value = type.type;
    option.textContent = type.label;
    objectKindSelect.append(option);
  }
  const defaultObjectType = availableObjectTypes.some((type) => type.type === 'character')
    ? 'character'
    : availableObjectTypes[0].type;
  objectKindSelect.value = defaultObjectType;
  for (const preset of HerosPointLevelClassification.Presets) {
    const option = document.createElement('option');
    option.value = preset.id;
    option.textContent = `${preset.name} (${preset.points} points)`;
    pointLevelSelect.append(option);
  }
  const characterElementTypeById = new Map(
    characterElementTypes.map((definition) => [definition.type, definition])
  );
  const objectBodyShapeSelect = container.querySelector('#heroes-object-body-shape');
  for (const definition of characterElementTypes.filter((entry) => entry.group === 'body-shapes')) {
    if (definition.elementClass?.requiresLibrary) continue;
    objectBodyShapeSelect.add(new Option(definition.label, definition.type));
  }
  const NON_PRICED_TYPES = new Set(
    characterElementTypes
      .filter((definition) => !definition.priced)
      .map((definition) => definition.type)
  );
  const typedKindSelect = container.querySelector('#heroes-typed-kind');
  const nestedKindSelect = container.querySelector('#heroes-nested-kind');
  for (const definition of characterElementTypes) {
    if (definition.group === 'body-shapes') continue;
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
  let libraryEntries = [];
  const containedObjects = [];
  const observedElementNameLabels = new Set();
  const nestedElements = [];
  let generatedCharacter = null;
  let activeWorldId = null;
  let editingObjectId = null;
  let editingNestedIndex = null;
  let editingEquationElement = null;
  const sendRequest = createHeroesClient({
    signal,
    onUnauthorized: () => {
      pairingPanel.hidden = false;
    },
  });
  const library = mountDefinitionLibrary(element('#heroes-library'), {
    request,
    downloadJson,
    signal,
    onChange: async (entries) => {
      const removed = libraryEntries.filter(
        (previous) => !entries.some((entry) => entry.id === previous.id)
      );
      for (const entry of removed) {
        const detached = detachLibraryReference(
          { typedElements, containedObjects },
          entry.id,
          libraryEntries
        );
        typedElements.splice(0, typedElements.length, ...detached.typedElements);
        containedObjects.splice(0, containedObjects.length, ...detached.containedObjects);
      }
      libraryEntries = entries;
      const select = element('#heroes-saved-definition');
      select.replaceChildren();
      for (const entry of entries.filter((entry) => entry.kind !== 'part')) {
        select.add(new Option(`${entry.name} (${entry.kind})`, entry.id));
      }
      updateEquationReadout();
      if (activeWorldId) await loadObjects(activeWorldId);
    },
  });

  element('#heroes-use-saved').addEventListener('click', () => {
    try {
      const entry = libraryEntries.find(
        (entry) => entry.id === element('#heroes-saved-definition').value
      );
      if (!entry) throw new Error('Select a saved shape or object.');
      const live = element('#heroes-saved-mode').value === 'reference';
      const definition = live
        ? { ...entry.definition, libraryRef: entry.id }
        : copyLibraryDefinition(entry.definition, libraryEntries);
      if (entry.kind === 'shape') {
        const object = replaceHerosObjectBodyShape(
          { objectType: objectKindSelect.value, typedElements, libraryEntries },
          { ...definition, type: definition.anatomyType, isBase: true }
        );
        typedElements.splice(0, typedElements.length, ...object.typedElements);
      } else containedObjects.push(definition);
      updateEquationReadout();
      setState(`Added ${entry.name} as ${live ? 'a live reference' : 'an independent copy'}.`);
    } catch (error) {
      setState(error.message, true);
    }
  });
  element('#heroes-detach-shape').addEventListener('click', () => {
    const index = typedElements.findIndex(
      (item) => characterElementTypeById.get(item.type)?.group === 'body-shapes'
    );
    try {
      typedElements[index] = copyLibraryDefinition(typedElements[index], libraryEntries);
      updateEquationReadout();
      setState('The shape is now an independent copy.');
    } catch (error) {
      setState(error.message, true);
    }
  });

  function newBodyComponentId() {
    return `body-change-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  }

  function setState(message, isError = false) {
    state.textContent = message;
    state.classList.toggle('is-error', isError);
  }

  function request(route, options) {
    return sendRequest(route, options);
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
      libraryEntries,
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
      generatedCharacter = generateHerosObject({
        objectType: objectKindSelect.value,
        name: element('#heroes-object-name').value,
        edition: '5e',
        characterType: currentCharacterType(),
        equation: {
          advantages: equationElements.advantages,
          points: [MixedNumber.from(pointValueInput.value)],
          disadvantages: equationElements.disadvantages,
        },
        typedElements,
        containedObjects,
        libraryEntries,
      });
      typedElements.splice(
        0,
        typedElements.length,
        ...generatedCharacter.typedElements.map((item) => ({
          ...item,
          modelTypes: [...item.modelTypes].map(String),
        }))
      );
      const shapeDefinition = bodyShapeDefinitions()[0];
      for (const option of [...objectBodyShapeSelect.options].filter(
        (option) => option.dataset.saved
      ))
        option.remove();
      if (
        shapeDefinition &&
        ![...objectBodyShapeSelect.options].some((option) => option.value === shapeDefinition.type)
      ) {
        const option = new Option(`${shapeDefinition.name} (saved anatomy)`, shapeDefinition.type);
        option.dataset.saved = 'true';
        objectBodyShapeSelect.add(option);
      }
      objectBodyShapeSelect.value = shapeDefinition?.type ?? '';
      const equation = generatedCharacter.equation;
      equationReadout.textContent = `Advantages ${equation.advantagesValue} + points ${equation.pointsValue} = disadvantages ${equation.disadvantagesValue}${equation.isBalanced ? ' (balanced)' : ` (difference ${equation.difference})`}`;
      element('#heroes-object-form button[type="submit"]').disabled = !activeWorldId;
    } catch (error) {
      generatedCharacter = null;
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

  function typedElementSheetSection(item, objectType, generatedElement) {
    const definition = characterElementTypeById.get(item.type);
    return getHerosSheetSection(item, objectType, definition, generatedElement);
  }

  function characteristicShortName(item, generatedElement) {
    if (characterElementTypeById.get(item.type)?.group !== 'characteristics') {
      const shortName = generatedElement?.shortName;
      return String(item.shortName ?? (shortName && shortName !== 'CELE' ? shortName : item.name));
    }
    const provided = item.shortName ?? generatedElement?.shortName ?? generatedElement?.ShortName;
    if (provided) return String(provided).toUpperCase();
    const className = item.type.split('#').at(-1);
    const canonicalName = CHARACTERISTIC_SHORT_NAMES.get(
      String(className ?? item.name).toLowerCase()
    );
    return canonicalName ?? String(item.name);
  }

  function bodyShapeDefinitions() {
    return typedElements.filter(
      (item) => characterElementTypeById.get(item.type)?.group === 'body-shapes'
    );
  }

  function bodyShapeComponentOptions(shape) {
    const options = [];
    const seen = new Set();
    const visit = (component, componentType, depth = 0) => {
      if (!seen.has(component.id)) {
        seen.add(component.id);
        options.push({
          id: component.id,
          name: component.name,
          componentType,
          isPresent: component.isPresent,
          depth,
        });
      }
      (component.components ?? []).forEach((child) => visit(child, componentType, depth + 1));
      (component.parts ?? []).forEach((child) => visit(child, 'body-part', depth + 1));
      (component.shapes ?? []).forEach((child) => visit(child, 'body-shape', depth + 1));
      (component.hitLocations ?? []).forEach((child) => visit(child, 'hit-location', depth + 1));
      (component.extraLimbs ?? []).forEach((child) => visit(child, 'extra-limb', depth + 1));
    };
    for (const source of [shape.baseBodyShape, shape].filter(Boolean)) {
      for (const [componentType, components] of [
        ['component', source.components ?? []],
        ['body-part', source.parts ?? []],
        ['hit-location', source.hitLocations ?? []],
        ['extra-limb', source.extraLimbs ?? []],
        ['body-shape', source.shapes ?? []],
      ]) {
        components.forEach((component) => visit(component, componentType));
      }
    }
    return options;
  }

  function supportsBodyShapeChanges(item) {
    const definition = characterElementTypeById.get(item.type);
    return definition?.group === 'disadvantages' || definition?.nestedIn.includes('framework');
  }

  function buildBodyShapeChangeEditor(item, onChange) {
    const change = item.bodyShapeChange ?? {};
    const shapeDefinitions = bodyShapeDefinitions();
    const shapeSelect = document.createElement('select');
    shapeSelect.className = 'custom-select';
    shapeSelect.setAttribute('aria-label', `Body shape for ${item.name}`);
    shapeSelect.add(new Option('Select body shape', ''));
    for (const shape of shapeDefinitions) {
      shapeSelect.add(
        new Option(`${shape.name} · ${shape.generalShape ?? 'unspecified'}`, shape.name)
      );
    }
    shapeSelect.value = change.shapeName ?? '';

    const actionSelect = document.createElement('select');
    actionSelect.className = 'custom-select';
    actionSelect.setAttribute('aria-label', `Body-shape operation for ${item.name}`);
    for (const [value, label] of [
      ['', 'Select change'],
      ['add', 'Add component'],
      ['remove', 'Remove component'],
      ['set-present', 'Set component presence'],
    ]) {
      actionSelect.add(new Option(label, value));
    }
    actionSelect.value = change.action ?? '';

    const componentTypeSelect = document.createElement('select');
    componentTypeSelect.className = 'custom-select';
    componentTypeSelect.setAttribute('aria-label', `Body component type for ${item.name}`);
    for (const [value, label] of [
      ['component', 'Component'],
      ['hit-location', 'Hit location'],
      ['extra-limb', 'Extra limb'],
    ]) {
      componentTypeSelect.add(new Option(label, value));
    }
    componentTypeSelect.value = change.componentType ?? 'component';

    const targetSelect = document.createElement('select');
    targetSelect.className = 'custom-select';
    targetSelect.setAttribute('aria-label', `Target body component for ${item.name}`);
    const parentSelect = document.createElement('select');
    parentSelect.className = 'custom-select';
    parentSelect.setAttribute('aria-label', `Parent body component for ${item.name}`);
    const populateComponents = (select, emptyLabel) => {
      select.replaceChildren(new Option(emptyLabel, ''));
      const shape = shapeDefinitions.find((candidate) => candidate.name === shapeSelect.value);
      for (const component of shape ? bodyShapeComponentOptions(shape) : []) {
        select.add(
          new Option(
            `${'  '.repeat(component.depth)}${component.name} (${component.componentType})`,
            component.id
          )
        );
      }
      select.disabled = !shape;
    };
    populateComponents(targetSelect, 'Select target component');
    populateComponents(parentSelect, 'Add at body-shape root');
    targetSelect.value = change.componentId ?? '';
    parentSelect.value = change.parentComponentId ?? '';

    const componentNameInput = document.createElement('input');
    componentNameInput.type = 'text';
    componentNameInput.maxLength = 120;
    componentNameInput.placeholder = 'Name for added component';
    componentNameInput.setAttribute('aria-label', `Body component name for ${item.name}`);
    componentNameInput.value = change.componentName ?? '';

    const presenceSelect = document.createElement('select');
    presenceSelect.className = 'custom-select';
    presenceSelect.setAttribute('aria-label', `Component presence for ${item.name}`);
    presenceSelect.add(new Option('Present', 'true'));
    presenceSelect.add(new Option('Absent', 'false'));
    presenceSelect.value = String(change.isPresent ?? true);

    const descriptionInput = document.createElement('input');
    descriptionInput.type = 'text';
    descriptionInput.maxLength = 240;
    descriptionInput.placeholder = 'Change notes (optional)';
    descriptionInput.setAttribute('aria-label', `Body-shape change notes for ${item.name}`);
    descriptionInput.value = change.description ?? '';

    const update = () => {
      const next = {
        ...change,
        shapeName: shapeSelect.value,
        action: actionSelect.value,
        componentType: componentTypeSelect.value,
        componentId: targetSelect.value || null,
        parentComponentId: parentSelect.value || null,
        componentName: componentNameInput.value.trim(),
        isPresent: presenceSelect.value === 'true',
        description: descriptionInput.value.trim(),
      };
      if (next.action === 'add' && next.componentName && !next.componentId) {
        next.componentId = newBodyComponentId();
      }
      if (next.shapeName || next.action || next.componentId || next.componentName) {
        item.bodyShapeChange = next;
      } else {
        delete item.bodyShapeChange;
      }
      onChange();
    };
    shapeSelect.addEventListener('change', () => {
      populateComponents(targetSelect, 'Select target component');
      populateComponents(parentSelect, 'Add at body-shape root');
      update();
    });
    for (const control of [
      actionSelect,
      componentTypeSelect,
      targetSelect,
      parentSelect,
      componentNameInput,
      presenceSelect,
      descriptionInput,
    ]) {
      control.addEventListener('change', update);
    }

    const editor = document.createElement('div');
    editor.className = 'heroes-sheet-body-change';
    editor.append(
      shapeSelect,
      actionSelect,
      componentTypeSelect,
      targetSelect,
      parentSelect,
      componentNameInput,
      presenceSelect,
      descriptionInput
    );
    return editor;
  }

  function populateBodyChangeSelects() {
    const shapeSelect = element('#heroes-body-change-shape');
    const targetSelect = element('#heroes-body-change-target');
    const parentSelect = element('#heroes-body-change-parent');
    const previousShape = shapeSelect.value;
    const previousTarget = targetSelect.value;
    const previousParent = parentSelect.value;
    shapeSelect.replaceChildren(new Option('Select body shape', ''));
    for (const shape of bodyShapeDefinitions()) {
      shapeSelect.add(
        new Option(`${shape.name} · ${shape.generalShape ?? 'unspecified'}`, shape.name)
      );
    }
    if (bodyShapeDefinitions().some((shape) => shape.name === previousShape)) {
      shapeSelect.value = previousShape;
    }
    const shape = bodyShapeDefinitions().find((candidate) => candidate.name === shapeSelect.value);
    for (const [select, emptyLabel] of [
      [targetSelect, 'Select target component'],
      [parentSelect, 'Add at body-shape root'],
    ]) {
      select.replaceChildren(new Option(emptyLabel, ''));
      for (const component of shape ? bodyShapeComponentOptions(shape) : []) {
        select.add(
          new Option(
            `${'  '.repeat(component.depth)}${component.name} (${component.componentType})`,
            component.id
          )
        );
      }
      select.disabled = !shape;
    }
    targetSelect.value = previousTarget;
    parentSelect.value = previousParent;
  }

  function updateBodyChangeFields() {
    const type = typedKindSelect.value;
    const editor = element('#heroes-body-change-editor');
    editor.hidden = !supportsBodyShapeChanges({ type });
    populateBodyChangeSelects();
  }

  function validateBodyShapeChanges() {
    for (const item of typedElements) {
      const change = item.bodyShapeChange;
      if (!change) continue;
      const shape = bodyShapeDefinitions().find((candidate) => candidate.name === change.shapeName);
      if (!shape || !change.action) {
        throw new Error(`Complete the linked body-shape change for ${item.name}.`);
      }
      if (change.action === 'add') {
        if (!change.componentName || !change.componentId) {
          throw new Error(`Enter the component name for the body-shape change on ${item.name}.`);
        }
        if (
          change.parentComponentId &&
          !bodyShapeComponentOptions(shape).some(
            (component) => component.id === change.parentComponentId
          )
        ) {
          throw new Error(`The parent component for ${item.name} no longer exists.`);
        }
      } else if (
        !change.componentId ||
        !bodyShapeComponentOptions(shape).some((component) => component.id === change.componentId)
      ) {
        throw new Error(`Select an existing body-shape component for ${item.name}.`);
      }
    }
  }

  function renderBodyShapeSummary() {
    const summary = document.createElement('section');
    summary.className = 'heroes-sheet-section heroes-sheet-body-summary';
    const heading = document.createElement('h4');
    heading.textContent = 'Body shape';
    summary.append(heading);
    const shapes = bodyShapeDefinitions();
    if (!shapes.length) {
      const empty = document.createElement('p');
      empty.className = 'heroes-sheet-summary';
      empty.textContent = 'No physical body shape applies to this object.';
      summary.append(empty);
      return summary;
    }
    for (const shape of shapes) {
      const overview = document.createElement('p');
      overview.className = 'heroes-sheet-summary';
      overview.textContent = `${shape.name}: ${shape.generalShape} · ${(shape.shapeTypes ?? []).join(', ') || 'type unspecified'}`;
      summary.append(overview);
      const components = bodyShapeComponentOptions(shape);
      const parts = document.createElement('p');
      parts.className = 'heroes-sheet-summary';
      const modelParts = generatedCharacter?.bodyShape?.parts ?? shape.parts ?? [];
      parts.textContent = `Parts: ${modelParts.map((part) => part.name).join(', ') || 'None defined'}`;
      summary.append(parts);
      if (components.length) {
        const list = document.createElement('ul');
        list.className = 'heroes-sheet-body-parts';
        for (const component of components) {
          const row = document.createElement('li');
          row.textContent = `${'  '.repeat(component.depth)}${component.name} (${component.componentType})${component.isPresent === false ? ' · absent' : ''}`;
          list.append(row);
        }
        summary.append(list);
      }
    }
    return summary;
  }

  function renderTypedElements() {
    const rootShape = bodyShapeDefinitions()[0];
    element('#heroes-shape-reference').textContent = rootShape?.libraryRef
      ? `Shape uses live library definition: ${libraryEntries.find((entry) => entry.id === rootShape.libraryRef)?.name ?? rootShape.libraryRef}`
      : 'Shape is an independent definition.';
    element('#heroes-detach-shape').hidden = !rootShape?.libraryRef;
    const containedList = element('#heroes-contained-objects');
    containedList.replaceChildren();
    containedObjects.forEach((item, index) => {
      const row = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = `${item.name ?? libraryEntries.find((entry) => entry.id === item.libraryRef)?.name} (${item.libraryRef ? 'live reference' : 'copy'})`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn';
      remove.textContent = 'Remove contained object';
      remove.addEventListener('click', () => {
        containedObjects.splice(index, 1);
        updateEquationReadout();
      });
      row.append(label, remove);
      if (item.libraryRef) {
        const detach = document.createElement('button');
        detach.type = 'button';
        detach.className = 'btn';
        detach.textContent = 'Make independent copy';
        detach.addEventListener('click', () => {
          try {
            containedObjects[index] = copyLibraryDefinition(item, libraryEntries);
            updateEquationReadout();
          } catch (error) {
            setState(error.message, true);
          }
        });
        row.append(detach);
      }
      containedList.append(row);
    });
    typedElementList.replaceChildren();
    typedElementList.append(renderBodyShapeSummary());
    const objectType = element('#heroes-object-kind').value;
    const isBase = objectType === 'base';
    const isCharacter = ['character', 'player-character', 'non-player-character'].includes(
      objectType
    );
    const layout = getHerosSheetLayout(objectType);
    const sections = layout.sections.map(([id, title]) => ({ id, title }));
    const reference = document.createElement('p');
    reference.className = 'heroes-sheet-summary';
    reference.textContent = layout.reference;
    typedElementList.append(reference);
    element('#heroes-model-entry-title').textContent = isBase
      ? 'Add base model entries'
      : isCharacter
        ? 'Add character model entries'
        : 'Add model entries';
    const groupedElements = new Map(sections.map(({ id }) => [id, []]));
    const entries = getHerosSheetEntries(
      generatedCharacter ?? {
        objectType,
        typedElements,
        generatedElements: new Map(),
      },
      characterElementTypes
    );
    entries.forEach(({ item, index, generatedIndex, generatedElement }) => {
      const section = typedElementSheetSection(item, objectType, generatedElement);
      if (!groupedElements.has(section)) groupedElements.set(section, []);
      groupedElements.get(section).push({ item, index, generatedIndex, generatedElement });
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

      const entries = groupedElements.get(section.id) || [];
      const hasBodyShapeChanges = entries.some(({ item }) => supportsBodyShapeChanges(item));
      const table = document.createElement('table');
      table.className = 'heroes-sheet-table';
      const head = document.createElement('thead');
      const headerRow = document.createElement('tr');
      for (const column of [
        'Element',
        'Value',
        'Points / cost',
        'Notes',
        ...(hasBodyShapeChanges ? ['Linked body-shape change'] : []),
        'Base entry',
        'Actions',
      ]) {
        const header = document.createElement('th');
        header.scope = 'col';
        header.textContent = column;
        headerRow.append(header);
      }
      head.append(headerRow);
      table.append(head);
      const body = document.createElement('tbody');
      for (const { item, index, generatedIndex } of entries) {
        const generatedElement = generatedCharacter?.generatedElements.get(item.type)?.[
          generatedIndex
        ];
        const shortNameValue = characteristicShortName(item, generatedElement);
        const row = document.createElement('tr');
        const elementCell = document.createElement('td');
        elementCell.dataset.label = 'Element';
        const nameLabel = document.createElement('span');
        nameLabel.className = 'heroes-sheet-element-label';
        nameLabel.textContent = shortNameValue;
        nameLabel.title = String(item.name);
        nameLabel.setAttribute('aria-label', `${shortNameValue}: ${item.name}`);
        nameLabel.tabIndex = 0;
        const nameLabelKey = `${item.type}\u0000${item.name}`;
        const stopNameLabelHint = () => {
          observedElementNameLabels.add(nameLabelKey);
          nameLabel.classList.add('heroes-sheet-element-label--seen');
        };
        if (observedElementNameLabels.has(nameLabelKey)) {
          nameLabel.classList.add('heroes-sheet-element-label--seen');
        } else {
          nameLabel.addEventListener('mouseenter', stopNameLabelHint, { once: true });
          nameLabel.addEventListener('focus', stopNameLabelHint, { once: true });
        }
        elementCell.append(nameLabel);

        const valueCell = document.createElement('td');
        valueCell.dataset.label = 'Value';
        const elementDefinition = characterElementTypeById.get(item.type);
        const supportsDesiredValue =
          elementDefinition?.isPrimaryCharacteristic &&
          generatedElement?.ValueRate != null &&
          !MixedNumber.from(generatedElement.ValueRate).equals(0);
        if (supportsDesiredValue) {
          const desiredValueInput = document.createElement('input');
          desiredValueInput.type = 'text';
          desiredValueInput.inputMode = 'decimal';
          desiredValueInput.value =
            generatedElement.UnroundedValue?.toString?.() ??
            generatedElement.Value?.() ??
            generatedElement.toString();
          desiredValueInput.setAttribute('aria-label', `Desired value for ${item.name}`);
          desiredValueInput.title = `Set the desired ${item.name} value; points are derived from its base value and cost rate.`;
          desiredValueInput.addEventListener('change', () => {
            try {
              const desiredValue = MixedNumber.from(desiredValueInput.value);
              const baseValue = MixedNumber.from(generatedElement.BaseValue ?? 0);
              const valueRate = MixedNumber.from(generatedElement.ValueRate);
              typedElements[index].value = desiredValue
                .subtract(baseValue)
                .multiply(valueRate)
                .toString();
              updateEquationReadout();
            } catch (error) {
              setState(error.message, true);
              desiredValueInput.value = generatedElement.UnroundedValue?.toString?.() ?? '0';
            }
          });
          valueCell.append(desiredValueInput);
        } else {
          const value =
            generatedElement == null
              ? '—'
              : (generatedElement.UnroundedValue?.toString?.() ??
                generatedElement.Value?.() ??
                generatedElement.toString());
          valueCell.textContent = `${value}${generatedElement?.valueUnit ?? ''}`;
        }

        const pointsCell = document.createElement('td');
        pointsCell.dataset.label = 'Points / cost';
        if (elementDefinition?.priced) {
          const pointsInput = document.createElement('input');
          pointsInput.type = 'text';
          pointsInput.inputMode = 'decimal';
          pointsInput.value = item.value ?? '0';
          pointsInput.setAttribute(
            'aria-label',
            `${elementDefinition.isPrimaryCharacteristic ? 'Points to spend on' : 'Points or cost for'} ${item.name}`
          );
          pointsInput.addEventListener('change', () => {
            try {
              typedElements[index].value = MixedNumber.from(pointsInput.value).toString();
              updateEquationReadout();
            } catch (error) {
              setState(error.message, true);
              pointsInput.value = item.value ?? '0';
            }
          });
          pointsCell.append(pointsInput);
        } else {
          pointsCell.textContent = '—';
        }

        const detailCell = document.createElement('td');
        detailCell.dataset.label = 'Notes';
        const detailInput = document.createElement('input');
        detailInput.type = 'text';
        detailInput.maxLength = 500;
        detailInput.value = item.detail ?? '';
        detailInput.setAttribute('aria-label', `Notes for ${item.name}`);
        detailInput.addEventListener('change', () => {
          const updated = typedElements[index];
          updated.detail = detailInput.value.trim();
          if (updated.type === 'figuredCharacteristic') {
            updated.formulaId = updated.detail;
          }
          if (elementDefinition?.isModifier) {
            try {
              MixedNumber.from(updated.detail);
            } catch (error) {
              setState(error.message, true);
              detailInput.value = item.detail ?? '';
              return;
            }
          }
          updateEquationReadout();
        });
        detailCell.append(detailInput);
        if (elementDefinition?.isModifier) {
          const targetInput = document.createElement('input');
          targetInput.type = 'text';
          targetInput.maxLength = 120;
          targetInput.value = item.target ?? '';
          targetInput.placeholder = 'Target element';
          targetInput.setAttribute('aria-label', `Modifier target for ${item.name}`);
          targetInput.addEventListener('change', () => {
            typedElements[index].target = targetInput.value.trim();
            updateEquationReadout();
          });
          detailCell.append(targetInput);
        }

        const bodyChangeCell = document.createElement('td');
        bodyChangeCell.dataset.label = 'Linked body-shape change';
        if (hasBodyShapeChanges) {
          if (supportsBodyShapeChanges(item)) {
            bodyChangeCell.append(buildBodyShapeChangeEditor(item, () => updateEquationReadout()));
          } else {
            bodyChangeCell.textContent = '—';
          }
        }

        const baseCell = document.createElement('td');
        baseCell.dataset.label = 'Base entry';
        const baseLabel = document.createElement('label');
        baseLabel.className = 'heroes-sheet-base-entry';
        const baseInput = document.createElement('input');
        baseInput.type = 'checkbox';
        baseInput.checked = Boolean(item.isBase);
        baseInput.disabled = Boolean(item.isHierarchyDefault);
        baseInput.setAttribute('aria-label', `Include ${item.name} in base trait specification`);
        baseInput.addEventListener('change', () => {
          typedElements[index].isBase = baseInput.checked;
          updateEquationReadout();
        });
        baseLabel.append(baseInput, document.createTextNode(item.isBase ? 'Base' : 'Extra'));
        baseCell.append(baseLabel);

        const actionsCell = document.createElement('td');
        actionsCell.dataset.label = 'Actions';
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'btn';
        remove.textContent = 'Remove';
        remove.setAttribute('aria-label', `Remove ${shortNameValue || item.name}`);
        remove.hidden = Boolean(item.isHierarchyDefault);
        remove.addEventListener('click', () => {
          typedElements.splice(index, 1);
          renderTypedElements();
          updateEquationReadout();
        });
        remove.hidden = Boolean(item.isHierarchyDefault);
        actionsCell.append(remove);
        row.append(elementCell, valueCell, pointsCell, detailCell);
        if (hasBodyShapeChanges) row.append(bodyChangeCell);
        row.append(baseCell, actionsCell);
        body.append(row);
      }
      if (!entries.length) {
        const row = document.createElement('tr');
        const empty = document.createElement('td');
        empty.colSpan = hasBodyShapeChanges ? 7 : 6;
        empty.className = 'heroes-empty-list';
        empty.textContent = 'No model entries in this section yet.';
        row.append(empty);
        body.append(row);
      }
      table.append(body);
      panel.append(table);
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
    objectKindSelect.value = defaultObjectType;
    pointLevelSelect.value = '';
    pointLevelCustomInput.value = '';
    updatePointLevelFields();
    equationElements.advantages.length = 0;
    equationElements.disadvantages.length = 0;
    typedElements.length = 0;
    containedObjects.length = 0;
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

  objectBodyShapeSelect.addEventListener('change', () => {
    try {
      const selected = characterElementTypeById.get(objectBodyShapeSelect.value);
      if (selected.elementClass?.requiresLibrary) {
        throw new Error('Use saved anatomy through the shared library selector.');
      }
      const object = replaceHerosObjectBodyShape(
        { objectType: objectKindSelect.value, typedElements, libraryEntries },
        { type: selected.type, name: selected.defaultName ?? selected.label }
      );
      typedElements.splice(
        0,
        typedElements.length,
        ...object.typedElements.map((item) => ({
          ...item,
          modelTypes: [...item.modelTypes].map(String),
        }))
      );
      updateEquationReadout();
      populateBodyChangeSelects();
      setState(`Body shape replaced with ${object.bodyShape.name}.`);
    } catch (error) {
      objectBodyShapeSelect.value = bodyShapeDefinitions()[0].type;
      setState(error.message, true);
    }
  });

  function beginEditing(object) {
    const definition = object.definition || {};
    resetEquationForm();
    editingObjectId = object.id;
    objectForm.reset();
    element('#heroes-object-name').value = object.name;
    element('#heroes-object-kind').value =
      definition.objectType ?? definition.kind ?? object.kind ?? 'object';
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
    containedObjects.splice(0, containedObjects.length, ...(definition.containedObjects ?? []));
    objectKindSelect.dispatchEvent(new Event('change'));
    resetTypedForm();
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
    const result = await request(`/heroes/worlds/${encodeURIComponent(worldId)}/objects`);
    const objects = result.objects.filter((object) => !page || isObjectForHeroesPage(object, page));
    objectCount.value = String(objects.length);
    if (!objects.length) {
      const empty = document.createElement('li');
      empty.className = 'heroes-empty-list';
      empty.textContent = 'No matching objects in this world yet.';
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
        libraryEntries,
      });
      const equation = generatedObject.equation;
      name.textContent = object.name;
      const typedCount = typedElements.length;
      const typeLabel = objectTypeById.get(objectType)?.label ?? objectType;
      detail.textContent = `${typeLabel} · ${equation.leftSideValue} = ${equation.rightSideValue}${equation.isBalanced ? '' : ` · difference ${equation.difference}`}${typedCount ? ` · ${typedCount} typed element(s)` : ''}`;
      content.append(name, detail);
      const edit = document.createElement(page?.editor === 'worlds' ? 'a' : 'button');
      if (edit.tagName === 'BUTTON') edit.type = 'button';
      edit.className = 'btn';
      edit.textContent = 'Edit';
      edit.setAttribute('aria-label', `Edit ${object.name}`);
      if (page?.editor === 'worlds') {
        const query = new URLSearchParams(window.location.search);
        query.set('world', worldId);
        const url = new URL(
          heroesPageHref(getHeroesObjectPage(object), query),
          window.location.origin
        );
        url.searchParams.set('object', object.id);
        edit.href = url.href;
      } else {
        edit.addEventListener('click', () => beginEditing(object));
      }
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
      const saveToLibrary = document.createElement('button');
      saveToLibrary.type = 'button';
      saveToLibrary.className = 'btn';
      saveToLibrary.textContent = 'Save to shared library';
      saveToLibrary.setAttribute('aria-label', `Save ${object.name} to library`);
      saveToLibrary.addEventListener('click', async () => {
        try {
          await request('/heroes/library', {
            method: 'POST',
            body: JSON.stringify({
              name: object.name,
              kind: 'object',
              definition: object.definition,
            }),
          });
          await library.refresh();
          setState(`Saved ${object.name} to the shared library.`);
        } catch (error) {
          setState(error.message, true);
        }
      });
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
      row.append(content, edit, exportButton, saveToLibrary, remove);
      objectList.append(row);
    }
    const requestedObjectId = new URLSearchParams(window.location.search).get('object');
    if (requestedObjectId && !editingObjectId && page?.editor !== 'worlds') {
      const object = objects.find((object) => object.id === requestedObjectId);
      if (object) beginEditing(object);
      else setState('The requested object is not in this world or page category.', true);
      const url = new URL(window.location.href);
      url.searchParams.delete('object');
      window.history.replaceState(null, '', url);
    }
  }

  async function loadWorlds(selectedId) {
    await library.refresh();
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
    const requestedId =
      selectedId || activeWorldId || new URLSearchParams(window.location.search).get('world');
    const selected = worlds.find((world) => world.id === requestedId) || worlds[0];
    worldSelect.value = selected?.id || '';
    activeWorldId = selected?.id || null;
    updateHeroesContext({ world: activeWorldId });
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
    downloadHeroesJson(value, fileName);
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
    updateHeroesContext({ world: activeWorldId, object: null });
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
      const destination = getHeroesObjectPage(object);
      setState(
        `Imported ${object.name} into ${worldSelect.selectedOptions[0].textContent}.${page && !isObjectForHeroesPage(object, page) ? ` Open ${destination.title} in the sidebar to edit it.` : ''}`
      );
    } catch (error) {
      setState(
        error instanceof SyntaxError ? 'Object file is not valid JSON.' : error.message,
        true
      );
    }
  });

  element('#heroes-object-kind').addEventListener('change', () => {
    const objectType = objectKindSelect.value;
    const availableDefaults = generateHerosObject({ objectType, edition: '5e' }).typedElements;
    const availableDefaultKeys = new Set(
      availableDefaults.map((item) => `${item.type}\u0000${item.name}`)
    );
    const retainedElements = typedElements.filter(
      (item) =>
        !item.isHierarchyDefault || availableDefaultKeys.has(`${item.type}\u0000${item.name}`)
    );
    const object = generateHerosObject({
      objectType,
      edition: '5e',
      typedElements: retainedElements,
      libraryEntries,
    });
    typedElements.splice(
      0,
      typedElements.length,
      ...object.typedElements.map((item) => ({
        ...item,
        modelTypes: [...item.modelTypes].map(String),
      }))
    );
    renderObjectModelTraits();
    renderTypedElements();
    updateEquationReadout();
  });
  element('#heroes-object-kind').dispatchEvent(new Event('change'));

  function currentModelTraits() {
    return objectTypeById.get(objectKindSelect.value)?.modelTypes ?? [];
  }

  function renderObjectModelTraits() {
    const available = new Set(currentModelTraits());
    const labels = new Map([
      ['physical', 'Physical'],
      ['non-physical', 'Non-physical'],
      ['sentient', 'Sentient'],
      ['non-sentient', 'Non-sentient'],
      ['mobile', 'Mobile'],
      ['non-mobile', 'Non-mobile'],
      ['player-character', 'Player character'],
      ['non-player-character', 'Non-player character'],
    ]);
    const list = element('#heroes-model-trait-list');
    list.replaceChildren();
    for (const [trait, label] of labels) {
      const item = document.createElement('li');
      item.className = available.has(trait) ? 'is-active' : 'is-inactive';
      item.textContent = label;
      list.append(item);
    }
  }

  function resetTypedForm() {
    element('#heroes-typed-kind').value = 'characteristic';
    updateTypedFields();
    element('#heroes-typed-name').value = '';
    element('#heroes-typed-name').readOnly = false;
    element('#heroes-typed-base').disabled = false;
    element('#heroes-typed-short-name').value = '';
    element('#heroes-typed-value').value = '';
    element('#heroes-typed-detail').value = '';
    element('#heroes-typed-target').value = '';
    element('#heroes-typed-base').checked = false;
    element('#heroes-body-change-shape').value = '';
    element('#heroes-body-change-action').value = '';
    element('#heroes-body-change-type').value = 'component';
    element('#heroes-body-change-target').value = '';
    element('#heroes-body-change-parent').value = '';
    element('#heroes-body-change-name').value = '';
    element('#heroes-body-change-presence').value = 'true';
    element('#heroes-body-change-description').value = '';
    populateBodyChangeSelects();
    nestedElements.length = 0;
    resetNestedForm();
    renderNestedElements();
    element('#heroes-add-typed').textContent = 'Add typed element';
  }

  function updateTypedFields() {
    const type = element('#heroes-typed-kind').value;
    const definition = characterElementTypeById.get(type);
    const detailInput = element('#heroes-typed-detail');
    const detailLabel = element('#heroes-typed-detail-label');
    const targetInput = element('#heroes-typed-target');
    const valueInput = element('#heroes-typed-value');
    element('#heroes-typed-value-label').textContent =
      definition?.group === 'characteristics'
        ? 'Points invested'
        : definition?.group
          ? 'Point cost'
          : (definition?.valueLabel ?? 'Point value');
    detailLabel.textContent = definition?.detailLabel || 'Description or detail';
    detailInput.placeholder = definition?.isModifier ? '-1/4 or 1/2' : '';
    detailInput.required = false;
    targetInput.disabled = !definition?.isModifier;
    targetInput.required = false;
    valueInput.disabled = definition ? !definition.priced : NON_PRICED_TYPES.has(type);
    valueInput.required = false;
    updateNestedEditor();
    updateBodyChangeFields();
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
  element('#heroes-body-change-shape').addEventListener('change', populateBodyChangeSelects);
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
      if (!element('#heroes-body-change-editor').hidden) {
        const bodyShapeChange = {
          shapeName: element('#heroes-body-change-shape').value,
          action: element('#heroes-body-change-action').value,
          componentType: element('#heroes-body-change-type').value,
          componentId: element('#heroes-body-change-target').value || null,
          parentComponentId: element('#heroes-body-change-parent').value || null,
          componentName: element('#heroes-body-change-name').value.trim(),
          isPresent: element('#heroes-body-change-presence').value === 'true',
          description: element('#heroes-body-change-description').value.trim(),
        };
        const hasBodyChange = Boolean(
          bodyShapeChange.shapeName ||
          bodyShapeChange.action ||
          bodyShapeChange.componentId ||
          bodyShapeChange.componentName ||
          bodyShapeChange.description
        );
        if (hasBodyChange) {
          if (!bodyShapeChange.shapeName || !bodyShapeChange.action) {
            throw new Error('Select a body shape and a body-shape change operation.');
          }
          if (bodyShapeChange.action === 'add') {
            if (!bodyShapeChange.componentName) {
              throw new Error('Enter the name of the component to add.');
            }
            bodyShapeChange.componentId = newBodyComponentId();
          } else if (!bodyShapeChange.componentId) {
            throw new Error('Select the body-shape component to change.');
          }
          item.bodyShapeChange = bodyShapeChange;
        }
      }
      item.isBase = element('#heroes-typed-base').checked;
      typedElements.push(item);
      resetTypedForm();
      renderTypedElements();
      updateEquationReadout();
      element('#heroes-typed-name').focus();
    } catch (error) {
      setState(error.message, true);
    }
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
      validateBodyShapeChanges();
      const wasEditing = Boolean(editingObjectId);
      const equation = readEquation();
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
        containedObjects: structuredClone(containedObjects),
      };
      const generatedObject = generateHerosObject({ ...definition, libraryEntries });
      definition.objectModelTypes = generatedObject.objectModelTypes.map(String);
      definition.typedElements = generatedObject.typedElements.map((item) => ({
        ...item,
        modelTypes: [...item.modelTypes].map(String),
      }));
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
