// dm of height per pile. Every material defaults to 1 dm; clay (and others) can be overridden.
export const DEFAULT_PILE_DM = {
  dirt: 1,
  sand: 1,
  clay: 1,
  peat: 1,
  tar: 1,
  'rock shards': 1,
};

const SURFACE_MATERIALS = ['sand', 'clay', 'peat', 'tar'];

export function materialFor(layer, typeName) {
  if (layer !== 'surface') return 'rock shards';
  const name = String(typeName ?? '').toLowerCase();
  return SURFACE_MATERIALS.find((material) => name.includes(material)) ?? 'dirt';
}

export function normalizeRates(rates) {
  const result = { ...DEFAULT_PILE_DM };
  for (const [material, value] of Object.entries(rates ?? {})) {
    const n = Number(value);
    if (material in result && Number.isFinite(n) && n > 0) result[material] = n;
  }
  return result;
}

export const dmToPiles = (dm, material, rates) =>
  dm / (rates[material] ?? DEFAULT_PILE_DM[material] ?? 1);

export const pilesToDm = (piles, material, rates) =>
  Math.round(piles * (rates[material] ?? DEFAULT_PILE_DM[material] ?? 1));
