import { describe, it, expect } from 'vitest';
import { normalizeText, parseAmount, parseAmountOrZero, parseCount, parseYear, parseYesNo } from './normalize';

describe('normalizeText', () => {
  it('met en minuscules, retire accents et ponctuation, compacte les espaces', () => {
    expect(normalizeText("  C'est quoi l'EBE ?  ")).toBe('c est quoi l ebe');
    expect(normalizeText('Boulangerie-Pâtisserie,  à   Lyon !')).toBe('boulangerie patisserie a lyon');
    expect(normalizeText('Chef-d’œuvre')).toBe('chef d oeuvre');
    expect(normalizeText(' … ')).toBe('');
  });
});

describe('parseAmount', () => {
  it.each([
    ['300 000', 300000],
    ['300000 €', 300000],
    ['300k', 300000],
    ['300 k€', 300000],
    ['1,2 M', 1200000],
    ['1.2 million', 1200000],
    ['45 mille', 45000],
    ['25 000 euros', 25000],
  ])('lit « %s »', (text, expected) => {
    expect(parseAmount(text)).toBe(expected);
  });

  it.each([
    ['environ 250 000 € par an', 250000],
    ['300\u00a0000\u00a0€', 300000],
    ['300\u202f000 €', 300000],
    ['300.000', 300000],
    ['1 250 000,50 €', 1250001],
    ['2 millions', 2000000],
    ['1,5 M€', 1500000],
    ['80K', 80000],
    ['-5 000', -5000],
    ['0', 0],
  ])('lit aussi « %s »', (text, expected) => {
    expect(parseAmount(text)).toBe(expected);
  });

  it('ne prend pas le début d\'un mot pour une unité', () => {
    expect(parseAmount('300 mois')).toBe(300);
    expect(parseAmount('12 kilos')).toBe(12);
  });

  it('refuse un texte sans nombre', () => {
    expect(parseAmount('je ne sais pas')).toBeNull();
    expect(parseAmount("c'est quoi l'EBE ?")).toBeNull();
    expect(parseAmount('')).toBeNull();
  });

  it('parseAmountOrZero comprend « aucun » comme zéro', () => {
    expect(parseAmountOrZero('aucun')).toBe(0);
    expect(parseAmountOrZero('rien du tout')).toBe(0);
    expect(parseAmountOrZero('60 000')).toBe(60000);
    expect(parseAmountOrZero('beaucoup')).toBeNull();
  });
});

describe('parseYesNo', () => {
  it('reconnaît oui, non et leurs variantes', () => {
    for (const text of ['oui', 'Ouais', 'Oui !', 'yes', 'bien sûr', "d'accord"]) expect(parseYesNo(text, 'fr')).toBe('yes');
    for (const text of ['non', 'Non pas vraiment', 'no', 'pas du tout', 'nope']) expect(parseYesNo(text, 'fr')).toBe('no');
    expect(parseYesNo('yes', 'en')).toBe('yes');
    expect(parseYesNo('not really', 'en')).toBe('no');
  });

  it('rend « unknown » pour « je ne sais pas »', () => {
    for (const text of ['je ne sais pas', 'Je sais pas trop', 'aucune idée', 'pas sûr', "I don't know", 'not sure']) {
      expect(parseYesNo(text, 'fr')).toBe('unknown');
    }
  });

  it('rend null pour ce qui n\'est pas une réponse', () => {
    expect(parseYesNo("c'est quoi l'EBE ?", 'fr')).toBeNull();
    expect(parseYesNo('boulangerie', 'fr')).toBeNull();
    expect(parseYesNo('45 000', 'fr')).toBeNull();
  });
});

describe('parseCount et parseYear', () => {
  it('lit un nombre de salariés', () => {
    expect(parseCount('3 salariés')).toBe(3);
    expect(parseCount('aucun')).toBe(0);
    expect(parseCount('je travaille seul')).toBe(0);
    expect(parseCount('quelques-uns')).toBeNull();
  });

  it('lit une année à quatre chiffres', () => {
    expect(parseYear('depuis 2008')).toBe(2008);
    expect(parseYear('1987')).toBe(1987);
    expect(parseYear('12')).toBeNull();
    expect(parseYear('120000')).toBeNull();
  });
});
