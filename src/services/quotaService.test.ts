import { describe, it, expect } from 'vitest';
import { decideContactQuota } from './quotaService';

// Règle messagerie :
//  free     : verrouillée — sauf annonce débloquée à 5 € et réponses
//  pro      : 20 nouvelles conversations / mois
//  business : illimité

const base = {
  alreadyInitiated: false,
  existingConversation: false,
  usedThisMonth: 0,
  targetUnlocked: false,
} as const;

describe('decideContactQuota — business (illimité)', () => {
  it('autorise toujours, même à 1000 contacts', () => {
    const r = decideContactQuota({ ...base, plan: 'business', usedThisMonth: 1000 });
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(Infinity);
  });
});

describe('decideContactQuota — free (verrouillé)', () => {
  it('refuse un nouveau contact (raison locked, pour le bon CTA)', () => {
    const r = decideContactQuota({ ...base, plan: 'free' });
    expect(r).toEqual({ allowed: false, remaining: 0, reason: 'locked' });
  });

  it('autorise si l’annonce visée est débloquée à 5 €', () => {
    const r = decideContactQuota({ ...base, plan: 'free', targetUnlocked: true });
    expect(r.allowed).toBe(true);
  });

  it('autorise TOUJOURS la réponse à une conversation existante (vendeur gratuit)', () => {
    const r = decideContactQuota({ ...base, plan: 'free', existingConversation: true });
    expect(r.allowed).toBe(true);
  });

  it('autorise à recontacter quelqu’un avec qui on a déjà initié', () => {
    const r = decideContactQuota({ ...base, plan: 'free', alreadyInitiated: true });
    expect(r.allowed).toBe(true);
  });
});

describe('decideContactQuota — pro (20/mois)', () => {
  it('autorise sous le quota, avec le restant exact', () => {
    const r = decideContactQuota({ ...base, plan: 'pro', usedThisMonth: 5 });
    expect(r).toEqual({ allowed: true, remaining: 15, reason: undefined });
  });

  it('refuse au quota atteint (raison quota, pour le bon CTA)', () => {
    const r = decideContactQuota({ ...base, plan: 'pro', usedThisMonth: 20 });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('quota');
    expect(r.remaining).toBe(0);
  });

  it('le quota ne bloque jamais les conversations déjà engagées', () => {
    expect(decideContactQuota({ ...base, plan: 'pro', usedThisMonth: 20, alreadyInitiated: true }).allowed).toBe(true);
    expect(decideContactQuota({ ...base, plan: 'pro', usedThisMonth: 20, existingConversation: true }).allowed).toBe(true);
  });

  it('remaining ne devient jamais négatif', () => {
    const r = decideContactQuota({ ...base, plan: 'pro', usedThisMonth: 35, alreadyInitiated: true });
    expect(r.remaining).toBe(0);
  });
});
