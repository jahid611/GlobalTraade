import { describe, it, expect, beforeAll, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { buildLOI } from './loiGenerator';
import { LOI_WORDING } from './pdf/loi';
import { PDF_LANGS } from './pdf/wording';
import { checkAndSavePdf, outOfMargins, takeWrittenTexts, usePublicFolderForPdf } from './pdf/pdfTestKit';

// chaque texte écrit est noté : contenu et position
vi.mock('jspdf', async (importOriginal) => (await import('./pdf/pdfTestKit')).trackedJsPdf(await importOriginal()));

const sample = {
  buyerName: 'Marie Dupont',
  sellerName: 'Karim Benali',
  listingName: 'Boulangerie du Parc',
  amount: 280000,
  financing: { loan: 70, equity: 30 },
  offerDate: '2026-10-02T09:30:00.000Z',
  acceptedDate: '2026-10-13T14:00:00.000Z',
  t: (key: string) => key,
};

describe("lettre d'intention", () => {
  // Hors navigateur, les polices et le logo sont lus dans le dossier public.
  beforeAll(usePublicFolderForPdf);

  it('produit la lettre en français, avec couverture', async () => {
    const { pdf, filename, reference } = await buildLOI({ ...sample, lang: 'fr' });
    const bytes = pdf.toArrayBuffer();
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-');
    expect(bytes.byteLength).toBeGreaterThan(20_000);
    expect(pdf.doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
    expect(reference).toMatch(/^LOI-[0-9A-Z]+$/);
    expect(filename).toBe(`${reference}-Boulangerie-du-Parc.pdf`);
    if (process.env.PDF_OUT) writeFileSync(process.env.PDF_OUT, Buffer.from(bytes));
  });

  it('produit la lettre en anglais, pour un financement simple', async () => {
    const { pdf } = await buildLOI({ ...sample, financing: 'cash', lang: 'en' });
    expect(pdf.toArrayBuffer().byteLength).toBeGreaterThan(20_000);
    if (process.env.PDF_OUT) writeFileSync(process.env.PDF_OUT.replace(/\.pdf$/, '-en-cash.pdf'), Buffer.from(pdf.toArrayBuffer()));
  });

  // Données inventées. Sortie : PDF_OUT pour le français, PDF_OUT avec le suffixe « -de », « -es »… pour les autres.
  it.each(PDF_LANGS)('produit la lettre dans la langue du document, dates et montants compris (%s)', async (lang) => {
    takeWrittenTexts();
    const { pdf } = await buildLOI({ ...sample, lang });
    const bytes = checkAndSavePdf(pdf, process.env.PDF_OUT, lang);
    expect(bytes.byteLength).toBeGreaterThan(20_000);
    const texts = takeWrittenTexts();
    const all = texts.map((t) => t.text).join(' ');
    expect(outOfMargins(texts)).toEqual([]);
    expect(all).toContain(LOI_WORDING.kind[lang].toUpperCase());
    expect(all).toContain(LOI_WORDING.conditionsTitle[lang]);
    expect(all).toContain(LOI_WORDING.disclaimerTitle[lang]);
    expect(all).toContain(LOI_WORDING.signatureNote[lang]);
    // mêmes durées dans toutes les langues
    expect(all).toMatch(/60/);
    expect(all).toMatch(/90 \(/);
    // dates et montants dans la langue du document
    const expected: Record<string, [string, string]> = {
      fr: ['13 octobre 2026', '280 000 €'], en: ['13 October 2026', '€280,000'], es: ['13 de octubre de 2026', '280.000 €'],
      it: ['13 ottobre 2026', '280.000 €'], pt: ['13 de outubro de 2026', '280 000 €'], de: ['13. Oktober 2026', '280.000 €'],
    };
    expect(all).toContain(expected[lang][0]);
    expect(all).toContain(expected[lang][1]);
    // la répartition du financement est reprise telle quelle
    expect(all).toContain('70');
    expect(all).toContain('30');
  });

  it('ne parle de parts sociales et de fonds de commerce qu\'en français', async () => {
    for (const lang of PDF_LANGS) {
      takeWrittenTexts();
      await buildLOI({ ...sample, lang });
      const all = takeWrittenTexts().map((t) => t.text).join(' ');
      expect(all.includes('parts sociales / fonds de commerce')).toBe(lang === 'fr');
    }
  });
});
