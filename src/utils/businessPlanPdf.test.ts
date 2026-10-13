import { describe, it, expect, beforeAll } from 'vitest';
import { writeFileSync } from 'node:fs';
import { usePublicFolderForPdf } from './pdfTemplate.test';
import { buildBusinessPlanPdf } from './businessPlanPdf';

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

  it('reste lisible quand rien n\'est renseigné', async () => {
    const pdf = await buildBusinessPlanPdf({ projectTitle: 'Empty project', lang: 'en', sections: [{ title: 'Summary', content: '' }] });
    expect(pdf.toArrayBuffer().byteLength).toBeGreaterThan(20_000);
  });
});
