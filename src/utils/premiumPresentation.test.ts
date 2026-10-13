import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TFunction } from 'i18next';
import type { Listing } from '@/types/domain';
import { setPdfAssetLoader } from './pdfTemplate';
import { buildPremiumPresentation } from './premiumPresentation';

const t = ((key: string, opts?: { defaultValue?: string }) => (key === 'industry.restauration' ? 'Restauration' : opts?.defaultValue ?? key)) as unknown as TFunction;

const publicFile = (path: string) => readFileSync(resolve(process.cwd(), 'public', path.replace(/^\//, ''))).toString('base64');

// Annonce inventée pour l'exemple. Le logo est une data URL : aucun appel réseau.
const listing: Listing = {
  id: 'a1b2c3', name: 'Brasserie des Halles', owner_id: 'u1', industry: 'restauration',
  address: '12 rue des Halles, 69002 Lyon', lat: 45.76, lng: 4.83, location: null,
  price: 420000, rent: 38400, employees: 9, surface: 145, siret: '12345678900012', hide_siret: false,
  logo_url: `data:image/png;base64,${publicFile('/logo.png')}`,
  website_url: 'https://brasserie-des-halles.example', image_urls: null,
  established_year: 2011, requires_nda: true, management_type: 'Gérant salarié en place, équipe autonome',
  client_concentration: 'Clientèle diversifiée, aucun client au-dessus de 5 % du chiffre', digital_maturity: 'Réservation en ligne et caisse connectée', market_trend: 'Stable',
  is_premium: true, status: null, share_financials: true, boosted_until: null,
  created_at: '2026-09-01T08:00:00Z', updated_at: null,
  last_confirmed_at: null, renewal_requested_at: null, inactive_since: null, renewal_reminder_sent_at: null,
  revenue_n1: 780000, revenue_n2: 742000, revenue_n3: 695000, ebitda: 118000,
  description: [
    "Brasserie traditionnelle de 80 couverts en salle et 40 en terrasse, installée depuis 2011 au cœur du quartier des Halles. L'établissement sert une cuisine de marché le midi et une carte plus large le soir, sept jours sur sept.",
    "La clientèle se partage entre les salariés des bureaux voisins en semaine et une clientèle de quartier et de passage le week-end. L'équipe de neuf personnes, dont un chef en poste depuis huit ans, assure le service sans la présence quotidienne du dirigeant.",
    "Le matériel de cuisine a été renouvelé en 2023 et la salle rénovée en 2021. La licence IV est comprise dans la cession.",
  ].join('\n'),
  reason_for_selling: 'Départ à la retraite', lease_details: 'Bail 3-6-9',
  view_count: 0, favorites_count: 0,
};

describe('dossier de présentation premium', () => {
  beforeAll(() => setPdfAssetLoader(async (path) => publicFile(path)));

  it.each(['fr', 'en'])('produit un PDF complet avec le logo (%s)', async (lang) => {
    const { pdf, filename } = await buildPremiumPresentation(listing, t, lang);
    const bytes = pdf.toArrayBuffer();
    expect(bytes.byteLength).toBeGreaterThan(20_000);
    expect(pdf.doc.getNumberOfPages()).toBeGreaterThanOrEqual(2); // couverture + contenu
    expect(filename).toBe('Presentation-Brasserie-des-Halles-Globly.pdf');
    if (process.env.PDF_OUT && lang === 'fr') writeFileSync(process.env.PDF_OUT, Buffer.from(bytes));
  });

  it('fonctionne sans logo et avec une annonce presque vide', async () => {
    const empty: Listing = {
      ...listing, logo_url: null, description: null, established_year: null, price: null, revenue_n1: null, revenue_n2: null, revenue_n3: null,
      ebitda: null, employees: null, surface: null, rent: null, website_url: null, address: null,
      management_type: null, client_concentration: null, digital_maturity: null, market_trend: null,
    };
    const { pdf } = await buildPremiumPresentation(empty, t, 'fr');
    expect(pdf.toArrayBuffer().byteLength).toBeGreaterThan(20_000);
  });
});
