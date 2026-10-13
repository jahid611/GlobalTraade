// LE modèle du « projet de reprise » d'un repreneur.
//
// Tout ce qui lit ou écrit le projet (Réglages, Profil, Marketplace) passe par
// ce fichier : mêmes champs, mêmes valeurs que le reste du site.
//   - secteurs   : clés de la liste maîtresse (src/lib/industries.ts)
//   - zones      : codes de pays, clés de région (src/lib/geoRegions.ts) et
//                  codes de département français (src/lib/departments.ts)
//   - budget, CA : tranches canoniques (src/lib/ranges.ts)
//   - apport     : un montant en euros
//
// Aucune table ni colonne nouvelle : le projet vit dans les colonnes existantes
// de `profiles`, sous une forme normalisée que les autres lecteurs (matching,
// alertes email, tableau de bord) comprennent déjà.
//   target_sectors  « Bakery,Restaurant »
//   target_geo      « FR,ES,idf,ES-CT,69,2A »   (pays, puis régions, puis départements)
//                   pays : code ISO en majuscules ; région française : ancienne clé
//                   (« idf ») ; région d'un autre pays : code ISO (« ES-CT »)
//   target_budget   « 250 – 500 k€ »
//   target_revenue  « 100 – 250 k€ »
//   apport          « 80000 »
//   ambitions       « [delai:6-12] Texte libre… »  (le délai n'a pas de colonne)
//
// Les anciennes valeurs (texte libre) restent lisibles : voir `parseBuyerProject`.
import type { MatchCriteria } from '@/components/SmartMatchForm';
import { INDUSTRIES, canonicalIndustry } from './industries';
import { FR_REGIONS, isCountryKey, isRegionKey, listingCountry, matchRegion, regionLabel, regionStoreKey } from './geoRegions';
import { MARKET_CODES, formatMoney, isMarket, regionCountry } from './markets';
import { canonicalCountry } from './countries';
import { DEPARTMENTS, canonicalDepartment, departmentName } from './departments';
import { AMOUNT_RANGES, type AmountRange } from './ranges';
import { rangeBounds } from './rangeBounds';

// ---------------------------------------------------------------------------
// Listes de choix
// ---------------------------------------------------------------------------
export const BUYER_TYPES = ['individuel', 'entreprise', 'investisseur'] as const;
export type BuyerType = typeof BUYER_TYPES[number];

export const EXPERIENCE_LEVELS = ['debutant', 'experimente', 'dirigeant', 'serial'] as const;
export type ExperienceLevel = typeof EXPERIENCE_LEVELS[number];

/** Libellés français par défaut (les traductions passent par `buyer.exp_<clé>`). */
export const EXPERIENCE_DEFAULTS: Record<ExperienceLevel, string> = {
  debutant: 'Premier rachat',
  experimente: 'Repreneur expérimenté',
  dirigeant: 'Dirigeant en poste',
  serial: 'Serial entrepreneur',
};

export const TIMELINES = ['lt6', '6-12', '12-24', 'gt24', 'open'] as const;
export type Timeline = typeof TIMELINES[number];

/** Libellés français par défaut (les traductions passent par `bp.timeline_<clé>`). */
export const TIMELINE_DEFAULTS: Record<Timeline, string> = {
  lt6: 'Dans les 6 mois',
  '6-12': 'Dans 6 à 12 mois',
  '12-24': "Dans 1 à 2 ans",
  gt24: 'Dans plus de 2 ans',
  open: 'Pas de date précise',
};

// ---------------------------------------------------------------------------
// Modèle
// ---------------------------------------------------------------------------
export interface BuyerProject {
  buyerType: BuyerType | '';
  /** clés de la liste maîtresse des secteurs */
  sectors: string[];
  /** codes de pays visés (« ES ») ; vide = tous les pays */
  countries: string[];
  /** clés de région (« idf », « ES-CT ») */
  regions: string[];
  /** codes de département */
  departments: string[];
  budget: AmountRange | '';
  revenue: AmountRange | '';
  /** apport personnel, en euros */
  apport: number | null;
  experience: ExperienceLevel | '';
  timeline: Timeline | '';
  /** présentation libre du projet */
  ambitions: string;
  /**
   * Anciennes valeurs en texte libre qui ne désignent rien de connu. Elles
   * restent affichées et enregistrées telles quelles tant que le membre ne les
   * a pas remplacées par un choix dans les listes.
   */
  legacy: {
    buyerType: string;
    sectors: string[];
    zones: string[];
    budget: string;
    revenue: string;
    apport: string;
    experience: string;
  };
}

/** Les colonnes de `profiles` (et de la vue `safe_profiles`) qui portent le projet. */
export interface BuyerProjectRow {
  buyer_type?: string | null;
  target_sectors?: string | null;
  target_geo?: string | null;
  target_budget?: string | null;
  target_revenue?: string | null;
  apport?: string | null;
  experience?: string | null;
  ambitions?: string | null;
}

export const emptyBuyerProject = (): BuyerProject => ({
  buyerType: '', sectors: [], countries: [], regions: [], departments: [], budget: '', revenue: '',
  apport: null, experience: '', timeline: '', ambitions: '',
  legacy: { buyerType: '', sectors: [], zones: [], budget: '', revenue: '', apport: '', experience: '' },
});

// ---------------------------------------------------------------------------
// Lecture tolérante des anciennes valeurs
// ---------------------------------------------------------------------------
const fold = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');

const splitList = (v: unknown): string[] => str(v).split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);

const uniq = <T,>(list: T[]): T[] => Array.from(new Set(list));

const INDUSTRY_BY_FOLD = new Map(INDUSTRIES.map((k) => [fold(k), k]));
const REGION_BY_FOLD = new Map<string, string>(
  FR_REGIONS.flatMap((r) => [[fold(r.key), r.key], [fold(r.label), r.key]] as [string, string][]),
);
const DEPARTMENT_BY_FOLD = new Map(DEPARTMENTS.map((d) => [fold(d.name), d.code]));

function toSector(raw: string): string {
  const canonical = canonicalIndustry(raw);
  return INDUSTRY_BY_FOLD.get(fold(canonical)) ?? '';
}

function toZone(raw: string): { country?: string; region?: string; department?: string } {
  // Un pays : son code en majuscules (« ES »), ou son nom dans une ancienne saisie (« Espagne »).
  if (isCountryKey(raw)) return { country: raw };
  const named = raw.length > 2 ? canonicalCountry(raw) : '';
  if (isMarket(named)) return { country: named };
  // Une région d'un des six pays, par son code (« ES-CT », « FR-IDF »).
  if (isRegionKey(raw.toUpperCase())) return { region: regionStoreKey(raw.toUpperCase()) };
  const f = fold(raw);
  const region = REGION_BY_FOLD.get(f);
  if (region) return { region };
  const code = canonicalDepartment(raw.replace(/^d[ée]p(artement)?\.?\s*:?\s*/i, ''));
  if (code) return { department: code };
  // « Rhône (69) », « 69 - Rhône »
  const inText = raw.match(/\b(\d{2,3}|2[abAB])\b/);
  if (inText && canonicalDepartment(inText[1]) && DEPARTMENT_BY_FOLD.has(fold(raw.replace(inText[0], '').replace(/[()\-–]/g, ' ')))) {
    return { department: canonicalDepartment(inText[1]) };
  }
  const byName = DEPARTMENT_BY_FOLD.get(f);
  if (byName) return { department: byName };
  return {};
}

/**
 * Les montants en euros lus dans un texte libre : « 300k », « 1,5 M€ »,
 * « 250 000 € », « 200-400k » (l'unité du second vaut pour le premier).
 */
export function parseAmounts(text: string | null | undefined): number[] {
  const src = str(text).toLowerCase().replace(/[  ]/g, ' ');
  if (!src) return [];
  const re = /(\d[\d .,]*)\s*(millions?|mio|m€|m\b|k€|k\b|mille)?/g;
  const found: { value: number; unit: number }[] = [];
  for (const m of src.matchAll(re)) {
    const unit = !m[2] ? 0 : m[2].startsWith('k') || m[2] === 'mille' ? 1_000 : 1_000_000;
    let digits = m[1].trim().replace(/[.,]$/, '');
    if (unit) digits = digits.replace(/\s/g, '').replace(',', '.');
    // Sans unité : espaces, points et virgules suivis de 3 chiffres séparent les milliers.
    else digits = digits.replace(/[ .,](?=\d{3}(\D|$))/g, '').replace(/\s/g, '').replace(',', '.');
    const value = parseFloat(digits);
    if (Number.isFinite(value) && value > 0) found.push({ value, unit });
  }
  const lastUnit = found.length ? found[found.length - 1].unit : 0;
  return found.map((f) => Math.round(f.value * (f.unit || (f.value < 1000 && lastUnit ? lastUnit : 1))));
}

/** La tranche canonique qui contient ce montant. */
export function rangeForAmount(amount: number): AmountRange | '' {
  if (!Number.isFinite(amount) || amount <= 0) return '';
  for (const label of AMOUNT_RANGES) {
    const b = rangeBounds(label)!;
    if (b.max === null || amount <= b.max) return label;
  }
  return '';
}

function toRange(raw: string): AmountRange | '' {
  if (!raw) return '';
  if (rangeBounds(raw)) {
    const target = rangeBounds(raw)!;
    return AMOUNT_RANGES.find((l) => { const b = rangeBounds(l)!; return b.min === target.min && b.max === target.max; }) ?? '';
  }
  const amounts = parseAmounts(raw);
  // Une fourchette libre se range dans la tranche de son plafond.
  return amounts.length ? rangeForAmount(Math.max(...amounts)) : '';
}

const TIMELINE_TAG = /^\s*\[delai:([a-z0-9-]+)\]\s*/i;

/** Lit le projet depuis une ligne de profil, anciennes saisies libres comprises. */
export function parseBuyerProject(row: BuyerProjectRow | null | undefined): BuyerProject {
  const p = emptyBuyerProject();
  if (!row) return p;

  const type = fold(str(row.buyer_type));
  if ((BUYER_TYPES as readonly string[]).includes(type)) p.buyerType = type as BuyerType;
  else p.legacy.buyerType = str(row.buyer_type);

  for (const raw of splitList(row.target_sectors)) {
    const key = toSector(raw);
    if (key) p.sectors.push(key); else p.legacy.sectors.push(raw);
  }
  p.sectors = uniq(p.sectors);
  p.legacy.sectors = uniq(p.legacy.sectors);

  for (const raw of splitList(row.target_geo)) {
    const z = toZone(raw);
    if (z.country) p.countries.push(z.country);
    else if (z.region) p.regions.push(z.region);
    else if (z.department) p.departments.push(z.department);
    else p.legacy.zones.push(raw);
  }
  p.countries = MARKET_CODES.filter((c) => p.countries.includes(c));
  p.regions = uniq(p.regions);
  p.departments = uniq(p.departments);
  p.legacy.zones = uniq(p.legacy.zones);

  const budget = str(row.target_budget);
  p.budget = toRange(budget);
  if (budget && !rangeBounds(budget)) p.legacy.budget = budget;

  const revenue = str(row.target_revenue);
  p.revenue = toRange(revenue);
  if (revenue && !rangeBounds(revenue)) p.legacy.revenue = revenue;

  // Apport : un montant seul devient un nombre ; une tranche ou une fourchette
  // reste telle quelle (on ne devine pas un montant précis).
  const apport = str(row.apport);
  if (apport) {
    const amounts = rangeBounds(apport) ? [] : parseAmounts(apport);
    if (amounts.length === 1 && !/[<>]|moins|plus|jusqu|environ|max|min/i.test(apport)) p.apport = amounts[0];
    else p.legacy.apport = apport;
  }

  const exp = fold(str(row.experience));
  if ((EXPERIENCE_LEVELS as readonly string[]).includes(exp)) p.experience = exp as ExperienceLevel;
  else p.legacy.experience = str(row.experience);

  const ambitions = typeof row.ambitions === 'string' ? row.ambitions : '';
  const tag = ambitions.match(TIMELINE_TAG);
  if (tag && (TIMELINES as readonly string[]).includes(tag[1].toLowerCase())) p.timeline = tag[1].toLowerCase() as Timeline;
  p.ambitions = (tag ? ambitions.replace(TIMELINE_TAG, '') : ambitions).trim();

  return p;
}

/** Les valeurs à enregistrer dans `profiles` (chaîne vide = non renseigné). */
export function serializeBuyerProject(p: BuyerProject): Required<{ [K in keyof BuyerProjectRow]: string }> {
  const ambitions = p.ambitions.trim();
  return {
    buyer_type: p.buyerType || p.legacy.buyerType,
    target_sectors: [...p.sectors, ...p.legacy.sectors].join(','),
    target_geo: [...p.countries, ...p.regions, ...p.departments, ...p.legacy.zones].join(','),
    target_budget: p.budget || p.legacy.budget,
    target_revenue: p.revenue || p.legacy.revenue,
    apport: p.apport !== null ? String(Math.round(p.apport)) : p.legacy.apport,
    experience: p.experience || p.legacy.experience,
    ambitions: p.timeline ? `[delai:${p.timeline}]${ambitions ? ` ${ambitions}` : ''}` : ambitions,
  };
}

/** Vrai si rien n'est renseigné. */
export function isEmptyProject(p: BuyerProject): boolean {
  return Object.values(serializeBuyerProject(p)).every((v) => !v);
}

// ---------------------------------------------------------------------------
// Affichage
// ---------------------------------------------------------------------------
/** « 80 000 € » */
export function formatEuros(amount: number, lang = 'fr'): string {
  return formatMoney(amount, lang);
}

/** Saisie d'un montant : chiffres seuls, plafonnés (un apport ne dépasse pas 999 M€). */
export function parseEurosInput(text: string): number | null {
  const digits = text.replace(/\D/g, '').slice(0, 9);
  return digits ? Number(digits) : null;
}

/** « 80000 » → « 80 000 » pour le champ de saisie. */
export function formatEurosInput(amount: number | null): string {
  return amount === null ? '' : String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** « Rhône (69) » */
export const departmentLabel = (code: string) => `${departmentName(code) || code} (${code})`;

/** Les zones du projet, en clair : pays, régions, puis départements, puis anciennes saisies. */
export function zoneLabels(p: BuyerProject, lang = 'fr'): string[] {
  return [...p.countries.map((c) => regionLabel(c, lang)), ...p.regions.map((k) => regionLabel(k, lang)), ...p.departments.map(departmentLabel), ...p.legacy.zones];
}

/** Budget, CA et apport en clair (l'ancienne saisie libre s'affiche telle qu'écrite). */
export const budgetLabel = (p: BuyerProject) => p.legacy.budget || p.budget;
export const revenueLabel = (p: BuyerProject) => p.legacy.revenue || p.revenue;
export const apportLabel = (p: BuyerProject, lang = 'fr') => (p.apport !== null ? formatEuros(p.apport, lang) : p.legacy.apport);

// ---------------------------------------------------------------------------
// Complétude
// ---------------------------------------------------------------------------
export type ProjectField = 'sectors' | 'zones' | 'budget' | 'apport' | 'timeline' | 'buyerType' | 'experience' | 'revenue' | 'ambitions';

// Le poids suit ce qu'un vendeur regarde d'abord : quoi, où, combien, quand.
const FIELD_WEIGHTS: [ProjectField, number][] = [
  ['sectors', 20], ['budget', 20], ['zones', 15], ['apport', 15], ['timeline', 10],
  ['buyerType', 5], ['experience', 5], ['revenue', 5], ['ambitions', 5],
];

function isFilled(p: BuyerProject, f: ProjectField): boolean {
  switch (f) {
    case 'sectors': return p.sectors.length + p.legacy.sectors.length > 0;
    case 'zones': return p.countries.length + p.regions.length + p.departments.length + p.legacy.zones.length > 0;
    case 'budget': return !!(p.budget || p.legacy.budget);
    case 'apport': return p.apport !== null || !!p.legacy.apport;
    case 'timeline': return !!p.timeline;
    case 'buyerType': return !!(p.buyerType || p.legacy.buyerType);
    case 'experience': return !!(p.experience || p.legacy.experience);
    case 'revenue': return !!(p.revenue || p.legacy.revenue);
    case 'ambitions': return !!p.ambitions.trim();
  }
}

/**
 * Part du projet renseignée (0 à 100) et ce qui manque, du plus utile au moins
 * utile. `imprecise` : champs remplis par une ancienne saisie libre, à préciser.
 */
export function projectCompleteness(p: BuyerProject): { score: number; missing: ProjectField[]; imprecise: ProjectField[] } {
  let score = 0;
  const missing: ProjectField[] = [];
  for (const [field, weight] of FIELD_WEIGHTS) {
    if (isFilled(p, field)) score += weight; else missing.push(field);
  }
  const imprecise: ProjectField[] = [];
  if (p.legacy.sectors.length) imprecise.push('sectors');
  if (p.legacy.zones.length) imprecise.push('zones');
  if (p.legacy.budget) imprecise.push('budget');
  if (p.legacy.apport) imprecise.push('apport');
  if (p.legacy.buyerType) imprecise.push('buyerType');
  if (p.legacy.experience) imprecise.push('experience');
  if (p.legacy.revenue) imprecise.push('revenue');
  return { score, missing, imprecise };
}

// ---------------------------------------------------------------------------
// Du projet aux critères de la recherche intelligente (marketplace)
// ---------------------------------------------------------------------------
/** La région d'un département (« 69 » → « ara »), ou "" hors métropole. */
export function regionOfDepartment(code: string): string {
  const c = code.toLowerCase();
  return FR_REGIONS.find((r) => r.keywords.includes(c))?.key ?? '';
}

/** Vrai si le projet donne au moins un critère de recherche. */
export function hasSearchCriteria(p: BuyerProject): boolean {
  return p.sectors.length > 0 || p.countries.length > 0 || p.regions.length > 0 || p.departments.some(regionOfDepartment) || !!p.budget;
}

/**
 * Les critères de la recherche intelligente correspondant au projet. La
 * recherche raisonne par pays et par région : un département français y entre
 * par sa région.
 * `bounds` : les limites du curseur de budget du formulaire.
 */
export function toMatchCriteria(p: BuyerProject, bounds: { min: number; max: number } = { min: 5_000, max: 3_000_000 }): MatchCriteria {
  const regions = uniq([...p.regions, ...p.departments.map(regionOfDepartment).filter(Boolean)]).filter(isRegionKey);
  let budgetMin = bounds.min;
  let budgetMax = bounds.max;
  const b = rangeBounds(p.budget);
  // Une tranche entièrement au-delà du curseur ne peut pas s'y exprimer : on
  // laisse alors le budget ouvert plutôt que de masquer toutes les annonces.
  if (b && b.min < bounds.max) {
    budgetMin = Math.max(bounds.min, b.min);
    budgetMax = b.max === null ? bounds.max : Math.min(bounds.max, b.max);
  }
  return { industries: [...p.sectors], countries: [...p.countries], regions, budgetMin, budgetMax };
}

// ---------------------------------------------------------------------------
// Le projet face à une annonce (ce que voit le vendeur)
// ---------------------------------------------------------------------------
/**
 * match   : l'annonce répond au critère
 * miss    : elle n'y répond pas
 * open    : le repreneur n'a rien précisé (tout lui convient a priori)
 * unknown : on ne peut pas comparer (donnée absente ou ancienne saisie libre)
 */
export type FitStatus = 'match' | 'miss' | 'open' | 'unknown';
export type BudgetFit = FitStatus | 'below';

export interface ListingFit {
  sector: FitStatus;
  zone: FitStatus;
  /** below : l'annonce est moins chère que la tranche visée */
  budget: BudgetFit;
  /** part du prix couverte par l'apport (0,2 = 20 %), si les deux sont connus */
  apportShare: number | null;
  /** strong : tout concorde · partial : un écart · weak : plusieurs écarts · unknown : rien de comparable */
  level: 'strong' | 'partial' | 'weak' | 'unknown';
}

export interface FitListing {
  industry?: string | null;
  address?: string | null;
  /** pays de l'annonce (code ISO) ; absent = France */
  country?: string | null;
  /** région de l'annonce (code ISO 3166-2), quand elle est connue */
  region?: string | null;
  price?: number | string | null;
}

/** Département d'une adresse, d'après son code postal. */
export function departmentOfAddress(address: string | null | undefined): string {
  const cp = (address || '').match(/\b(\d{5})\b/)?.[1];
  if (!cp) return '';
  if (cp.startsWith('20')) return Number(cp) < 20200 ? '2A' : '2B';
  const code = /^9[78]/.test(cp) ? cp.slice(0, 3) : cp.slice(0, 2);
  return canonicalDepartment(code);
}

function zoneFit(p: BuyerProject, listing: FitListing): FitStatus {
  const precise = p.countries.length + p.regions.length + p.departments.length;
  if (!precise) return p.legacy.zones.length ? 'unknown' : 'open';
  const address = listing.address;
  if ((!address || !address.trim()) && !listing.country && !listing.region) return 'unknown';
  const country = listingCountry(listing);
  // Régions (et départements, pour la France) choisis DANS le pays de l'annonce :
  // l'annonce doit être dans l'un d'eux. Sinon, le pays entier convient s'il est visé.
  const ownRegions = p.regions.filter((k) => regionCountry(k) === country);
  const ownDepartments = country === 'FR' ? p.departments : [];
  if (!ownRegions.length && !ownDepartments.length) return p.countries.includes(country) ? 'match' : 'miss';
  if (ownRegions.length && matchRegion(listing, ownRegions)) return 'match';
  if (ownDepartments.length && address) {
    const dep = departmentOfAddress(address);
    if (dep && ownDepartments.includes(dep)) return 'match';
    const a = fold(address);
    if (ownDepartments.some((code) => { const n = fold(departmentName(code)); return !!n && new RegExp(`(^|[^a-z])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`).test(a); })) return 'match';
  }
  return 'miss';
}

/** Comment une annonce répond au projet : secteur, zone, budget, apport. */
export function fitListing(p: BuyerProject, listing: FitListing): ListingFit {
  const industry = toSector(str(listing.industry));
  const sector: FitStatus = p.sectors.length
    ? (industry ? (p.sectors.includes(industry) ? 'match' : 'miss') : 'unknown')
    : (p.legacy.sectors.length ? 'unknown' : 'open');

  const zone = zoneFit(p, listing);

  const price = Number(listing.price);
  const hasPrice = Number.isFinite(price) && price > 0;
  const b = rangeBounds(p.budget);
  let budget: BudgetFit;
  if (!b) budget = 'open';
  else if (!hasPrice) budget = 'unknown';
  else if (price < b.min) budget = 'below';
  else if (b.max !== null && price > b.max) budget = 'miss';
  else budget = 'match';

  const apportShare = hasPrice && p.apport !== null && p.apport > 0 ? p.apport / price : null;

  const all = [sector, zone, budget];
  const misses = all.filter((s) => s === 'miss').length;
  const matches = all.filter((s) => s === 'match' || s === 'below').length;
  const level: ListingFit['level'] = misses >= 2 ? 'weak' : misses === 1 ? 'partial' : matches > 0 ? 'strong' : 'unknown';

  return { sector, zone, budget, apportShare, level };
}

const LEVEL_ORDER: Record<ListingFit['level'], number> = { strong: 0, partial: 1, unknown: 2, weak: 3 };

/** Les annonces d'un vendeur, de celle qui répond le mieux au projet à celle qui y répond le moins. */
export function rankListingsForProject<L extends FitListing>(p: BuyerProject, listings: L[]): { listing: L; fit: ListingFit }[] {
  return listings
    .map((listing, i) => ({ listing, fit: fitListing(p, listing), i }))
    .sort((a, b) => LEVEL_ORDER[a.fit.level] - LEVEL_ORDER[b.fit.level] || a.i - b.i)
    .map(({ listing, fit }) => ({ listing, fit }));
}
