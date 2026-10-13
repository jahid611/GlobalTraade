// Les courriels du serveur sont écrits dans la langue du destinataire
// (`profiles.language`). Leurs textes vivent dans un module sans dépendance,
// côté Deno : ces tests vérifient qu'aucune langue n'a de texte manquant, que
// les valeurs variables sont les mêmes partout, et que les repères de sécurité
// (pas de HTML dans les textes, repli sur le français) tiennent.
import { describe, expect, it } from 'vitest';
import {
  DECISION_KINDS, DECISION_TEXTS, EMAIL_TEXTS, LANGS, LOCALES,
  countryName, decisionContent, fill, firstNameOf, formatDate, formatMoney,
  pickLang, placeholders, recipientLang,
} from '../../supabase/functions/_shared/i18n.ts';
import { LANGUAGES } from '../locales';

/** Aplatit un objet de textes : { 'kinds.kyc_verified.subject': '…' }. */
function flatten(node: unknown, prefix = ''): Record<string, string> {
  if (typeof node === 'string') return { [prefix]: node };
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    Object.assign(out, flatten(value, prefix ? `${prefix}.${key}` : key));
  }
  return out;
}

const emails = Object.entries(EMAIL_TEXTS) as [string, Record<string, unknown>][];

describe('courriels : langues', () => {
  it('les six langues du site, dans le même ordre de liste', () => {
    expect([...LANGS].sort()).toEqual(LANGUAGES.map((l) => l.code).sort());
    expect(LOCALES).toEqual({ fr: 'fr-FR', en: 'en-GB', es: 'es-ES', it: 'it-IT', pt: 'pt-PT', de: 'de-DE' });
  });

  it('pickLang : une valeur inconnue ou vide donne le français', () => {
    for (const lang of LANGS) expect(pickLang(lang)).toBe(lang);
    expect(pickLang('EN')).toBe('en');
    expect(pickLang(' de ')).toBe('de');
    expect(pickLang('pt-BR')).toBe('pt');
    for (const value of [null, undefined, '', '  ', 'xx', 'nl', 'zh-CN', 42, {}, [], true]) {
      expect(pickLang(value)).toBe('fr');
    }
  });

  it('recipientLang : lit le profil du destinataire, et ne lève jamais d’erreur', async () => {
    const asked: string[] = [];
    const client = (result: () => Promise<{ data: unknown }>) => ({
      from: (table: string) => ({
        select: (columns: string) => ({
          eq: (column: string, value: string) => { asked.push(`${table}.${columns} ${column}=${value}`); return { maybeSingle: result }; },
        }),
      }),
    });
    expect(await recipientLang(client(async () => ({ data: { language: 'es' } })), 'u1')).toBe('es');
    expect(asked).toEqual(['profiles.language id=u1']);
    expect(await recipientLang(client(async () => ({ data: { language: null } })), 'u1')).toBe('fr');
    expect(await recipientLang(client(async () => ({ data: null })), 'u1')).toBe('fr');
    expect(await recipientLang(client(async () => { throw new Error('colonne absente'); }), 'u1')).toBe('fr');
    expect(await recipientLang({}, 'u1')).toBe('fr');
    expect(await recipientLang(client(async () => ({ data: { language: 'de' } })), null)).toBe('fr');
  });
});

describe('courriels : textes', () => {
  it.each(emails)('%s : chaque texte existe dans les six langues, avec les mêmes valeurs variables', (_name, byLang) => {
    expect(Object.keys(byLang).sort()).toEqual([...LANGS].sort());
    const reference = flatten(byLang.fr);
    expect(Object.keys(reference).length).toBeGreaterThan(0);
    for (const lang of LANGS) {
      const texts = flatten(byLang[lang]);
      expect(Object.keys(texts).sort(), `clés ${lang}`).toEqual(Object.keys(reference).sort());
      for (const [key, text] of Object.entries(texts)) {
        expect(text.trim().length, `${lang} ${key} vide`).toBeGreaterThan(0);
        expect(placeholders(text), `${lang} ${key}`).toEqual(placeholders(reference[key]));
      }
    }
  });

  it.each(emails)('%s : ni HTML ni tiret long dans les textes', (_name, byLang) => {
    for (const lang of LANGS) {
      for (const [key, text] of Object.entries(flatten(byLang[lang]))) {
        expect(text, `${lang} ${key}`).not.toMatch(/[<>&]/);
        expect(text, `${lang} ${key}`).not.toMatch(/[—–]/);
      }
    }
  });

  it('les traductions ne sont pas restées en français', () => {
    for (const [, byLang] of emails) {
      const fr = flatten(byLang.fr);
      for (const lang of LANGS.filter((l) => l !== 'fr')) {
        const texts = flatten(byLang[lang]);
        const same = Object.keys(fr).filter((k) => texts[k] === fr[k]);
        expect(same, lang).toEqual([]);
      }
    }
  });

  it('décisions : un texte par type d’avis, le nom du projet entre guillemets quand il est connu', () => {
    for (const lang of LANGS) {
      expect(Object.keys(DECISION_TEXTS[lang].kinds).sort()).toEqual([...DECISION_KINDS].sort());
      for (const kind of DECISION_KINDS) {
        const c = decisionContent(lang, kind, 'Boulangerie <b>Martin</b>');
        expect(c).not.toBeNull();
        expect(c!.subject).not.toContain('{');
        expect(c!.title).not.toContain('{');
        expect(c!.title.includes('Boulangerie <b>Martin</b>')).toBe(kind.startsWith('project_'));
        // Sans nom de projet : le titre simple, jamais de valeur vide entre guillemets.
        expect(decisionContent(lang, kind, null)!.title).toBe(DECISION_TEXTS[lang].kinds[kind].title);
        expect(decisionContent(lang, kind, '   ')!.title).toBe(DECISION_TEXTS[lang].kinds[kind].title);
      }
      expect(decisionContent(lang, 'type_inconnu', null)).toBeNull();
    }
    expect(decisionContent('fr', 'project_verified', 'Atelier')!.title).toBe('Votre projet « Atelier » est vérifié');
    expect(decisionContent('de', 'project_rejected', 'Atelier')!.title).toBe('Ihr Projekt „Atelier“ wurde nicht bestätigt');
  });
});

describe('courriels : formats', () => {
  it('fill : remplace en un seul passage, laisse une clé inconnue', () => {
    expect(fill('Bonjour {name}, {count} annonces', { name: 'Ana', count: 3 })).toBe('Bonjour Ana, 3 annonces');
    expect(fill('{a} {b}', { a: '{b}', b: 'x' })).toBe('{b} x');
    expect(fill('{absent}', {})).toBe('{absent}');
    expect(fill('{toString}', {})).toBe('{toString}');
  });

  it('montants selon la langue, sans décimales', () => {
    const plain = (s: string) => s.replace(/\s/g, ' ');
    expect(plain(formatMoney(250000, 'fr'))).toBe('250 000 €');
    expect(plain(formatMoney(250000, 'en'))).toBe('€250,000');
    expect(plain(formatMoney(250000, 'de'))).toBe('250.000 €');
    expect(plain(formatMoney(250000, 'es'))).toBe('250.000 €');
    expect(plain(formatMoney(250000, 'it'))).toBe('250.000 €');
    expect(plain(formatMoney(250000, 'pt'))).toBe('250 000 €');
    expect(plain(formatMoney(250000, 'inconnue'))).toBe('250 000 €');
    for (const empty of [null, undefined, '', 0, 'abc']) expect(formatMoney(empty, 'fr')).toBe('');
  });

  it('dates selon la langue', () => {
    expect(formatDate('2026-10-14T08:00:00Z', 'fr')).toBe('14 octobre 2026');
    expect(formatDate('2026-10-14T08:00:00Z', 'en')).toBe('14 October 2026');
    expect(formatDate('2026-10-14T08:00:00Z', 'de')).toBe('14. Oktober 2026');
    expect(formatDate('2026-10-14T08:00:00Z', 'es')).toBe('14 de octubre de 2026');
    expect(formatDate('2026-10-14T08:00:00Z', 'it')).toBe('14 ottobre 2026');
    expect(formatDate('2026-10-14T08:00:00Z', 'pt')).toBe('14 de outubro de 2026');
    expect(formatDate(null, 'fr')).toBe('');
    expect(formatDate('pas une date', 'fr')).toBe('');
  });

  it('noms de pays et prénom', () => {
    expect(countryName('ES', 'fr')).toBe('Espagne');
    expect(countryName('es', 'de')).toBe('Spanien');
    expect(countryName('DE', 'it')).toBe('Germania');
    expect(countryName('', 'fr')).toBe('');
    expect(firstNameOf('  Ana  Maria Lopez ')).toBe('Ana');
    expect(firstNameOf(null)).toBe('');
  });
});
