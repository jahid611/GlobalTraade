import { describe, expect, it, vi } from 'vitest';

// Ce test ne lit rien en base : il vérifie seulement les conditions de recherche.
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

import { zoneSearchConditions } from './adminContentService';

describe('zoneSearchConditions (recherche admin dans les zones des repreneurs)', () => {
  it('rien à chercher : aucune condition', () => {
    expect(zoneSearchConditions('')).toEqual([]);
    expect(zoneSearchConditions('zzzz')).toEqual([]);
  });

  it('une région française se cherche par son ancienne clé, comme avant', () => {
    expect(zoneSearchConditions('bretagne')).toEqual(['regions.ilike.%bre%']);
    expect(zoneSearchConditions('ile-de-france')).toEqual(['regions.ilike.%idf%']);
    expect(zoneSearchConditions('corse')).toEqual(['regions.ilike.%cor%']);
  });

  it("une région d'un autre pays se cherche par son code", () => {
    expect(zoneSearchConditions('cataluna')).toEqual(['regions.ilike.%ES-CT%']);
    expect(zoneSearchConditions('bayern')).toEqual(['regions.ilike.%DE-BY%']);
  });

  it('un pays se cherche comme un élément entier de la liste, et par ses régions', () => {
    const es = zoneSearchConditions('espagne');
    expect(es).toEqual(expect.arrayContaining([
      'regions.eq.ES', 'regions.like."ES,%"', 'regions.like."%,ES,%"', 'regions.like."%,ES"', 'regions.like.%ES-%',
    ]));
    // jamais « %ES% » : ce morceau de texte est aussi dans « ges » (Grand Est)
    expect(es.some((c) => /ilike\.%es%/i.test(c))).toBe(false);
  });

  it('le nom du pays est reconnu dans les langues du site', () => {
    expect(zoneSearchConditions('spain')).toContain('regions.eq.ES');
    expect(zoneSearchConditions('alemania')).toContain('regions.eq.DE');
    expect(zoneSearchConditions('deutschland')).toContain('regions.eq.DE');
  });

  it('la France retrouve aussi les recherches enregistrées par région française', () => {
    const fr = zoneSearchConditions('france');
    expect(fr).toEqual(expect.arrayContaining(['regions.eq.FR', 'regions.ilike.%idf%', 'regions.ilike.%paca%']));
  });
});
