import { describe, it, expect } from 'vitest';
import { detectLanguage, initialLanguage } from './languageDetect';

const SITE = ['fr', 'en', 'es', 'it', 'pt', 'de'] as const;

describe('detectLanguage', () => {
  it('prend la première langue du navigateur que le site propose', () => {
    expect(detectLanguage(['es-ES', 'es', 'en'], SITE, 'fr')).toBe('es');
    expect(detectLanguage(['de-AT'], SITE, 'fr')).toBe('de');
    expect(detectLanguage(['pt_BR'], SITE, 'fr')).toBe('pt');
    expect(detectLanguage(['EN-gb'], SITE, 'fr')).toBe('en');
  });
  it('saute les langues inconnues et garde l ordre de préférence', () => {
    expect(detectLanguage(['nl-NL', 'it-IT', 'en'], SITE, 'fr')).toBe('it');
  });
  it('revient au français quand rien ne convient', () => {
    expect(detectLanguage(['ja-JP', 'zh'], SITE, 'fr')).toBe('fr');
    expect(detectLanguage([], SITE, 'fr')).toBe('fr');
    expect(detectLanguage(undefined, SITE, 'fr')).toBe('fr');
    expect(detectLanguage(null, SITE, 'fr')).toBe('fr');
  });
});

describe('initialLanguage', () => {
  it('garde un choix enregistré, quelle que soit la langue du navigateur', () => {
    expect(initialLanguage('de', ['es-ES'], SITE, 'fr')).toEqual({ language: 'de', detected: false });
    expect(initialLanguage('fr', ['en-GB'], SITE, 'fr')).toEqual({ language: 'fr', detected: false });
  });
  it('détecte quand rien n est enregistré, ou une valeur inconnue', () => {
    expect(initialLanguage(null, ['es-ES'], SITE, 'fr')).toEqual({ language: 'es', detected: true });
    expect(initialLanguage('xx', ['it'], SITE, 'fr')).toEqual({ language: 'it', detected: true });
    expect(initialLanguage(null, ['ja'], SITE, 'fr')).toEqual({ language: 'fr', detected: true });
  });
});
