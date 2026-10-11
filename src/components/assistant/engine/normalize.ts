// Lecture du texte tapé par un commerçant : tout est ramené à une forme simple
// (minuscules, sans accents) avant d'être comparé.

import type { Lang } from './types';

/** Minuscules, sans accents, ponctuation → espaces, espaces compactés. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Vrai si `phrase` (déjà normalisée) figure dans `text` (déjà normalisé) en mots entiers. */
export function hasPhrase(text: string, phrase: string): boolean {
  return ` ${text} `.includes(` ${phrase} `);
}

const UNITS: Record<string, number> = {
  k: 1e3, ke: 1e3, keur: 1e3, keuros: 1e3, mille: 1e3, millier: 1e3, milliers: 1e3, thousand: 1e3,
  m: 1e6, me: 1e6, meur: 1e6, mio: 1e6, million: 1e6, millions: 1e6,
};

// Un nombre (chiffres, espaces, points, virgules) suivi, peut-être, d'une unité.
// L'unité ne compte que si elle n'est pas le début d'un autre mot (« 300 mois »).
const AMOUNT = /(-\s?)?(\d[\d\s.,]*)(?:\s*(keuros|keur|ke|k|milliers|millier|mille|thousand|millions|million|mio|meur|me|m)(?![a-z0-9]))?/;

function parseDigits(raw: string, hasUnit: boolean): number | null {
  let s = raw.replace(/\s/g, '').replace(/[.,]+$/, '');
  if (!s) return null;
  const dots = (s.match(/\./g) ?? []).length;
  const commas = (s.match(/,/g) ?? []).length;
  if (dots > 0 && commas > 0) {
    // Les deux signes : le dernier est la virgule décimale, l'autre sépare les milliers.
    const decimal = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
    s = s.split(decimal === '.' ? ',' : '.').join('').replace(decimal, '.');
  } else if (dots + commas > 1) {
    s = s.replace(/[.,]/g, '');
  } else if (dots + commas === 1) {
    const decimals = s.length - 1 - s.search(/[.,]/);
    // « 300.000 » : séparateur de milliers ; « 1,2 » ou « 1,250 M » : décimales.
    s = decimals === 3 && !hasUnit ? s.replace(/[.,]/, '') : s.replace(',', '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Montant en euros écrit comme on l'écrit à la main : « 300 000 », « 300000 € »,
 * « 300k », « 300 k€ », « 1,2 M », « 1.2 million », « 45 mille », « 25 000 euros ».
 * Renvoie null s'il n'y a pas de nombre.
 */
export function parseAmount(s: string): number | null {
  const text = s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u00a0\u202f\u2009]/g, ' ')
    .replace(/\u2212/g, '-')
    .replace(/€/g, ' ');
  const match = AMOUNT.exec(text);
  if (!match) return null;
  const unit = match[3] ? UNITS[match[3]] : undefined;
  const value = parseDigits(match[2], unit !== undefined);
  if (value === null) return null;
  const amount = Math.round(value * (unit ?? 1));
  return match[1] ? -amount : amount;
}

const ZERO_WORDS = ['aucun', 'aucune', 'rien', 'zero', 'personne', 'seul', 'seule', 'none', 'nothing', 'nobody', 'alone', 'no one'];

/** Comme parseAmount, mais « aucun », « rien », « zéro »… valent 0. */
export function parseAmountOrZero(s: string): number | null {
  const amount = parseAmount(s);
  if (amount !== null) return amount;
  const text = normalizeText(s);
  return ZERO_WORDS.some(word => hasPhrase(text, word)) ? 0 : null;
}

const UNKNOWN = [
  'je ne sais pas', 'je sais pas', 'sais pas', 'ne sais plus', 'aucune idee', 'pas sur', 'pas sure', 'pas certain', 'je l ignore', 'peut etre',
  'i don t know', 'i dont know', 'don t know', 'dont know', 'dunno', 'not sure', 'no idea', 'maybe',
];
const NO = ['non', 'nan', 'nope', 'no', 'pas vraiment', 'pas du tout', 'pas encore', 'jamais', 'aucun', 'aucune', 'not really', 'not yet', 'never'];
const YES = [
  'oui', 'ouais', 'ouai', 'ouep', 'yes', 'yep', 'yeah', 'si', 'ok', 'okay', 'd accord', 'bien sur', 'tout a fait', 'absolument', 'exact',
  'exactement', 'evidemment', 'carrement', 'of course', 'sure', 'absolutely', 'i do', 'correct',
];

/**
 * Réponse par oui ou non, avec ses variantes (« ouais », « non pas vraiment »).
 * « Je ne sais pas » donne 'unknown' ; un texte qui n'est pas une réponse, null.
 */
export function parseYesNo(s: string, lang: Lang): 'yes' | 'no' | 'unknown' | null {
  const text = normalizeText(s);
  if (!text) return s.trim() === '?' ? 'unknown' : null;
  const words = text.split(' ');
  // Une longue phrase est une question ou une explication, pas un oui / non.
  if (words.length > 8) return null;
  if (UNKNOWN.some(phrase => hasPhrase(text, phrase))) return 'unknown';
  // Le oui ou le non se dit d'entrée : on ne le cherche pas au milieu d'une phrase.
  const head = words.slice(0, 3).join(' ');
  // « si » veut dire oui en français, pas en anglais.
  const yes = lang === 'en' ? YES.filter(w => w !== 'si') : YES;
  if (NO.some(phrase => hasPhrase(head, phrase))) return 'no';
  if (yes.some(phrase => hasPhrase(head, phrase))) return 'yes';
  return null;
}

/** Nombre entier simple (salariés) : « 3 », « 3 salariés », « aucun », « je travaille seul ». */
export function parseCount(s: string): number | null {
  const text = normalizeText(s);
  const match = /\d{1,6}/.exec(text);
  if (match) return Number(match[0]);
  return ZERO_WORDS.some(word => hasPhrase(text, word)) ? 0 : null;
}

/** Année à quatre chiffres trouvée dans le texte, ou null. */
export function parseYear(s: string): number | null {
  const match = /(?<!\d)(1[7-9]\d\d|20\d\d)(?!\d)/.exec(s);
  return match ? Number(match[1]) : null;
}
