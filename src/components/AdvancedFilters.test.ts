import { describe, it, expect } from 'vitest';
import { matchesTeamSize, matchesMinAge } from './AdvancedFilters';

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
});
