import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { INDUSTRIES } from '@/lib/industries';
import { INDUSTRIES_FR } from './industriesFr';
import { industryLabel, suggestIndustries } from './industryMatch';

describe('suggestIndustries', () => {
  it('boulangerie → Bakery, Bakery-Pastry', () => {
    expect(suggestIndustries('boulangerie', 'fr').slice(0, 2)).toEqual(['Bakery', 'Bakery-Pastry']);
    expect(suggestIndustries('Une Boulangerie', 'fr')[0]).toBe('Bakery');
  });

  it('coiffeur → Hairdressing, Hair Salon, Barber Shop', () => {
    expect(suggestIndustries('coiffeur', 'fr').slice(0, 3)).toEqual(['Hairdressing', 'Hair Salon', 'Barber Shop']);
  });

  it('resto → Restaurant en tête', () => {
    const found = suggestIndustries('resto', 'fr');
    expect(found[0]).toBe('Restaurant');
    expect(found).toContain('Traditional Restaurant');
  });

  it('garage → Car Garage en tête', () => {
    const found = suggestIndustries('garage', 'fr');
    expect(found[0]).toBe('Car Garage');
    expect(found).toContain('Motorcycle Garage');
  });

  it('comprend les synonymes courants et l\'anglais', () => {
    expect(suggestIndustries('bar-tabac', 'fr')[0]).toBe('Tobacco');
    expect(suggestIndustries('fleuriste', 'fr')[0]).toBe('Florist');
    expect(suggestIndustries('épicier', 'fr')[0]).toBe('Grocery Store');
    expect(suggestIndustries('institut de beauté', 'fr')[0]).toBe('Beauty Institute');
    expect(suggestIndustries('plombier', 'fr')[0]).toBe('Plumbing');
    expect(suggestIndustries('électricien', 'fr')[0]).toBe('Electricity');
    expect(suggestIndustries('pizzeria', 'fr')[0]).toBe('Pizzeria');
    expect(suggestIndustries('bakery', 'en')[0]).toBe('Bakery');
    expect(suggestIndustries('hairdresser', 'en')[0]).toBe('Hairdressing');
  });

  it('rend au plus 4 valeurs, toutes dans INDUSTRIES', () => {
    for (const trade of ['restaurant', 'coiffure', 'agence', 'bar', 'boulangerie', 'garage', 'transport']) {
      const found = suggestIndustries(trade, 'fr');
      expect(found.length).toBeLessThanOrEqual(4);
      for (const value of found) expect(INDUSTRIES).toContain(value);
    }
  });

  it('rend une liste vide pour un métier inconnu ou trop vague', () => {
    expect(suggestIndustries('astronaute', 'fr')).toEqual([]);
    expect(suggestIndustries('xyzzy', 'en')).toEqual([]);
    expect(suggestIndustries('mon commerce', 'fr')).toEqual([]);
    expect(suggestIndustries('', 'fr')).toEqual([]);
  });

  it('donne le libellé dans la langue demandée', () => {
    expect(industryLabel('Bakery', 'fr')).toBe('Boulangerie');
    expect(industryLabel('Bakery', 'en')).toBe('Bakery');
  });
});

describe('INDUSTRIES_FR', () => {
  it('reste identique à industriesFr de src/i18n.ts', () => {
    const source = readFileSync(path.resolve(__dirname, '../../../i18n.ts'), 'utf8');
    const start = source.indexOf('const industriesFr');
    const body = source.slice(source.indexOf('{', start), source.indexOf('\n};', start) + 2);
    expect(INDUSTRIES_FR).toEqual(JSON.parse(body));
  });

  it('retombe sur le libellé anglais pour un secteur sans traduction', () => {
    // « Fast Food Restaurant » n'a pas de libellé français dans src/i18n.ts.
    const untranslated = INDUSTRIES.filter(value => !(value in INDUSTRIES_FR));
    for (const value of untranslated) expect(industryLabel(value, 'fr')).toBe(value);
  });
});
