import { describe, it, expect, beforeAll, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import type { TFunction } from 'i18next';
import { buildDueDiligenceReport, buildVDRAuditTrail } from './pdfExport';
import { DUE_DILIGENCE_WORDING } from './pdf/dueDiligence';
import { DATA_ROOM_LOG_WORDING } from './pdf/dataRoomLog';
import { PDF_LANGS } from './pdf/wording';
import { checkAndSavePdf, outOfMargins, takeWrittenTexts, usePublicFolderForPdf } from './pdf/pdfTestKit';

// chaque texte écrit est noté : contenu et position
vi.mock('jspdf', async (importOriginal) => (await import('./pdf/pdfTestKit')).trackedJsPdf(await importOriginal()));

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

  // Tâches inventées, dans la langue du document comme le site les envoie (ici en allemand pour les mots longs).
  // Sortie : PDF_OUT_DD pour le français, avec le suffixe « -de », « -es »… pour les autres langues.
  it.each(PDF_LANGS)('produit le rapport de due diligence dans la langue du document (%s)', async (lang) => {
    takeWrittenTexts();
    const categories = ['Finanzen', 'Recht', 'Personal', 'Steuern', 'Geschäftsbeziehungen', 'Immobilien'];
    const titles = [
      'Bilanzen sowie Gewinn- und Verlustrechnungen der letzten drei Geschäftsjahre',
      'Gewerbemietvertrag und Nachträge',
      'Arbeitsverträge und Personalverzeichnis',
      'Unbedenklichkeitsbescheinigungen (Steuern und Sozialversicherung)',
      'Liste der zehn größten Kunden mit Umsatzanteil und laufenden Rahmenverträgen',
      'Technische Gutachten zum Geschäftslokal (Asbest, Elektrik, Barrierefreiheit)',
    ];
    const statuses = ['completed', 'in_progress', 'pending'];
    const tasks = Array.from({ length: 34 }, (_, i) => ({
      category: categories[i % categories.length],
      title: titles[i % titles.length],
      status: statuses[i % statuses.length],
      created_at: `2026-09-${String((i % 28) + 1).padStart(2, '0')}T09:00:00Z`,
      completed_at: i % 3 === 0 ? `2026-10-${String((i % 12) + 1).padStart(2, '0')}T15:30:00Z` : null,
    }));
    const pdf = await buildDueDiligenceReport(tasks, 'Bäckerei am Stadtpark', t, lang);
    const bytes = checkAndSavePdf(pdf, process.env.PDF_OUT_DD, lang);
    expect(bytes.byteLength).toBeGreaterThan(20_000);
    const texts = takeWrittenTexts();
    const all = texts.map((t) => t.text).join(' ');
    expect(outOfMargins(texts)).toEqual([]);
    expect(all).toContain(DUE_DILIGENCE_WORDING.kind[lang].toUpperCase());
    expect(all).toContain(DUE_DILIGENCE_WORDING.progressTitle[lang]);
    for (const key of ['statusCompleted', 'statusInProgress', 'statusPending'] as const) expect(all).toContain(DUE_DILIGENCE_WORDING[key][lang]);
    // dates courtes dans la langue du document
    expect(all).toContain(lang === 'de' ? '01.09.2026' : '01/09/2026');
  });

  // Sortie : PDF_OUT_VDR pour le français, avec le suffixe « -de », « -es »… pour les autres langues.
  it.each(PDF_LANGS)("produit le journal d'accès dans la langue du document (%s)", async (lang) => {
    takeWrittenTexts();
    const logs = Array.from({ length: 12 }, (_, i) => ({
      viewed_at: new Date(Date.UTC(2026, 8, 1 + i, 8 + i, 7, 13)).toISOString(),
      created_at: null,
      viewer: i % 4 === 3 ? null : { full_name: ['Marie Dupont', 'Wirtschaftsprüfungsgesellschaft Rhein-Main', 'Karim Benali'][i % 3] },
      document: i % 5 === 4 ? null : { name: ['Bilanz 2025.pdf', 'Gewerbemietvertrag mit sämtlichen Nachträgen.pdf'][i % 2] },
    }));
    const pdf = await buildVDRAuditTrail(logs, 'Bäckerei am Stadtpark', t, lang);
    const bytes = checkAndSavePdf(pdf, process.env.PDF_OUT_VDR, lang);
    expect(bytes.byteLength).toBeGreaterThan(20_000);
    const texts = takeWrittenTexts();
    const all = texts.map((t) => t.text).join(' ');
    expect(outOfMargins(texts)).toEqual([]);
    expect(all).toContain(DATA_ROOM_LOG_WORDING.historyTitle[lang]);
    expect(all).toContain(DATA_ROOM_LOG_WORDING.secureAccess[lang]);
    expect(all).toContain(DATA_ROOM_LOG_WORDING.unknownUser[lang]);
    expect(all).toContain(DATA_ROOM_LOG_WORDING.unknownFile[lang]);
    if (lang !== 'fr') expect(all).not.toContain('Accès sécurisé');
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
