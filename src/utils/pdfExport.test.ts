import { describe, it, expect, beforeAll } from 'vitest';
import { writeFileSync } from 'node:fs';
import type { TFunction } from 'i18next';
import { usePublicFolderForPdf } from './pdfTemplate.test';
import { buildDueDiligenceReport, buildVDRAuditTrail } from './pdfExport';

const t = ((key: string) => key) as unknown as TFunction;

describe('rapport de due diligence et journal de la data room', () => {
  beforeAll(usePublicFolderForPdf);

  it('produit le rapport de due diligence avec son tableau de tâches', async () => {
    const categories = ['financier', 'juridique', 'social', 'fiscal', 'commercial', 'immobilier'];
    const titles = [
      'Bilans et comptes de résultat des trois derniers exercices',
      'Bail commercial 3-6-9 et avenants',
      'Contrats de travail et registre du personnel',
      'Attestations de régularité fiscale et sociale',
      'Liste des dix premiers clients et part du chiffre d\'affaires, avec les contrats cadres en cours',
      'Diagnostics techniques du local (amiante, électricité, accessibilité)',
    ];
    const statuses = ['completed', 'in_progress', 'pending'];
    const tasks = Array.from({ length: 34 }, (_, i) => ({
      category: categories[i % categories.length],
      title: titles[i % titles.length],
      status: statuses[i % statuses.length],
      created_at: `2026-09-${String((i % 28) + 1).padStart(2, '0')}T09:00:00Z`,
      completed_at: i % 3 === 0 ? `2026-10-${String((i % 12) + 1).padStart(2, '0')}T15:30:00Z` : null,
    }));
    const pdf = await buildDueDiligenceReport(tasks, 'Boulangerie du Parc', t, 'fr');
    const bytes = pdf.toArrayBuffer();
    expect(bytes.byteLength).toBeGreaterThan(20_000);
    expect(pdf.doc.getNumberOfPages()).toBeGreaterThan(2);
    if (process.env.PDF_OUT_DD) writeFileSync(process.env.PDF_OUT_DD, Buffer.from(bytes));
  });

  it('produit le rapport en anglais, même sans tâche', async () => {
    const pdf = await buildDueDiligenceReport([], 'Parc Bakery', t, 'en');
    expect(pdf.toArrayBuffer().byteLength).toBeGreaterThan(20_000);
  });

  it("produit le journal d'accès sur plusieurs pages", async () => {
    const people = ['Marie Dupont', 'Karim Benali', 'Sophie Lefèvre-Martineau', null, 'Cabinet Audit & Conseil Rhône-Alpes'];
    const files = ['Bilan 2025.pdf', 'Liasse fiscale 2024 complète avec annexes.pdf', 'Bail commercial.pdf', null, 'Contrats fournisseurs.zip'];
    const logs = Array.from({ length: 140 }, (_, i) => ({
      viewed_at: i % 7 === 0 ? null : new Date(Date.UTC(2026, 8, 1 + (i % 30), 8 + (i % 10), (i * 7) % 60, (i * 13) % 60)).toISOString(),
      created_at: new Date(Date.UTC(2026, 8, 1 + (i % 30), 7, 0, 0)).toISOString(),
      viewer: people[i % people.length] ? { full_name: people[i % people.length] } : null,
      document: files[i % files.length] ? { name: files[i % files.length] } : null,
    }));
    const pdf = await buildVDRAuditTrail(logs, 'Boulangerie du Parc', t, 'fr');
    const bytes = pdf.toArrayBuffer();
    expect(bytes.byteLength).toBeGreaterThan(20_000);
    expect(pdf.doc.getNumberOfPages()).toBeGreaterThan(4);
    if (process.env.PDF_OUT_VDR) writeFileSync(process.env.PDF_OUT_VDR, Buffer.from(bytes));
  });
});
