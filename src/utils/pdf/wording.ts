// Textes des documents PDF, dans les six langues du site.
//
// Chaque document a son fichier dans ce dossier (loi.ts, nda.ts, teaser.ts…).
// Un texte se retrouve par document, clé et langue :
//
//   const w = wordsFor(LOI_WORDING, 'de');
//   w('kind')                                   // « Absichtserklärung »
//   w('object', { listing: 'Bäckerei am Park' }) // les {{repères}} sont remplacés
//
// Le français est la référence. Si une langue manque pour une clé, on prend
// l'anglais, puis le français. Les textes saisis par les utilisateurs et ceux
// que l'appelant a déjà traduits (t(...)) ne passent pas par ici.

export const PDF_LANGS = ['fr', 'en', 'es', 'it', 'pt', 'de'] as const;
export type PdfLang = typeof PDF_LANGS[number];

/** Un texte dans chaque langue. Le français est obligatoire, c'est la référence. */
export type Translated = { fr: string } & Partial<Record<Exclude<PdfLang, 'fr'>, string>>;
/** Les textes d'un document : clé, puis langue. */
export type Wording<K extends string = string> = Record<K, Translated>;

/** Vérifie à la compilation que les six langues sont écrites pour chaque clé. */
export const defineWording = <K extends string>(wording: Record<K, Record<PdfLang, string>>): Wording<K> => wording;

/**
 * Langue des textes d'un document. La langue du site quand elle fait partie des
 * six ; le français quand rien n'est précisé ; l'anglais pour une langue inconnue.
 */
export function pdfLang(language: string | null | undefined): PdfLang {
  if (!language) return 'fr';
  const code = language.slice(0, 2).toLowerCase();
  return (PDF_LANGS as readonly string[]).includes(code) ? (code as PdfLang) : 'en';
}

/** Remplace les {{repères}} d'un texte. Un repère sans valeur est laissé tel quel. */
export const fillPlaceholders = (text: string, vars?: Record<string, string | number>): string =>
  vars ? text.replace(/\{\{(\w+)\}\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole)) : text;

/** Les {{repères}} d'un texte, triés (utilisé par les tests). */
export const placeholdersOf = (text: string): string[] =>
  Array.from(text.matchAll(/\{\{(\w+)\}\}/g), (m) => m[1]).sort();

/** Un texte par clé et langue : la langue demandée, sinon l'anglais, sinon le français. */
export function pdfWord<K extends string>(wording: Wording<K>, key: K, language: string | null | undefined, vars?: Record<string, string | number>): string {
  const entry = wording[key];
  if (!entry) return key;
  return fillPlaceholders(entry[pdfLang(language)] ?? entry.en ?? entry.fr, vars);
}

/** Les textes d'un document dans une langue : `w('clé', { repère: valeur })`. */
export const wordsFor = <K extends string>(wording: Wording<K>, language: string | null | undefined) =>
  (key: K, vars?: Record<string, string | number>): string => pdfWord(wording, key, language, vars);
