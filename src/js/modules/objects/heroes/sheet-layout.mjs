const characterTypes = new Set(['character', 'player-character', 'non-player-character']);
const characterOrder = [
  'STR',
  'DEX',
  'CON',
  'BODY',
  'INT',
  'EGO',
  'PRE',
  'COM',
  'PD',
  'ED',
  'SPD',
  'REC',
  'END',
  'STUN',
];
const characteristicOrders = {
  character: characterOrder,
  'player-character': characterOrder,
  'non-player-character': characterOrder,
  animal: characterOrder,
  base: ['BODY', 'DEF'],
  vehicle: ['STR', 'DEX', 'BODY', 'DEF', 'SPD'],
  computer: ['INT', 'DEX', 'SPD'],
};

export function getHerosSheetLayout(objectType) {
  if (characterTypes.has(objectType)) {
    return {
      reference: '5th Edition Revised, pp. 591-592',
      sections: [
        ['identity', 'Identity & character/campaign information'],
        ['primary-characteristics', 'Primary characteristics'],
        ['figured-characteristics', 'Figured characteristics'],
        ['combat', 'Combat information'],
        ['combat-maneuvers', 'Combat maneuvers'],
        ['skills', 'Skills, perks & talents'],
        ['powers', 'Powers & equipment'],
        ['disadvantages', 'Disadvantages'],
        ['other', 'Other model entries'],
        ['totals', 'Totals'],
      ],
    };
  }
  if (objectType === 'base') {
    return {
      reference:
        'User-provided Suburban Base sheet; characteristic order: 5th Edition Revised, p. 465',
      sections: [
        ['description', 'Narrative description'],
        ['characteristics', 'Characteristics'],
        ['abilities', 'Abilities & equipment'],
        ['costs', 'Construction & acquisition costs'],
        ['other', 'Other model entries'],
      ],
    };
  }
  const orderReferences = {
    animal: 'pp. 452-454',
    vehicle: 'p. 462',
    computer: 'p. 461',
  };
  return {
    reference: orderReferences[objectType]
      ? `Characteristic order: 5th Edition Revised, ${orderReferences[objectType]}. A complete type-specific sheet layout is not documented; remaining entries retain object order.`
      : 'No type-specific sheet reference is documented. This is a generic grouping; entries retain object order, not character-sheet order.',
    sections: [
      ['characteristics', 'Characteristics'],
      ['abilities', 'Advantages & abilities'],
      ['disadvantages', 'Disadvantages'],
      ['other', 'Other model entries'],
      ['totals', 'Totals'],
    ],
  };
}

export function getHerosSheetSection(item, objectType, definition, generatedElement) {
  const typeName = item.type.split('#').at(-1).toLowerCase();
  const shortName = String(
    item.shortName ?? generatedElement?.shortName ?? generatedElement?.ShortName ?? item.name ?? ''
  ).toUpperCase();
  if (objectType === 'base') {
    if (item.type === 'description') return 'description';
    if (definition?.group === 'characteristics') return 'characteristics';
    if (definition?.group === 'advantages') return 'abilities';
    return 'other';
  }
  if (!characterTypes.has(objectType)) {
    if (definition?.group === 'characteristics') return 'characteristics';
    if (definition?.group === 'disadvantages') return 'disadvantages';
    if (definition?.group === 'advantages') return 'abilities';
    return 'other';
  }
  if (['description', 'event', 'specialEffect'].includes(item.type)) return 'identity';
  if (item.type === 'action' || /maneuver/i.test(typeName)) return 'combat-maneuvers';
  if (definition?.group === 'characteristics') {
    if (['OCV', 'DCV', 'ECV', 'OECV', 'DECV'].includes(shortName) || /combatvalue/i.test(typeName))
      return 'combat';
    return definition.isPrimaryCharacteristic
      ? 'primary-characteristics'
      : 'figured-characteristics';
  }
  if (definition?.group === 'disadvantages') return 'disadvantages';
  if (/skill|talent|perk/i.test(typeName)) return 'skills';
  if (definition?.group === 'advantages') return 'powers';
  return 'other';
}

export function getHerosSheetEntries(object, catalog) {
  const definitions = new Map(catalog.map((entry) => [entry.type, entry]));
  const indexes = new Map();
  const entries = object.typedElements.map((item, index) => {
    const generatedIndex = indexes.get(item.type) ?? 0;
    indexes.set(item.type, generatedIndex + 1);
    return {
      item,
      index,
      generatedIndex,
      definition: definitions.get(item.type),
      generatedElement: object.generatedElements.get(item.type)?.[generatedIndex],
    };
  });
  const shortName = ({ item, generatedElement }) =>
    String(
      item.shortName ?? generatedElement?.shortName ?? generatedElement?.ShortName ?? ''
    ).toUpperCase();
  const hasCharacteristic = (name) =>
    entries.some(
      (entry) => entry.definition?.group === 'characteristics' && shortName(entry) === name
    );
  const hideDefense = hasCharacteristic('PD') && hasCharacteristic('ED');
  const order = characteristicOrders[object.objectType] ?? [];
  const rank = (entry) => {
    if (entry.definition?.group !== 'characteristics') return Number.MAX_SAFE_INTEGER;
    const index = order.indexOf(shortName(entry));
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };
  return entries
    .filter((entry) => entry.definition?.group !== 'body-shapes')
    .filter(
      (entry) =>
        !(
          hideDefense &&
          entry.definition?.group === 'characteristics' &&
          shortName(entry) === 'DEF'
        )
    )
    .sort((left, right) => rank(left) - rank(right) || left.index - right.index);
}
