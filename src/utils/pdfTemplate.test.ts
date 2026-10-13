import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createGloblyPdf, pdfFileName, pdfText, setPdfAssetLoader } from './pdfTemplate';

// Hors navigateur, les polices et le logo sont lus dans le dossier public.
export const usePublicFolderForPdf = () =>
  setPdfAssetLoader(async (path) => readFileSync(resolve(process.cwd(), 'public', path.replace(/^\//, ''))).toString('base64'));

describe('gabarit PDF', () => {
  beforeAll(usePublicFolderForPdf);

  it('remplace les signes absents des polices', () => {
    expect(pdfText('110 m² ≈ 1 200 €')).toBe('110 m2 ~ 1 200 €');
  });

  it('donne un nom de fichier sûr', () => {
    expect(pdfFileName('LOI', "Boulangerie de l'Été & Fils")).toBe('LOI-Boulangerie-de-l-Ete-Fils.pdf');
  });

  it('produit un document complet, avec couverture et pages numérotées', async () => {
    const pdf = await createGloblyPdf({
      kind: "Lettre d'intention", title: 'Boulangerie du Parc', subtitle: 'Projet de reprise, Lyon 3e', reference: 'GLB-LOI-2026-0412',
      facts: [['Référence', 'GLB-LOI-2026-0412'], ['Date', '13 octobre 2026'], ['Repreneur', 'Marie Dupont'], ['Cédant', 'Karim Benali']],
    });
    pdf.section('Synthèse de la proposition');
    pdf.figures([{ label: 'Prix proposé', value: '280 000 €', highlight: true }, { label: 'Apport personnel', value: '84 000 €', hint: '30 % du prix' }, { label: 'Emprunt bancaire', value: '196 000 €' }]);
    pdf.section('Conditions');
    pdf.keyValues([['Objet de la cession', 'Fonds de commerce de 110 m², bail commercial 3-6-9'], ['Mode de financement', 'Apport 30 %, emprunt 70 % sur 7 ans']]);
    pdf.paragraph("Le repreneur confirme son intérêt pour l'acquisition du fonds de commerce décrit ci-dessus.");
    pdf.bullets(['Obtention du prêt', 'Audit des comptes des trois derniers exercices']);
    pdf.callout('Document établi à partir des informations saisies sur Globly.', { title: 'À savoir' });
    pdf.section('Journal');
    pdf.grid(['Date', 'Personne', 'Action'], Array.from({ length: 60 }, (_, i) => [`${(i % 28) + 1}/10/2026`, `Visiteur ${i + 1}`, i % 3 ? 'Consultation' : 'Téléchargement']), { widths: [1, 2, 2] });
    pdf.section('Signatures');
    pdf.signatures([{ role: 'Le repreneur', name: 'Marie Dupont' }, { role: 'Le cédant', name: 'Karim Benali' }]);
    const bytes = pdf.toArrayBuffer();
    expect(bytes.byteLength).toBeGreaterThan(20_000);
    expect(pdf.doc.getNumberOfPages()).toBeGreaterThan(3); // couverture + tableau sur plusieurs pages
    if (process.env.PDF_OUT) writeFileSync(process.env.PDF_OUT, Buffer.from(bytes));
  });
});
