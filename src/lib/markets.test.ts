import { describe, it, expect } from 'vitest';
import { MARKETS, MARKET_CODES, marketOf, regionKeyFor, regionIso, regionCountry, marketRegionLabel, legacyFrRegionKey, localeFor, formatMoney, formatDate } from './markets';

describe('marchés', () => {
  it('rend les règles du pays, la France par défaut, et des règles génériques ailleurs', () => {
    expect(marketOf('ES').identifier.name).toBe('NIF');
    expect(marketOf('de').identifier.name).toBe('Handelsregisternummer');
    expect(marketOf(null).code).toBe('FR');
    expect(marketOf('BR').code).toBe('XX');
  });

  it('contrôle le format des identifiants de chaque pays', () => {
    expect(MARKETS.FR.identifier.isValid('73282932000074')).toBe(true);
    expect(MARKETS.FR.identifier.isValid('12345678901234')).toBe(false);
    expect(MARKETS.ES.identifier.isValid('B-12345678')).toBe(true);
    expect(MARKETS.ES.identifier.isValid('12345678Z')).toBe(true);
    expect(MARKETS.ES.identifier.isValid('1234')).toBe(false);
    // 501442600 : la clé modulo 11 tombe juste
    expect(MARKETS.PT.identifier.isValid('501 442 600')).toBe(true);
    expect(MARKETS.PT.identifier.isValid('501442601')).toBe(false);
    // 00743110157 : clé de Luhn correcte
    expect(MARKETS.IT.identifier.isValid('00743110157')).toBe(true);
    expect(MARKETS.IT.identifier.isValid('00743110158')).toBe(false);
    expect(MARKETS.DE.identifier.isValid('HRB 123456')).toBe(true);
    expect(MARKETS.DE.identifier.isValid('DE123456789')).toBe(true);
    expect(MARKETS.DE.identifier.isValid('12345')).toBe(false);
    expect(MARKETS.GB.identifier.isValid('01234567')).toBe(true);
    expect(MARKETS.GB.identifier.isValid('SC123456')).toBe(true);
    expect(MARKETS.GB.identifier.isValid('1234')).toBe(false);
  });

  it('nettoie la saisie sans perdre les lettres utiles', () => {
    expect(MARKETS.ES.identifier.clean('b-1234.5678')).toBe('B12345678');
    expect(MARKETS.DE.identifier.clean('hrb  123456')).toBe('HRB 123456');
    expect(MARKETS.FR.identifier.clean('394 927 081 00114')).toBe('39492708100114');
  });

  it('chaque pays a des régions aux codes uniques, préfixés par le pays', () => {
    const all = MARKET_CODES.flatMap((c) => MARKETS[c].regions.map((reg) => reg.key));
    expect(new Set(all).size).toBe(all.length);
    MARKET_CODES.forEach((c) => MARKETS[c].regions.forEach((reg) => expect(reg.key.startsWith(`${c}-`)).toBe(true)));
    expect(MARKETS.ES.regions).toHaveLength(19);
    expect(MARKETS.DE.regions).toHaveLength(16);
    expect(MARKETS.IT.regions).toHaveLength(20);
    expect(MARKETS.PT.regions).toHaveLength(20);
    expect(MARKETS.FR.regions).toHaveLength(13);
  });

  it("retrouve la région d'une adresse, par code ou par nom, dans plusieurs langues", () => {
    expect(regionKeyFor('ES', 'ES-CT')).toBe('ES-CT');
    expect(regionKeyFor('ES', 'Catalunya')).toBe('ES-CT');
    expect(regionKeyFor('DE', 'Bavaria')).toBe('DE-BY');
    expect(regionKeyFor('DE', 'Bayern')).toBe('DE-BY');
    expect(regionKeyFor('IT', 'Lombardie')).toBe('IT-25');
    expect(regionKeyFor('FR', 'Auvergne-Rhône-Alpes')).toBe('FR-ARA');
    expect(regionKeyFor('GB', 'Scotland')).toBe('GB-SCT');
    expect(regionKeyFor('PT', 'Lisboa')).toBe('PT-11');
    expect(regionKeyFor('ES', 'Bavaria')).toBeNull();
    expect(regionKeyFor('BR', 'São Paulo')).toBeNull();
  });

  it('accepte encore les anciennes clés des régions françaises', () => {
    expect(regionIso('idf')).toBe('FR-IDF');
    expect(regionIso('ES-CT')).toBe('ES-CT');
    expect(regionCountry('paca')).toBe('FR');
    expect(regionCountry('DE-BY')).toBe('DE');
    expect(marketRegionLabel('ara')).toBe('Auvergne-Rhône-Alpes');
    expect(legacyFrRegionKey('FR-IDF')).toBe('idf');
    expect(legacyFrRegionKey('ES-CT')).toBeUndefined();
  });

  it('écrit montants et dates dans la langue du visiteur', () => {
    expect(localeFor('de')).toBe('de-DE');
    expect(localeFor('en')).toBe('en-GB');
    expect(localeFor(undefined)).toBe('fr-FR');
    expect(formatMoney(280000, 'de').replace(/\s/g, ' ')).toBe('280.000 €');
    expect(formatMoney(280000, 'en')).toBe('€280,000');
    expect(formatMoney(null, 'fr')).toBe('');
    expect(formatDate('2026-10-13T10:00:00Z', 'es')).toBe('13 de octubre de 2026');
    expect(formatDate('', 'fr')).toBe('');
  });
});
