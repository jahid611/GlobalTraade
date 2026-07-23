import { describe, it, expect } from 'vitest';
import { normalizePlan, hasContentAccess, isPaidPlan, PLAN_RULES } from './planService';

// Ces tests verrouillent les règles de sécurité du bridage payant : ils doivent
// échouer si une future modification ré-ouvre une fuite de contenu payant.

describe('normalizePlan', () => {
  it('migre premium vers pro', () => {
    expect(normalizePlan('premium')).toBe('pro');
  });
  it('conserve pro et business', () => {
    expect(normalizePlan('pro')).toBe('pro');
    expect(normalizePlan('business')).toBe('business');
  });
  it('retombe sur free pour tout le reste', () => {
    expect(normalizePlan(null)).toBe('free');
    expect(normalizePlan(undefined)).toBe('free');
    expect(normalizePlan('inconnu')).toBe('free');
    expect(normalizePlan('')).toBe('free');
  });
});

describe('hasContentAccess — source unique de vérité du bridage payant', () => {
  it('accorde toujours l’accès au propriétaire', () => {
    expect(hasContentAccess({ isOwner: true, plan: 'free' })).toBe(true);
  });

  it('refuse l’accès à un free non propriétaire et non débloqué', () => {
    expect(hasContentAccess({ plan: 'free' })).toBe(false);
  });

  it('accorde l’accès à un plan payant confirmé', () => {
    expect(hasContentAccess({ plan: 'pro' })).toBe(true);
    expect(hasContentAccess({ plan: 'business' })).toBe(true);
  });

  it('NE fuite PAS pendant que le plan se rafraîchit (cache périmé possible)', () => {
    // Cœur du correctif : plan potentiellement périmé => on verrouille tant que
    // le rafraîchissement n’est pas confirmé.
    expect(hasContentAccess({ plan: 'business', planFetching: true })).toBe(false);
    expect(hasContentAccess({ plan: 'pro', planFetching: true })).toBe(false);
  });

  it('accorde l’accès sur un déblocage confirmé, même en free', () => {
    expect(hasContentAccess({ plan: 'free', unlocked: true })).toBe(true);
  });

  it('NE fuite PAS pendant que le déblocage se rafraîchit (changement de fiche)', () => {
    expect(hasContentAccess({ plan: 'free', unlocked: true, unlockFetching: true })).toBe(false);
  });

  it('le propriétaire garde l’accès même pendant un rafraîchissement', () => {
    expect(hasContentAccess({ isOwner: true, plan: 'free', planFetching: true })).toBe(true);
  });
});

describe('règles de plan', () => {
  it('free est bien le seul plan non payant', () => {
    expect(isPaidPlan('free')).toBe(false);
    expect(isPaidPlan('pro')).toBe(true);
    expect(isPaidPlan('business')).toBe(true);
  });
  it('free n’a pas accès complet aux annonces ni au CRM', () => {
    expect(PLAN_RULES.free.fullListingAccess).toBe(false);
    expect(PLAN_RULES.free.crm).toBe(false);
  });
  it('business a la prospection APE, pas pro', () => {
    expect(PLAN_RULES.business.prospectionContacts).toBeGreaterThan(0);
    expect(PLAN_RULES.pro.prospectionContacts).toBe(0);
  });
});
