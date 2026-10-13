// Couverture des traductions : l'espagnol, l'italien, le portugais et l'allemand
// doivent avoir toutes les clés du français et de l'anglais, avec les mêmes
// {{variables}}. Le test charge les vrais dictionnaires (src/i18n.ts et
// src/locales/<langue>/).

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

type Dict = Record<string, string>;

const LAZY = ['es', 'it', 'pt', 'de'] as const;
const dicts: Record<string, Dict> = {};

/** Les variables d'un texte ({{count}}, {{name}}…), triées. */
function placeholders(text: string): string {
  return [...String(text).matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map((m) => m[1]).sort().join(',');
}

beforeAll(async () => {
  // src/i18n.ts lit la langue enregistrée dès son chargement : hors navigateur,
  // on lui fournit un localStorage en mémoire.
  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => { store.set(key, String(value)); },
        removeItem: (key: string) => { store.delete(key); },
        clear: () => { store.clear(); },
      },
    });
  }
  const { default: i18n, industriesFr } = await import('../i18n');
  const { loadLanguageBundle } = await import('./index');
  dicts.fr = i18n.getResourceBundle('fr', 'translation') as Dict;
  dicts.en = i18n.getResourceBundle('en', 'translation') as Dict;
  for (const code of LAZY) dicts[code] = await loadLanguageBundle(code, industriesFr);
});

describe('traductions : couverture', () => {
  it('le français et l\'anglais sont chargés', () => {
    expect(Object.keys(dicts.fr).length).toBeGreaterThan(1000);
    expect(Object.keys(dicts.en).length).toBeGreaterThan(1000);
  });

  it.each(LAZY)('%s a toutes les clés du français et de l\'anglais', (code) => {
    const expected = new Set([...Object.keys(dicts.fr), ...Object.keys(dicts.en)]);
    const missing = [...expected].filter((key) => !(key in dicts[code]));
    expect(missing).toEqual([]);
  });

  it.each(LAZY)('%s garde les mêmes {{variables}} que le français ou l\'anglais', (code) => {
    const wrong: string[] = [];
    for (const [key, value] of Object.entries(dicts[code])) {
      const sources = [dicts.fr[key], dicts.en[key]].filter((s): s is string => typeof s === 'string');
      if (sources.length === 0) continue;
      const mine = placeholders(value);
      if (!sources.some((source) => placeholders(source) === mine)) {
        wrong.push(`${key} : « ${value} » (attendu : ${sources.map(placeholders).join(' ou ') || 'aucune variable'})`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it.each(LAZY)('%s n\'a pas de tiret long', (code) => {
    const withDash = Object.entries(dicts[code]).filter(([, value]) => /[—–]/.test(value)).map(([key]) => key);
    expect(withDash).toEqual([]);
  });
});

// Les prix et les quantités passent par des variables ({{price}}, {{count}}…) :
// un montant écrit en dur dans une traduction resterait faux le jour où il change.
describe('traductions : montants et quantités', () => {
  const read = (relative: string) => readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');
  const ALL = [...LAZY, 'en'] as const;

  it('les textes de prix et de quota utilisent les variables passées par le code', () => {
    const expected: Record<string, string> = {
      'quota.unlock_hint': 'price',
      'quota.unlock_cta': 'price',
      'quota.unlock_contact': 'price',
      'quota.unlock_project_hint': 'price',
      'boost.cta': 'price',
      'quota.prospection_pay_first': 'count,price',
      'quota.prospection_extra_one': 'limit,price',
      'msg.offer_out_of_range': 'max,min',
      'quota.publications_reached_one': 'count',
      'quota.publications_reached_other': 'count',
      'quota.publications_reached_short_one': 'count',
      'quota.publications_reached_short_other': 'count',
    };
    const wrong: string[] = [];
    for (const code of ALL) {
      for (const [key, variables] of Object.entries(expected)) {
        const value = dicts[code][key];
        if (typeof value !== 'string') { wrong.push(`${code} ${key} : absent`); continue; }
        if (placeholders(value) !== variables) wrong.push(`${code} ${key} : variables « ${placeholders(value)} » au lieu de « ${variables} »`);
        if (/\d/.test(value.replace(/\{\{[^}]*\}\}/g, ''))) wrong.push(`${code} ${key} : un nombre est écrit en dur`);
      }
    }
    expect(wrong).toEqual([]);
  });

  // `quota.msg_locked` est le seul texte dont l'appel t() écrit encore le prix
  // du déblocage en toutes lettres : il doit suivre la constante du code.
  it('quota.msg_locked reprend le prix de déblocage du code', () => {
    const match = /export const UNLOCK_PRICE\s*=\s*([0-9.]+)/.exec(read('../services/planService.ts'));
    if (!match) throw new Error('Constante introuvable : UNLOCK_PRICE');
    const wrong = ALL.filter((code) => ((dicts[code]['quota.msg_locked'] ?? '').match(/\d+/g) ?? []).join(',') !== String(Number(match[1])));
    expect(wrong).toEqual([]);
  });
});

// Un texte écrit seulement dans le code (second argument de t(), ou
// `defaultValue`) s'affiche en français dans toutes les langues. Ce test lit le
// code et signale chaque clé de ce genre absente d'un dictionnaire. Les clés
// construites (gabarits `…${x}…`, variables) ne sont pas lues.
describe('traductions : clés écrites dans le code', () => {
  const SRC = fileURLToPath(new URL('..', import.meta.url));
  const sourceFiles = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'locales' ? [] : sourceFiles(path);
    if (!/\.tsx?$/.test(entry.name) || /\.(test|spec)\.tsx?$/.test(entry.name) || /^i18n(\.|$)/.test(entry.name)) return [];
    return [path];
  });
  // t('clé', 'texte') · t('clé', { defaultValue: … }) · t('clé', { defaultValue_one: … })
  const CALL = /\bt\(\s*(['"])([A-Za-z0-9_.-]+)\1\s*,\s*(?:(['"`])|\{[^}]*?\bdefaultValue(_one|_other)?\s*:)/g;

  it('chaque clé avec un texte par défaut existe en en, es, it, pt et de', () => {
    const wanted = new Map<string, string>();
    for (const file of sourceFiles(SRC)) {
      const code = readFileSync(file, 'utf8');
      for (const match of code.matchAll(CALL)) {
        const where = file.slice(SRC.length);
        if (match[4]) { wanted.set(`${match[2]}_one`, where); wanted.set(`${match[2]}_other`, where); }
        else wanted.set(match[2], where);
      }
    }
    expect(wanted.size).toBeGreaterThan(100);
    const missing: string[] = [];
    for (const [key, where] of wanted) {
      const absent = ['en', ...LAZY].filter((code) => !(key in dicts[code]));
      if (absent.length) missing.push(`${key} (${where}) : absent en ${absent.join(', ')}`);
    }
    expect(missing).toEqual([]);
  });
});
