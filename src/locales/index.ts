// Les langues du site.
//
// Le français et l'anglais sont dans le paquet principal (src/i18n.ts). Les
// autres langues vivent chacune dans son dossier (src/locales/<code>/) et ne
// sont téléchargées que lorsqu'un visiteur les choisit.

export const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'de', label: 'Deutsch' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

/** Langues chargées à la demande. */
export const LAZY_LANGUAGES: LanguageCode[] = ['es', 'it', 'pt', 'de'];

export function isLanguage(code: string | null | undefined): code is LanguageCode {
  return !!code && LANGUAGES.some((l) => l.code === code);
}

type Parts = {
  core: Record<string, string>; additions: Record<string, string>; pages: Record<string, string>;
  assistant: Record<string, string>; projects: Record<string, string>; projectform: Record<string, string>;
  radar: Record<string, string>; crm: Record<string, string>; industries: Record<string, string>;
  account: Record<string, string>; sector: Record<string, string>; dashboard: Record<string, string>;
  extra: Record<string, string>; finance: Record<string, string>; markets: Record<string, string>;
};

async function loadParts(code: LanguageCode): Promise<Parts> {
  // Chemins écrits en toutes lettres : c'est ce qui permet au compilateur de
  // faire un fichier séparé par langue.
  const pick = async (m: Promise<Record<string, unknown>>, name: string) => (await m)[name] as Record<string, string>;
  switch (code) {
    case 'es': return {
      core: await pick(import('./es/core'), 'core'), additions: await pick(import('./es/additions'), 'additions'), pages: await pick(import('./es/pages'), 'pages'),
      assistant: await pick(import('./es/assistant'), 'assistant'), projects: await pick(import('./es/projects'), 'projects'), projectform: await pick(import('./es/projectform'), 'projectform'),
      radar: await pick(import('./es/radar'), 'radar'), crm: await pick(import('./es/crm'), 'crm'), industries: await pick(import('./es/industries'), 'industries'),
      account: await pick(import('./es/account'), 'account'), sector: await pick(import('./es/sector'), 'sector'), dashboard: await pick(import('./es/dashboard'), 'dashboard'),
      extra: await pick(import('./es/extra'), 'extra'), finance: await pick(import('./es/finance'), 'finance'), markets: await pick(import('./es/markets'), 'markets'),
    };
    case 'it': return {
      core: await pick(import('./it/core'), 'core'), additions: await pick(import('./it/additions'), 'additions'), pages: await pick(import('./it/pages'), 'pages'),
      assistant: await pick(import('./it/assistant'), 'assistant'), projects: await pick(import('./it/projects'), 'projects'), projectform: await pick(import('./it/projectform'), 'projectform'),
      radar: await pick(import('./it/radar'), 'radar'), crm: await pick(import('./it/crm'), 'crm'), industries: await pick(import('./it/industries'), 'industries'),
      account: await pick(import('./it/account'), 'account'), sector: await pick(import('./it/sector'), 'sector'), dashboard: await pick(import('./it/dashboard'), 'dashboard'),
      extra: await pick(import('./it/extra'), 'extra'), finance: await pick(import('./it/finance'), 'finance'), markets: await pick(import('./it/markets'), 'markets'),
    };
    case 'pt': return {
      core: await pick(import('./pt/core'), 'core'), additions: await pick(import('./pt/additions'), 'additions'), pages: await pick(import('./pt/pages'), 'pages'),
      assistant: await pick(import('./pt/assistant'), 'assistant'), projects: await pick(import('./pt/projects'), 'projects'), projectform: await pick(import('./pt/projectform'), 'projectform'),
      radar: await pick(import('./pt/radar'), 'radar'), crm: await pick(import('./pt/crm'), 'crm'), industries: await pick(import('./pt/industries'), 'industries'),
      account: await pick(import('./pt/account'), 'account'), sector: await pick(import('./pt/sector'), 'sector'), dashboard: await pick(import('./pt/dashboard'), 'dashboard'),
      extra: await pick(import('./pt/extra'), 'extra'), finance: await pick(import('./pt/finance'), 'finance'), markets: await pick(import('./pt/markets'), 'markets'),
    };
    case 'de': return {
      core: await pick(import('./de/core'), 'core'), additions: await pick(import('./de/additions'), 'additions'), pages: await pick(import('./de/pages'), 'pages'),
      assistant: await pick(import('./de/assistant'), 'assistant'), projects: await pick(import('./de/projects'), 'projects'), projectform: await pick(import('./de/projectform'), 'projectform'),
      radar: await pick(import('./de/radar'), 'radar'), crm: await pick(import('./de/crm'), 'crm'), industries: await pick(import('./de/industries'), 'industries'),
      account: await pick(import('./de/account'), 'account'), sector: await pick(import('./de/sector'), 'sector'), dashboard: await pick(import('./de/dashboard'), 'dashboard'),
      extra: await pick(import('./de/extra'), 'extra'), finance: await pick(import('./de/finance'), 'finance'), markets: await pick(import('./de/markets'), 'markets'),
    };
    default: throw new Error(`Langue non prise en charge : ${code}`);
  }
}

/**
 * Tous les textes d'une langue, à plat, prêts pour i18next.
 * `industriesFr` (nom anglais → libellé français) sert à retrouver aussi un
 * secteur enregistré sous son ancien libellé français.
 */
export async function loadLanguageBundle(code: LanguageCode, industriesFr: Record<string, string>): Promise<Record<string, string>> {
  const p = await loadParts(code);
  const sectors: Record<string, string> = {};
  for (const [english, french] of Object.entries(industriesFr)) {
    const label = p.industries[english] ?? english;
    sectors[`industry.${english}`] = label;
    sectors[`industry.${french}`] = label;
  }
  return {
    ...p.core, ...sectors, ...p.additions, ...p.pages, ...p.assistant, ...p.projects, ...p.projectform, ...p.radar, ...p.crm,
    ...p.dashboard, ...p.sector, ...p.account, ...p.extra, ...p.finance, ...p.markets,
  };
}
