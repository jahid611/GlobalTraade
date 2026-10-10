import { describe, it, expect } from 'vitest';
import { isOfferMessage, isPurchaseOfferMessage, financingKind } from './offers';

describe('isOfferMessage', () => {
  it('reconnaît une offre par son type', () => {
    expect(isOfferMessage({ type: 'offer', content: 'OFFRE: 100000€', metadata: { amount: 100000 } })).toBe(true);
    expect(isOfferMessage({ type: 'need_offer', content: 'PROPOSITION AIDE: 10h', metadata: { amount: '10h' } })).toBe(true);
  });

  it("ne prend pas un message libre commençant par « OFFRE: » pour une offre", () => {
    expect(isOfferMessage({ content: 'OFFRE: je vous propose de déjeuner' })).toBe(false);
    expect(isOfferMessage({ type: 'text', content: 'OFFRE: 5', metadata: null })).toBe(false);
    expect(isOfferMessage({ content: 'PROPOSITION AIDE: un coup de main ?', metadata: {} })).toBe(false);
  });

  it('garde la rétrocompatibilité des anciens messages portant un montant', () => {
    expect(isOfferMessage({ content: 'OFFRE: 250000€', metadata: { amount: 250000 } })).toBe(true);
    expect(isOfferMessage({ content: 'Bonjour', metadata: { amount: 250000 } })).toBe(false);
  });

  it('distingue offre d\'achat et proposition d\'aide', () => {
    expect(isPurchaseOfferMessage({ type: 'offer', content: 'OFFRE: 1€' })).toBe(true);
    expect(isPurchaseOfferMessage({ type: 'need_offer', content: 'PROPOSITION AIDE: 1' })).toBe(false);
    expect(isPurchaseOfferMessage({ content: 'PROPOSITION AIDE: 1', metadata: { amount: 1 } })).toBe(false);
    expect(isPurchaseOfferMessage({ content: 'OFFRE: salut' })).toBe(false);
  });
});

describe('financingKind', () => {
  it('gère la répartition { loan, equity }', () => {
    expect(financingKind({ loan: 0, equity: 100 })).toBe('cash');
    expect(financingKind({ loan: 50, equity: 50 })).toBe('mixed');
    expect(financingKind({ loan: 100, equity: 0 })).toBe('loan');
  });

  it("gère l'ancienne forme en chaîne et l'absence de valeur", () => {
    expect(financingKind('cash')).toBe('cash');
    expect(financingKind('mixed')).toBe('mixed');
    expect(financingKind('loan')).toBe('loan');
    expect(financingKind(undefined)).toBe('unknown');
    expect(financingKind(null)).toBe('unknown');
    expect(financingKind('autre')).toBe('unknown');
  });
});
