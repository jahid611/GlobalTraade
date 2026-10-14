import { describe, it, expect } from 'vitest';
import {
  FR_REGIONS, regionLabel, matchRegion, matchGeo, listingInRegion, isCountryKey, isRegionKey,
  regionStoreKey, splitGeoKeys, marketCountryOptions, regionOptionsFor, pruneRegions,
  homeCountryFor, showsCountry,
  addressInFrRegion,
} from './geoRegions';

// Une annonce espagnole dont l'adresse contient « 75 » (Paris) et « 13 » (Marseille).
const barcelona = { country: 'ES', region: 'ES-CT', address: 'Carrer de Mallorca 75, 13 bis, 08013 Barcelona' };
const madrid = { country: 'ES', region: 'ES-MD', address: 'Calle de Alcalá 13, 28014 Madrid' };
// Annonces françaises d'avant le multi-pays : pas de région, parfois pas de pays.
const paris = { address: '10 rue de Rivoli, 75004 Paris' };
const lyon = { country: 'FR', region: null, address: '12 rue de la République, 69002 Lyon' };
// Annonce française récente : la région enregistrée fait foi.
const rennes = { country: 'FR', region: 'FR-BRE', address: '75 boulevard de la Liberté, Rennes' };
const berlin = { country: 'DE', region: 'DE-BE', address: 'Friedrichstraße 69, 10117 Berlin' };

describe('région d\'une annonce', () => {
  it('une annonce espagnole de Barcelone est en Catalogne, pas dans une région française', () => {
    expect(matchRegion(barcelona, ['ES-CT'])).toBe(true);
    expect(matchRegion(barcelona, ['idf'])).toBe(false);   // « 75 » dans l'adresse
    expect(matchRegion(barcelona, ['paca'])).toBe(false);  // « 13 » dans l'adresse
    expect(matchRegion(barcelona, ['FR-IDF'])).toBe(false);
    for (const r of FR_REGIONS) expect(listingInRegion(barcelona, r.key)).toBe(false);
    expect(matchRegion(barcelona, ['ES-MD'])).toBe(false);
    // même sans région enregistrée, une annonce étrangère n'est jamais située par les mots français
    expect(matchRegion({ country: 'ES', address: barcelona.address }, ['idf', 'paca'])).toBe(false);
    expect(matchRegion(berlin, ['ara'])).toBe(false);      // « 69 » dans l'adresse
    expect(matchRegion(berlin, ['DE-BE'])).toBe(true);
  });

  it('les annonces françaises sans région restent situées par leur adresse', () => {
    expect(matchRegion(paris, ['idf'])).toBe(true);
    expect(matchRegion(paris, ['FR-IDF'])).toBe(true);
    expect(matchRegion(lyon, ['ara'])).toBe(true);
    expect(matchRegion(lyon, ['bre'])).toBe(false);
    expect(matchRegion(paris, ['ES-CT'])).toBe(false);
    // ancien appel avec une simple adresse : lue comme une annonce française
    expect(matchRegion('69002 Lyon', ['ara'])).toBe(true);
  });

  it('la région enregistrée sur une annonce française fait foi', () => {
    expect(matchRegion(rennes, ['bre'])).toBe(true);
    expect(matchRegion(rennes, ['idf'])).toBe(false);      // « 75 » dans l'adresse, mais région connue
  });

  it('sans région choisie, tout passe ; une clé inconnue ne retient rien', () => {
    expect(matchRegion(barcelona, [])).toBe(true);
    expect(matchRegion(paris, ['inconnue'])).toBe(false);
    expect(matchRegion(null, ['idf'])).toBe(false);
  });
});

describe('pays et régions ensemble', () => {
  it('aucun choix : tous les pays', () => {
    for (const l of [barcelona, madrid, paris, lyon, berlin]) expect(matchGeo(l, { countries: [], regions: [] })).toBe(true);
    expect(matchGeo(barcelona, {})).toBe(true);
  });

  it('un pays choisi retient ses annonces, où qu\'elles soient dans le pays', () => {
    expect(matchGeo(barcelona, { countries: ['ES'] })).toBe(true);
    expect(matchGeo(madrid, { countries: ['ES'] })).toBe(true);
    expect(matchGeo(paris, { countries: ['ES'] })).toBe(false);
    expect(matchGeo(paris, { countries: ['FR'] })).toBe(true);   // pas de pays enregistré = France
    expect(matchGeo(berlin, { countries: ['FR', 'ES'] })).toBe(false);
    // un pays sans fiche propre n'apparaît que sans choix de pays
    expect(matchGeo({ country: 'BE', address: 'Bruxelles' }, { countries: ['FR'] })).toBe(false);
  });

  it('une région ne restreint que son pays', () => {
    const zone = { countries: ['FR', 'ES'], regions: ['ES-CT'] };
    expect(matchGeo(barcelona, zone)).toBe(true);
    expect(matchGeo(madrid, zone)).toBe(false);
    expect(matchGeo(lyon, zone)).toBe(true);
    expect(matchGeo(berlin, zone)).toBe(false);
  });

  it('un ancien filtre français (régions seules) ne retient que des annonces françaises', () => {
    const zone = { countries: [], regions: ['idf'] };
    expect(matchGeo(paris, zone)).toBe(true);
    expect(matchGeo(lyon, zone)).toBe(false);
    expect(matchGeo(barcelona, zone)).toBe(false);
  });
});

describe('clés enregistrées', () => {
  it('reconnaît pays et régions', () => {
    expect(isCountryKey('ES')).toBe(true);
    expect(isCountryKey('es')).toBe(false);
    expect(isCountryKey('BE')).toBe(false);
    expect(isCountryKey('2A')).toBe(false);
    expect(isRegionKey('idf')).toBe(true);
    expect(isRegionKey('ES-CT')).toBe(true);
    expect(isRegionKey('69')).toBe(false);
    expect(regionStoreKey('FR-IDF')).toBe('idf');
    expect(regionStoreKey('idf')).toBe('idf');
    expect(regionStoreKey('ES-CT')).toBe('ES-CT');
  });

  it('sépare une liste de zones', () => {
    expect(splitGeoKeys(['ES', 'idf', 'FR-ARA', 'ES-CT', '69', 'Lyon'])).toEqual({
      countries: ['ES'], regions: ['idf', 'ara', 'ES-CT'], others: ['69', 'Lyon'],
    });
    expect(splitGeoKeys(null)).toEqual({ countries: [], regions: [], others: [] });
  });

  it('nomme une zone', () => {
    expect(regionLabel('idf')).toBe('Île-de-France');
    expect(regionLabel('FR-IDF')).toBe('Île-de-France');
    expect(regionLabel('ES-CT')).toBe('Cataluña');
    expect(regionLabel('ES')).toBe('Espagne');
    expect(regionLabel('DE', 'en')).toBe('Germany');
    expect(regionLabel('Lyon')).toBe('Lyon');
  });
});

describe('listes de choix', () => {
  it('propose les six pays, la France en tête', () => {
    const options = marketCountryOptions('fr');
    expect(options.map((o) => o.value)).toEqual(['FR', 'ES', 'PT', 'DE', 'IT', 'GB']);
    expect(options[0].label).toBe('France');
  });

  it('propose les régions des pays choisis', () => {
    const fr = regionOptionsFor(['FR']);
    expect(fr).toHaveLength(13);
    // les régions françaises gardent leur ancienne clé, sans nom de pays devant
    expect(fr.find((o) => o.value === 'idf')?.label).toBe('Île-de-France');
    const two = regionOptionsFor(['ES', 'FR']);
    expect(two.find((o) => o.value === 'ES-CT')?.label).toBe('Espagne · Cataluña');
    expect(two.find((o) => o.value === 'idf')?.label).toBe('France · Île-de-France');
    expect(two.some((o) => o.value.startsWith('DE-'))).toBe(false);
    // aucun pays choisi : tous les pays
    const all = regionOptionsFor([]);
    expect(all.some((o) => o.value === 'DE-BE')).toBe(true);
    expect(all.some((o) => o.value === 'idf')).toBe(true);
    expect(new Set(all.map((o) => o.value)).size).toBe(all.length);
  });

  it('retire les régions des pays retirés', () => {
    expect(pruneRegions(['idf', 'ES-CT', 'DE-BE'], ['FR', 'ES'])).toEqual(['idf', 'ES-CT']);
    expect(pruneRegions(['idf', 'ES-CT'], [])).toEqual(['idf', 'ES-CT']);
  });
});

describe('pays du visiteur', () => {
  it('suit la langue du site', () => {
    expect(homeCountryFor('fr')).toBe('FR');
    expect(homeCountryFor('fr-FR')).toBe('FR');
    expect(homeCountryFor('de')).toBe('DE');
    expect(homeCountryFor('en')).toBeNull();
    expect(homeCountryFor(undefined)).toBe('FR');
  });

  it('écrit le pays des annonces qui ne sont pas du pays du visiteur', () => {
    expect(showsCountry(paris, 'fr')).toBe(false);
    expect(showsCountry(barcelona, 'fr')).toBe(true);
    expect(showsCountry(barcelona, 'es')).toBe(false);
    expect(showsCountry(paris, 'es')).toBe(true);
    expect(showsCountry(paris, 'en')).toBe(true);
  });
});

describe('région d’une adresse française : le code postal fait foi', () => {
  const ara = FR_REGIONS.find((r) => r.key === 'ara')!.keywords;
  const cvl = FR_REGIONS.find((r) => r.key === 'cvl')!.keywords;
  const paca = FR_REGIONS.find((r) => r.key === 'paca')!.keywords;
  const cor = FR_REGIONS.find((r) => r.key === 'cor')!.keywords;

  it('ne confond plus un morceau de code postal ou un numéro de rue avec un département', () => {
    const marseille = '45 Avenue de la Capelette, 13010 Marseille';
    expect(addressInFrRegion(ara, marseille)).toBe(false);  // « 13010 » contient « 01 »
    expect(addressInFrRegion(cvl, marseille)).toBe(false);  // « 45 » est le numéro de la rue
    expect(addressInFrRegion(paca, marseille)).toBe(true);
    expect(matchGeo({ country: 'FR', address: marseille }, { regions: ['ara'] })).toBe(false);
    expect(matchGeo({ country: 'FR', address: marseille }, { regions: ['paca'] })).toBe(true);
  });

  it('lit le code postal de l’adresse ou celui enregistré à part', () => {
    expect(addressInFrRegion(ara, '8 Rue Mercière, 69002 Lyon')).toBe(true);
    expect(addressInFrRegion(ara, 'Rue Mercière', '69002')).toBe(true);
    expect(addressInFrRegion(cor, 'Cours Napoléon, 20000 Ajaccio')).toBe(true);
    expect(addressInFrRegion(cor, 'Place Saint-Nicolas, 20200 Bastia')).toBe(true);
  });

  it('sans code postal, cherche un nom de ville en mot entier', () => {
    expect(addressInFrRegion(ara, 'Villars, Saint-Étienne, Loire')).toBe(true);
    expect(addressInFrRegion(paca, 'Rue du Savarin')).toBe(false); // « var » n'est pas un mot entier
  });
});
