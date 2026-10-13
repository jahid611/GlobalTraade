import { describe, it, expect } from 'vitest';
import { loadMarketContent, hasMarketContent, localized } from './index';
import type { Lang, Localized } from './types';

const LANGS: Lang[] = ['fr', 'en', 'es', 'it', 'pt', 'de'];
const complete = (t: Localized) => LANGS.every((l) => typeof t[l] === 'string' && t[l].trim().length > 0);
const noLongDash = (t: Localized) => LANGS.every((l) => !/[–—]/.test(t[l]));

describe('contenus par pays', () => {
  it.each(['FR', 'ES', 'PT', 'DE', 'IT', 'GB'])('%s : complet, dans les six langues, avec ses sources', async (code) => {
    expect(hasMarketContent(code)).toBe(true);
    const c = await loadMarketContent(code);
    expect(c).not.toBeNull();
    expect(c!.country).toBe(code);
    expect(c!.sources.length).toBeGreaterThan(4);
    c!.sources.forEach((s) => expect(s.url).toMatch(/^https?:\/\//));
    expect(c!.dueDiligence).toHaveLength(12);
    (['governance', 'financial', 'legal', 'social'] as const).forEach((cat) => expect(c!.dueDiligence.filter((d) => d.category === cat)).toHaveLength(3));
    expect(new Set(c!.dueDiligence.map((d) => d.id)).size).toBe(12);
    expect(c!.transfer.length).toBeGreaterThanOrEqual(5);
    expect(c!.glossary.length).toBeGreaterThanOrEqual(6);
    const texts: Localized[] = [
      ...c!.dueDiligence.map((d) => d.what),
      ...c!.transfer.flatMap((f) => [f.title, f.text]),
      ...c!.financing.map((f) => f.what),
      ...c!.glossary.map((g) => g.meaning),
      ...(c!.bankingNote ? [c!.bankingNote] : []),
    ];
    texts.forEach((t) => { expect(complete(t)).toBe(true); expect(noLongDash(t)).toBe(true); });
    expect(c!.dataAuthority.url).toMatch(/^https?:\/\//);
  });

  it("rend le texte dans la langue du visiteur, sinon l'anglais", () => {
    const t = { fr: 'bonjour', en: 'hello', es: 'hola', it: 'ciao', pt: 'olá', de: 'hallo' };
    expect(localized(t, 'de')).toBe('hallo');
    expect(localized(t, 'pt-PT')).toBe('olá');
    expect(localized(t, 'nl')).toBe('hello');
    expect(localized(null, 'fr')).toBe('');
  });

  it("n'a pas de contenu pour un pays sans fiche", async () => {
    expect(hasMarketContent('BR')).toBe(false);
    expect(await loadMarketContent('BR')).toBeNull();
  });
});
