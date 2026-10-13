import { describe, it, expect, beforeAll, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { createGloblyPdf, pdfFileName, pdfLang, pdfText } from './pdfTemplate';
import { PDF_LANGS } from './pdf/wording';
import { TEMPLATE_WORDING } from './pdf/template';
import { checkAndSavePdf, outOfMargins, takeWrittenTexts, usePublicFolderForPdf } from './pdf/pdfTestKit';

// chaque texte écrit est noté, pour contrôler qu'aucun ne sort des marges
vi.mock('jspdf', async (importOriginal) => (await import('./pdf/pdfTestKit')).trackedJsPdf(await importOriginal()));

describe('gabarit PDF', () => {
  beforeAll(usePublicFolderForPdf);

  it('remplace les signes absents des polices', () => {
    expect(pdfText('110 m² ≈ 1 200 €')).toBe('110 m2 ~ 1 200 €');
  });

  it('écrit dans la langue du site, en anglais pour une langue inconnue', () => {
    expect(pdfLang('fr')).toBe('fr');
    expect(pdfLang('fr-BE')).toBe('fr');
    expect(pdfLang(undefined)).toBe('fr');
    for (const lang of ['en', 'es', 'it', 'pt', 'de']) expect(pdfLang(lang)).toBe(lang);
    expect(pdfLang('en-GB')).toBe('en');
    expect(pdfLang('nl')).toBe('en');
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

  it.each(PDF_LANGS)('écrit ses mentions par défaut dans la langue du document (%s)', async (lang) => {
    takeWrittenTexts();
    const pdf = await createGloblyPdf({ kind: 'Essai', title: 'Essai', lang });
    pdf.signatures([{ role: 'A', name: 'Marie Dupont' }, { role: 'B', name: 'Karim Benali' }]);
    checkAndSavePdf(pdf, undefined, lang);
    const all = takeWrittenTexts().map((t) => t.text).join(' | ');
    expect(all).toContain(TEMPLATE_WORDING.confidential[lang]);
    expect(all).toContain(`${TEMPLATE_WORDING.confidential[lang]}, ${TEMPLATE_WORDING.generatedOn[lang]}`);
    expect(all).toContain(TEMPLATE_WORDING.dateAndSignature[lang]);
  });

  it('garde les mots très longs dans leur case, leur colonne et le bandeau', async () => {
    takeWrittenTexts();
    const long = 'Unternehmensnachfolgefinanzierungsbestätigung';
    const pdf = await createGloblyPdf({
      kind: `${long} und Vertraulichkeitsvereinbarungsnachweis`, title: `${long} Donaudampfschifffahrtsgesellschaft`,
      subtitle: `${long} ${long}`, reference: '7c1f0c5e-2b7a-4f0e-9d3b-5a8e6f1c2d40-7c1f0c5e-2b7a-4f0e-9d3b-5a8e6f1c2d40',
      facts: [[long, long], [long, '13. Oktober 2026'], [long, long], [long, '420.000 €']],
      footerNote: `${long} ${long} ${long} ${long}`, lang: 'de',
    });
    pdf.section(`${long} ${long}`);
    pdf.heading(`${long} ${long} ${long} ${long}`);
    pdf.figures([{ label: long, value: '1.234.567.890 €', highlight: true }, { label: long, value: long, hint: `${long} ${long}` }, { label: long, value: '12' }, { label: long, value: '3' }], { perRow: 4 });
    pdf.figures([{ label: long, value: long }, { label: long, value: long }, { label: long, value: long }]);
    pdf.keyValues([[long, `${long} ${long} ${long}`], [`${long}${long}`, `${long}${long}${long}${long}`]]);
    pdf.grid([long, `Datum der ${long}`, long, 'Status', `${long} am`], [[long, long, long, long, long], ['A', `${long}${long}`, '13.10.2026', 'Erledigt', '']], { widths: [30, 50, 29, 26, 31], align: ['left', 'left', 'left', 'center', 'right'] });
    pdf.bullets([`${long}${long}${long}${long}${long}`]);
    pdf.paragraph(`${long}${long}${long}${long}${long}`);
    pdf.callout(`${long} ${long} ${long}`, { title: `${long} ${long} ${long} ${long}`, tone: 'warning' });
    pdf.signatures([{ role: `${long} ${long}`, name: `${long} ${long}`, note: `${long} ${long}` }, { role: long, name: long }, { role: long, name: long }]);
    checkAndSavePdf(pdf, process.env.PDF_OUT_LONG, 'fr');
    const texts = takeWrittenTexts();
    expect(texts.length).toBeGreaterThan(40);
    expect(outOfMargins(texts)).toEqual([]);
  });
});
