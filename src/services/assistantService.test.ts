import { describe, it, expect } from 'vitest';
import { sanitizeDraft } from './assistantService';

describe('sanitizeDraft', () => {
  it('ne garde que les champs connus au bon type', () => {
    expect(sanitizeDraft({
      name: '  Le Fournil ', industry: 'Bakery', price: 120000, ebitda: -5000, revenue_n1: '250000',
      rent: null, surface: 'grande', employees: true, description: '', owner_id: 'x',
    })).toEqual({ name: 'Le Fournil', industry: 'Bakery', price: 120000, ebitda: -5000, revenue_n1: 250000 });
  });

  it('rend un brouillon vide pour une valeur qui n\'est pas un objet', () => {
    expect(sanitizeDraft(null)).toEqual({});
    expect(sanitizeDraft('texte')).toEqual({});
  });
});
