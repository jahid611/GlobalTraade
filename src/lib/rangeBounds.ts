// Bornes numériques (en euros) des tranches de montants canoniques de Globly.
//
// Les tranches de `ranges.ts` sont des LIBELLÉS (« 100 – 250 k€ ») : dès qu'il
// faut comparer un prix à une tranche (matching, filtres), on passe par ici au
// lieu de re-parser le libellé à la main — le tiret demi-cadratin et les unités
// mélangées (« 500 k€ – 1 M€ ») rendent ce parsing fragile.
import { AMOUNT_RANGES, type AmountRange } from './ranges';

export interface RangeBounds {
  /** borne basse incluse, en euros */
  min: number;
  /** borne haute incluse, en euros — `null` = pas de plafond (« > 10 M€ ») */
  max: number | null;
}

const K = 1_000;
const M = 1_000_000;

// `Record<AmountRange, …>` : ajouter une tranche dans ranges.ts sans la
// déclarer ici est une erreur de compilation.
const BOUNDS: Record<AmountRange, RangeBounds> = {
  '< 100 k€': { min: 0, max: 100 * K },
  '100 – 250 k€': { min: 100 * K, max: 250 * K },
  '250 – 500 k€': { min: 250 * K, max: 500 * K },
  '500 k€ – 1 M€': { min: 500 * K, max: 1 * M },
  '1 – 3 M€': { min: 1 * M, max: 3 * M },
  '3 – 5 M€': { min: 3 * M, max: 5 * M },
  '5 – 10 M€': { min: 5 * M, max: 10 * M },
  '> 10 M€': { min: 10 * M, max: null },
};

// Tolère les variantes de saisie d'un même libellé : tiret simple ou cadratin
// à la place du demi-cadratin, espaces insécables ou multiples, casse.
const normalize = (v: string) =>
  v
    .replace(/[\u2012\u2013\u2014\u2212-]/g, '-')
    .replace(/[\s\u00a0\u202f]+/g, '')
    .toLowerCase();

const BY_NORMALIZED = new Map<string, RangeBounds>(
  AMOUNT_RANGES.map((label) => [normalize(label), BOUNDS[label]]),
);

/**
 * Bornes d'une tranche canonique, ou `null` si la valeur n'en est pas une
 * (vide, texte libre hérité d'une ancienne version…).
 */
export function rangeBounds(value: string | null | undefined): RangeBounds | null {
  if (!value) return null;
  const found = BY_NORMALIZED.get(normalize(value));
  return found ? { ...found } : null;
}

/** Vrai si le montant tombe dans la tranche (bornes incluses). */
export function isInRange(amount: number, value: string | null | undefined): boolean {
  const b = rangeBounds(value);
  if (!b || !Number.isFinite(amount)) return false;
  return amount >= b.min && (b.max === null || amount <= b.max);
}
