// Recherche par mots-clés dans la base de fiches : aucun modèle, seulement des
// mots reconnus et comptés.

import { normalizeText } from './normalize';
import type { KnowledgeEntry, Lang } from './types';

export type Confidence = 'sure' | 'ambiguous' | 'none';

export interface SearchHit { entry: KnowledgeEntry; score: number }

export interface SearchResult {
  /** toutes les fiches reconnues, de la plus proche à la moins proche */
  hits: SearchHit[];
  /** 'sure' : un net premier ; 'ambiguous' : 2 ou 3 fiches proches ; 'none' : rien */
  confidence: Confidence;
  /** la fiche retenue ('sure') ou les fiches entre lesquelles hésiter ('ambiguous') */
  candidates: KnowledgeEntry[];
}

// Mots trop courants pour compter quand ils viennent du libellé d'une question.
const STOPWORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'ou', 'en', 'au', 'aux', 'ce', 'ces', 'cet', 'cette', 'que', 'qui', 'quoi',
  'est', 'sont', 'mon', 'ma', 'mes', 'son', 'sa', 'ses', 'je', 'il', 'elle', 'on', 'nous', 'vous', 'pour', 'par', 'sur', 'dans', 'avec',
  'comment', 'quel', 'quelle', 'quels', 'quelles', 'faut', 'faire', 'dois', 'peut', 'ca', 'se', 'ne', 'pas', 'plus', 'tout', 'avant',
  'the', 'an', 'of', 'and', 'or', 'to', 'in', 'on', 'is', 'are', 'my', 'your', 'do', 'does', 'what', 'how', 'which', 'for', 'with',
  'it', 'be', 'can', 'should', 'need', 'me', 'we', 'you', 'that', 'this', 'when', 'who', 'why', 'at', 'by',
]);

const MIN_SCORE = 1;
const QUESTION_WORD = 0.5;
const SAME_QUESTION = 10;

// Un mot de 3 lettres ou moins doit être un mot entier (« ebe » ne se lit pas
// dans « bebe ») ; un mot plus long peut être le début d'un mot du texte
// (« bilan » se lit dans « bilans »). Une expression doit se suivre mot à mot.
function matches(padded: string, keyword: string): boolean {
  if (!keyword) return false;
  const single = !keyword.includes(' ');
  if (single && keyword.length <= 3) return padded.includes(` ${keyword} `);
  return padded.includes(` ${keyword}`);
}

// Une expression pèse plus qu'un mot seul, et d'autant plus qu'elle est longue.
function weight(keyword: string): number {
  const words = keyword.split(' ').length;
  return words === 1 ? 1 : 1 + words;
}

function scoreEntry(text: string, entry: KnowledgeEntry, lang: Lang): number {
  const padded = ` ${text} `;
  let score = 0;
  const seen = new Set<string>();
  for (const raw of entry.keywords[lang] ?? []) {
    const keyword = normalizeText(raw);
    if (seen.has(keyword)) continue;
    seen.add(keyword);
    if (matches(padded, keyword)) score += weight(keyword);
  }
  const question = normalizeText(entry.question[lang] ?? '');
  if (question && question === text) return score + SAME_QUESTION;
  for (const word of new Set(question.split(' '))) {
    if (word.length < 2 || STOPWORDS.has(word) || seen.has(word)) continue;
    if (matches(padded, word)) score += QUESTION_WORD;
  }
  return score;
}

function rank(text: string, lang: Lang, entries: KnowledgeEntry[]): SearchHit[] {
  return entries
    .map((entry, index) => ({ entry, score: scoreEntry(text, entry, lang), index }))
    .filter(hit => hit.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ entry, score }) => ({ entry, score }));
}

/** Fiches de la base classées par score pour un texte libre, avec un niveau de confiance. */
export function searchKnowledge(text: string, lang: Lang, entries: KnowledgeEntry[]): SearchResult {
  const normalized = normalizeText(text);
  if (!normalized) return { hits: [], confidence: 'none', candidates: [] };

  let hits = rank(normalized, lang, entries);
  // Rien dans la langue du site : la question est peut-être écrite dans l'autre.
  if (hits.length === 0) hits = rank(normalized, lang === 'fr' ? 'en' : 'fr', entries);
  if (hits.length === 0) return { hits, confidence: 'none', candidates: [] };

  const [first, second] = hits;
  if (!second || (first.score >= second.score * 1.5 && first.score - second.score >= 1)) {
    return { hits, confidence: 'sure', candidates: [first.entry] };
  }
  const close = hits.filter(hit => hit.score >= first.score * 0.6).slice(0, 3);
  return { hits, confidence: 'ambiguous', candidates: close.map(hit => hit.entry) };
}
