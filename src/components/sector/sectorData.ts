// Calculs de la page « Secteur » : uniquement à partir des lignes renvoyées
// par les vues masquantes (annonces, recherches de repreneurs, projets).
// Aucun chiffre n'est estimé : sans donnée, on renvoie null.

import type { Listing, SearchAd } from "@/types/domain";
import { localeFor } from "@/lib/markets";

/** Colonnes texte « a,b,c » (ou tableau) -> liste propre. */
export const toList = (s: string | string[] | null | undefined): string[] =>
  typeof s === "string" && s.trim()
    ? s.split(",").map((x) => x.trim()).filter(Boolean)
    : Array.isArray(s) ? s : [];

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Une annonce vendue ou en pause n'est plus « à vendre ». */
export const isOnSale = (l: Listing) => l.status !== "sold" && l.status !== "inactive";

export type PriceStats = { count: number; median: number | null; min: number | null; max: number | null };

/** Prix demandés (publics sur chaque carte) des annonces qui en affichent un. */
export function priceStats(listings: Listing[]): PriceStats {
  const prices = listings.map((l) => Number(l.price)).filter((p) => Number.isFinite(p) && p > 0);
  return {
    count: prices.length,
    median: median(prices),
    min: prices.length ? Math.min(...prices) : null,
    max: prices.length ? Math.max(...prices) : null,
  };
}

export const adMatchesSector = (ad: SearchAd, sector: string) => toList(ad.sectors).includes(sector);

/** Date de l'annonce la plus récente, ou null. */
export function latestDate(listings: Listing[]): string | null {
  let best: string | null = null;
  for (const l of listings) {
    if (l.created_at && (!best || new Date(l.created_at).getTime() > new Date(best).getTime())) best = l.created_at;
  }
  return best;
}

/** Ville lue dans l'adresse publique (« 12 rue X, 69001 Lyon » -> « 69001 Lyon »). */
export const cityFromAddress = (address: string | null | undefined): string =>
  address ? String(address).split(",").slice(-1)[0].trim() : "";

export const formatEuro = (value: number, lang: string): string => {
  try {
    return new Intl.NumberFormat(localeFor(lang), { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${Math.round(value)} €`;
  }
};

export const formatDate = (iso: string, lang: string): string => {
  try {
    return new Date(iso).toLocaleDateString(localeFor(lang), { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
};
