import { describe, it, expect } from 'vitest';
import { KNOWLEDGE } from './knowledge';
import type { Lang } from './types';

const LANGS: Lang[] = ['fr', 'en'];
const FLOWS = ['estimate', 'listing', 'start'];

/** Même normalisation que le moteur : minuscules, sans accents. */
const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const ids = KNOWLEDGE.map((entry) => entry.id);

describe('base de connaissances de Globi', () => {
  it('a des identifiants uniques, en kebab-case', () => {
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id, id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('contient les sept fiches d\'étape, rattachées à la bonne étape', () => {
    for (let step = 1; step <= 7; step++) {
      const entry = KNOWLEDGE.find((e) => e.id === `etape-${step}`);
      expect(entry, `etape-${step}`).toBeDefined();
      expect(entry!.step).toBe(step);
      expect(entry!.related?.length, `etape-${step} : related`).toBeGreaterThan(0);
    }
    expect(KNOWLEDGE.find((e) => e.id === 'etape-3')!.suggestFlow).toBe('estimate');
    expect(KNOWLEDGE.find((e) => e.id === 'etape-4')!.suggestFlow).toBe('listing');
    expect(KNOWLEDGE.find((e) => e.id === 'par-ou-commencer')!.suggestFlow).toBe('start');
  });

  it('a des étapes et des parcours valides', () => {
    for (const entry of KNOWLEDGE) {
      expect([0, 1, 2, 3, 4, 5, 6, 7], entry.id).toContain(entry.step);
      if (entry.suggestFlow) expect(FLOWS, entry.id).toContain(entry.suggestFlow);
    }
  });

  it('ne renvoie que vers des fiches existantes, jamais vers elle-même', () => {
    for (const entry of KNOWLEDGE) {
      const related = entry.related ?? [];
      expect(related.length, `${entry.id} : 3 fiches liées au plus`).toBeLessThanOrEqual(3);
      expect(new Set(related).size, `${entry.id} : doublon dans related`).toBe(related.length);
      for (const target of related) {
        expect(ids, `${entry.id} → ${target}`).toContain(target);
        expect(target, `${entry.id} se cite elle-même`).not.toBe(entry.id);
      }
    }
  });

  it('a une question et une réponse dans les deux langues', () => {
    for (const entry of KNOWLEDGE) {
      for (const lang of LANGS) {
        expect(entry.question[lang].trim(), `${entry.id} question ${lang}`).not.toBe('');
        expect(entry.answer[lang].trim(), `${entry.id} réponse ${lang}`).not.toBe('');
      }
    }
  });

  it('a des mots-clés en minuscules, sans accent ni ponctuation', () => {
    for (const entry of KNOWLEDGE) {
      for (const lang of LANGS) {
        const keywords = entry.keywords[lang];
        expect(keywords.length, `${entry.id} ${lang} : au moins 6 mots-clés`).toBeGreaterThanOrEqual(6);
        expect(keywords.length, `${entry.id} ${lang} : 20 mots-clés au plus`).toBeLessThanOrEqual(20);
        expect(new Set(keywords).size, `${entry.id} ${lang} : mot-clé en double`).toBe(keywords.length);
        for (const keyword of keywords) {
          const where = `${entry.id} ${lang} « ${keyword} »`;
          expect(keyword.trim(), where).not.toBe('');
          expect(keyword, where).toBe(keyword.trim());
          expect(keyword, where).toBe(normalize(keyword));
          // ni apostrophe, ni tiret, ni double espace : le moteur compare des mots séparés par une espace
          expect(keyword, where).toMatch(/^[a-z0-9]+( [a-z0-9]+)*$/);
        }
      }
    }
  });

  it('ne partage pas un même mot-clé entre plus de deux fiches', () => {
    for (const lang of LANGS) {
      const owners = new Map<string, string[]>();
      for (const entry of KNOWLEDGE) {
        for (const keyword of entry.keywords[lang]) {
          owners.set(keyword, [...(owners.get(keyword) ?? []), entry.id]);
        }
      }
      const tooShared = [...owners].filter(([, list]) => list.length > 2).map(([k, list]) => `${k} (${list.join(', ')})`);
      expect(tooShared, `mots-clés ${lang} trop partagés`).toEqual([]);
    }
  });

  it('garde un Markdown léger : ni titre, ni tableau, ni lien, ni « undefined »', () => {
    for (const entry of KNOWLEDGE) {
      for (const lang of LANGS) {
        const answer = entry.answer[lang];
        const where = `${entry.id} ${lang}`;
        expect(answer, where).not.toContain('undefined');
        expect(answer, where).not.toContain('#');
        expect(answer, where).not.toContain('|');
        expect(answer, where).not.toMatch(/\]\(|https?:\/\/|www\./);
        expect(answer, where).not.toMatch(/\n{3,}/);
        // gras toujours refermé
        expect((answer.match(/\*\*/g) ?? []).length % 2, `${where} : gras non refermé`).toBe(0);
      }
    }
  });

  it('ne glisse aucun taux d\'imposition', () => {
    const taxWord = /(imp[oô]t|impos|tax|fisc|tva|vat|plus-value|capital gain|pr[ée]l[èe]vement|cotisation|abattement|exon[ée]r)/i;
    for (const entry of KNOWLEDGE) {
      for (const lang of LANGS) {
        // un « % » et un mot d'impôt dans la même phrase
        for (const sentence of entry.answer[lang].split(/[.!?\n]+/)) {
          if (sentence.includes('%')) {
            expect(sentence, `${entry.id} ${lang}`).not.toMatch(taxWord);
          }
        }
      }
    }
    for (const id of ['fiscalite-vente', 'depart-retraite']) {
      const entry = KNOWLEDGE.find((e) => e.id === id)!;
      for (const lang of LANGS) expect(entry.answer[lang], `${id} ${lang} : aucun chiffre`).not.toMatch(/\d/);
    }
  });
});
