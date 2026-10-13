// Zones géographiques de la recherche : pays, régions, et correspondance avec une annonce.
// Partagé par les filtres Marketplace, la Smart Search, le projet de reprise et le moteur de matching.
//
// Les règles par pays (liste des régions, codes ISO) vivent dans `markets.ts` ;
// ce fichier ne garde que les mots-clés des régions FRANÇAISES, qui servent
// encore pour les annonces françaises d'avant le multi-pays (pas de `region`).
//
// CE QUI EST ENREGISTRÉ dans une liste de zones (`target_geo`, `search_ads.regions`,
// filtres) : des clés de texte, dans le même tableau.
//   - un pays      : son code ISO à deux lettres en majuscules (« ES ») ;
//   - une région française : son ancienne clé (« idf »), comme avant, pour que
//     tous les lecteurs existants continuent de la comprendre (« FR-IDF » est lu aussi) ;
//   - une région d'un autre pays : son code ISO 3166-2 (« ES-CT »).
import { MARKET_CODES, MARKETS, isMarket, legacyFrRegionKey, marketRegionLabel, regionCountry, regionIso } from './markets';
import { countryLabel } from './countries';

export interface RegionDef {
  key: string;
  label: string;
  keywords: string[];
}

export const FR_REGIONS: RegionDef[] = [
  { key: "idf", label: "Île-de-France", keywords: ["paris", "île-de-france", "ile-de-france", "versailles", "nanterre", "créteil", "creteil", "boulogne", "neuilly", "75", "77", "78", "91", "92", "93", "94", "95"] },
  { key: "ara", label: "Auvergne-Rhône-Alpes", keywords: ["lyon", "grenoble", "saint-étienne", "saint-etienne", "clermont", "annecy", "chambéry", "chambery", "rhône", "rhone", "isère", "isere", "69", "38", "42", "63", "74", "73", "01", "07", "26", "15", "43", "03"] },
  { key: "paca", label: "Provence-Alpes-Côte d'Azur", keywords: ["marseille", "nice", "toulon", "aix", "cannes", "avignon", "provence", "var", "bouches-du-rhône", "bouches-du-rhone", "13", "06", "83", "84", "04", "05"] },
  { key: "naq", label: "Nouvelle-Aquitaine", keywords: ["bordeaux", "limoges", "poitiers", "pau", "la rochelle", "gironde", "33", "87", "86", "64", "17", "16", "19", "23", "24", "40", "47", "79"] },
  { key: "occ", label: "Occitanie", keywords: ["toulouse", "montpellier", "nîmes", "nimes", "perpignan", "hérault", "herault", "31", "34", "30", "66", "11", "09", "12", "32", "46", "48", "65", "81", "82"] },
  { key: "hdf", label: "Hauts-de-France", keywords: ["lille", "amiens", "roubaix", "tourcoing", "dunkerque", "nord", "pas-de-calais", "59", "62", "80", "02", "60"] },
  { key: "ges", label: "Grand Est", keywords: ["strasbourg", "reims", "metz", "nancy", "mulhouse", "alsace", "lorraine", "67", "68", "57", "54", "51", "08", "10", "52", "55", "88"] },
  { key: "pdl", label: "Pays de la Loire", keywords: ["nantes", "angers", "le mans", "loire-atlantique", "vendée", "vendee", "44", "49", "53", "72", "85"] },
  { key: "bre", label: "Bretagne", keywords: ["rennes", "brest", "quimper", "lorient", "vannes", "bretagne", "finistère", "finistere", "morbihan", "35", "29", "22", "56"] },
  { key: "nor", label: "Normandie", keywords: ["rouen", "caen", "le havre", "cherbourg", "normandie", "76", "14", "27", "50", "61"] },
  { key: "bfc", label: "Bourgogne-Franche-Comté", keywords: ["dijon", "besançon", "besancon", "21", "25", "58", "71", "89", "70", "39", "90"] },
  { key: "cvl", label: "Centre-Val de Loire", keywords: ["orléans", "orleans", "tours", "bourges", "blois", "chartres", "45", "37", "18", "41", "28", "36"] },
  { key: "cor", label: "Corse", keywords: ["ajaccio", "bastia", "corse", "2a", "2b"] },
];

const BY_KEY: Record<string, RegionDef> = Object.fromEntries(FR_REGIONS.map((r) => [r.key, r]));

/** Tous les codes ISO de région connus (les six pays). */
const ALL_REGION_ISO = new Set<string>(MARKET_CODES.flatMap((c) => MARKETS[c].regions.map((r) => r.key)));

/** « ES », « FR »… : un des pays ouverts sur Globly, écrit en majuscules. */
export const isCountryKey = (key: string | null | undefined): boolean =>
  !!key && /^[A-Z]{2}$/.test(key) && isMarket(key);

/** « idf », « FR-IDF », « ES-CT »… : une région connue, sous son ancienne clé ou son code ISO. */
export const isRegionKey = (key: string | null | undefined): boolean => !!key && ALL_REGION_ISO.has(regionIso(key));

/** La clé à ENREGISTRER pour une région : ancienne clé pour la France (« idf »), code ISO ailleurs (« ES-CT »). */
export const regionStoreKey = (key: string): string => legacyFrRegionKey(key) || regionIso(key);

/**
 * Nom d'une zone enregistrée : une région (« idf », « ES-CT ») ou un pays (« ES »).
 * Une valeur inconnue est rendue telle quelle.
 */
export function regionLabel(key: string, lang = 'fr'): string {
  if (BY_KEY[key]) return BY_KEY[key].label;
  if (isCountryKey(key)) return countryLabel(key, lang);
  return marketRegionLabel(key);
}

/** Sépare une liste de zones enregistrées : pays, régions, et le reste (départements, ancien texte libre). */
export function splitGeoKeys(keys: readonly string[] | null | undefined): { countries: string[]; regions: string[]; others: string[] } {
  const out = { countries: [] as string[], regions: [] as string[], others: [] as string[] };
  for (const k of keys || []) {
    if (isCountryKey(k)) out.countries.push(k);
    else if (isRegionKey(k)) out.regions.push(regionStoreKey(k));
    else out.others.push(k);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Listes de choix (formulaires)
// ---------------------------------------------------------------------------
/** Les six pays, la France en tête, nommés dans la langue affichée. */
export function marketCountryOptions(lang = 'fr'): { value: string; label: string }[] {
  return MARKET_CODES.map((c) => ({ value: c as string, label: countryLabel(c, lang) }));
}

/**
 * Les régions proposées pour les pays choisis, rangées pays par pays. Aucun
 * pays choisi : tous les pays. Dès que plusieurs pays sont proposés, le nom du
 * pays précède celui de la région (« Espagne · Cataluña »).
 */
export function regionOptionsFor(countries: readonly string[] | null | undefined, lang = 'fr'): { value: string; label: string }[] {
  const wanted = (countries || []).filter(isCountryKey);
  const scope = MARKET_CODES.filter((c) => !wanted.length || wanted.includes(c));
  const prefix = scope.length > 1;
  return scope.flatMap((c) => MARKETS[c].regions.map((r) => ({
    value: regionStoreKey(r.key),
    label: prefix ? `${countryLabel(c, lang)} · ${r.label}` : r.label,
  })));
}

/** Retire les régions qui n'appartiennent plus aux pays choisis (aucun pays choisi : on garde tout). */
export function pruneRegions(regions: readonly string[], countries: readonly string[]): string[] {
  const wanted = countries.filter(isCountryKey);
  return wanted.length ? regions.filter((k) => wanted.includes(regionCountry(k))) : [...regions];
}

/**
 * Nouveau choix de pays dans un filtre ou un formulaire : les régions d'un pays
 * retiré sont retirées avec lui (aucun pays choisi = tous les pays, les régions restent).
 */
export const withCountries = <F extends { countries: string[]; regions: string[] }>(filters: F, countries: string[]): F =>
  ({ ...filters, countries, regions: pruneRegions(filters.regions, countries) });

// ---------------------------------------------------------------------------
// Une annonce est-elle dans la zone choisie ?
// ---------------------------------------------------------------------------
/** Ce qu'il faut connaître d'une annonce pour la situer. */
export interface GeoListing {
  country?: string | null;
  region?: string | null;
  address?: string | null;
}

/** Pays d'une annonce (les annonces d'avant le multi-pays, sans pays, sont françaises). */
export const listingCountry = (listing: GeoListing | null | undefined): string => (listing?.country || 'FR').trim().toUpperCase();

/**
 * Vrai si l'annonce est dans CETTE région. Le pays de l'annonce doit être celui
 * de la région ; ensuite la région enregistrée sur l'annonce fait foi. Seules
 * les annonces françaises sans région (publiées avant le multi-pays) sont
 * encore situées par les mots de leur adresse.
 */
export function listingInRegion(listing: GeoListing | null | undefined, key: string): boolean {
  if (!listing || !isRegionKey(key)) return false;
  const iso = regionIso(key);
  if (listingCountry(listing) !== regionCountry(iso)) return false;
  const own = (listing.region || '').trim();
  if (own) return regionIso(own) === iso || regionIso(own.toUpperCase()) === iso;
  const legacy = legacyFrRegionKey(iso);
  if (!legacy) return false;
  const a = (listing.address || '').toLowerCase();
  return !!a && BY_KEY[legacy].keywords.some((kw) => a.includes(kw));
}

/**
 * Vrai si l'annonce est dans AU MOINS une des régions sélectionnées.
 * Liste vide = aucune contrainte géographique (tout passe).
 * Reçoit l'annonce ; une simple adresse (ancien appel) est lue comme une
 * annonce française sans région.
 */
export function matchRegion(listing: GeoListing | string | null | undefined, keys: string[]): boolean {
  if (!keys || keys.length === 0) return true;
  const l: GeoListing = typeof listing === 'string' ? { address: listing } : (listing || {});
  return keys.some((k) => listingInRegion(l, k));
}

/**
 * Pays et régions ensemble. Aucun des deux : tout passe. Sinon l'annonce doit
 * être dans un pays visé (choisi, ou pays d'une région choisie) ; si des
 * régions de SON pays sont choisies, elle doit être dans l'une d'elles, sinon
 * tout le pays convient.
 */
export function matchGeo(listing: GeoListing | null | undefined, zone: { countries?: readonly string[] | null; regions?: readonly string[] | null }): boolean {
  const countries = (zone.countries || []).map((c) => c.toUpperCase());
  const regions = (zone.regions || []).filter(isRegionKey);
  if (!countries.length && !(zone.regions || []).length) return true;
  const country = listingCountry(listing);
  const own = regions.filter((k) => regionCountry(k) === country);
  if (own.length) return own.some((k) => listingInRegion(listing, k));
  return countries.includes(country);
}

// ---------------------------------------------------------------------------
// Le pays du visiteur (pour savoir quand afficher le pays d'une annonce)
// ---------------------------------------------------------------------------
/**
 * Le pays « de chez soi » d'un visiteur, d'après la langue du site : français,
 * la France ; espagnol, l'Espagne… L'anglais sert à des visiteurs de partout :
 * aucun pays de référence, le pays de chaque annonce est alors toujours affiché.
 */
export function homeCountryFor(language: string | null | undefined): string | null {
  const lang = (language || 'fr').slice(0, 2).toLowerCase();
  if (lang === 'en') return null;
  return MARKET_CODES.find((c) => MARKETS[c].language === lang) ?? 'FR';
}

/** Faut-il écrire le pays de cette annonce pour ce visiteur ? */
export const showsCountry = (listing: GeoListing | null | undefined, language: string | null | undefined): boolean =>
  listingCountry(listing) !== homeCountryFor(language);
