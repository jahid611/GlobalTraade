import { describe, it, expect, beforeAll, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { buildNdaProof, ndaProofFileName, type NdaProofParams } from './ndaProof';
import { NDA_WORDING } from './pdf/nda';
import { PDF_LANGS } from './pdf/wording';
import { checkAndSavePdf, outOfMargins, takeWrittenTexts, usePublicFolderForPdf } from './pdf/pdfTestKit';

// chaque texte écrit est noté : contenu et position
vi.mock('jspdf', async (importOriginal) => (await import('./pdf/pdfTestKit')).trackedJsPdf(await importOriginal()));

const sample: NdaProofParams = {
  ndaId: '7c1f0c5e-2b7a-4f0e-9d3b-5a8e6f1c2d40',
  listingId: '4812',
  listingName: 'Boulangerie du Parc',
  signerId: 'b3d9a6f2-11c4-4e57-8a90-0f6f2a7c9e15',
  signerName: 'Marie Dupont',
  signedAt: '2026-10-02T14:32:07.000Z',
  status: 'signed',
  intro: "Le présent accord vise à protéger les informations confidentielles transmises dans le cadre de l'évaluation de cette entreprise. En cliquant sur \"Accepter et Signer\", vous vous engagez formellement à :",
  commitments: [
    "1. Maintenir la plus stricte confidentialité sur l'ensemble des documents financiers et opérationnels partagés.",
    "2. Ne pas utiliser ces informations à d'autres fins que l'évaluation de la présente opportunité.",
    "3. Ne pas contacter directement les employés, clients ou fournisseurs sans l'accord explicite du vendeur.",
    '4. Détruire ou restituer ces informations sur simple demande.',
  ],
  lang: 'fr',
};

describe('attestation de signature du NDA', () => {
  beforeAll(usePublicFolderForPdf);

  it("produit l'attestation en français", async () => {
    const pdf = await buildNdaProof(sample);
    const bytes = pdf.toArrayBuffer();
    expect(bytes.byteLength).toBeGreaterThan(20_000);
    expect(pdf.doc.getNumberOfPages()).toBeGreaterThan(1);
    if (process.env.PDF_OUT_NDA) writeFileSync(process.env.PDF_OUT_NDA, Buffer.from(bytes));
  });

  it("produit l'attestation en anglais pour un accès retiré", async () => {
    const pdf = await buildNdaProof({ ...sample, status: 'revoked', lang: 'en' });
    const bytes = pdf.toArrayBuffer();
    expect(bytes.byteLength).toBeGreaterThan(20_000);
    if (process.env.PDF_OUT_NDA_EN) writeFileSync(process.env.PDF_OUT_NDA_EN, Buffer.from(bytes));
  });

  // Données inventées. Sortie : PDF_OUT_NDA pour le français, avec le suffixe « -de », « -it »… pour les autres.
  it.each(PDF_LANGS)("produit l'attestation dans la langue du document (%s)", async (lang) => {
    takeWrittenTexts();
    const pdf = await buildNdaProof({ ...sample, lang });
    const bytes = checkAndSavePdf(pdf, process.env.PDF_OUT_NDA, lang);
    expect(bytes.byteLength).toBeGreaterThan(20_000);
    const texts = takeWrittenTexts();
    const all = texts.map((t) => t.text).join(' ');
    expect(outOfMargins(texts)).toEqual([]);
    expect(all).toContain(NDA_WORDING.kind[lang].toUpperCase());
    expect(all).toContain(NDA_WORDING.dataSection[lang]);
    expect(all).toContain(`(${NDA_WORDING.parisTime[lang]})`);
    // l'autorité de la plateforme reste la CNIL, dans toutes les langues
    expect(all).toContain('CNIL (www.cnil.fr)');
    expect(all).toContain('eIDAS');
    // date de signature dans la langue du document, à l'heure de Paris (14:32 UTC = 16:32)
    const expected: Record<string, string> = {
      fr: '2 octobre 2026', en: '2 October 2026', es: '2 de octubre de 2026', it: '2 ottobre 2026', pt: '2 de outubro de 2026', de: '2. Oktober 2026',
    };
    expect(all).toContain(expected[lang]);
    expect(all).toContain('16:32:07');
    // aucune donnée de contact du signataire : la seule adresse est celle de Globly
    expect(all.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)).toEqual(['contact@globly.com']);
    expect(all).not.toMatch(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
  });

  it('donne au fichier un nom dans la langue du document', () => {
    expect(ndaProofFileName({ listingName: 'Boulangerie du Parc', lang: 'fr' })).toBe('attestation-nda-Boulangerie-du-Parc.pdf');
    expect(ndaProofFileName({ listingName: 'Boulangerie du Parc', lang: 'en' })).toBe('nda-certificate-Boulangerie-du-Parc.pdf');
    expect(ndaProofFileName({ listingName: 'Bäckerei am Park', lang: 'de' })).toBe('nda-nachweis-Backerei-am-Park.pdf');
    expect(ndaProofFileName({ listingName: '', lang: 'it' })).toBe('attestato-nda-annuncio.pdf');
  });
});
