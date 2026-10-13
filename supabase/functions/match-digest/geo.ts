// La zone d'un projet de reprise face à une annonce, pour le résumé par e-mail.
//
// MÊME RÈGLE que `matchGeo` dans src/lib/geoRegions.ts. Cette fonction tourne
// sur Deno et ne peut rien importer de src/ : la règle est donc réécrite ici,
// sans aucune dépendance. Le test src/lib/matchDigestGeo.test.ts vérifie que
// les deux versions répondent pareil et que les listes ci-dessous sont à jour.
//
// Ce qui est enregistré dans `profiles.target_geo` (texte, séparé par des virgules) :
//   - un pays : son code ISO à deux lettres en majuscules (« ES ») ;
//   - une région française : son ancienne clé (« idf »), ou « FR-IDF » ;
//   - une région d'un autre pays : son code ISO 3166-2 (« ES-CT ») ;
//   - le reste : départements français, ancien texte libre.

export const MARKET_CODES = ["FR", "ES", "PT", "DE", "IT", "GB"];

/** Codes ISO 3166-2 des régions, pays par pays (copie de src/lib/markets.ts). */
export const REGION_CODES: Record<string, string[]> = {
  FR: ["ARA", "BFC", "BRE", "CVL", "20R", "GES", "HDF", "IDF", "NOR", "NAQ", "OCC", "PDL", "PAC"],
  ES: ["AN", "AR", "AS", "IB", "CN", "CB", "CM", "CL", "CT", "VC", "EX", "GA", "RI", "MD", "MC", "NC", "PV", "CE", "ML"],
  PT: ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "20", "30"],
  DE: ["BW", "BY", "BE", "BB", "HB", "HH", "HE", "MV", "NI", "NW", "RP", "SL", "SN", "ST", "SH", "TH"],
  IT: ["65", "77", "78", "72", "45", "36", "62", "42", "25", "57", "67", "21", "75", "88", "82", "52", "32", "55", "23", "34"],
  GB: ["ENG", "SCT", "WLS", "NIR"],
};

const ALL_REGION_ISO = new Set<string>(MARKET_CODES.flatMap((c) => REGION_CODES[c].map((r) => `${c}-${r}`)));

/** Anciennes clés des régions françaises et leur code ISO. */
export const LEGACY_FR_REGION: Record<string, string> = {
  idf: "FR-IDF", ara: "FR-ARA", paca: "FR-PAC", naq: "FR-NAQ", occ: "FR-OCC", hdf: "FR-HDF", ges: "FR-GES",
  pdl: "FR-PDL", bre: "FR-BRE", nor: "FR-NOR", bfc: "FR-BFC", cvl: "FR-CVL", cor: "FR-20R",
};

/**
 * Mots de l'adresse qui situent une annonce FRANÇAISE sans région (publiée
 * avant le multi-pays). Copie de FR_REGIONS dans src/lib/geoRegions.ts.
 */
export const FR_REGION_KEYWORDS: Record<string, string[]> = {
  "FR-IDF": ["paris", "île-de-france", "ile-de-france", "versailles", "nanterre", "créteil", "creteil", "boulogne", "neuilly", "75", "77", "78", "91", "92", "93", "94", "95"],
  "FR-ARA": ["lyon", "grenoble", "saint-étienne", "saint-etienne", "clermont", "annecy", "chambéry", "chambery", "rhône", "rhone", "isère", "isere", "69", "38", "42", "63", "74", "73", "01", "07", "26", "15", "43", "03"],
  "FR-PAC": ["marseille", "nice", "toulon", "aix", "cannes", "avignon", "provence", "var", "bouches-du-rhône", "bouches-du-rhone", "13", "06", "83", "84", "04", "05"],
  "FR-NAQ": ["bordeaux", "limoges", "poitiers", "pau", "la rochelle", "gironde", "33", "87", "86", "64", "17", "16", "19", "23", "24", "40", "47", "79"],
  "FR-OCC": ["toulouse", "montpellier", "nîmes", "nimes", "perpignan", "hérault", "herault", "31", "34", "30", "66", "11", "09", "12", "32", "46", "48", "65", "81", "82"],
  "FR-HDF": ["lille", "amiens", "roubaix", "tourcoing", "dunkerque", "nord", "pas-de-calais", "59", "62", "80", "02", "60"],
  "FR-GES": ["strasbourg", "reims", "metz", "nancy", "mulhouse", "alsace", "lorraine", "67", "68", "57", "54", "51", "08", "10", "52", "55", "88"],
  "FR-PDL": ["nantes", "angers", "le mans", "loire-atlantique", "vendée", "vendee", "44", "49", "53", "72", "85"],
  "FR-BRE": ["rennes", "brest", "quimper", "lorient", "vannes", "bretagne", "finistère", "finistere", "morbihan", "35", "29", "22", "56"],
  "FR-NOR": ["rouen", "caen", "le havre", "cherbourg", "normandie", "76", "14", "27", "50", "61"],
  "FR-BFC": ["dijon", "besançon", "besancon", "21", "25", "58", "71", "89", "70", "39", "90"],
  "FR-CVL": ["orléans", "orleans", "tours", "bourges", "blois", "chartres", "45", "37", "18", "41", "28", "36"],
  "FR-20R": ["ajaccio", "bastia", "corse", "2a", "2b"],
};

export interface GeoListing {
  country?: string | null;
  region?: string | null;
  address?: string | null;
}

export interface GeoZone {
  /** codes de pays (« ES ») */
  countries: string[];
  /** codes ISO de région (« FR-IDF », « ES-CT ») */
  regions: string[];
  /** le reste, tel qu'écrit : départements, ancien texte libre */
  others: string[];
}

const regionIso = (key: string): string => LEGACY_FR_REGION[key] || key;

/** Lit `target_geo` : pays, régions, et le reste. */
export function parseZone(targetGeo: string | null | undefined): GeoZone {
  const zone: GeoZone = { countries: [], regions: [], others: [] };
  for (const raw of (targetGeo || "").split(/[,;/\n]+/)) {
    const key = raw.trim();
    if (!key) continue;
    if (/^[A-Z]{2}$/.test(key) && MARKET_CODES.includes(key)) zone.countries.push(key);
    else if (ALL_REGION_ISO.has(regionIso(key))) zone.regions.push(regionIso(key));
    else zone.others.push(key);
  }
  return zone;
}

/** Pays d'une annonce (les annonces d'avant le multi-pays, sans pays, sont françaises). */
export const listingCountry = (l: GeoListing | null | undefined): string => (l?.country || "FR").trim().toUpperCase();

/**
 * L'annonce est-elle dans CETTE région ? Le pays doit être celui de la région ;
 * ensuite la région enregistrée sur l'annonce fait foi. Seules les annonces
 * françaises sans région sont encore situées par les mots de leur adresse.
 */
export function listingInRegion(l: GeoListing | null | undefined, iso: string): boolean {
  if (!l || !ALL_REGION_ISO.has(iso)) return false;
  if (listingCountry(l) !== iso.slice(0, 2)) return false;
  const own = (l.region || "").trim();
  if (own) return regionIso(own) === iso || regionIso(own.toUpperCase()) === iso;
  const keywords = FR_REGION_KEYWORDS[iso];
  if (!keywords) return false;
  const a = (l.address || "").toLowerCase();
  return !!a && keywords.some((kw) => a.includes(kw));
}

/**
 * Pays et régions ensemble. Aucun des deux : tout passe. Sinon l'annonce doit
 * être dans un pays visé (choisi, ou pays d'une région choisie) ; si des
 * régions de SON pays sont choisies, elle doit être dans l'une d'elles, sinon
 * tout le pays convient.
 */
export function matchGeo(l: GeoListing | null | undefined, zone: { countries: string[]; regions: string[] }): boolean {
  if (!zone.countries.length && !zone.regions.length) return true;
  const country = listingCountry(l);
  const own = zone.regions.filter((k) => k.slice(0, 2) === country);
  if (own.length) return own.some((k) => listingInRegion(l, k));
  return zone.countries.includes(country);
}

/**
 * Ce que la zone du projet dit d'une annonce :
 *   - "open"  : le membre n'a donné aucune zone exploitable (tout lui convient a priori) ;
 *   - "match" : l'annonce est dans sa zone ;
 *   - "miss"  : elle n'y est pas.
 * Un ancien texte libre (« Lyon ») est encore cherché dans l'adresse, comme avant.
 */
export function zoneFit(l: GeoListing, targetGeo: string | null | undefined): "open" | "match" | "miss" {
  const zone = parseZone(targetGeo);
  const words = zone.others.map((w) => w.toLowerCase()).filter((w) => w.length > 2);
  const precise = zone.countries.length + zone.regions.length > 0;
  if (!precise && !words.length) return "open";
  if (precise && matchGeo(l, zone)) return "match";
  const address = (l.address || "").toLowerCase();
  return !!address && words.some((w) => address.includes(w)) ? "match" : "miss";
}

/**
 * Vrai si `target_geo` donne au moins une zone exploitable : un pays (« ES »),
 * une région, ou un mot à chercher dans l'adresse. Un département seul (« 69 »)
 * n'en est pas une ici, comme avant.
 */
export const hasZone = (targetGeo: string | null | undefined): boolean => zoneFit({}, targetGeo) !== "open";
