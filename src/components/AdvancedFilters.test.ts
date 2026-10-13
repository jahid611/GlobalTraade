import { describe, it, expect } from 'vitest';
import { matchesTeamSize, matchesMinAge } from './AdvancedFilters';
import { matchGeo, withCountries } from '@/lib/geoRegions';

describe('filtres de la marketplace', () => {
  it('range un effectif dans la bonne tranche', () => {
    expect(matchesTeamSize(4, '')).toBe(true);
    expect(matchesTeamSize(5, '1-5')).toBe(true);
    expect(matchesTeamSize(6, '1-5')).toBe(false);
    expect(matchesTeamSize(6, '6-20')).toBe(true);
    expect(matchesTeamSize(20, '6-20')).toBe(true);
    expect(matchesTeamSize(21, '21+')).toBe(true);
    // effectif absent : l'annonce ne peut pas être rangée, elle sort du filtre
    expect(matchesTeamSize(null, '1-5')).toBe(false);
  });

  it("compare l'ancienneté à l'année en cours", () => {
    const year = new Date().getFullYear();
    expect(matchesMinAge(year - 10, '10')).toBe(true);
    expect(matchesMinAge(year - 9, '10')).toBe(false);
    expect(matchesMinAge(year - 4, '3')).toBe(true);
    expect(matchesMinAge(null, '5')).toBe(false);
    expect(matchesMinAge(null, '')).toBe(true);
  });

  it('retirer un pays retire ses régions', () => {
    const filters = { countries: ['FR', 'ES'], regions: ['idf', 'ES-CT'], priceMin: '100' };
    expect(withCountries(filters, ['ES'])).toEqual({ countries: ['ES'], regions: ['ES-CT'], priceMin: '100' });
    // aucun pays = tous les pays : les régions déjà choisies restent
    expect(withCountries(filters, [])).toEqual({ countries: [], regions: ['idf', 'ES-CT'], priceMin: '100' });
  });

  it('filtre par pays et par région', () => {
    const barcelona = { country: 'ES', region: 'ES-CT', address: 'Carrer de Mallorca 75, 08013 Barcelona' };
    const paris = { country: 'FR', region: null, address: '10 rue de Rivoli, 75004 Paris' };
    const none = { countries: [] as string[], regions: [] as string[] };
    expect([barcelona, paris].filter((l) => matchGeo(l, none))).toHaveLength(2);
    expect([barcelona, paris].filter((l) => matchGeo(l, { ...none, countries: ['ES'] }))).toEqual([barcelona]);
    expect([barcelona, paris].filter((l) => matchGeo(l, { ...none, regions: ['ES-CT'] }))).toEqual([barcelona]);
    // ancien filtre français : « 75 » dans une adresse espagnole ne suffit plus
    expect([barcelona, paris].filter((l) => matchGeo(l, { ...none, regions: ['idf'] }))).toEqual([paris]);
  });
});
