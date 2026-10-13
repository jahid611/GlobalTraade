// Parcours guidés de Globi : des machines à états décrites question par
// question (texte, type de réponse attendue, boutons, validation, suite).
// Le déroulé lui-même (annulation, réponse incomprise, question posée en
// chemin) est dans engine.ts.

import { estimateValue } from '@/lib/valuation';
import type { ListingDraft } from '@/services/assistantService';
import { industryLabel, suggestIndustries } from './industryMatch';
import { normalizeText, parseAmount, parseAmountOrZero, parseCount, parseYear, parseYesNo } from './normalize';
import {
  BUTTONS, COMMON_TRADES, DESCRIPTION, ESTIMATE, FAMILIES, FAMILY_DEFAULT, LISTING, REFUSALS, REMARKS, START,
  capitalize, decimal, euros, say,
} from './texts';
import type { Bilingual, BotReply, FlowId, KnowledgeEntry, Lang, QuickReply } from './types';

/** Ce que l'interface sait de l'utilisateur. `currentYear` garde le moteur pur (pas d'horloge ici). */
export interface EngineContext {
  firstName?: string;
  hasListing?: boolean;
  currentYear?: number;
  /** pays de l'entreprise ou du profil (code ISO), quand l'interface le connaît ; absent, c'est la France */
  country?: string | null;
}

/** Dit après l'estimation quand l'entreprise n'est pas en France : les repères du calcul sont français. */
const FOREIGN_BENCHMARKS: Bilingual = {
  fr: "Ces repères viennent d'usages français. Ils n'ont pas été vérifiés pour votre pays : prenez cette fourchette comme une simple indication et faites-la valider par un expert-comptable de votre pays.",
  en: 'These benchmarks come from French practice. They have not been checked for your country: treat this range as a rough guide only and have an accountant in your country confirm it.',
};

export type Memory = Record<string, string | number | boolean>;

export interface StepContext {
  lang: Lang;
  /** réponses du parcours en cours */
  data: Memory;
  /** ce que Globi sait déjà, d'un parcours à l'autre */
  facts: Memory;
  ctx: EngineContext;
  entries: KnowledgeEntry[];
}

/**
 * Verdict sur une réponse. Acceptée : `data` et `facts` sont retenus (une
 * chaîne vide efface la valeur), `note` est dit avant la question suivante.
 * Refusée : avec `message`, c'est un refus expliqué ; sans, la réponse n'a pas
 * été comprise.
 */
export type Outcome =
  | { ok: true; data?: Memory; facts?: Memory; note?: string }
  | { ok: false; message?: string; data?: Memory };

export type AnswerKind = 'text' | 'amount' | 'yesno' | 'choice' | 'count' | 'year';

export interface FlowStep {
  id: string;
  /** type de réponse attendue */
  kind: AnswerKind;
  /** question sautée quand la réponse est déjà connue */
  skip?: (c: StepContext) => boolean;
  question: (c: StepContext) => string;
  /** reformulation avec un exemple, dite quand la réponse n'est pas comprise */
  example: Bilingual;
  replies?: (c: StepContext) => QuickReply[];
  accept: (text: string, c: StepContext) => Outcome;
  /** identifiant de la question suivante, null à la fin du parcours */
  next: (c: StepContext) => string | null;
}

export interface FlowDef {
  id: FlowId;
  /** étape de « Mon parcours » marquée en cours au lancement */
  journeyStep: number;
  first: string;
  /** réponses déjà connues au lancement */
  seed?: (facts: Memory) => Memory;
  intro: (c: StepContext) => string;
  steps: FlowStep[];
  finish: (c: StepContext) => { replies: BotReply[]; facts?: Memory };
}

// ── Outils ─────────────────────────────────────────────────────────────────
const num = (m: Memory, key: string) => (typeof m[key] === 'number' ? (m[key] as number) : undefined);
const str = (m: Memory, key: string) => (typeof m[key] === 'string' && m[key] ? (m[key] as string) : undefined);

const answer = (label: Bilingual, lang: Lang, value: string, vars?: Record<string, string | number>): QuickReply =>
  ({ label: say(label, lang, vars), action: { type: 'answer', value } });
const flowButton = (label: Bilingual, lang: Lang, id: FlowId): QuickReply => ({ label: label[lang], action: { type: 'flow', id } });

/** Boutons vers des fiches de la base ; une fiche absente ne donne pas de bouton. */
export function topicButtons(ids: string[], entries: KnowledgeEntry[], lang: Lang): QuickReply[] {
  const out: QuickReply[] = [];
  for (const id of ids) {
    const entry = entries.find(e => e.id === id);
    if (entry) out.push({ label: entry.question[lang], action: { type: 'topic', id } });
  }
  return out;
}

const YES_NO_VALUES = { yes: 'oui', no: 'non', unknown: 'je ne sais pas' };

const hasLetters = (text: string, min = 2) => new RegExp(`[a-z]{${min}}`).test(normalizeText(text));

/** Texte libre remis au propre : espaces compactés, guillemets et ponctuation de fin retirés. */
function tidy(text: string): string {
  return text.replace(/\s+/g, ' ').trim().replace(/^[«»"“”'\s]+|[«»"“”'\s.!?,;:]+$/g, '');
}

// « J'ai une boulangerie » → « boulangerie ».
function tidyTrade(text: string): string {
  return tidy(text)
    .replace(/^(j['’]ai|je tiens|je suis|je g[eè]re|c['’]est|i have|i run|i own|i am|i['’]m|it['’]s)\s+/i, '')
    .replace(/^(une?|mon|ma|a|an|my)\s+/i, '');
}

const SHARED_FACTS = ['metier', 'industry', 'ca', 'ebe', 'ebeApprox'];

// Changer de métier rend caduc le secteur choisi pour l'ancien.
function tradeFacts(trade: string, facts: Memory): Memory {
  const same = normalizeText(str(facts, 'metier') ?? '') === normalizeText(trade);
  return same ? { metier: trade } : { metier: trade, industry: '' };
}

/**
 * Secteur Globly évident pour un métier : une seule proposition, ou une
 * proposition dont le libellé EST le métier écrit (« boulangerie » →
 * « Boulangerie », même si « Boulangerie-Pâtisserie » est aussi proposée).
 * Dans ces cas Globi ne repose pas la question : demander le métier puis
 * « quel secteur ? » donnait l'impression d'entendre deux fois la même chose.
 */
export function obviousIndustry(trade: string, lang: Lang): string | undefined {
  const suggestions = suggestIndustries(trade, lang);
  if (suggestions.length === 1) return suggestions[0];
  const wanted = normalizeText(trade);
  const labelsOf = (value: string) => [value, industryLabel(value, 'fr'), industryLabel(value, 'en')].map(normalizeText);
  const exact = suggestions.find(value => labelsOf(value).includes(wanted));
  if (exact) return exact;
  // Le nom du métier pour le nom du secteur : « menuisier » → « Menuiserie »,
  // « coiffeur » → « Coiffure », « boulanger » → « Boulangerie ». On retient le
  // secteur dont le libellé, en UN mot, commence comme le métier écrit — à
  // condition qu'il soit le seul dans ce cas.
  const words = wanted.split(' ').filter(word => word.length >= 5);
  const sameRoot = (label: string) => !label.includes(' ') && words.some(word => {
    let common = 0;
    while (common < word.length && common < label.length && word[common] === label[common]) common++;
    return common >= 5;
  });
  const close = suggestions.filter(value => labelsOf(value).some(sameRoot));
  return close.length === 1 ? close[0] : undefined;
}

/**
 * Un texte libre qui est simplement un métier (« menuisier », « je suis
 * coiffeuse ») : le métier remis au propre, ou undefined si ce n'en est pas un.
 */
export function recognizeTrade(text: string, lang: Lang): string | undefined {
  const trade = tidyTrade(text);
  if (!hasLetters(trade) || trade.split(' ').length > 4) return undefined;
  return suggestIndustries(trade, lang).length > 0 ? trade : undefined;
}

/** Ce que Globi retient d'un métier : le métier, et son secteur s'il est évident. */
export function tradeMemory(trade: string, facts: Memory, lang: Lang): Memory {
  const memory = tradeFacts(trade, facts);
  const kept = memory.industry === undefined ? str(facts, 'industry') : undefined;
  const industry = kept ?? obviousIndustry(trade, lang);
  if (industry) memory.industry = industry;
  return memory;
}

function acceptTrade(text: string, c: StepContext): Outcome {
  const trade = tidyTrade(text);
  if (!hasLetters(trade)) return { ok: false };
  if (trade.length > 80) return { ok: false, message: REFUSALS.tooLong[c.lang] };
  const facts = tradeFacts(trade, c.facts);
  const data: Memory = { metier: trade };
  // Le secteur déjà retenu pour ce même métier est gardé ; sinon on le déduit.
  const kept = facts.industry === undefined ? str(c.facts, 'industry') : undefined;
  const industry = kept ?? obviousIndustry(trade, c.lang);
  if (industry) { data.industry = industry; facts.industry = industry; }
  return { ok: true, data, facts };
}

function acceptRevenue(text: string, c: StepContext): Outcome {
  const amount = parseAmount(text);
  if (amount === null) return { ok: false };
  if (amount <= 0) return { ok: false, message: REFUSALS.revenueZero[c.lang] };
  if (amount < 1000) return { ok: false, message: say(REFUSALS.amountSmall, c.lang, { amount: euros(amount, c.lang) }) };
  if (amount > 1e9) return { ok: false, message: REFUSALS.amountHuge[c.lang] };
  return { ok: true, data: { ca: amount }, facts: { ca: amount } };
}

// L'EBE peut être négatif, jamais supérieur au chiffre d'affaires.
function checkEbe(amount: number, c: StepContext): string | null {
  const revenue = num(c.data, 'ca');
  if (revenue !== undefined && amount > revenue) return say(REFUSALS.ebeAboveRevenue, c.lang, { revenue: euros(revenue, c.lang) });
  if (Math.abs(amount) > 1e9) return REFUSALS.amountHuge[c.lang];
  return null;
}

/**
 * Secteur donné à estimateValue : le métier tel qu'il a été dit, complété par
 * le secteur le plus proche (« resto » seul ne serait pas reconnu).
 */
export function valuationSector(trade: string, lang: Lang): string {
  const [closest] = suggestIndustries(trade, lang);
  return closest ? `${trade} ${closest} ${industryLabel(closest, 'fr')}` : trade;
}

// ── Estimer mon prix ───────────────────────────────────────────────────────
const costStep = (id: string, question: Bilingual, next: string, withNoEmployee = false): FlowStep => ({
  id,
  kind: 'amount',
  question: c => question[c.lang],
  example: ESTIMATE.exampleCost,
  replies: withNoEmployee ? c => [answer(BUTTONS.noEmployee, c.lang, '0')] : undefined,
  accept: (text, c) => {
    const amount = parseAmountOrZero(text);
    if (amount === null) return { ok: false };
    if (amount < 0) return { ok: false, message: REFUSALS.negative[c.lang] };
    if (amount > 1e9) return { ok: false, message: REFUSALS.amountHuge[c.lang] };
    if (id !== 'salaires') return { ok: true, data: { [id]: amount } };
    // Dernier des trois postes : l'EBE approché peut être annoncé.
    const revenue = num(c.data, 'ca') ?? 0;
    const costs = (num(c.data, 'achats') ?? 0) + (num(c.data, 'charges') ?? 0) + amount;
    const ebe = revenue - costs;
    const vars = { ebe: euros(ebe, c.lang), revenue: euros(revenue, c.lang), costs: euros(costs, c.lang) };
    return {
      ok: true,
      data: { salaires: amount, ebe, ebeApprox: true },
      facts: { ebe, ebeApprox: true },
      note: say(ebe < 0 ? ESTIMATE.ebeApproxNegative : ESTIMATE.ebeApprox, c.lang, vars),
    };
  },
  next: () => next,
});

const estimateFlow: FlowDef = {
  id: 'estimate',
  journeyStep: 3,
  first: 'metier_connu',
  // Globi se souvient du métier d'un parcours à l'autre : il le confirme d'un
  // bouton au lieu de reposer la question.
  seed: facts => {
    if (!str(facts, 'metier')) return {};
    // Un parcours a déjà été commencé avec ce métier : on vérifie d'un bouton
    // que c'est toujours la même activité (et on laisse en changer). Sinon le
    // métier vient juste d'être donné — on le reprend sans reposer aucune
    // question, en le rappelant simplement.
    return facts.prixBas !== undefined || facts.ca !== undefined
      ? { metier: facts.metier, metierConnu: true }
      : { metier: facts.metier, metierGarde: true };
  },
  intro: c => (c.data.metierGarde === true
    ? say(ESTIMATE.introKnownTrade, c.lang, { trade: str(c.data, 'metier') ?? '' })
    : ESTIMATE.intro[c.lang]),
  steps: [
    {
      id: 'metier_connu',
      kind: 'choice',
      skip: c => c.data.metierConnu !== true,
      question: c => say(ESTIMATE.confirmTrade, c.lang, { trade: str(c.data, 'metier') ?? '' }),
      example: ESTIMATE.exampleConfirmTrade,
      replies: c => [
        answer(ESTIMATE.sameTrade, c.lang, YES_NO_VALUES.yes),
        answer(ESTIMATE.otherTrade, c.lang, YES_NO_VALUES.no),
      ],
      accept: (text, c) => {
        const verdict = parseYesNo(text, c.lang);
        if (verdict === 'yes') return { ok: true, data: { metierConnu: false, metierGarde: true } };
        if (verdict === 'no') return { ok: true, data: { metierConnu: false, metierGarde: false, metier: '' } };
        // Il écrit directement un autre métier : on le prend.
        const other = acceptTrade(text, c);
        return other.ok ? { ...other, data: { ...other.data, metierConnu: false, metierGarde: true } } : { ok: false };
      },
      next: c => (c.data.metierGarde === true ? 'ca' : 'metier'),
    },
    {
      id: 'metier',
      kind: 'text',
      skip: c => c.data.metierGarde === true,
      question: c => ESTIMATE.askTrade[c.lang],
      example: ESTIMATE.exampleTrade,
      replies: c => COMMON_TRADES.map(trade => answer(trade, c.lang, trade[c.lang])),
      accept: acceptTrade,
      next: () => 'ca',
    },
    {
      id: 'ca',
      kind: 'amount',
      question: c => ESTIMATE.askRevenue[c.lang],
      example: ESTIMATE.exampleAmount,
      accept: acceptRevenue,
      next: () => 'ebe_connu',
    },
    {
      id: 'ebe_connu',
      kind: 'yesno',
      question: c => ESTIMATE.askEbeKnown[c.lang],
      example: ESTIMATE.exampleEbeKnown,
      replies: c => [
        answer(BUTTONS.yes, c.lang, YES_NO_VALUES.yes),
        answer(BUTTONS.no, c.lang, YES_NO_VALUES.no),
        ...topicButtons(['ebe'], c.entries, c.lang),
      ],
      accept: (text, c) => {
        const verdict = parseYesNo(text, c.lang);
        const amount = parseAmount(text);
        // « Oui, 45 000 » ou « 45 000 » : le montant est donné d'emblée.
        if (amount !== null && verdict !== 'no' && verdict !== 'unknown') {
          const refusal = checkEbe(amount, c);
          if (refusal) return { ok: false, message: refusal };
          return { ok: true, data: { ebeConnu: true, ebe: amount, ebeApprox: false }, facts: { ebe: amount, ebeApprox: '' } };
        }
        if (verdict === 'yes') return { ok: true, data: { ebeConnu: true } };
        if (verdict === 'no' || verdict === 'unknown') {
          return { ok: true, data: { ebeConnu: false }, note: ESTIMATE.approachIntro[c.lang] };
        }
        return { ok: false };
      },
      next: c => (c.data.ebeConnu !== true ? 'achats' : num(c.data, 'ebe') === undefined ? 'ebe' : 'salaire'),
    },
    {
      id: 'ebe',
      kind: 'amount',
      question: c => ESTIMATE.askEbe[c.lang],
      example: ESTIMATE.exampleEbe,
      replies: c => [answer(BUTTONS.unknown, c.lang, YES_NO_VALUES.unknown)],
      accept: (text, c) => {
        const amount = parseAmount(text);
        if (amount === null) {
          const verdict = parseYesNo(text, c.lang);
          if (verdict === 'no' || verdict === 'unknown') {
            return { ok: true, data: { ebeConnu: false }, note: ESTIMATE.approachIntro[c.lang] };
          }
          return { ok: false };
        }
        const refusal = checkEbe(amount, c);
        if (refusal) return { ok: false, message: refusal };
        return { ok: true, data: { ebe: amount, ebeApprox: false }, facts: { ebe: amount, ebeApprox: '' } };
      },
      next: c => (c.data.ebeConnu === false ? 'achats' : 'salaire'),
    },
    costStep('achats', ESTIMATE.askPurchases, 'charges'),
    costStep('charges', ESTIMATE.askCosts, 'salaires'),
    costStep('salaires', ESTIMATE.askWages, 'salaire', true),
    {
      id: 'salaire',
      kind: 'yesno',
      question: c => ESTIMATE.askOwnerPay[c.lang],
      example: ESTIMATE.exampleOwnerPay,
      replies: c => [
        answer(BUTTONS.yes, c.lang, YES_NO_VALUES.yes),
        answer(BUTTONS.no, c.lang, YES_NO_VALUES.no),
        answer(BUTTONS.unknown, c.lang, YES_NO_VALUES.unknown),
      ],
      accept: (text, c) => {
        const verdict = parseYesNo(text, c.lang);
        if (verdict === null) return { ok: false };
        if (verdict === 'unknown') return { ok: true, data: { dirigeantRemunere: '' }, facts: { dirigeantRemunere: '' } };
        return { ok: true, data: { dirigeantRemunere: verdict === 'yes' }, facts: { dirigeantRemunere: verdict === 'yes' } };
      },
      next: () => null,
    },
  ],
  finish: c => {
    const { lang } = c;
    const trade = str(c.data, 'metier') ?? '';
    const paid = c.data.dirigeantRemunere;
    const result = estimateValue({
      secteur: valuationSector(trade, lang),
      chiffreAffaires: num(c.data, 'ca') ?? 0,
      ebe: num(c.data, 'ebe'),
      dirigeantRemunere: typeof paid === 'boolean' ? paid : undefined,
      pays: c.ctx.country,
    });
    const low = result.fourchette_basse;
    const high = result.fourchette_haute;
    const byRevenue = result.methode_chiffre_affaires;
    const byEbe = result.methode_ebe;

    const lines = [
      say(low === high ? ESTIMATE.resultSingle : ESTIMATE.resultRange, lang, { low: euros(low, lang), high: euros(high, lang), trade }),
      '',
      ESTIMATE.originTitle[lang],
      `- ${say(ESTIMATE.originRevenue, lang, {
        family: (FAMILIES[result.famille] ?? FAMILY_DEFAULT)[lang],
        pctLow: byRevenue.pourcentage_bas, pctHigh: byRevenue.pourcentage_haut,
        low: euros(byRevenue.bas, lang), high: euros(byRevenue.haut, lang),
      })}`,
    ];
    if (byEbe) {
      lines.push(`- ${say(ESTIMATE.originEbe, lang, {
        multLow: decimal(byEbe.multiple_bas, lang), multHigh: decimal(byEbe.multiple_haut, lang),
        low: euros(byEbe.bas, lang), high: euros(byEbe.haut, lang),
      })}`);
    }
    // Les deux calculs se contredisent quand estimateValue signale un écart de rentabilité.
    const apart = result.codes.includes('rentabilite_faible') || result.codes.includes('rentabilite_forte');
    lines.push('', (byEbe ? (apart ? ESTIMATE.originAverage : ESTIMATE.originOverlap) : ESTIMATE.originRevenueOnly)[lang]);
    if (result.codes.length > 0) {
      lines.push('', ESTIMATE.remarksTitle[lang], ...result.codes.map(code => `- ${REMARKS[code][lang]}`));
    }

    const related = c.entries.filter(entry => entry.step === 3).slice(0, 2).map(entry => entry.id);
    return {
      facts: { prixBas: low, prixHaut: high },
      replies: [
        { text: lines.join('\n'), pose: 'bravo', journey: { step: 3, status: 'done' } },
        {
          text: `${ESTIMATE.levers[lang]}\n\n${ESTIMATE.warning[lang]}${result.hors_france ? `\n\n${FOREIGN_BENCHMARKS[lang]}` : ''}`,
          pose: 'guide',
          quickReplies: [
            flowButton(BUTTONS.listingWithNumbers, lang, 'listing'),
            ...topicButtons(related, c.entries, lang),
            flowButton(BUTTONS.estimateAgain, lang, 'estimate'),
          ],
        },
      ],
    };
  },
};

// ── Créer mon annonce ──────────────────────────────────────────────────────
const sectorSuggestions = (c: StepContext) => suggestIndustries(str(c.data, 'secteurRecherche') ?? str(c.data, 'metier') ?? '', c.lang);

// Le métier tel qu'il s'écrit dans une phrase : le secteur choisi s'il se lit
// bien (« salon de coiffure »), sinon le mot du commerçant.
function tradeLabel(data: Memory, lang: Lang): string {
  const industry = str(data, 'industry');
  if (industry) {
    const label = industryLabel(industry, lang);
    if (!/[/()]/.test(label)) return label.toLowerCase();
  }
  return (str(data, 'metier') ?? '').toLowerCase();
}

const REASONS: Record<string, { label: Bilingual; sentence: Bilingual }> = {
  retraite: { label: BUTTONS.reasonRetirement, sentence: DESCRIPTION.reasonRetirement },
  projet: { label: BUTTONS.reasonProject, sentence: DESCRIPTION.reasonProject },
  sante: { label: BUTTONS.reasonHealth, sentence: DESCRIPTION.reasonHealth },
  demenagement: { label: BUTTONS.reasonMove, sentence: DESCRIPTION.reasonMove },
};

const STRENGTHS: Record<string, { label: Bilingual; sentence: Bilingual }> = {
  emplacement: { label: BUTTONS.strengthLocation, sentence: DESCRIPTION.strengthLocation },
  clientele: { label: BUTTONS.strengthCustomers, sentence: DESCRIPTION.strengthCustomers },
  materiel: { label: BUTTONS.strengthEquipment, sentence: DESCRIPTION.strengthEquipment },
  equipe: { label: BUTTONS.strengthTeam, sentence: DESCRIPTION.strengthTeam },
};

/**
 * Description de l'annonce, de 4 à 6 phrases, assemblée à partir des seules
 * réponses données : une phrase dont l'information manque n'est pas écrite.
 */
export function buildDescription(data: Memory, lang: Lang): string {
  const trade = tradeLabel(data, lang);
  const city = str(data, 'ville') ?? '';
  const name = str(data, 'nom');
  const sentences: string[] = [];

  sentences.push(name
    ? say(DESCRIPTION.openNamed, lang, { name, trade, city })
    : say(DESCRIPTION.openDiscreet, lang, { Trade: capitalize(trade), city }));

  const year = num(data, 'annee');
  const employees = num(data, 'employes');
  if (year !== undefined && employees !== undefined) {
    const staff = employees === 0 ? DESCRIPTION.staffNone : employees === 1 ? DESCRIPTION.staffOne : DESCRIPTION.staffMany;
    sentences.push(say(DESCRIPTION.since, lang, { year, staff: say(staff, lang, { count: employees }) }));
  }

  const revenue = num(data, 'ca');
  const ebe = num(data, 'ebe');
  if (revenue !== undefined) {
    // Un EBE nul ou négatif reste dans les chiffres de l'annonce, pas dans son texte.
    const template = ebe !== undefined && ebe > 0
      ? (data.ebeApprox === true ? DESCRIPTION.revenueEbeApprox : DESCRIPTION.revenueEbe)
      : DESCRIPTION.revenue;
    sentences.push(say(template, lang, { revenue: euros(revenue, lang), ebe: euros(ebe ?? 0, lang) }));
  }

  const strength = str(data, 'atout');
  if (strength && STRENGTHS[strength]) sentences.push(STRENGTHS[strength].sentence[lang]);
  else if (strength === 'autre' && str(data, 'atoutTexte')) {
    sentences.push(say(DESCRIPTION.strengthOther, lang, { text: str(data, 'atoutTexte') ?? '' }));
  }

  const reason = str(data, 'raison');
  if (reason && REASONS[reason]) sentences.push(REASONS[reason].sentence[lang]);
  else if (str(data, 'raisonTexte')) sentences.push(say(DESCRIPTION.reasonOther, lang, { text: str(data, 'raisonTexte') ?? '' }));

  sentences.push(DESCRIPTION.close[lang]);
  return sentences.join(' ');
}

/** Brouillon d'annonce : uniquement les champs réellement renseignés. */
export function buildDraft(data: Memory, lang: Lang): ListingDraft {
  const draft: ListingDraft = {};
  const city = str(data, 'ville');
  draft.name = str(data, 'nom') ?? say(LISTING.discreetName, lang, { trade: capitalize(tradeLabel(data, lang)), city: city ?? '' });
  const industry = str(data, 'industry');
  if (industry) draft.industry = industry;
  if (city) draft.address = city;
  for (const [field, key] of [['price', 'prix'], ['revenue_n1', 'ca'], ['ebitda', 'ebe'], ['employees', 'employes'], ['established_year', 'annee']] as const) {
    const value = num(data, key);
    if (value !== undefined) draft[field] = value;
  }
  draft.description = buildDescription(data, lang);
  const reason = str(data, 'raison');
  const reasonText = reason && REASONS[reason] ? REASONS[reason].label[lang] : str(data, 'raisonTexte');
  if (reasonText) draft.reason_for_selling = capitalize(reasonText);
  return draft;
}

const DISCREET_WORDS = ['rester discret', 'discret', 'discrete', 'anonyme', 'confidentiel', 'stay discreet', 'discreet', 'anonymous', 'confidential'];
const NONE_WORDS = ['aucun de ceux la', 'aucun', 'aucune', 'autre', 'none of these', 'none', 'other', 'neither'];
const SKIP_WORDS = ['passer', 'skip', 'non', 'no', 'aucun', 'aucune', 'rien', 'none', 'nothing', 'pas de point fort'];

const listingFlow: FlowDef = {
  id: 'listing',
  journeyStep: 4,
  first: 'nom',
  seed: facts => {
    const data: Memory = {};
    for (const key of SHARED_FACTS) if (facts[key] !== undefined) data[key] = facts[key];
    // Métier connu d'une estimation : le secteur évident est retenu d'office.
    const trade = str(data, 'metier');
    if (trade && !str(data, 'industry')) {
      const industry = obviousIndustry(trade, 'fr');
      if (industry) data.industry = industry;
    }
    return data;
  },
  intro: c => {
    const parts = [(c.data.reprise === true ? LISTING.introResume : LISTING.intro)[c.lang]];
    if (c.ctx.hasListing && c.data.reprise !== true) parts.push(LISTING.hasListing[c.lang]);
    const revenue = num(c.data, 'ca');
    const ebe = num(c.data, 'ebe');
    const known = [
      str(c.data, 'metier'),
      revenue !== undefined ? say(LISTING.recapRevenue, c.lang, { amount: euros(revenue, c.lang) }) : undefined,
      ebe !== undefined ? say(LISTING.recapEbe, c.lang, { amount: euros(ebe, c.lang) }) : undefined,
    ].filter(Boolean).join(', ');
    if (known) parts.push(say(LISTING.recap, c.lang, { known }));
    return parts.join(' ');
  },
  steps: [
    {
      id: 'nom',
      kind: 'text',
      question: c => LISTING.askName[c.lang],
      example: LISTING.exampleName,
      replies: c => [answer(BUTTONS.discreet, c.lang, DISCREET_WORDS[0])],
      accept: (text, c) => {
        if (DISCREET_WORDS.includes(normalizeText(text))) return { ok: true, data: { discret: true, nom: '' } };
        const name = tidy(text);
        if (!hasLetters(name)) return { ok: false };
        if (name.length > 80) return { ok: false, message: REFUSALS.tooLong[c.lang] };
        return { ok: true, data: { nom: name, discret: false } };
      },
      next: () => 'metier',
    },
    {
      id: 'metier',
      kind: 'text',
      skip: c => str(c.data, 'metier') !== undefined,
      question: c => LISTING.askTrade[c.lang],
      example: ESTIMATE.exampleTrade,
      accept: acceptTrade,
      next: () => 'secteur',
    },
    {
      id: 'secteur',
      kind: 'choice',
      // Aucun secteur proche : il sera choisi dans le formulaire.
      skip: c => str(c.data, 'industry') !== undefined || c.data.secteurPlusTard === true || sectorSuggestions(c).length === 0,
      question: c => LISTING.askSector[c.lang],
      example: LISTING.exampleSector,
      replies: c => [
        ...sectorSuggestions(c).map((value): QuickReply => ({ label: industryLabel(value, c.lang), action: { type: 'answer', value } })),
        answer(BUTTONS.noneOfThese, c.lang, NONE_WORDS[0]),
      ],
      accept: (text, c) => {
        const wanted = normalizeText(text);
        if (!wanted) return { ok: false };
        const offered = sectorSuggestions(c);
        const labelsOf = (value: string) => [value, industryLabel(value, 'fr'), industryLabel(value, 'en')].map(normalizeText);
        const chosen = offered.find(value => labelsOf(value).includes(wanted))
          // « patisserie » pour « Boulangerie-Pâtisserie » : un seul secteur proposé contient ce qui est écrit
          ?? (() => {
            const partial = offered.filter(value => labelsOf(value).some(label => label.includes(wanted) || wanted.includes(label)));
            return partial.length === 1 ? partial[0] : undefined;
          })();
        if (chosen) return { ok: true, data: { industry: chosen }, facts: { industry: chosen } };
        const later: Outcome = { ok: true, data: { secteurPlusTard: true }, note: LISTING.sectorLater[c.lang] };
        if (NONE_WORDS.includes(wanted)) return later;
        // Un autre métier est écrit : on propose UNE fois les secteurs qui s'en
        // approchent. Au second essai, ou si rien ne s'en approche, Globi
        // n'insiste pas : le secteur se choisira dans le formulaire.
        const others = suggestIndustries(text, c.lang);
        // Seulement pour un métier écrit en quelques mots : une phrase vague ne
        // doit pas choisir un secteur par hasard.
        const obvious = tidy(text).split(' ').length <= 3 ? obviousIndustry(tidy(text), c.lang) : undefined;
        if (obvious) return { ok: true, data: { industry: obvious }, facts: { industry: obvious } };
        if (others.length === 0 || str(c.data, 'secteurRecherche') !== undefined) return later;
        return { ok: false, message: say(LISTING.sectorOthers, c.lang, { text: tidy(text) }), data: { secteurRecherche: tidy(text) } };
      },
      next: () => 'ville',
    },
    {
      id: 'ville',
      kind: 'text',
      question: c => LISTING.askCity[c.lang],
      example: LISTING.exampleCity,
      accept: (text, c) => {
        const city = tidy(text).replace(/^(à|a|au|aux|en|in|at)\s+/i, '');
        if (!hasLetters(city)) return { ok: false };
        if (city.length > 60) return { ok: false, message: REFUSALS.tooLong[c.lang] };
        return { ok: true, data: { ville: capitalize(city) } };
      },
      next: () => 'ca',
    },
    {
      id: 'ca',
      kind: 'amount',
      skip: c => num(c.data, 'ca') !== undefined,
      question: c => LISTING.askRevenue[c.lang],
      example: ESTIMATE.exampleAmount,
      accept: acceptRevenue,
      next: () => 'ebe',
    },
    {
      id: 'ebe',
      kind: 'amount',
      skip: c => num(c.data, 'ebe') !== undefined || c.data.ebeInconnu === true,
      question: c => LISTING.askEbe[c.lang],
      example: LISTING.exampleEbe,
      replies: c => [answer(BUTTONS.unknown, c.lang, YES_NO_VALUES.unknown), ...topicButtons(['ebe'], c.entries, c.lang)],
      accept: (text, c) => {
        const amount = parseAmount(text);
        if (amount === null) {
          const verdict = parseYesNo(text, c.lang);
          return verdict === 'no' || verdict === 'unknown' ? { ok: true, data: { ebeInconnu: true } } : { ok: false };
        }
        const refusal = checkEbe(amount, c);
        if (refusal) return { ok: false, message: refusal };
        return { ok: true, data: { ebe: amount, ebeApprox: false }, facts: { ebe: amount, ebeApprox: '' } };
      },
      next: () => 'prix',
    },
    {
      id: 'prix',
      kind: 'amount',
      question: c => {
        const low = num(c.facts, 'prixBas');
        const high = num(c.facts, 'prixHaut');
        return low !== undefined && high !== undefined
          ? say(LISTING.askPriceWithRange, c.lang, { low: euros(low, c.lang), high: euros(high, c.lang) })
          : LISTING.askPrice[c.lang];
      },
      example: LISTING.examplePrice,
      replies: c => {
        const low = num(c.facts, 'prixBas');
        const high = num(c.facts, 'prixHaut');
        if (low === undefined || high === undefined) return [flowButton(BUTTONS.estimateFirst, c.lang, 'estimate')];
        const middle = Math.round((low + high) / 2000) * 1000;
        const price = (label: Bilingual, amount: number) => answer(label, c.lang, String(amount), { amount: euros(amount, c.lang) });
        if (low === high) return [price(BUTTONS.priceMiddle, low)];
        return [price(BUTTONS.priceMiddle, middle), price(BUTTONS.priceLow, low), price(BUTTONS.priceHigh, high)];
      },
      accept: (text, c) => {
        const amount = parseAmount(text);
        if (amount === null) return { ok: false };
        if (amount <= 0) return { ok: false, message: REFUSALS.priceZero[c.lang] };
        if (amount < 1000) return { ok: false, message: say(REFUSALS.amountSmall, c.lang, { amount: euros(amount, c.lang) }) };
        if (amount > 1e9) return { ok: false, message: REFUSALS.amountHuge[c.lang] };
        return { ok: true, data: { prix: amount } };
      },
      next: () => 'employes',
    },
    {
      id: 'employes',
      kind: 'count',
      question: c => LISTING.askEmployees[c.lang],
      example: LISTING.exampleEmployees,
      replies: c => [
        answer(BUTTONS.workAlone, c.lang, '0'),
        ...['1', '2', '3'].map((count): QuickReply => ({ label: count, action: { type: 'answer', value: count } })),
      ],
      accept: (text, c) => {
        const count = parseCount(text);
        if (count === null) return { ok: false };
        if (count > 10000) return { ok: false, message: REFUSALS.employeesHuge[c.lang] };
        return { ok: true, data: { employes: count } };
      },
      next: () => 'annee',
    },
    {
      id: 'annee',
      kind: 'year',
      question: c => LISTING.askYear[c.lang],
      example: LISTING.exampleYear,
      accept: (text, c) => {
        let year = parseYear(text);
        // « Depuis 12 ans » : l'année se déduit si l'interface a donné l'année en cours.
        const age = /(\d{1,3}) (ans|an|years|year|yrs)\b/.exec(normalizeText(text));
        if (year === null && age && c.ctx.currentYear) year = c.ctx.currentYear - Number(age[1]);
        if (year === null || year < 1700) return { ok: false };
        if (year > (c.ctx.currentYear ?? 2100)) return { ok: false, message: REFUSALS.yearFuture[c.lang] };
        return { ok: true, data: { annee: year } };
      },
      next: () => 'raison',
    },
    {
      id: 'raison',
      kind: 'choice',
      question: c => LISTING.askReason[c.lang],
      example: LISTING.exampleReason,
      replies: c => [
        ...Object.entries(REASONS).map(([code, reason]) => answer(reason.label, c.lang, code)),
        answer(BUTTONS.reasonOther, c.lang, 'autre'),
      ],
      accept: (text, c) => {
        const said = normalizeText(text);
        const code = /\bretrait|\bretire/.test(said) ? 'retraite'
          : /\bprojet|\bproject|\breconversion/.test(said) ? 'projet'
          : /\bsante|\bhealth|\bmalad|\billness/.test(said) ? 'sante'
          : /\bdemenag|\brelocat|\bmoving\b/.test(said) ? 'demenagement'
          : null;
        if (code) return { ok: true, data: { raison: code, raisonTexte: '' } };
        if (['autre', 'autre raison', 'other', 'other reason'].includes(said)) return { ok: true, data: { raison: 'autre', raisonTexte: '' } };
        if (!hasLetters(text, 3)) return { ok: false };
        if (text.length > 200) return { ok: false, message: REFUSALS.tooLong[c.lang] };
        return { ok: true, data: { raison: 'autre', raisonTexte: tidy(text) } };
      },
      next: c => (c.data.raison === 'autre' && !str(c.data, 'raisonTexte') ? 'raison_autre' : 'atout'),
    },
    {
      id: 'raison_autre',
      kind: 'text',
      question: c => LISTING.askReasonOther[c.lang],
      example: LISTING.exampleReasonOther,
      accept: (text, c) => {
        if (!hasLetters(text, 3)) return { ok: false };
        if (text.length > 200) return { ok: false, message: REFUSALS.tooLong[c.lang] };
        return { ok: true, data: { raisonTexte: tidy(text) } };
      },
      next: () => 'atout',
    },
    {
      id: 'atout',
      kind: 'choice',
      question: c => LISTING.askStrength[c.lang],
      example: LISTING.exampleStrength,
      replies: c => [
        ...Object.entries(STRENGTHS).map(([code, strength]) => answer(strength.label, c.lang, code)),
        answer(BUTTONS.skip, c.lang, SKIP_WORDS[0]),
      ],
      accept: (text, c) => {
        const said = normalizeText(text);
        const verdict = parseYesNo(text, c.lang);
        if (SKIP_WORDS.includes(said) || verdict === 'no' || verdict === 'unknown') return { ok: true, data: { atout: 'aucun' } };
        // Un mot ou deux : c'est l'un des points forts proposés. Une vraie phrase est gardée telle quelle.
        if (said.split(' ').length <= 3) {
          const code = /\bemplacement|\blocation/.test(said) ? 'emplacement'
            : /\bclient|\bcustomer|\bloyal/.test(said) ? 'clientele'
            : /\bmateriel|\bequipement|\bequipment/.test(said) ? 'materiel'
            : /\bequipe|\bteam|\bstaff/.test(said) ? 'equipe'
            : null;
          if (code) return { ok: true, data: { atout: code } };
        }
        if (!hasLetters(text, 3)) return { ok: false };
        if (text.length > 200) return { ok: false, message: REFUSALS.tooLong[c.lang] };
        return { ok: true, data: { atout: 'autre', atoutTexte: tidy(text) } };
      },
      next: () => null,
    },
  ],
  finish: c => {
    const { lang } = c;
    const draft = buildDraft(c.data, lang);
    const todo = [
      LISTING.todoSiret[lang],
      LISTING.todoAddress[lang],
      ...(draft.industry ? [] : [LISTING.todoSector[lang]]),
      LISTING.todoPhotos[lang],
    ];
    const text = [
      LISTING.ready[lang],
      '',
      LISTING.todoTitle[lang],
      ...todo.map(item => `- ${item}`),
      '',
      LISTING.todoAccount[lang],
    ].join('\n');
    return {
      replies: [{
        text,
        draft,
        pose: 'bravo',
        journey: { step: 4, status: 'doing' },
        quickReplies: topicButtons(['etape-5'], c.entries, lang),
      }],
    };
  },
};

// ── Par où commencer ? ─────────────────────────────────────────────────────
const SITUATIONS: Record<string, { label: Bilingual; text: Bilingual; step: number; flows: FlowId[]; topics: string[] }> = {
  reflexion: { label: BUTTONS.stillThinking, text: START.thinking, step: 1, flows: ['estimate'], topics: ['etape-1'] },
  decide: { label: BUTTONS.decided, text: START.decided, step: 3, flows: ['estimate', 'listing'], topics: [] },
  annonce: { label: BUTTONS.haveListing, text: START.haveListing, step: 5, flows: [], topics: ['etape-5', 'etape-6'] },
  repreneur: { label: BUTTONS.buyerContacted, text: START.buyer, step: 6, flows: [], topics: ['etape-6', 'etape-7'] },
};

const FLOW_LABELS: Record<FlowId, Bilingual> = {
  estimate: BUTTONS.flowEstimate,
  listing: BUTTONS.flowListing,
  start: BUTTONS.flowStart,
};

const startFlowDef: FlowDef = {
  id: 'start',
  journeyStep: 1,
  first: 'situation',
  intro: c => `${START.intro[c.lang]}\n\n${START.steps[c.lang]}`,
  steps: [
    {
      id: 'situation',
      kind: 'choice',
      question: c => START.ask[c.lang],
      example: START.example,
      replies: c => Object.entries(SITUATIONS).map(([code, situation]) => answer(situation.label, c.lang, code)),
      accept: text => {
        const said = normalizeText(text);
        const code = Object.keys(SITUATIONS).includes(said) ? said
          : /\breflech|\bhesit|pas encore|\bthinking|not sure|\bunsure/.test(said) ? 'reflexion'
          : /\brepreneur|\bacheteur|\boffre|\bcontacte|\bbuyer|\boffer/.test(said) ? 'repreneur'
          : /\bannonce|\blisting|en ligne|\bpublie/.test(said) ? 'annonce'
          : /\bdecide|\bpret|\bcertain|made up|\bready|\bfonce/.test(said) ? 'decide'
          : null;
        return code ? { ok: true, data: { situation: code } } : { ok: false };
      },
      next: () => null,
    },
  ],
  finish: c => {
    const situation = SITUATIONS[str(c.data, 'situation') ?? 'reflexion'];
    return {
      replies: [{
        text: situation.text[c.lang],
        pose: 'guide',
        journey: { step: situation.step, status: 'doing' },
        quickReplies: [
          ...situation.flows.map(id => flowButton(FLOW_LABELS[id], c.lang, id)),
          ...topicButtons(situation.topics, c.entries, c.lang),
        ],
      }],
    };
  },
};

export const FLOWS: Record<FlowId, FlowDef> = { estimate: estimateFlow, listing: listingFlow, start: startFlowDef };

export { FLOW_LABELS, SHARED_FACTS };
