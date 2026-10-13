// Recherche d'adresse du formulaire d'annonce.
//
// Deux services publics, sans clé :
//   - la Base Adresse Nationale (France) : elle connaît les numéros de rue un
//     par un, là où OpenStreetMap n'en a souvent aucun ;
//   - Nominatim (OpenStreetMap) : le reste du monde.
//
// Ce fichier ne fait que construire les adresses à appeler et lire les
// réponses : il transforme chaque résultat en une suggestion qui porte le pays,
// la région, la ville et le code postal, en plus du texte et des coordonnées.
// Les règles par pays (liste des régions…) restent dans src/lib/markets.ts.

import { canonicalCountry } from '@/lib/countries';
import { regionKeyFor } from '@/lib/markets';

export interface AddressSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  /** code ISO à deux lettres (« ES »), null si le service ne le donne pas */
  country: string | null;
  /** clé de région au format ISO 3166-2 (« ES-CT »), null si elle n'est pas reconnue */
  region: string | null;
  city: string | null;
  postal_code: string | null;
}

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

const record = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

/** Première clé de région reconnue parmi plusieurs codes ou noms possibles. */
function firstRegion(country: string | null, candidates: unknown[]): string | null {
  if (!country) return null;
  for (const candidate of candidates) {
    const key = regionKeyFor(country, text(candidate));
    if (key) return key;
  }
  return null;
}

/**
 * Un résultat de la Base Adresse Nationale.
 * Son champ `context` s'écrit « 69, Rhône, Auvergne-Rhône-Alpes » : la région est le dernier élément.
 */
export function suggestionFromBan(feature: unknown): AddressSuggestion | null {
  const f = record(feature);
  const props = record(f.properties);
  const coords = record(f.geometry).coordinates;
  const label = text(props.label);
  if (!label || !Array.isArray(coords) || !Number.isFinite(Number(coords[0])) || !Number.isFinite(Number(coords[1]))) return null;
  const context = (text(props.context) || '').split(',').map((part) => part.trim()).filter(Boolean);
  return {
    display_name: `${label}, France`,
    lat: String(coords[1]),
    lon: String(coords[0]),
    country: 'FR',
    region: firstRegion('FR', [...context].reverse()),
    city: text(props.city),
    postal_code: text(props.postcode),
  };
}

/**
 * Un résultat de Nominatim demandé avec `addressdetails=1`.
 * La région se lit d'abord dans les codes ISO 3166-2 renvoyés (« ISO3166-2-lvl4 »…),
 * sinon dans les noms (état, région, province).
 */
export function suggestionFromNominatim(result: unknown): AddressSuggestion | null {
  const o = record(result);
  const displayName = text(o.display_name);
  if (!displayName || !Number.isFinite(parseFloat(String(o.lat))) || !Number.isFinite(parseFloat(String(o.lon)))) return null;
  const address = record(o.address);
  const country = canonicalCountry(text(address.country_code)) || null;
  const isoCodes = Object.keys(address)
    .filter((key) => key.startsWith('ISO3166-2'))
    .sort()
    .map((key) => address[key]);
  return {
    display_name: displayName,
    lat: String(o.lat),
    lon: String(o.lon),
    country,
    region: firstRegion(country, [...isoCodes, address.state, address.region, address.province, address.county, address.state_district]),
    city: text(address.city) || text(address.town) || text(address.village) || text(address.municipality) || text(address.hamlet),
    postal_code: text(address.postcode),
  };
}

/** Adresse de recherche dans la Base Adresse Nationale. */
export const banSearchUrl = (query: string): string =>
  `https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(query)}&limit=5&autocomplete=1`;

/**
 * Adresse de recherche Nominatim.
 * `country` limite la recherche à ce pays ; sans lui, la recherche porte sur le monde entier.
 * `language` est la langue de l'interface : les noms reviennent dans cette langue.
 */
export function nominatimSearchUrl(query: string, options: { country?: string | null; language?: string | null } = {}): string {
  const params = new URLSearchParams({ format: 'json', q: query, limit: '5', addressdetails: '1' });
  const code = canonicalCountry(options.country);
  if (code) params.set('countrycodes', code.toLowerCase());
  const language = (options.language || '').slice(0, 2).toLowerCase();
  if (language) params.set('accept-language', language);
  return `https://nominatim.openstreetmap.org/search?${params.toString()}`;
}

/**
 * Liste finale proposée au vendeur.
 * Les adresses françaises précises d'abord ; quand il y en a, on écarte les
 * résultats français d'OpenStreetMap (la même rue reviendrait en double, sans
 * numéro). Le tri se fait sur le code du pays, jamais sur le texte affiché, qui
 * change avec la langue (« France », « Frankreich », « Francia »).
 */
export function mergeSuggestions(ban: AddressSuggestion[], osm: AddressSuggestion[], max = 7): AddressSuggestion[] {
  const others = ban.length ? osm.filter((s) => s.country !== 'FR') : osm;
  return [...ban, ...others].slice(0, max);
}
