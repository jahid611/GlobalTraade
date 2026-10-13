// Couverture des traductions : l'espagnol, l'italien, le portugais et l'allemand
// doivent avoir toutes les clés du français et de l'anglais, avec les mêmes
// {{variables}}. Le test charge les vrais dictionnaires (src/i18n.ts et
// src/locales/<langue>/).

import { readFileSync } from 'node:fs';
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

// Quelques textes répètent un montant fixé dans le code (leur appel t() ne passe
// pas de variable). Si le montant change dans le code, ce test le signale.
describe('traductions : montants repris du code', () => {
  const read = (relative: string) => readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');
  const constant = (source: string, name: string): number => {
    const match = new RegExp(`export const ${name}\\s*=\\s*([0-9.]+)`).exec(source);
    if (!match) throw new Error(`Constante introuvable : ${name}`);
    return Number(match[1]);
  };

  it('les prix et pourcentages écrits dans les textes sont ceux du code', () => {
    const plan = read('../services/planService.ts');
    const prospect = read('../services/prospectService.ts');
    const offers = read('../lib/offers.ts');
    const unlock = String(constant(plan, 'UNLOCK_PRICE'));
    const boost = String(constant(plan, 'BOOST_PRICE'));
    const extra = String(constant(plan, 'EXTRA_PROSPECT_PRICE'));
    const included = String(constant(prospect, 'PROSPECTION_MONTHLY_INCLUDED'));
    const min = String(Math.round(constant(offers, 'OFFER_MIN_PCT') * 100));
    const max = String(Math.round(constant(offers, 'OFFER_MAX_PCT') * 100));

    const expected: Record<string, string[]> = {
      'quota.unlock_hint': [unlock],
      'quota.unlock_cta': [unlock],
      'quota.unlock_contact': [unlock],
      'quota.unlock_project_hint': [unlock],
      'quota.msg_locked': [unlock],
      'boost.cta': [boost],
      'quota.prospection_pay_first': [extra],
      'quota.prospection_extra_one': [included, extra],
      'msg.offer_out_of_range': [min, max],
    };
    const wrong: string[] = [];
    for (const code of [...LAZY, 'en']) {
      for (const [key, numbers] of Object.entries(expected)) {
        const found = (dicts[code][key] ?? '').match(/\d+/g) ?? [];
        if (found.join(',') !== numbers.join(',')) wrong.push(`${code} ${key} : ${found.join(',')} au lieu de ${numbers.join(',')}`);
      }
    }
    expect(wrong).toEqual([]);
  });
});
