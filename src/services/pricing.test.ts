import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PLAN_PRICES, UNLOCK_PRICE, BOOST_PRICE, EXTRA_PROSPECT_PRICE } from './planService';
import { computePublicationQuota, isApeLocked, PLAN_RULES } from './planService';
import { computeProspectionQuota, PROSPECTION_MONTHLY_INCLUDED } from './prospectService';

// ── Anti-dérive front / serveur ─────────────────────────────────────────────
// Les tarifs affichés au client (planService) et ceux réellement facturés par
// Stripe (Edge Function create-checkout-session) sont définis à deux endroits.
// Ce test lit la source de l'Edge Function et échoue si les montants divergent.
describe('cohérence des tarifs front ↔ Edge Function Stripe', () => {
  const src = readFileSync(
    resolve(__dirname, '../../supabase/functions/create-checkout-session/index.ts'),
    'utf8'
  );
  const cents = (key: string): number => {
    const m = src.match(new RegExp(`${key}:\\s*([0-9_]+)`));
    if (!m) throw new Error(`Tarif "${key}" introuvable dans l'Edge Function`);
    return parseInt(m[1].replace(/_/g, ''), 10);
  };

  it('pro = 70 € des deux côtés', () => {
    expect(cents('pro')).toBe(PLAN_PRICES.pro * 100);
  });
  it('business = 120 € des deux côtés', () => {
    expect(cents('business')).toBe(PLAN_PRICES.business * 100);
  });
  it('déblocage = 5 € des deux côtés', () => {
    expect(cents('unlock')).toBe(UNLOCK_PRICE * 100);
  });
  it('boost = 10 € des deux côtés', () => {
    expect(cents('boost')).toBe(BOOST_PRICE * 100);
  });
  it('prospection = 2 € des deux côtés', () => {
    expect(cents('prospection')).toBe(EXTRA_PROSPECT_PRICE * 100);
  });
});

// ── Quota de publication ────────────────────────────────────────────────────
describe('computePublicationQuota', () => {
  it('free : 1 annonce active maximum', () => {
    expect(computePublicationQuota('free', 0).allowed).toBe(true);
    expect(computePublicationQuota('free', 1).allowed).toBe(false);
  });
  it('pro : 5 annonces actives maximum', () => {
    expect(computePublicationQuota('pro', 4).allowed).toBe(true);
    expect(computePublicationQuota('pro', 5).allowed).toBe(false);
  });
  it('business : illimité', () => {
    expect(computePublicationQuota('business', 10_000).allowed).toBe(true);
  });
  it('renvoie used et limit pour le message d’upgrade', () => {
    expect(computePublicationQuota('pro', 5)).toEqual({ allowed: false, used: 5, limit: 5 });
  });
});

// ── Verrou APE en prospection ───────────────────────────────────────────────
describe('isApeLocked', () => {
  it('business déverrouille le code APE (le bug upgrade d’origine)', () => {
    expect(isApeLocked('business', false, false)).toBe(false);
  });
  it('pro et free restent verrouillés', () => {
    expect(isApeLocked('pro', false, false)).toBe(true);
    expect(isApeLocked('free', false, false)).toBe(true);
  });
  it('reste verrouillé pendant le rafraîchissement du plan (pas de fuite via cache)', () => {
    expect(isApeLocked('business', true, false)).toBe(true);
  });
  it('admin prospecte toujours librement', () => {
    expect(isApeLocked('free', false, true)).toBe(false);
    expect(isApeLocked('business', true, true)).toBe(false);
  });
});

// ── Facturation prospection au-delà du forfait ──────────────────────────────
describe('computeProspectionQuota', () => {
  it('les 20 premiers contacts du mois sont inclus', () => {
    expect(computeProspectionQuota(0).extra).toBe(false);
    expect(computeProspectionQuota(19).extra).toBe(false);
  });
  it('le 21e contact devient facturé 2 €', () => {
    expect(computeProspectionQuota(20).extra).toBe(true);
  });
  it('le forfait inclus correspond à la règle du plan Business', () => {
    expect(PROSPECTION_MONTHLY_INCLUDED).toBe(PLAN_RULES.business.prospectionContacts);
  });
});
