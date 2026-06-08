// Régions de France (métropole) + mots-clés pour matcher une adresse d'annonce.
// Partagé par les filtres Marketplace, la Smart Search et le moteur de matching.
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

export function regionLabel(key: string): string {
  return BY_KEY[key]?.label || key;
}

// Vrai si l'adresse correspond à AU MOINS une des régions sélectionnées.
// Liste vide = aucune contrainte géographique (tout passe).
export function matchRegion(address: string | null | undefined, keys: string[]): boolean {
  if (!keys || keys.length === 0) return true;
  const a = (address || "").toLowerCase();
  return keys.some((k) => BY_KEY[k]?.keywords.some((kw) => a.includes(kw)));
}
