import { describe, it, expect, beforeAll } from 'vitest';
import { writeFileSync } from 'node:fs';
import { usePublicFolderForPdf } from './pdfTemplate.test';
import { buildNdaProof, type NdaProofParams } from './ndaProof';

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
});
