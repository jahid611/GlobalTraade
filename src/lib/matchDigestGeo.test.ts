// La fonction serveur `match-digest` (Deno) ne peut pas importer src/ : elle
// porte sa propre copie de la règle des zones. Ces tests vérifient que la copie
// répond comme `matchGeo` du site et que ses listes suivent `markets.ts`.
import { describe, expect, it } from 'vitest';
import {
  FR_REGION_KEYWORDS, LEGACY_FR_REGION, MARKET_CODES as DIGEST_CODES, REGION_CODES,
  hasZone, matchGeo as digestMatchGeo, parseZone, zoneFit,
} from '../../supabase/functions/match-digest/geo.ts';
import { FR_REGIONS, matchGeo, splitGeoKeys } from './geoRegions';
import { MARKET_CODES, MARKETS, regionIso } from './markets';

describe('match-digest : listes recopiées', () => {
  it('mêmes pays et mêmes régions que markets.ts', () => {
    expect(DIGEST_CODES).toEqual([...MARKET_CODES]);
    for (const c of MARKET_CODES) {
      expect(REGION_CODES[c].map((r) => `${c}-${r}`)).toEqual(MARKETS[c].regions.map((r) => r.key));
    }
  });

  it('mêmes anciennes clés et mêmes mots-clés que geoRegions.ts', () => {
    expect(Object.keys(LEGACY_FR_REGION).sort()).toEqual(FR_REGIONS.map((r) => r.key).sort());
    for (const r of FR_REGIONS) {
      expect(LEGACY_FR_REGION[r.key]).toBe(regionIso(r.key));
      expect(FR_REGION_KEYWORDS[regionIso(r.key)]).toEqual(r.keywords);
    }
  });
});

describe('match-digest : même réponse que matchGeo du site', () => {
  const listings = [
    { address: '12 rue de la Paix, 75002 Paris' },
    { address: 'Lyon 69003', country: 'FR' },
    { address: 'Lyon 69003', country: 'FR', region: 'FR-ARA' },
    { address: 'Rue de Paris, Lille', country: 'FR', region: 'FR-HDF' },
    { address: 'Carrer de Paris 12, Barcelona', country: 'ES', region: 'ES-CT' },
    { address: 'Calle Mayor, Madrid', country: 'ES', region: 'ES-MD' },
    { address: 'Sevilla', country: 'ES', region: null },
    { address: 'Paris Platz, Berlin', country: 'DE', region: 'DE-BE' },
    { address: 'Rua Augusta, Lisboa', country: 'pt', region: 'PT-11' },
    { address: 'Leeds', country: 'GB', region: 'GB-ENG' },
    { address: 'Zürich', country: 'CH' },
    { address: '', country: null, region: null },
    {},
  ];
  const zones = [
    '', 'idf', 'idf,ara', 'FR-IDF', 'cor', 'FR', 'ES', 'FR,ES', 'ES-CT', 'ES,ES-CT', 'FR,ES-CT', 'idf,ES',
    'idf,ES-CT', 'DE,idf,ES-MD', 'PT', 'GB-ENG,GB-SCT', 'ES,idf,69', 'IT,IT-25',
  ];

  it.each(zones)('zone « %s »', (zone) => {
    const keys = zone.split(',').filter(Boolean);
    const site = splitGeoKeys(keys);
    const digest = parseZone(zone);
    expect(digest.countries).toEqual(site.countries);
    expect(digest.regions).toEqual(site.regions.map(regionIso));
    expect(digest.others).toEqual(site.others);
    for (const l of listings) {
      expect(digestMatchGeo(l, digest), JSON.stringify(l)).toBe(matchGeo(l, site));
    }
  });
});

describe('match-digest : zoneFit', () => {
  it('aucune zone : ouvert', () => {
    expect(zoneFit({ address: 'Paris' }, null)).toBe('open');
    expect(zoneFit({ address: 'Paris' }, '')).toBe('open');
    expect(hasZone('')).toBe(false);
  });

  it('un département seul ne compte pas comme une zone, comme avant', () => {
    expect(zoneFit({ address: 'Lyon 69003' }, '69')).toBe('open');
    expect(hasZone('69')).toBe(false);
  });

  it('un pays seul compte, alors que son code ne fait que deux lettres', () => {
    expect(hasZone('ES')).toBe(true);
    expect(zoneFit({ address: 'Madrid', country: 'ES' }, 'ES')).toBe('match');
    expect(zoneFit({ address: 'Paris 75001' }, 'ES')).toBe('miss');
  });

  it("projet français d'avant le multi-pays : l'annonce française sans région est située par son adresse", () => {
    expect(zoneFit({ address: '3 rue Oberkampf, 75011 Paris' }, 'idf')).toBe('match');
    expect(zoneFit({ address: 'Bordeaux' }, 'idf')).toBe('miss');
    expect(hasZone('idf')).toBe(true);
  });

  it("une région ne vaut que pour une annonce de son pays", () => {
    // « Carrer de Paris » ne met pas une annonce espagnole en Île-de-France.
    expect(zoneFit({ address: 'Carrer de Paris 12, Barcelona', country: 'ES', region: 'ES-CT' }, 'idf')).toBe('miss');
    expect(zoneFit({ address: 'Carrer de Paris 12, Barcelona', country: 'ES', region: 'ES-CT' }, 'ES-CT')).toBe('match');
    expect(zoneFit({ address: 'Madrid', country: 'ES', region: 'ES-MD' }, 'ES-CT')).toBe('miss');
  });

  it('un pays choisi sans région : tout le pays ; avec une de ses régions : cette région seulement', () => {
    expect(zoneFit({ address: 'Madrid', country: 'ES', region: 'ES-MD' }, 'ES,idf')).toBe('match');
    expect(zoneFit({ address: 'Madrid', country: 'ES', region: 'ES-MD' }, 'ES,ES-CT')).toBe('miss');
  });

  it("l'ancien texte libre reste cherché dans l'adresse", () => {
    expect(zoneFit({ address: 'Annecy, Haute-Savoie' }, 'Haute-Savoie')).toBe('match');
    expect(zoneFit({ address: 'Annecy' }, 'idf,Annecy')).toBe('match');
    expect(zoneFit({ address: 'Nantes' }, 'Haute-Savoie')).toBe('miss');
  });
});
