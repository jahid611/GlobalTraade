// LISTE MAÎTRESSE des pays de Globly — tous les pays et territoires du monde.
//
// Tous les champs « Pays » du site (inscription, projet…) passent par le
// composant `CountrySelect`, qui lit CETTE liste : mêmes choix, mêmes valeurs
// partout. Ne pas créer d'autre liste de pays, ni de champ pays en saisie libre.
//
// La valeur stockée en base est le code ISO 3166-1 à deux lettres (« FR ») :
// il ne dépend ni de la langue ni du navigateur. Le nom affiché est produit
// dans la langue de l'interface par `Intl.DisplayNames`.

/** Codes ISO 3166-1 alpha-2 (pays et territoires officiellement attribués). */
export const COUNTRY_CODES = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY', 'BZ',
  'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ',
  'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ',
  'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET',
  'FI', 'FJ', 'FK', 'FM', 'FO', 'FR',
  'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY',
  'HK', 'HM', 'HN', 'HR', 'HT', 'HU',
  'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT',
  'JE', 'JM', 'JO', 'JP',
  'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ',
  'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY',
  'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ',
  'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ',
  'OM',
  'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY',
  'QA',
  'RE', 'RO', 'RS', 'RU', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ',
  'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ',
  'UA', 'UG', 'UM', 'US', 'UY', 'UZ',
  'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU',
  'WF', 'WS',
  'YE', 'YT',
  'ZA', 'ZM', 'ZW',
] as const;

export type CountryCode = typeof COUNTRY_CODES[number];

const CODE_SET = new Set<string>(COUNTRY_CODES);

/** Pays par défaut : la plateforme est centrée sur la France. */
export const DEFAULT_COUNTRY: CountryCode = 'FR';

// Avant cette liste, le pays était stocké sous son nom français (inscription :
// 16 choix ; projet : saisie libre). Ces noms sont relus comme leur code.
const LEGACY_NAMES: Record<string, CountryCode> = {
  france: 'FR', belgique: 'BE', suisse: 'CH', luxembourg: 'LU', monaco: 'MC',
  allemagne: 'DE', espagne: 'ES', italie: 'IT', portugal: 'PT', 'pays-bas': 'NL',
  'royaume-uni': 'GB', irlande: 'IE', canada: 'CA', maroc: 'MA', tunisie: 'TN',
  algerie: 'DZ', 'etats-unis': 'US', usa: 'US', uk: 'GB', senegal: 'SN', "cote d'ivoire": 'CI',
  belgium: 'BE', switzerland: 'CH', germany: 'DE', spain: 'ES', italy: 'IT', netherlands: 'NL',
  'united kingdom': 'GB', ireland: 'IE', morocco: 'MA', tunisia: 'TN', 'united states': 'US',
};

const normalize = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Code ISO d'un pays lu en base : un code est rendu tel quel, un ancien nom
 * (« France ») est converti. Chaîne vide si la valeur n'est pas reconnue.
 */
export function canonicalCountry(value: string | null | undefined): string {
  if (!value) return '';
  const upper = value.trim().toUpperCase();
  if (CODE_SET.has(upper)) return upper;
  return LEGACY_NAMES[normalize(value)] ?? '';
}

// Langues dans lesquelles le site écrit les noms de pays ; toute autre valeur
// retombe sur le français, langue d'écriture du site.
const NAME_LANGUAGES = ['fr', 'en', 'es', 'it', 'pt', 'de'];
const nameLanguage = (lang: string | null | undefined): string => {
  const code = (lang || 'fr').slice(0, 2).toLowerCase();
  return NAME_LANGUAGES.includes(code) ? code : 'fr';
};

const displayNames = new Map<string, Intl.DisplayNames | null>();
function namesFor(lang: string): Intl.DisplayNames | null {
  const key = nameLanguage(lang);
  if (!displayNames.has(key)) {
    try { displayNames.set(key, new Intl.DisplayNames([key], { type: 'region' })); }
    catch { displayNames.set(key, null); }
  }
  return displayNames.get(key) ?? null;
}

/**
 * Nom du pays dans la langue de l'interface. Une valeur non reconnue (ancienne
 * saisie libre) est affichée telle quelle plutôt que perdue.
 */
export function countryLabel(value: string | null | undefined, lang = 'fr'): string {
  if (!value) return '';
  const code = canonicalCountry(value);
  if (!code) return value;
  return namesFor(lang)?.of(code) ?? code;
}

export type CountryOption = { value: string; label: string };

/** Tous les pays, triés par nom dans la langue affichée — la France en tête. */
export function countryOptions(lang = 'fr'): CountryOption[] {
  const locale = nameLanguage(lang);
  const options = COUNTRY_CODES.map((code) => ({ value: code as string, label: countryLabel(code, locale) }));
  const collator = new Intl.Collator(locale);
  options.sort((a, b) =>
    Number(b.value === DEFAULT_COUNTRY) - Number(a.value === DEFAULT_COUNTRY) || collator.compare(a.label, b.label));
  return options;
}
