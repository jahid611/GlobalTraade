import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setPdfAssetLoader } from './pdfTemplate';
import { buildLOI } from './loiGenerator';

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
  beforeAll(() =>
    setPdfAssetLoader(async (path) => readFileSync(resolve(process.cwd(), 'public', path.replace(/^\//, ''))).toString('base64')));

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
    if (process.env.PDF_OUT) writeFileSync(process.env.PDF_OUT.replace(/\.pdf$/, '-en.pdf'), Buffer.from(pdf.toArrayBuffer()));
  });
});
