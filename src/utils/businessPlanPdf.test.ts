import { describe, it, expect, beforeAll, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { buildBusinessPlanPdf } from './businessPlanPdf';
import { BUSINESS_PLAN_WORDING } from './pdf/businessPlan';
import { PDF_LANGS } from './pdf/wording';
import { checkAndSavePdf, outOfMargins, takeWrittenTexts, usePublicFolderForPdf } from './pdf/pdfTestKit';

// chaque texte écrit est noté : contenu et position
vi.mock('jspdf', async (importOriginal) => (await import('./pdf/pdfTestKit')).trackedJsPdf(await importOriginal()));

const long = (text: string, times: number) => Array.from({ length: times }, () => text).join('\n\n');

describe('business plan en PDF', () => {
  beforeAll(usePublicFolderForPdf);

  it('produit le business plan avec ses rubriques renseignées', async () => {
    const pdf = await buildBusinessPlanPdf({
      projectTitle: 'Atelier Vélo Cargo, Lyon',
      lang: 'fr',
      sections: [
        { title: 'Résumé', content: "Atelier de réparation et de location de vélos cargo pour les familles et les artisans du 7e arrondissement de Lyon. Le quartier compte 80 000 habitants et aucun atelier spécialisé.\nNotre ambition : devenir en trois ans l'adresse de référence du vélo utilitaire à Lyon." },
        { title: 'Marché', content: long("Le marché du vélo cargo progresse d'environ 30 % par an en France. Nos clients sont les familles avec jeunes enfants, les artisans et les commerçants qui livrent en centre-ville. Trois concurrents généralistes sont installés à moins de deux kilomètres, aucun ne propose la location longue durée.", 14) },
        { title: 'Modèle économique', content: "Trois sources de revenus : la réparation (45 % du chiffre d'affaires), la location longue durée (35 %) et la vente d'accessoires (20 %). Panier moyen en atelier : 85 €." },
        { title: 'Équipe', content: '' },
        { title: 'Prévisionnel 3 ans', content: "Année 1 : 140 000 € de chiffre d'affaires, résultat à l'équilibre.\nAnnée 2 : 210 000 €, résultat de 18 000 €.\nAnnée 3 : 290 000 €, résultat de 41 000 €." },
      ],
    });
    const bytes = pdf.toArrayBuffer();
    expect(bytes.byteLength).toBeGreaterThan(20_000);
    expect(pdf.doc.getNumberOfPages()).toBeGreaterThan(2);
    if (process.env.PDF_OUT_BP) writeFileSync(process.env.PDF_OUT_BP, Buffer.from(bytes));
  });

  // Rubriques inventées, saisies par l'utilisateur : elles restent telles quelles, seuls les textes du document changent.
  // Sortie : PDF_OUT_BP pour le français, avec le suffixe « -de », « -es »… pour les autres langues.
  it.each(PDF_LANGS)('produit le business plan dans la langue du document (%s)', async (lang) => {
    takeWrittenTexts();
    const pdf = await buildBusinessPlanPdf({
      projectTitle: 'Lastenrad-Werkstatt, Köln',
      lang,
      sections: [
        { title: 'Zusammenfassung', content: 'Werkstatt für Reparatur und Vermietung von Lastenrädern für Familien und Handwerksbetriebe.\nUnser Ziel: in drei Jahren die erste Adresse für Nutzfahrräder zu werden.' },
        { title: 'Geschäftsmodell', content: 'Drei Einnahmequellen: Reparatur (45 % des Umsatzes), Langzeitmiete (35 %) und Zubehörverkauf (20 %).' },
        { title: 'Team', content: '' },
      ],
    });
    const bytes = checkAndSavePdf(pdf, process.env.PDF_OUT_BP, lang);
    expect(bytes.byteLength).toBeGreaterThan(20_000);
    const texts = takeWrittenTexts();
    const all = texts.map((t) => t.text).join(' ');
    expect(outOfMargins(texts)).toEqual([]);
    expect(all).toContain(BUSINESS_PLAN_WORDING.kind[lang].toUpperCase());
    expect(all).toContain(BUSINESS_PLAN_WORDING.sections[lang].toUpperCase());
    expect(all).toContain('Zusammenfassung'); // texte saisi : inchangé
    expect(all).toContain('2 / 3');
  });

  it.each(PDF_LANGS)('dit dans la langue du document que rien n\'est renseigné (%s)', async (lang) => {
    takeWrittenTexts();
    const pdf = await buildBusinessPlanPdf({ projectTitle: 'Projet vide', lang, sections: [{ title: 'Résumé', content: '' }] });
    checkAndSavePdf(pdf, undefined, lang);
    // la phrase peut tenir sur deux lignes : on compare sans tenir compte des coupures
    const all = takeWrittenTexts().map((t) => t.text).join(' ').replace(/\s+/g, ' ');
    expect(all).toContain(BUSINESS_PLAN_WORDING.empty[lang]);
  });

  it('reste lisible quand rien n\'est renseigné', async () => {
    const pdf = await buildBusinessPlanPdf({ projectTitle: 'Empty project', lang: 'en', sections: [{ title: 'Summary', content: '' }] });
    expect(pdf.toArrayBuffer().byteLength).toBeGreaterThan(20_000);
  });
});
