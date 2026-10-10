import { describe, it, expect } from 'vitest';
import { AMOUNT_RANGES } from './ranges';
import { rangeBounds, isInRange } from './rangeBounds';

// Le matching du tableau de bord compare le prix d'une annonce au budget du
// profil : ces tests verrouillent la conversion libellé → bornes en euros.

describe('rangeBounds', () => {
  it('convertit chaque tranche canonique', () => {
    expect(rangeBounds('< 100 k€')).toEqual({ min: 0, max: 100_000 });
    expect(rangeBounds('100 – 250 k€')).toEqual({ min: 100_000, max: 250_000 });
    expect(rangeBounds('250 – 500 k€')).toEqual({ min: 250_000, max: 500_000 });
    expect(rangeBounds('500 k€ – 1 M€')).toEqual({ min: 500_000, max: 1_000_000 });
    expect(rangeBounds('1 – 3 M€')).toEqual({ min: 1_000_000, max: 3_000_000 });
    expect(rangeBounds('3 – 5 M€')).toEqual({ min: 3_000_000, max: 5_000_000 });
    expect(rangeBounds('5 – 10 M€')).toEqual({ min: 5_000_000, max: 10_000_000 });
    expect(rangeBounds('> 10 M€')).toEqual({ min: 10_000_000, max: null });
  });

  it('couvre toutes les tranches de ranges.ts, sans trou ni chevauchement', () => {
    const all = AMOUNT_RANGES.map((label) => rangeBounds(label));
    expect(all.every(Boolean)).toBe(true);
    expect(all[0]!.min).toBe(0);
    expect(all[all.length - 1]!.max).toBeNull();
    for (let i = 1; i < all.length; i++) {
      // la borne haute d'une tranche est la borne basse de la suivante
      expect(all[i]!.min).toBe(all[i - 1]!.max);
      expect(all[i]!.min).toBeGreaterThan(all[i - 1]!.min);
    }
  });

  it('accepte un tiret simple ou des espaces différents (même tranche)', () => {
    expect(rangeBounds('100 - 250 k€')).toEqual({ min: 100_000, max: 250_000 });
    expect(rangeBounds('500 k€ — 1 M€')).toEqual({ min: 500_000, max: 1_000_000 });
    expect(rangeBounds('100\u00a0–\u00a0250\u00a0k€')).toEqual({ min: 100_000, max: 250_000 });
    expect(rangeBounds('>10 m€')).toEqual({ min: 10_000_000, max: null });
  });

  it('renvoie null pour tout ce qui n\'est pas une tranche canonique', () => {
    expect(rangeBounds(null)).toBeNull();
    expect(rangeBounds(undefined)).toBeNull();
    expect(rangeBounds('')).toBeNull();
    expect(rangeBounds('environ 300k')).toBeNull();
    expect(rangeBounds('100 – 300 k€')).toBeNull();
  });

  it('renvoie une copie (la table interne ne peut pas être modifiée)', () => {
    const b = rangeBounds('1 – 3 M€')!;
    b.min = -1;
    expect(rangeBounds('1 – 3 M€')).toEqual({ min: 1_000_000, max: 3_000_000 });
  });
});

describe('isInRange', () => {
  it('inclut les deux bornes', () => {
    expect(isInRange(100_000, '100 – 250 k€')).toBe(true);
    expect(isInRange(250_000, '100 – 250 k€')).toBe(true);
    expect(isInRange(99_999, '100 – 250 k€')).toBe(false);
    expect(isInRange(250_001, '100 – 250 k€')).toBe(false);
  });

  it('gère la tranche sans plafond', () => {
    expect(isInRange(50_000_000, '> 10 M€')).toBe(true);
    expect(isInRange(9_999_999, '> 10 M€')).toBe(false);
  });

  it('refuse une tranche inconnue ou un montant invalide', () => {
    expect(isInRange(200_000, 'budget libre')).toBe(false);
    expect(isInRange(Number.NaN, '100 – 250 k€')).toBe(false);
  });
});
