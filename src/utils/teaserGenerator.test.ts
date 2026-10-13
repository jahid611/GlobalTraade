import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TFunction } from 'i18next';
import type { Listing } from '@/types/domain';
import { setPdfAssetLoader } from './pdfTemplate';
import { buildBlindTeaser } from './teaserGenerator';
import { TEASER_WORDING } from './pdf/teaser';
import { PDF_LANGS } from './pdf/wording';
import { checkAndSavePdf } from './pdf/pdfTestKit';

const t = ((key: string, opts?: { defaultValue?: string }) => (key === 'industry.restauration' ? 'Restauration' : opts?.defaultValue ?? key)) as unknown as TFunction;

// Annonce inventée pour l'exemple.
const listing: Listing = {
  id: 'a1b2c3', name: 'Brasserie des Halles', owner_id: 'u1', industry: 'restauration',
  address: '12 rue des Halles, 69002 Lyon', lat: 45.76, lng: 4.83, location: null,
  price: 420000, rent: 38400, employees: 9, surface: 145, siret: '12345678900012', hide_siret: false,
  logo_url: null, website_url: 'https://brasserie-des-halles.example', image_urls: null,
  established_year: 2011, requires_nda: true, management_type: 'Gérant salarié en place',
  client_concentration: 'Clientèle diversifiée', digital_maturity: 'Réservation en ligne', market_trend: 'Stable',
  is_premium: true, status: null, share_financials: true, boosted_until: null,
  created_at: '2026-09-01T08:00:00Z', updated_at: null,
  last_confirmed_at: null, renewal_requested_at: null, inactive_since: null, renewal_reminder_sent_at: null,
  revenue_n1: 780000, revenue_n2: 742000, revenue_n3: 695000, ebitda: 118000,
  description: 'Brasserie traditionnelle de 80 couverts.', reason_for_selling: 'Départ à la retraite', lease_details: 'Bail 3-6-9',
  view_count: 0, favorites_count: 0,
};

// Tout le texte confié au gabarit : la couverture (meta) puis chaque écriture des pages.
const written: string[] = [];
vi.mock('./pdfTemplate', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./pdfTemplate')>();
  return {
    ...actual,
    createGloblyPdf: async (meta: Parameters<typeof actual.createGloblyPdf>[0]) => {
      written.push(JSON.stringify(meta));
      const pdf = await actual.createGloblyPdf(meta);
      const text = pdf.doc.text.bind(pdf.doc);
      pdf.doc.text = ((...args: Parameters<typeof text>) => {
        written.push(Array.isArray(args[0]) ? args[0].join(' ') : String(args[0]));
        return text(...args);
      }) as typeof pdf.doc.text;
      return pdf;
    },
  };
});

describe('teaser anonyme', () => {
  beforeEach(() => { written.length = 0; });
  beforeAll(() => setPdfAssetLoader(async (path) => readFileSync(resolve(process.cwd(), 'public', path.replace(/^\//, ''))).toString('base64')));

  // Sortie : PDF_OUT pour le français, avec le suffixe « -pt », « -de »… pour les autres langues.
  it.each(PDF_LANGS)('produit un PDF complet dans la langue du document (%s)', async (lang) => {
    const { pdf, filename } = await buildBlindTeaser(listing, t, lang);
    const bytes = checkAndSavePdf(pdf, process.env.PDF_OUT, lang);
    expect(bytes.byteLength).toBeGreaterThan(20_000);
    expect(pdf.doc.getNumberOfPages()).toBeGreaterThanOrEqual(2); // couverture + contenu
    expect(filename).toMatch(new RegExp(`^Teaser_${TEASER_WORDING.fileProject[lang]}_[A-Z]+\\.pdf$`));
    const all = written.join(' ');
    expect(all).toContain(TEASER_WORDING.opportunity[lang]);
    expect(all).toContain(TEASER_WORDING.indicatorsTitle[lang]);
    expect(all).toContain(TEASER_WORDING.disclaimerTitle[lang]);
    const money: Record<string, string> = { fr: '420 000 €', en: '€420,000', es: '420.000 €', it: '420.000 €', pt: '420 000 €', de: '420.000 €' };
    expect(all).toContain(money[lang]);
  });

  it('écrit chaque langue avec ses propres textes et ses propres nombres', async () => {
    const { filename } = await buildBlindTeaser(listing, t, 'de');
    const all = written.join(' ');
    expect(filename).toMatch(/^Teaser_Projekt_[A-Z]+\.pdf$/);
    expect(all).toContain('Übernahmemöglichkeit');
    expect(all).not.toContain('Acquisition Opportunity');
    expect(all).not.toContain("Opportunité d'Acquisition");
    expect(all).toContain('420.000 €'); // nombres à l'allemande
    written.length = 0;
    await buildBlindTeaser(listing, t, 'en');
    expect(written.join(' ')).toContain('€420,000');
    written.length = 0;
    await buildBlindTeaser(listing, t, 'fr');
    expect(written.join(' ')).toContain('420 000 €');
    expect(written.join(' ')).toContain("Opportunité d'Acquisition");
  });

  it("ne laisse passer ni le nom ni l'adresse de l'entreprise", async () => {
    await buildBlindTeaser(listing, t, 'fr');
    const all = written.join(' ');
    expect(all).toContain('Restauration');
    expect(all).toContain('780');
    for (const secret of ['Brasserie', 'Halles', 'Lyon', '69002', '12345678900012', 'brasserie-des-halles', 'retraite']) {
      expect(all).not.toContain(secret);
    }
  });

  it.each(PDF_LANGS)("reste anonyme dans toutes les langues (%s)", async (lang) => {
    await buildBlindTeaser(listing, t, lang);
    const all = written.join(' ');
    for (const secret of ['Brasserie', 'Halles', 'Lyon', '69002', '12345678900012', 'brasserie-des-halles', 'retraite']) {
      expect(all).not.toContain(secret);
    }
  });
});
