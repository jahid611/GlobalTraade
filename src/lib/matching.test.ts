import { describe, it, expect } from 'vitest';
import { scoreListing } from './matching';
import type { Listing } from '@/types/domain';
import type { MatchCriteria } from '@/components/SmartMatchForm';

const listing = (over: Partial<Listing>): Listing => ({
  id: 'x', name: 'Test', industry: 'Bakery', price: 300000, ebitda: 30000, ...over,
} as Listing);

const barcelona = listing({ country: 'ES', region: 'ES-CT', address: 'Carrer de Mallorca 75, 08013 Barcelona' });
const paris = listing({ country: 'FR', region: null, address: '10 rue de Rivoli, 75004 Paris' });

const criteria = (over: Partial<MatchCriteria>): MatchCriteria => ({ industries: [], regions: [], budgetMin: 0, budgetMax: 0, ...over });

describe('pertinence et pays', () => {
  it("l'Île-de-France ne correspond pas à une annonce de Barcelone", () => {
    const c = criteria({ regions: ['idf'] });
    const es = scoreListing(barcelona, c);
    const fr = scoreListing(paris, c);
    expect(fr.reasons).toContain('region');
    expect(es.reasons).not.toContain('region');
    expect(fr.score).toBeGreaterThan(es.score);
  });

  it('une région espagnole correspond à une annonce de cette région', () => {
    const c = criteria({ regions: ['ES-CT'] });
    expect(scoreListing(barcelona, c).reasons).toContain('region');
    expect(scoreListing(paris, c).reasons).not.toContain('region');
  });

  it('un pays seul compte comme une zone', () => {
    const c = criteria({ countries: ['ES'] });
    const es = scoreListing(barcelona, c);
    const fr = scoreListing(paris, c);
    expect(es.reasons).toContain('country');
    expect(fr.reasons).not.toContain('country');
    expect(es.score).toBeGreaterThan(fr.score);
  });

  it('sans zone, le pays ne change pas la note', () => {
    expect(scoreListing(barcelona, criteria({})).score).toBe(scoreListing(paris, criteria({})).score);
  });

  it('le projet du profil tient compte du pays', () => {
    const c = criteria({});
    expect(scoreListing(barcelona, c, { target_geo: 'ES' }).reasons).toContain('profile_geo');
    expect(scoreListing(barcelona, c, { target_geo: 'ES-CT' }).reasons).toContain('profile_geo');
    expect(scoreListing(barcelona, c, { target_geo: 'idf' }).reasons).not.toContain('profile_geo');
    expect(scoreListing(paris, c, { target_geo: 'idf,69' }).reasons).toContain('profile_geo');
    // ancienne saisie libre : toujours cherchée dans l'adresse
    expect(scoreListing(paris, c, { target_geo: 'Paris' }).reasons).toContain('profile_geo');
  });
});
