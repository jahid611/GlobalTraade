import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TFunction } from 'i18next';
import type { Listing } from '@/types/domain';
import { setPdfAssetLoader } from './pdfTemplate';
import { buildBlindTeaser } from './teaserGenerator';

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

  it.each(['fr', 'en'])('produit un PDF complet (%s)', async (lang) => {
    const { pdf, filename } = await buildBlindTeaser(listing, t, lang);
    const bytes = pdf.toArrayBuffer();
    expect(bytes.byteLength).toBeGreaterThan(20_000);
    expect(pdf.doc.getNumberOfPages()).toBeGreaterThanOrEqual(2); // couverture + contenu
    expect(filename).toMatch(lang === 'en' ? /^Teaser_Project_[A-Z]+\.pdf$/ : /^Teaser_Projet_[A-Z]+\.pdf$/);
    if (process.env.PDF_OUT && lang === 'fr') writeFileSync(process.env.PDF_OUT, Buffer.from(bytes));
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
});
