import { describe, it, expect } from 'vitest';
import { suggestionFromBan, suggestionFromNominatim, nominatimSearchUrl, banSearchUrl, mergeSuggestions } from './address';

describe("recherche d'adresse du formulaire d'annonce", () => {
  it('lit un résultat de la Base Adresse Nationale : région prise dans le contexte', () => {
    const s = suggestionFromBan({
      geometry: { coordinates: [4.85, 45.76] },
      properties: { label: '30 Rue Garibaldi 69006 Lyon', city: 'Lyon', postcode: '69006', context: '69, Rhône, Auvergne-Rhône-Alpes' },
    });
    expect(s).toEqual({
      display_name: '30 Rue Garibaldi 69006 Lyon, France', lat: '45.76', lon: '4.85',
      country: 'FR', region: 'FR-ARA', city: 'Lyon', postal_code: '69006',
    });
  });

  it("garde l'adresse française même quand la région n'est pas reconnue (outre-mer)", () => {
    const s = suggestionFromBan({
      geometry: { coordinates: [-61.53, 16.24] },
      properties: { label: 'Rue Frébault 97110 Pointe-à-Pitre', city: 'Pointe-à-Pitre', postcode: '97110', context: '971, Guadeloupe' },
    });
    expect(s?.country).toBe('FR');
    expect(s?.region).toBeNull();
    expect(suggestionFromBan({ properties: { label: 'x' } })).toBeNull();
  });

  it('lit un résultat Nominatim : code ISO de la région en priorité', () => {
    const s = suggestionFromNominatim({
      display_name: 'Carrer de Mallorca, 401, Barcelona, Catalunya, 08013, España', lat: '41.4036', lon: '2.1744',
      address: { road: 'Carrer de Mallorca', city: 'Barcelona', state: 'Catalunya', 'ISO3166-2-lvl4': 'ES-CT', 'ISO3166-2-lvl6': 'ES-B', postcode: '08013', country_code: 'es' },
    });
    expect(s).toMatchObject({ country: 'ES', region: 'ES-CT', city: 'Barcelona', postal_code: '08013', lat: '41.4036', lon: '2.1744' });
  });

  it('retrouve la région par un code de niveau inférieur ou par son nom', () => {
    // Portugal continental : le district est au niveau 6
    expect(suggestionFromNominatim({
      display_name: 'Rua Augusta, Lisboa', lat: '38.71', lon: '-9.13',
      address: { town: 'Lisboa', 'ISO3166-2-lvl6': 'PT-11', postcode: '1100-053', country_code: 'pt' },
    })).toMatchObject({ country: 'PT', region: 'PT-11', city: 'Lisboa' });
    // pas de code : le nom, dans la langue demandée
    expect(suggestionFromNominatim({
      display_name: 'Marienplatz, München', lat: '48.137', lon: '11.575',
      address: { city: 'München', state: 'Bavière', postcode: '80331', country_code: 'de' },
    })).toMatchObject({ country: 'DE', region: 'DE-BY' });
    expect(suggestionFromNominatim({
      display_name: 'Princes Street, Edinburgh', lat: '55.95', lon: '-3.19',
      address: { city: 'Edinburgh', state: 'Scotland', 'ISO3166-2-lvl4': 'GB-SCT', country_code: 'gb' },
    })).toMatchObject({ country: 'GB', region: 'GB-SCT', postal_code: null });
  });

  it('rend le pays sans région pour un pays hors des six marchés, et rien pour un résultat inutilisable', () => {
    expect(suggestionFromNominatim({
      display_name: 'Grand-Place, Bruxelles', lat: '50.84', lon: '4.35',
      address: { city: 'Bruxelles', state: 'Bruxelles-Capitale', 'ISO3166-2-lvl4': 'BE-BRU', postcode: '1000', country_code: 'be' },
    })).toMatchObject({ country: 'BE', region: null, city: 'Bruxelles', postal_code: '1000' });
    expect(suggestionFromNominatim({ display_name: 'Sans détails', lat: '1', lon: '2' })).toMatchObject({ country: null, region: null, city: null });
    expect(suggestionFromNominatim({ display_name: 'Sans coordonnées' })).toBeNull();
    expect(suggestionFromNominatim(null)).toBeNull();
  });

  it("construit l'adresse de recherche : pays, détails et langue de l'interface", () => {
    const url = new URL(nominatimSearchUrl('Gran Vía 1 Madrid', { country: 'ES', language: 'de-DE' }));
    expect(url.origin + url.pathname).toBe('https://nominatim.openstreetmap.org/search');
    expect(url.searchParams.get('q')).toBe('Gran Vía 1 Madrid');
    expect(url.searchParams.get('countrycodes')).toBe('es');
    expect(url.searchParams.get('addressdetails')).toBe('1');
    expect(url.searchParams.get('accept-language')).toBe('de');
    expect(url.searchParams.get('format')).toBe('json');
    // sans pays : le monde entier
    expect(new URL(nominatimSearchUrl('Lyon', { language: 'fr' })).searchParams.has('countrycodes')).toBe(false);
    expect(banSearchUrl('rue de la Paix')).toContain('q=rue%20de%20la%20Paix');
  });

  it("écarte les doublons français d'OpenStreetMap d'après le code du pays, pas d'après le texte", () => {
    const base = { lat: '1', lon: '2', region: null, city: null, postal_code: null };
    const ban = [{ ...base, display_name: '1 Rue A, France', country: 'FR' }];
    const osm = [
      { ...base, display_name: 'Rue A, Lyon, Frankreich', country: 'FR' },
      { ...base, display_name: 'Rue A, Genève, Schweiz', country: 'CH' },
    ];
    expect(mergeSuggestions(ban, osm).map((s) => s.display_name)).toEqual(['1 Rue A, France', 'Rue A, Genève, Schweiz']);
    // la base française ne trouve rien : on garde tout OpenStreetMap
    expect(mergeSuggestions([], osm)).toHaveLength(2);
  });
});
