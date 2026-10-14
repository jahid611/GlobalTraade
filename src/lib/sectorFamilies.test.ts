import { describe, expect, it } from 'vitest';
import { INDUSTRIES } from './industries';
import { SECTOR_FAMILIES, sectorFamily, sectorFit, unclassifiedSectors } from './sectorFamilies';

describe('familles de secteurs', () => {
  it('classe tous les secteurs de la liste maîtresse', () => {
    expect(unclassifiedSectors()).toEqual([]);
  });

  it('ne classe que des secteurs qui existent, une seule fois chacun', () => {
    const all = Object.values(SECTOR_FAMILIES).flat() as string[];
    expect(all.filter((s) => !INDUSTRIES.includes(s))).toEqual([]);
    expect(all.filter((s, i) => all.indexOf(s) !== i)).toEqual([]);
  });

  it('rapproche les activités qui se ressemblent', () => {
    expect(sectorFamily('Italian Restaurant')).toBe('restauration');
    expect(sectorFit('Italian Restaurant', ['Italian Restaurant'])).toBe('exact');
    expect(sectorFit('Italian Restaurant', ['Traditional Restaurant'])).toBe('family');
    // « Restaurant » est un secteur large : il vise toute la restauration
    expect(sectorFit('Italian Restaurant', ['Restaurant'])).toBe('exact');
    expect(sectorFit('Bar', ['Restaurant'])).toBe('neighbour');
  });

  it('ne rapproche pas ce qui n’a rien à voir', () => {
    expect(sectorFit('Car Garage', ['Restaurant', 'E-commerce'])).toBe('none');
    expect(sectorFit('Bakery-Pastry', ['Car Garage'])).toBe('none');
    expect(sectorFit('Other', ['Other'])).toBe('exact');
    expect(sectorFit('Other', ['Restaurant'])).toBe('none');
    expect(sectorFit('Car Garage', [])).toBe('none');
  });
});
