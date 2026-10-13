import { describe, it, expect, beforeAll } from 'vitest';
import { createGloblyPdf, pdfText } from '../pdfTemplate';
import { PDF_WORDING, pdfDocWord, type PdfDocument } from './index';
import { PDF_LANGS, defineWording, fillPlaceholders, pdfLang, pdfWord, placeholdersOf, wordsFor, type Wording } from './wording';
import { usePublicFolderForPdf } from './pdfTestKit';

// chaque texte : [document, clé, { fr, en, … }]
const entries = (Object.keys(PDF_WORDING) as PdfDocument[]).flatMap((doc) =>
  Object.entries(PDF_WORDING[doc] as Wording).map(([key, texts]) => [doc, key, texts as Record<string, string | undefined>] as const));

describe('textes des PDF', () => {
  it('couvre les sept documents et le gabarit', () => {
    expect(Object.keys(PDF_WORDING).sort()).toEqual(['businessPlan', 'dataRoomLog', 'dueDiligence', 'loi', 'nda', 'presentation', 'teaser', 'template']);
    expect(entries.length).toBeGreaterThan(150);
  });

  it('écrit chaque texte dans les six langues', () => {
    const missing = entries.flatMap(([doc, key, texts]) =>
      PDF_LANGS.filter((lang) => !(texts[lang] || '').trim()).map((lang) => `${doc}.${key}.${lang}`));
    expect(missing).toEqual([]);
    // et aucune langue en trop
    for (const [, , texts] of entries) expect(Object.keys(texts).sort()).toEqual([...PDF_LANGS].sort());
  });

  it('garde les mêmes {{repères}} dans toutes les langues', () => {
    const wrong = entries.flatMap(([doc, key, texts]) =>
      PDF_LANGS.filter((lang) => placeholdersOf(texts[lang] || '').join() !== placeholdersOf(texts.fr || '').join()).map((lang) => `${doc}.${key}.${lang}`));
    expect(wrong).toEqual([]);
    // les textes à repères existent bien (le contrôle ci-dessus n'est pas vide de sens)
    expect(placeholdersOf(PDF_WORDING.loi.object.fr)).toEqual(['listing']);
    expect(placeholdersOf(PDF_WORDING.loi.financingSplit.de || '')).toEqual(['equity', 'loan']);
    expect(placeholdersOf(PDF_WORDING.nda.dataRights.es || '')).toEqual(['contact']);
  });

  it('garde les mêmes durées et les mêmes nombres dans les phrases de toutes les langues', () => {
    // clauses, réserves et mentions : toute phrase d'au moins 60 signes en français
    const numbers = (text: string) => (text.match(/\d+/g) || []).sort().join(',');
    const sentences = entries.filter(([, , texts]) => (texts.fr || '').length >= 60);
    expect(sentences.length).toBeGreaterThan(15);
    const wrong = sentences.flatMap(([doc, key, texts]) =>
      PDF_LANGS.filter((lang) => numbers(texts[lang] || '') !== numbers(texts.fr || '')).map((lang) => `${doc}.${key}.${lang}`));
    expect(wrong).toEqual([]);
    for (const lang of PDF_LANGS) {
      expect(PDF_WORDING.loi.clauseAudit[lang]).toContain('60');
      expect(PDF_WORDING.loi.clauseFinancing[lang]).toContain('90');
      expect(PDF_WORDING.loi.exclusivity[lang]).toContain('90 (');
    }
  });

  it("n'emploie aucun tiret long et garde les noms propres", () => {
    const dashes = entries.flatMap(([doc, key, texts]) => PDF_LANGS.filter((lang) => /[–—]/.test(texts[lang] || '')).map((lang) => `${doc}.${key}.${lang}`));
    expect(dashes).toEqual([]);
    for (const lang of PDF_LANGS) {
      expect(PDF_WORDING.nda.dataRights[lang]).toContain('CNIL (www.cnil.fr)');
      expect(PDF_WORDING.nda.scope[lang]).toContain('eIDAS');
      expect(PDF_WORDING.loi.disclaimer[lang]).toContain('Globly');
      expect(PDF_WORDING.teaser.disclaimer[lang]).toContain('(NDA)');
    }
  });

  it('choisit la langue du site, le français par défaut, l\'anglais pour une langue inconnue', () => {
    expect(pdfLang('fr')).toBe('fr');
    expect(pdfLang('fr-BE')).toBe('fr');
    expect(pdfLang(undefined)).toBe('fr');
    expect(pdfLang(null)).toBe('fr');
    expect(pdfLang('en-GB')).toBe('en');
    expect(pdfLang('DE-de')).toBe('de');
    for (const lang of ['es', 'it', 'pt', 'de']) expect(pdfLang(lang)).toBe(lang);
    expect(pdfLang('nl')).toBe('en');
  });

  it('retrouve un texte par document, clé et langue', () => {
    expect(pdfDocWord('loi', 'kind', 'fr')).toBe("Lettre d'intention");
    expect(pdfDocWord('loi', 'kind', 'de')).toBe('Absichtserklärung');
    expect(pdfDocWord('nda', 'subtitle', 'it')).toBe('Accordo di riservatezza (NDA)');
    expect(pdfDocWord('template', 'dateAndSignature', 'pt-PT')).toBe('Data e assinatura');
    expect(pdfDocWord('loi', 'financingSplit', 'es', { loan: 70, equity: 30 })).toBe('Préstamo 70 % · Fondos propios 30 %');
    expect(wordsFor(PDF_WORDING.teaser, 'es')('project', { name: 'TITAN' })).toBe('PROYECTO TITAN');
  });

  it("se rabat sur l'anglais, puis sur le français, quand une langue manque", () => {
    const partial: Wording<'both' | 'frOnly'> = { both: { fr: 'Bonjour {{name}}', en: 'Hello {{name}}' }, frOnly: { fr: 'Seulement en français' } };
    expect(pdfWord(partial, 'both', 'de', { name: 'Ada' })).toBe('Hello Ada');
    expect(pdfWord(partial, 'frOnly', 'de')).toBe('Seulement en français');
    expect(pdfWord(partial, 'both', 'fr', { name: 'Ada' })).toBe('Bonjour Ada');
    expect(fillPlaceholders('{{a}} et {{b}}', { a: 1 })).toBe('1 et {{b}}');
    expect(defineWording({ k: { fr: 'a', en: 'b', es: 'c', it: 'd', pt: 'e', de: 'f' } }).k.de).toBe('f');
  });

  describe('polices', () => {
    beforeAll(usePublicFolderForPdf);

    it('disposent de tous les signes employés, dans les quatre styles', async () => {
      const pdf = await createGloblyPdf({ kind: 'Essai', title: 'Essai', cover: false });
      const fonts: [string, string][] = [['Sans', 'normal'], ['Sans', 'bold'], ['Serif', 'normal'], ['Serif', 'italic']];
      // les libellés passent souvent en capitales : on contrôle aussi les capitales
      const chars = new Set<string>();
      for (const [, , texts] of entries) {
        for (const lang of PDF_LANGS) for (const ch of pdfText(texts[lang]) + pdfText(texts[lang]).toUpperCase()) chars.add(ch);
      }
      for (const ch of 'ßẞäöüÄÖÜñÑ¿¡ãõçÃÕÇàèéìòùÀÈÉÌÒÙáíóúÁÍÓÚâêôÂÊÔ«»„“”€·') chars.add(ch);
      chars.delete('ẞ'); // la capitale de ß s'écrit SS (toUpperCase)
      const missing: string[] = [];
      for (const [family, style] of fonts) {
        pdf.doc.setFont(family, style);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const metadata = (pdf.doc.getFont() as any).metadata;
        expect(typeof metadata?.characterToGlyph).toBe('function');
        for (const ch of chars) {
          if (ch === ' ' || ch === '\n') continue;
          if (!metadata.characterToGlyph(ch.codePointAt(0))) missing.push(`${family} ${style} : ${ch} (U+${ch.codePointAt(0)!.toString(16).toUpperCase()})`);
        }
      }
      expect(missing).toEqual([]);
    });
  });
});
