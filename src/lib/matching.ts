// Moteur de correspondance de Globly : dit si une annonce correspond au projet
// d'un repreneur, à quel point, et POURQUOI.
//
// Trois règles tiennent tout le reste :
//
//  1. On ne note que ce qui est connu. Un critère que le repreneur n'a pas
//     rempli, ou une information que l'annonce ne donne pas, ne rapporte aucun
//     point : il sort du calcul. (L'ancien moteur donnait 28 points sur 40 à un
//     secteur non renseigné : sans aucun critère, tout « correspondait » à 82 %.)
//
//  2. Trois critères sont éliminatoires : le secteur, la zone et le prix. Une
//     annonce d'un autre secteur, hors de la zone voulue ou hors de portée n'est
//     pas une correspondance, quoi que valent les autres critères. (Avant, un
//     garage obtenait 61 % pour un projet de restaurant, parce qu'il était dans
//     la bonne région et le bon budget.)
//
//  3. Une note demande au moins deux des trois critères principaux. Avec un
//     seul, on dit seulement lequel correspond, sans pourcentage.
//
// Le calcul est local et déterministe : mêmes critères, même annonce, même note.
import { matchGeo } from './geoRegions';
import { sectorFit, type SectorFit } from './sectorFamilies';
import type { Listing } from '@/types/domain';

/** Ce que le repreneur cherche. Une valeur vide ou nulle = critère non renseigné. */
export interface BuyerCriteria {
  /** clés de la liste maîtresse des secteurs */
  industries: string[];
  /** codes de pays (« ES ») */
  countries?: string[];
  /** clés de région (« idf », « ES-CT ») */
  regions: string[];
  /** budget d'achat en euros ; 0 = pas de borne de ce côté */
  budgetMin: number;
  budgetMax: number;
  /** apport personnel en euros */
  apport?: number | null;
  /** chiffre d'affaires visé, en euros ; null = pas de borne de ce côté */
  revenueMin?: number | null;
  revenueMax?: number | null;
  /** secteurs dont le repreneur ne veut pas : éliminatoire */
  excludedIndustries?: string[];
  /** nombre de salariés voulu ; teamMax null = pas de plafond */
  teamMin?: number | null;
  teamMax?: number | null;
  /** rôle après la reprise : « exploitant », « dirigeant » ou « investisseur » */
  role?: string | null;
}

export type CriterionKey = 'sector' | 'zone' | 'price' | 'financing' | 'size' | 'team' | 'role';

/**
 * ok      : correspond ;
 * close   : proche, sans correspondre exactement ;
 * ko      : ne correspond pas ;
 * unknown : non évaluable (critère non rempli ou information absente de l'annonce).
 */
export type CriterionStatus = 'ok' | 'close' | 'ko' | 'unknown';

export interface CriterionResult {
  key: CriterionKey;
  status: CriterionStatus;
  /** part du critère obtenue, de 0 à 1 */
  points: number;
  /** précision pour l'affichage : « family », « neighbour », « below », « above »… */
  detail?: string;
}

/**
 * match   : correspond au projet ;
 * partial : correspond en partie (un critère proche, ou trop peu de critères pour noter) ;
 * none    : ne correspond pas (critère éliminatoire manqué, ou rien à comparer).
 */
export type Verdict = 'match' | 'partial' | 'none';

export interface MatchResult {
  /** 0 à 100, ou null quand une note n'aurait pas de sens (voir les règles en tête de fichier) */
  score: number | null;
  verdict: Verdict;
  /** un résultat par critère, dans l'ordre d'affichage */
  criteria: CriterionResult[];
  /** nombre de critères réellement comparés */
  compared: number;
}

/** Poids de chaque critère dans la note. */
export const WEIGHTS: Record<CriterionKey, number> = { sector: 35, zone: 25, price: 25, financing: 10, size: 5, team: 5, role: 5 };

/** Critères principaux : éliminatoires, et il en faut deux pour donner une note. */
const CORE: CriterionKey[] = ['sector', 'zone', 'price'];

/** À partir de cette note (et sans critère manqué), l'annonce « correspond ». */
export const MATCH_THRESHOLD = 75;

/** Part du prix qu'une banque attend en apport personnel : repère français (voir financingRules). */
const OWN_FUNDS = { comfortable: 0.3, tight: 0.2, weak: 0.1 };

const num = (v: number | string | null | undefined): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const SECTOR_POINTS: Record<SectorFit, number> = { exact: 1, family: 0.6, neighbour: 0.25, none: 0 };

function sectorCriterion(listing: Listing, c: BuyerCriteria): CriterionResult {
  // Un secteur exclu par le repreneur écarte l'annonce, même s'il n'a rien choisi d'autre.
  if (listing.industry && c.excludedIndustries?.length && sectorFit(listing.industry, c.excludedIndustries) === 'exact') {
    return { key: 'sector', status: 'ko', points: 0, detail: 'excluded' };
  }
  if (!c.industries?.length || !listing.industry) return { key: 'sector', status: 'unknown', points: 0 };
  const fit = sectorFit(listing.industry, c.industries);
  const status: CriterionStatus = fit === 'exact' ? 'ok' : fit === 'none' ? 'ko' : 'close';
  return { key: 'sector', status, points: SECTOR_POINTS[fit], detail: fit };
}

function zoneCriterion(listing: Listing, c: BuyerCriteria): CriterionResult {
  const countries = c.countries || [];
  const regions = c.regions || [];
  if (countries.length === 0 && regions.length === 0) return { key: 'zone', status: 'unknown', points: 0 };
  const inZone = matchGeo(listing, { countries, regions });
  return { key: 'zone', status: inZone ? 'ok' : 'ko', points: inZone ? 1 : 0, detail: regions.length ? 'region' : 'country' };
}

function priceCriterion(listing: Listing, c: BuyerCriteria): CriterionResult {
  const price = num(listing.price);
  const min = num(c.budgetMin);
  const max = num(c.budgetMax);
  if (!price || (!min && !max)) return { key: 'price', status: 'unknown', points: 0 };
  if (price >= min && (!max || price <= max)) return { key: 'price', status: 'ok', points: 1 };
  if (max && price > max) {
    // Au-dessus du budget : un écart de 10 % se négocie, 25 % est un pari, au-delà c'est hors de portée.
    const over = price / max - 1;
    if (over <= 0.1) return { key: 'price', status: 'close', points: 0.5, detail: 'above' };
    if (over <= 0.25) return { key: 'price', status: 'close', points: 0.2, detail: 'above' };
    return { key: 'price', status: 'ko', points: 0, detail: 'above' };
  }
  // Sous le budget : une affaire moins chère reste finançable, mais ce n'est pas la taille recherchée.
  const ratio = price / min;
  if (ratio >= 0.7) return { key: 'price', status: 'close', points: 0.6, detail: 'below' };
  if (ratio >= 0.4) return { key: 'price', status: 'close', points: 0.3, detail: 'below' };
  return { key: 'price', status: 'ko', points: 0, detail: 'below' };
}

function financingCriterion(listing: Listing, c: BuyerCriteria): CriterionResult {
  const price = num(listing.price);
  const apport = num(c.apport);
  if (!price || !apport) return { key: 'financing', status: 'unknown', points: 0 };
  const share = apport / price;
  if (share >= OWN_FUNDS.comfortable) return { key: 'financing', status: 'ok', points: 1 };
  if (share >= OWN_FUNDS.tight) return { key: 'financing', status: 'close', points: 0.6 };
  if (share >= OWN_FUNDS.weak) return { key: 'financing', status: 'close', points: 0.25 };
  return { key: 'financing', status: 'ko', points: 0 };
}

function sizeCriterion(listing: Listing, c: BuyerCriteria): CriterionResult {
  const revenue = num(listing.revenue_n1);
  const min = num(c.revenueMin);
  const max = num(c.revenueMax);
  // Le chiffre d'affaires d'une annonce peut être masqué (fiche non débloquée) : alors on ne compare pas.
  if (!revenue || (!min && !max)) return { key: 'size', status: 'unknown', points: 0 };
  if (revenue >= min && (!max || revenue <= max)) return { key: 'size', status: 'ok', points: 1 };
  const near = (max && revenue > max && revenue <= max * 1.5) || (min && revenue < min && revenue >= min * 0.6);
  return near
    ? { key: 'size', status: 'close', points: 0.5, detail: revenue > max && max ? 'above' : 'below' }
    : { key: 'size', status: 'ko', points: 0, detail: max && revenue > max ? 'above' : 'below' };
}

function teamCriterion(listing: Listing, c: BuyerCriteria): CriterionResult {
  const hasWish = c.teamMin !== null && c.teamMin !== undefined;
  if (!hasWish || listing.employees === null || listing.employees === undefined) return { key: 'team', status: 'unknown', points: 0 };
  const n = num(listing.employees);
  const min = num(c.teamMin);
  const max = c.teamMax === null || c.teamMax === undefined ? Infinity : num(c.teamMax);
  if (n >= min && n <= max) return { key: 'team', status: 'ok', points: 1 };
  // Une tranche d'écart reste proche : jusqu'au double du plafond, ou la moitié du plancher.
  const gap = n > max ? n - max : min - n;
  const tolerance = Math.max(2, n > max ? max : Math.round(min * 0.5));
  return gap <= tolerance
    ? { key: 'team', status: 'close', points: 0.5, detail: n > max ? 'above' : 'below' }
    : { key: 'team', status: 'ko', points: 0, detail: n > max ? 'above' : 'below' };
}

// Ce que l'annonce dit de sa dépendance au dirigeant (champ « management_type » du formulaire d'annonce).
const ROLE_FIT: Record<string, Record<string, number>> = {
  // entreprise qui tourne sans son dirigeant : convient à tous
  autonomous: { exploitant: 1, dirigeant: 1, investisseur: 1 },
  // entreprise familiale : il faut s'y impliquer
  family: { exploitant: 1, dirigeant: 0.5, investisseur: 0.5 },
  // entreprise qui repose sur son dirigeant : il faut y être tous les jours
  dependent: { exploitant: 1, dirigeant: 0.5, investisseur: 0 },
};

function roleCriterion(listing: Listing, c: BuyerCriteria): CriterionResult {
  const fit = c.role && listing.management_type ? ROLE_FIT[listing.management_type]?.[c.role] : undefined;
  if (fit === undefined) return { key: 'role', status: 'unknown', points: 0 };
  return { key: 'role', status: fit === 1 ? 'ok' : fit === 0 ? 'ko' : 'close', points: fit };
}

/** Compare une annonce au projet d'un repreneur. */
export function matchListing(listing: Listing, c: BuyerCriteria): MatchResult {
  const criteria = [
    sectorCriterion(listing, c),
    zoneCriterion(listing, c),
    priceCriterion(listing, c),
    financingCriterion(listing, c),
    sizeCriterion(listing, c),
    teamCriterion(listing, c),
    roleCriterion(listing, c),
  ];
  const known = criteria.filter((r) => r.status !== 'unknown');
  const core = known.filter((r) => CORE.includes(r.key));

  // Rien à comparer, ou un critère principal manqué (secteur exclu compris) : ce n'est pas une correspondance.
  if (core.length === 0 || core.some((r) => r.status === 'ko')) {
    return { score: null, verdict: 'none', criteria, compared: known.length };
  }

  // Un seul critère principal : on sait dire lequel correspond, pas donner une note.
  if (core.length < 2) {
    return { score: null, verdict: 'partial', criteria, compared: known.length };
  }

  const total = known.reduce((sum, r) => sum + WEIGHTS[r.key], 0);
  const got = known.reduce((sum, r) => sum + WEIGHTS[r.key] * r.points, 0);
  const score = Math.round((got / total) * 100);
  const allGood = known.every((r) => r.status !== 'ko');
  const verdict: Verdict = allGood && score >= MATCH_THRESHOLD ? 'match' : 'partial';
  return { score, verdict, criteria, compared: known.length };
}

/** Vrai si le repreneur a rempli au moins un critère comparable. */
export const hasCriteria = (c: BuyerCriteria): boolean =>
  (c.industries?.length || 0) + (c.countries?.length || 0) + (c.regions?.length || 0) > 0 || num(c.budgetMin) > 0 || num(c.budgetMax) > 0;

/**
 * Classe des annonces pour un projet : les correspondances d'abord (meilleure
 * note en tête), puis les correspondances partielles. Les annonces qui ne
 * correspondent pas sont retirées.
 */
export function rankListings<L extends Listing>(listings: L[], c: BuyerCriteria): (L & { _match: MatchResult })[] {
  const rank = (v: Verdict) => (v === 'match' ? 0 : v === 'partial' ? 1 : 2);
  return listings
    .map((l) => ({ ...l, _match: matchListing(l, c) }))
    .filter((l) => l._match.verdict !== 'none')
    .sort((a, b) => rank(a._match.verdict) - rank(b._match.verdict) || (b._match.score ?? -1) - (a._match.score ?? -1));
}
