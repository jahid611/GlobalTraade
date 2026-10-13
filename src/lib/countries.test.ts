import { describe, it, expect } from 'vitest';
import { COUNTRY_CODES, canonicalCountry, countryLabel, countryOptions } from './countries';

describe('liste des pays', () => {
  it('contient tous les codes ISO, sans doublon', () => {
    expect(COUNTRY_CODES.length).toBe(249);
    expect(new Set(COUNTRY_CODES).size).toBe(COUNTRY_CODES.length);
    for (const code of COUNTRY_CODES) expect(code).toMatch(/^[A-Z]{2}$/);
  });

  it('chaque pays a un nom dans les six langues du site', () => {
    for (const lang of ['fr', 'en', 'es', 'it', 'pt', 'de']) {
      const options = countryOptions(lang);
      expect(options).toHaveLength(COUNTRY_CODES.length);
      for (const o of options) {
        expect(o.label.length).toBeGreaterThan(1);
        expect(o.label, `${o.value} sans nom en ${lang}`).not.toBe(o.value);
      }
      expect(new Set(options.map(o => o.label)).size).toBe(options.length);
    }
  });

  it('la France est en tête, le reste par ordre alphabétique', () => {
    const options = countryOptions('fr');
    expect(options[0]).toEqual({ value: 'FR', label: 'France' });
    const rest = options.slice(1).map(o => o.label);
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b, 'fr')));
  });

  it('relit les anciens noms comme leur code', () => {
    expect(canonicalCountry('France')).toBe('FR');
    expect(canonicalCountry(' royaume-uni ')).toBe('GB');
    expect(canonicalCountry('fr')).toBe('FR');
    expect(canonicalCountry('Atlantide')).toBe('');
    expect(canonicalCountry(null)).toBe('');
  });

  it('affiche le nom dans la langue demandée, et garde une valeur inconnue', () => {
    expect(countryLabel('DE', 'fr')).toBe('Allemagne');
    expect(countryLabel('DE', 'en')).toBe('Germany');
    expect(countryLabel('France', 'en')).toBe('France');
    expect(countryLabel('Atlantide', 'fr')).toBe('Atlantide');
  });

  it('écrit les noms dans les six langues, avec ou sans région dans le code de langue', () => {
    expect(countryLabel('DE', 'es')).toBe('Alemania');
    expect(countryLabel('DE', 'it')).toBe('Germania');
    expect(countryLabel('DE', 'pt')).toBe('Alemanha');
    expect(countryLabel('DE', 'de')).toBe('Deutschland');
    expect(countryLabel('ES', 'de-DE')).toBe('Spanien');
    expect(countryLabel('GB', 'en-GB')).toBe('United Kingdom');
    // langue que le site ne propose pas : français
    expect(countryLabel('DE', 'ja')).toBe('Allemagne');
  });

  it('trie selon la langue affichée, la France toujours en tête', () => {
    for (const lang of ['en', 'es', 'it', 'pt', 'de']) {
      const options = countryOptions(lang);
      expect(options[0].value).toBe('FR');
      const rest = options.slice(1).map(o => o.label);
      expect(rest, lang).toEqual([...rest].sort(new Intl.Collator(lang).compare));
    }
    // l'accent ne renvoie pas un pays en fin de liste (« Ägypten » avant « Albanien »)
    const de = countryOptions('de').map(o => o.label);
    expect(de.indexOf('Ägypten')).toBeLessThan(de.indexOf('Albanien'));
    expect(de.indexOf('Österreich')).toBeLessThan(de.indexOf('Polen'));
  });
});
