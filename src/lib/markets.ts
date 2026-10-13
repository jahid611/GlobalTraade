// LES MARCHÉS DE GLOBLY — ce qui change d'un pays à l'autre, au même endroit.
//
// Une annonce porte le pays de l'entreprise (`listings.country`, code ISO à deux
// lettres). Tout ce qui dépend de ce pays se lit ICI : le nom et le format de
// l'identifiant de l'entreprise, les régions, les formes juridiques, la façon
// d'écrire les montants et les dates. Ne pas réécrire ces règles ailleurs.
//
// Deux notions à ne pas confondre :
//   - le PAYS DE L'ANNONCE décide des règles (identifiant, régions, documents) ;
//   - la LANGUE DU VISITEUR décide seulement de la langue d'affichage et du
//     format des nombres et des dates.
// Un Français qui consulte une annonce allemande lit donc du français, avec les
// règles allemandes.
//
// Les contrôles d'identifiant ci-dessous vérifient un FORMAT (longueur, clé de
// contrôle quand elle est publique). Seule la France a en plus une vérification
// dans son registre officiel. Formats à faire confirmer par un professionnel du
// pays avant une ouverture commerciale : voir `needsReview`.

import { isValidSiret } from './siret';

/** Pays pour lesquels Globly a des règles propres. Les autres pays utilisent les règles génériques. */
export const MARKET_CODES = ['FR', 'ES', 'PT', 'DE', 'IT', 'GB'] as const;
export type MarketCode = typeof MARKET_CODES[number];

export interface MarketRegion {
  /** code ISO 3166-2, ex. « ES-CT » : c'est la valeur enregistrée dans `listings.region` */
  key: string;
  /** nom dans la langue du pays */
  label: string;
}

export interface MarketIdentifier {
  /** nom usuel, jamais traduit : c'est un nom propre du pays (« SIRET », « NIF »…) */
  name: string;
  /** ce que c'est, en clair (texte français par défaut, clé i18n `market.<pays>.id_what`) */
  what: string;
  placeholder: string;
  /** retire espaces et ponctuation, met en majuscules */
  clean: (raw: string) => string;
  /** le format est-il plausible ? (pas une vérification dans un registre) */
  isValid: (raw: string) => boolean;
  /** registre officiel où l'on retrouve l'entreprise */
  registry: { name: string; url: string };
  /** la plateforme peut-elle vérifier l'existence de l'entreprise en ligne ? */
  onlineCheck: boolean;
}

export interface Market {
  code: MarketCode | 'XX';
  /** langue principale du pays, parmi celles du site */
  language: 'fr' | 'en' | 'es' | 'it' | 'pt' | 'de';
  /** format des nombres et des dates du pays */
  locale: string;
  /** monnaie du pays. Les prix des annonces sont tous saisis et affichés en euros pour l'instant. */
  localCurrency: 'EUR' | 'GBP';
  phonePrefix: string;
  identifier: MarketIdentifier;
  /** formes juridiques courantes, dans la langue du pays, « Autre » en dernier */
  legalForms: string[];
  regions: MarketRegion[];
  /** nom du contrat de location des locaux dans ce pays */
  leaseName: string;
  /** points de cette fiche à faire confirmer par un professionnel du pays */
  needsReview: string[];
}

const digits = (raw: string) => (raw || '').replace(/\D/g, '');
const alnum = (raw: string) => (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Portugal : 9 chiffres, le dernier est une clé (modulo 11). */
function isValidNipc(raw: string): boolean {
  const d = digits(raw);
  if (!/^\d{9}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(d[i]) * (9 - i);
  const check = 11 - (sum % 11);
  return Number(d[8]) === (check >= 10 ? 0 : check);
}

/** Italie : 11 chiffres, le dernier est une clé (formule de Luhn). */
function isValidPartitaIva(raw: string): boolean {
  const d = digits(raw);
  if (!/^\d{11}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let n = Number(d[i]);
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return (10 - (sum % 10)) % 10 === Number(d[10]);
}

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

/**
 * Espagne. Trois formes, chacune avec une clé de contrôle publique que l'on vérifie :
 *   - société : une lettre, sept chiffres, puis un chiffre ou une lettre de contrôle ;
 *   - indépendant (DNI) : huit chiffres et une lettre ;
 *   - étranger résident (NIE) : X, Y ou Z, sept chiffres et une lettre.
 * Un numéro inventé au bon format est donc refusé dans la grande majorité des cas.
 * Cela ne prouve pas que l'entreprise existe : seul un registre le dirait.
 */
function isValidNif(raw: string): boolean {
  const v = alnum(raw);
  if (/^\d{8}[A-Z]$/.test(v)) return DNI_LETTERS[Number(v.slice(0, 8)) % 23] === v[8];
  if (/^[XYZ]\d{7}[A-Z]$/.test(v)) return DNI_LETTERS[Number('XYZ'.indexOf(v[0]) + v.slice(1, 8)) % 23] === v[8];
  if (!/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(v)) return false;
  const d = v.slice(1, 8);
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const n = Number(d[i]);
    if (i % 2 === 1) sum += n;
    else { const doubled = n * 2; sum += Math.floor(doubled / 10) + (doubled % 10); }
  }
  const control = (10 - (sum % 10)) % 10;
  const letter = 'JABCDEFGHI'[control];
  // selon le type d'entité, la clé s'écrit en chiffre, en lettre, ou l'un des deux
  if ('KPQSNW'.includes(v[0])) return v[8] === letter;
  if ('ABEH'.includes(v[0])) return v[8] === String(control);
  return v[8] === String(control) || v[8] === letter;
}

/**
 * Allemagne : numéro à un registre (HRA / HRB pour le commerce, GsR pour les sociétés civiles
 * inscrites, PR pour les professions libérales, GnR pour les coopératives) suivi de chiffres,
 * ou numéro de TVA (DE + 9 chiffres), ou identifiant économique (DE + 9 chiffres + 5 chiffres).
 */
const isValidGermanId = (raw: string) => /^((HR[AB]|GSR|PR|GNR)\d{1,6}[A-Z]{0,2}|DE\d{9}(\d{5})?)$/.test(alnum(raw));

/** Royaume-Uni : 8 chiffres, ou 2 lettres + 6 chiffres (SC… pour l'Écosse, NI… pour l'Irlande du Nord), ou 1 lettre + 7 chiffres (anciens numéros). */
const isValidCompanyNumber = (raw: string) => /^(\d{8}|[A-Z]{2}\d{6}|[A-Z]\d{7})$/.test(alnum(raw));

const r = (key: string, label: string): MarketRegion => ({ key, label });

export const MARKETS: Record<MarketCode, Market> = {
  FR: {
    code: 'FR', language: 'fr', locale: 'fr-FR', localCurrency: 'EUR', phonePrefix: '+33',
    identifier: {
      name: 'SIRET',
      what: "Le numéro à 14 chiffres de l'établissement, sur l'extrait Kbis et les factures.",
      placeholder: '394 927 081 00114',
      clean: (raw) => digits(raw).slice(0, 14),
      isValid: (raw) => isValidSiret(raw),
      registry: { name: 'Annuaire des Entreprises', url: 'https://annuaire-entreprises.data.gouv.fr' },
      onlineCheck: true,
    },
    legalForms: ['SAS', 'SASU', 'SARL', 'EURL', 'SA', 'SNC', 'EI', 'Micro-entreprise', 'Autre'],
    regions: [
      r('FR-ARA', 'Auvergne-Rhône-Alpes'), r('FR-BFC', 'Bourgogne-Franche-Comté'), r('FR-BRE', 'Bretagne'),
      r('FR-CVL', 'Centre-Val de Loire'), r('FR-20R', 'Corse'), r('FR-GES', 'Grand Est'),
      r('FR-HDF', 'Hauts-de-France'), r('FR-IDF', 'Île-de-France'), r('FR-NOR', 'Normandie'),
      r('FR-NAQ', 'Nouvelle-Aquitaine'), r('FR-OCC', 'Occitanie'), r('FR-PDL', 'Pays de la Loire'),
      r('FR-PAC', "Provence-Alpes-Côte d'Azur"),
    ],
    leaseName: 'Bail commercial (3-6-9)',
    needsReview: [],
  },
  ES: {
    code: 'ES', language: 'es', locale: 'es-ES', localCurrency: 'EUR', phonePrefix: '+34',
    identifier: {
      name: 'NIF',
      what: "Le numéro d'identification fiscale (ancien CIF). Société : une lettre, sept chiffres et un caractère de contrôle. Indépendant (autónomo) : huit chiffres et une lettre.",
      placeholder: 'B12345674',
      clean: (raw) => alnum(raw).slice(0, 9),
      isValid: isValidNif,
      registry: { name: 'Registro Mercantil (Colegio de Registradores)', url: 'https://sede.registradores.org' },
      onlineCheck: false,
    },
    legalForms: ['S.L.', 'S.L.U.', 'S.A.', 'Autónomo', 'Sociedad Cooperativa', 'Comunidad de Bienes', 'Otra'],
    regions: [
      r('ES-AN', 'Andalucía'), r('ES-AR', 'Aragón'), r('ES-AS', 'Asturias'), r('ES-IB', 'Illes Balears'),
      r('ES-CN', 'Canarias'), r('ES-CB', 'Cantabria'), r('ES-CM', 'Castilla-La Mancha'), r('ES-CL', 'Castilla y León'),
      r('ES-CT', 'Cataluña'), r('ES-VC', 'Comunitat Valenciana'), r('ES-EX', 'Extremadura'), r('ES-GA', 'Galicia'),
      r('ES-RI', 'La Rioja'), r('ES-MD', 'Comunidad de Madrid'), r('ES-MC', 'Región de Murcia'), r('ES-NC', 'Navarra'),
      r('ES-PV', 'País Vasco'), r('ES-CE', 'Ceuta'), r('ES-ML', 'Melilla'),
    ],
    leaseName: 'Contrato de arrendamiento de local de negocio',
    needsReview: ["Format du NIF : les NIF de personnes commençant par K, L ou M ne sont pas acceptés.", "Un autónomo ou une comunidad de bienes n'est en général pas inscrit au Registro Mercantil : il ne peut pas y être vérifié.", "Accès en ligne au Registro Mercantil pour vérifier une entreprise."],
  },
  PT: {
    code: 'PT', language: 'pt', locale: 'pt-PT', localCurrency: 'EUR', phonePrefix: '+351',
    identifier: {
      name: 'NIPC',
      what: "Le numéro d'identification de la personne morale (ou le NIF d'un indépendant) : 9 chiffres.",
      placeholder: '501 234 567',
      clean: (raw) => digits(raw).slice(0, 9),
      isValid: isValidNipc,
      registry: { name: 'Registo Comercial (gov.pt, Empresa Online)', url: 'https://www.gov.pt/servicos/consultar-a-certidao-permanente-de-registo-comercial' },
      onlineCheck: false,
    },
    legalForms: ['Lda.', 'Unipessoal Lda.', 'S.A.', 'Empresário em Nome Individual', 'Cooperativa', 'Outra'],
    regions: [
      r('PT-01', 'Aveiro'), r('PT-02', 'Beja'), r('PT-03', 'Braga'), r('PT-04', 'Bragança'), r('PT-05', 'Castelo Branco'),
      r('PT-06', 'Coimbra'), r('PT-07', 'Évora'), r('PT-08', 'Faro'), r('PT-09', 'Guarda'), r('PT-10', 'Leiria'),
      r('PT-11', 'Lisboa'), r('PT-12', 'Portalegre'), r('PT-13', 'Porto'), r('PT-14', 'Santarém'), r('PT-15', 'Setúbal'),
      r('PT-16', 'Viana do Castelo'), r('PT-17', 'Vila Real'), r('PT-18', 'Viseu'), r('PT-20', 'Açores'), r('PT-30', 'Madeira'),
    ],
    leaseName: 'Contrato de arrendamento comercial',
    needsReview: ["Accès en ligne au registre du commerce pour vérifier une entreprise."],
  },
  DE: {
    code: 'DE', language: 'de', locale: 'de-DE', localCurrency: 'EUR', phonePrefix: '+49',
    identifier: {
      name: 'Handelsregisternummer',
      what: "Le numéro au registre du commerce (HRB ou HRA suivi de chiffres). Une entreprise non inscrite donne son numéro de TVA (USt-IdNr., DE + 9 chiffres) ou son identifiant économique (W-IdNr.).",
      placeholder: 'HRB 123456',
      clean: (raw) => (raw || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20),
      isValid: isValidGermanId,
      registry: { name: 'Handelsregister', url: 'https://www.handelsregister.de' },
      onlineCheck: false,
    },
    legalForms: ['GmbH', 'UG (haftungsbeschränkt)', 'GmbH & Co. KG', 'AG', 'OHG', 'KG', 'e.K.', 'Einzelunternehmen', 'GbR', 'Sonstige'],
    regions: [
      r('DE-BW', 'Baden-Württemberg'), r('DE-BY', 'Bayern'), r('DE-BE', 'Berlin'), r('DE-BB', 'Brandenburg'),
      r('DE-HB', 'Bremen'), r('DE-HH', 'Hamburg'), r('DE-HE', 'Hessen'), r('DE-MV', 'Mecklenburg-Vorpommern'),
      r('DE-NI', 'Niedersachsen'), r('DE-NW', 'Nordrhein-Westfalen'), r('DE-RP', 'Rheinland-Pfalz'), r('DE-SL', 'Saarland'),
      r('DE-SN', 'Sachsen'), r('DE-ST', 'Sachsen-Anhalt'), r('DE-SH', 'Schleswig-Holstein'), r('DE-TH', 'Thüringen'),
    ],
    leaseName: 'Gewerbemietvertrag',
    needsReview: ["Le numéro de registre seul n'identifie pas l'entreprise : il faut aussi le tribunal (Amtsgericht). À ajouter si la vérification devient obligatoire.", "Identifiant à demander aux entreprises individuelles non inscrites."],
  },
  IT: {
    code: 'IT', language: 'it', locale: 'it-IT', localCurrency: 'EUR', phonePrefix: '+39',
    identifier: {
      name: 'Partita IVA',
      what: "Le numéro de TVA de l'entreprise : 11 chiffres.",
      placeholder: '01234567890',
      clean: (raw) => digits(raw).slice(0, 11),
      isValid: isValidPartitaIva,
      registry: { name: 'Registro Imprese', url: 'https://www.registroimprese.it' },
      onlineCheck: false,
    },
    legalForms: ['S.r.l.', 'S.r.l.s.', 'S.p.A.', 'S.n.c.', 'S.a.s.', 'Ditta individuale', 'Società cooperativa', 'Altra'],
    regions: [
      r('IT-65', 'Abruzzo'), r('IT-77', 'Basilicata'), r('IT-78', 'Calabria'), r('IT-72', 'Campania'),
      r('IT-45', 'Emilia-Romagna'), r('IT-36', 'Friuli-Venezia Giulia'), r('IT-62', 'Lazio'), r('IT-42', 'Liguria'),
      r('IT-25', 'Lombardia'), r('IT-57', 'Marche'), r('IT-67', 'Molise'), r('IT-21', 'Piemonte'),
      r('IT-75', 'Puglia'), r('IT-88', 'Sardegna'), r('IT-82', 'Sicilia'), r('IT-52', 'Toscana'),
      r('IT-32', 'Trentino-Alto Adige/Südtirol'), r('IT-55', 'Umbria'), r('IT-23', "Valle d'Aosta"), r('IT-34', 'Veneto'),
    ],
    leaseName: 'Contratto di locazione commerciale',
    needsReview: ["Accès en ligne au Registro Imprese pour vérifier une entreprise."],
  },
  GB: {
    code: 'GB', language: 'en', locale: 'en-GB', localCurrency: 'GBP', phonePrefix: '+44',
    identifier: {
      name: 'Company number',
      what: "Le numéro d'immatriculation à Companies House : 8 chiffres, ou 2 lettres et 6 chiffres.",
      placeholder: '01234567',
      clean: (raw) => alnum(raw).slice(0, 8),
      isValid: isValidCompanyNumber,
      registry: { name: 'Companies House', url: 'https://find-and-update.company-information.service.gov.uk' },
      onlineCheck: false,
    },
    legalForms: ['Private limited company (Ltd)', 'Limited liability partnership (LLP)', 'Sole trader', 'Partnership', 'Public limited company (PLC)', 'Other'],
    regions: [r('GB-ENG', 'England'), r('GB-SCT', 'Scotland'), r('GB-WLS', 'Wales'), r('GB-NIR', 'Northern Ireland')],
    leaseName: 'Commercial lease',
    needsReview: ["Identifiant à demander à un sole trader (non immatriculé à Companies House).", "Prix affichés en euros alors que la monnaie du pays est la livre sterling : décision commerciale à prendre."],
  },
};

/** Règles génériques, pour une entreprise située dans un pays sans fiche propre. */
const OTHER_MARKET: Market = {
  code: 'XX', language: 'en', locale: 'en-GB', localCurrency: 'EUR', phonePrefix: '',
  identifier: {
    name: "Numéro d'identification",
    what: "Le numéro officiel d'immatriculation de l'entreprise dans son pays.",
    placeholder: '',
    clean: (raw) => (raw || '').toUpperCase().replace(/[^A-Z0-9 .\-/]/g, '').trim().slice(0, 24),
    isValid: (raw) => alnum(raw).length >= 5,
    registry: { name: '', url: '' },
    onlineCheck: false,
  },
  legalForms: [],
  regions: [],
  leaseName: '',
  needsReview: [],
};

export const isMarket = (code: string | null | undefined): code is MarketCode =>
  !!code && (MARKET_CODES as readonly string[]).includes(code.toUpperCase());

/** Les règles du pays d'une annonce. Pays inconnu ou absent : la France (toutes les annonces d'avant en viennent). */
export function marketOf(country: string | null | undefined): Market {
  if (!country) return MARKETS.FR;
  const code = country.toUpperCase();
  return isMarket(code) ? MARKETS[code] : OTHER_MARKET;
}

// ---------------------------------------------------------------------------
// Régions
// ---------------------------------------------------------------------------

/** Anciennes clés des régions françaises (filtres et projets enregistrés avant le multi-pays). */
const LEGACY_FR_REGION: Record<string, string> = {
  idf: 'FR-IDF', ara: 'FR-ARA', paca: 'FR-PAC', naq: 'FR-NAQ', occ: 'FR-OCC', hdf: 'FR-HDF', ges: 'FR-GES',
  pdl: 'FR-PDL', bre: 'FR-BRE', nor: 'FR-NOR', bfc: 'FR-BFC', cvl: 'FR-CVL', cor: 'FR-20R',
};
const LEGACY_FROM_ISO: Record<string, string> = Object.fromEntries(Object.entries(LEGACY_FR_REGION).map(([k, v]) => [v, k]));

/** Clé de région au format ISO, quelle que soit la forme reçue (« idf » ou « FR-IDF »). */
export const regionIso = (key: string): string => LEGACY_FR_REGION[key] || key;
/** Ancienne clé française correspondant à un code ISO, si elle existe (pour la recherche par mots de l'adresse). */
export const legacyFrRegionKey = (iso: string): string | undefined => LEGACY_FROM_ISO[regionIso(iso)];
/** Pays d'une clé de région. */
export const regionCountry = (key: string): string => regionIso(key).slice(0, 2);

const REGION_LABELS: Record<string, string> = Object.fromEntries(
  MARKET_CODES.flatMap((c) => MARKETS[c].regions.map((reg) => [reg.key, reg.label])),
);
export const marketRegionLabel = (key: string): string => REGION_LABELS[regionIso(key)] || key;

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** Noms sous lesquels un service d'adresses peut renvoyer une région, quand ce n'est pas le nom du pays. */
const REGION_ALIASES: Record<string, string[]> = {
  'ES-CT': ['catalunya', 'catalonia', 'catalogne'], 'ES-AN': ['andalusia', 'andalousie'], 'ES-AR': ['aragon'],
  'ES-AS': ['principado de asturias', 'asturies'], 'ES-IB': ['islas baleares', 'balearic islands', 'baleares', 'iles baleares'],
  'ES-CN': ['islas canarias', 'canary islands', 'iles canaries'], 'ES-CL': ['castile and leon', 'castille et leon'],
  'ES-CM': ['castile la mancha', 'castille la manche'], 'ES-VC': ['comunidad valenciana', 'valencian community', 'communaute valencienne'],
  'ES-MD': ['madrid', 'community of madrid', 'communaute de madrid'], 'ES-MC': ['murcia', 'region of murcia', 'murcie'],
  'ES-NC': ['comunidad foral de navarra', 'navarre', 'nafarroa'], 'ES-PV': ['euskadi', 'basque country', 'pays basque'],
  'ES-GA': ['galice'], 'ES-EX': ['estremadure'], 'ES-RI': ['rioja'],
  'DE-BY': ['bavaria', 'baviere'], 'DE-NW': ['north rhine westphalia', 'rhenanie du nord westphalie'], 'DE-HE': ['hesse'],
  'DE-NI': ['lower saxony', 'basse saxe'], 'DE-SN': ['saxony', 'saxe'], 'DE-ST': ['saxony anhalt', 'saxe anhalt'],
  'DE-RP': ['rhineland palatinate', 'rhenanie palatinat'], 'DE-TH': ['thuringia', 'thuringe'], 'DE-HH': ['hambourg'],
  'DE-HB': ['breme', 'freie hansestadt bremen'], 'DE-BW': ['bade wurtemberg'], 'DE-MV': ['mecklenburg western pomerania', 'mecklembourg pomeranie occidentale'],
  'DE-SL': ['sarre'], 'DE-BB': ['brandebourg'], 'DE-SH': ['schleswig holstein'],
  'IT-25': ['lombardy', 'lombardie'], 'IT-21': ['piedmont', 'piemont'], 'IT-52': ['tuscany', 'toscane'], 'IT-82': ['sicily', 'sicile'],
  'IT-88': ['sardinia', 'sardaigne'], 'IT-75': ['apulia', 'pouilles'], 'IT-62': ['latium'], 'IT-34': ['venetie'],
  'IT-45': ['emilie romagne'], 'IT-72': ['campanie'], 'IT-78': ['calabre'], 'IT-42': ['ligurie'], 'IT-57': ['marches'],
  'IT-55': ['ombrie'], 'IT-65': ['abruzzes'], 'IT-77': ['basilicate'], 'IT-32': ['trentino alto adige sudtirol', 'trentin haut adige'],
  'IT-23': ['aosta valley', "vallee d aoste", 'valle d aosta vallee d aoste'], 'IT-36': ['frioul venetie julienne'],
  'GB-ENG': ['angleterre'], 'GB-SCT': ['ecosse', 'alba'], 'GB-WLS': ['pays de galles', 'cymru'], 'GB-NIR': ['irlande du nord'],
  'PT-11': ['lisbon', 'lisbonne'], 'PT-20': ['regiao autonoma dos acores', 'azores', 'acores'], 'PT-30': ['regiao autonoma da madeira', 'madere'],
  'FR-PAC': ['provence alpes cote d azur', 'paca'], 'FR-20R': ['corsica'], 'FR-BRE': ['brittany'], 'FR-NOR': ['normandy'],
};

/**
 * Clé de région d'une annonce à partir de ce que renvoie le service d'adresses :
 * un code ISO 3166-2 (« ES-CT ») quand il existe, sinon un nom de région.
 */
export function regionKeyFor(country: string | null | undefined, isoOrName: string | null | undefined): string | null {
  if (!country || !isoOrName) return null;
  const market = marketOf(country);
  if (!market.regions.length) return null;
  const raw = isoOrName.trim();
  const asIso = raw.toUpperCase();
  if (market.regions.some((reg) => reg.key === asIso)) return asIso;
  const wanted = slug(raw);
  const found = market.regions.find((reg) => slug(reg.label) === wanted || (REGION_ALIASES[reg.key] || []).includes(wanted));
  return found ? found.key : null;
}

// ---------------------------------------------------------------------------
// Formats selon la langue du visiteur
// ---------------------------------------------------------------------------

const LOCALES: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES', it: 'it-IT', pt: 'pt-PT', de: 'de-DE' };

/** Format des nombres et des dates pour la langue choisie sur le site. */
export const localeFor = (language: string | null | undefined): string => LOCALES[(language || 'fr').slice(0, 2).toLowerCase()] || 'fr-FR';

/** Un montant en euros, écrit comme dans la langue du visiteur (« 280 000 € », « €280,000 », « 280.000 € »). */
export function formatMoney(amount: number | string | null | undefined, language?: string | null, currency = 'EUR'): string {
  const n = Number(amount);
  if (amount === null || amount === undefined || amount === '' || !Number.isFinite(n)) return '';
  return new Intl.NumberFormat(localeFor(language), { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

/** Un nombre simple, avec les séparateurs de la langue du visiteur. */
export const formatNumber = (value: number | string | null | undefined, language?: string | null): string => {
  const n = Number(value);
  return value === null || value === undefined || value === '' || !Number.isFinite(n) ? '' : new Intl.NumberFormat(localeFor(language)).format(n);
};

/** Une date, en clair (« 13 octobre 2026 ») ou courte (« 13/10/2026 »), dans la langue du visiteur. */
export function formatDate(value: string | number | Date | null | undefined, language?: string | null, style: 'long' | 'short' = 'long'): string {
  if (value === null || value === undefined || value === '') return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(localeFor(language), style === 'long' ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: '2-digit', month: '2-digit', year: 'numeric' });
}
