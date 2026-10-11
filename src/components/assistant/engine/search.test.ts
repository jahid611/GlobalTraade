import { describe, it, expect } from 'vitest';
import { searchKnowledge } from './search';
import type { KnowledgeEntry } from './types';

const entry = (id: string, question: string, fr: string[], en: string[] = []): KnowledgeEntry => ({
  id,
  step: 0,
  question: { fr: question, en: question },
  answer: { fr: `Réponse ${id}`, en: `Answer ${id}` },
  keywords: { fr, en },
});

const ENTRIES: KnowledgeEntry[] = [
  entry('ebe', "C'est quoi l'EBE ?", ['ebe', 'excedent brut'], ['ebitda']),
  entry('prix', 'Comment fixer un tarif ?', ['prix']),
  entry('prix-de-vente', 'Que comprend le montant demandé ?', ['prix de vente']),
  entry('bail-duree', 'Combien de temps dure un bail ?', ['bail']),
  entry('bail-cession', 'Peut-on céder un bail ?', ['bail']),
  entry('bilan', 'Où trouver mes comptes ?', ['bilan']),
];

const ids = (text: string, lang: 'fr' | 'en' = 'fr') => searchKnowledge(text, lang, ENTRIES).hits.map(hit => hit.entry.id);

describe('searchKnowledge', () => {
  it('trouve une fiche par son mot-clé, accents et majuscules ignorés', () => {
    const found = searchKnowledge("C'est quoi l'EBE ?", 'fr', ENTRIES);
    expect(found.confidence).toBe('sure');
    expect(found.candidates.map(e => e.id)).toEqual(['ebe']);
    expect(searchKnowledge('Excédent brut ?', 'fr', ENTRIES).candidates[0].id).toBe('ebe');
  });

  it('exige le mot entier pour un mot de 3 lettres ou moins', () => {
    expect(ids('mon bebe pleure')).not.toContain('ebe');
    expect(ids('plebe')).not.toContain('ebe');
    expect(ids("l'ebe, c'est quoi")).toContain('ebe');
  });

  it('lit un mot plus long en début de mot (pluriel)', () => {
    expect(ids('où sont mes bilans')).toContain('bilan');
    expect(ids('combien')).not.toContain('bilan');
  });

  it('fait peser une expression plus qu\'un mot seul', () => {
    const found = searchKnowledge('quel prix de vente demander', 'fr', ENTRIES);
    expect(found.hits[0].entry.id).toBe('prix-de-vente');
    expect(found.hits[0].score).toBeGreaterThan(found.hits[1].score);
    expect(found.confidence).toBe('sure');
  });

  it('signale une ambiguïté quand plusieurs fiches sont proches', () => {
    const found = searchKnowledge('mon bail', 'fr', ENTRIES);
    expect(found.confidence).toBe('ambiguous');
    expect(found.candidates.map(e => e.id).sort()).toEqual(['bail-cession', 'bail-duree']);
    expect(found.candidates.length).toBeLessThanOrEqual(3);
  });

  it('compte aussi le libellé de la question', () => {
    const found = searchKnowledge('Peut-on céder un bail ?', 'fr', ENTRIES);
    expect(found.confidence).toBe('sure');
    expect(found.candidates[0].id).toBe('bail-cession');
  });

  it('ne rend rien quand aucun mot n\'est reconnu', () => {
    const found = searchKnowledge('quelle est la capitale du Pérou', 'fr', ENTRIES);
    expect(found.confidence).toBe('none');
    expect(found.hits).toEqual([]);
    expect(searchKnowledge('   ', 'fr', ENTRIES).confidence).toBe('none');
  });

  it('cherche dans l\'autre langue si la langue du site ne donne rien', () => {
    expect(ids('what is ebitda', 'fr')).toEqual(['ebe']);
    expect(ids('what is ebitda', 'en')).toEqual(['ebe']);
  });
});
