// Moteur de dialogue de Globi. Pur : mêmes entrées, mêmes sorties — ni réseau,
// ni horloge, ni hasard. L'interface lui passe ce que l'utilisateur a écrit ou
// le bouton qu'il a touché, et reçoit les messages de Globi et sa mémoire.

import { FLOWS, FLOW_LABELS, recognizeTrade, topicButtons, tradeMemory, type EngineContext, type FlowDef, type FlowStep, type Memory, type Outcome, type StepContext } from './flows';
import { KNOWLEDGE } from './knowledge';
import { normalizeText } from './normalize';
import { searchKnowledge } from './search';
import { BUTTONS, GENERAL, say } from './texts';
import type { BotReply, EngineState, FlowId, FlowState, KnowledgeEntry, Lang, QuickReply } from './types';

export type { EngineContext } from './flows';

/** Texte libre, ou action du bouton touché. */
export type EngineInput = string | QuickReply['action'];

export interface EngineResult { replies: BotReply[]; state: EngineState }

interface Env { lang: Lang; ctx: EngineContext; entries: KnowledgeEntry[] }

const FLOW_IDS: FlowId[] = ['estimate', 'listing', 'start'];
const POPULAR_TOPICS = ['ebe', 'etape-1', 'etape-5'];
// Annonce interrompue pour faire l'estimation : gardée dans `facts` pour la reprendre ensuite.
const PENDING_LISTING = 'annonceEnAttente';
const MISSES = 'incompris';

// ── Boutons et réponses communes ───────────────────────────────────────────
const cancelButton = (lang: Lang): QuickReply => ({ label: BUTTONS.cancel[lang], action: { type: 'cancel' } });

function homeButtons(lang: Lang): QuickReply[] {
  return [
    ...FLOW_IDS.map((id): QuickReply => ({ label: FLOW_LABELS[id][lang], action: { type: 'flow', id } })),
    { label: BUTTONS.whatIsEbe[lang], action: { type: 'topic', id: 'ebe' } },
  ];
}

/** Message d'accueil, avec les trois parcours et « C'est quoi l'EBE ? » en boutons. */
export function welcome(lang: Lang, ctx: EngineContext = {}): BotReply {
  const hello = ctx.firstName ? say(GENERAL.welcomeNamed, lang, { name: ctx.firstName }) : GENERAL.welcome[lang];
  return { text: `${hello}\n\n${GENERAL.welcomeHint[lang]}`, pose: 'bonjour', quickReplies: homeButtons(lang) };
}

function topicReply(entry: KnowledgeEntry, env: Env, withButtons: boolean): BotReply {
  const reply: BotReply = { text: entry.answer[env.lang], pose: 'guide' };
  if (entry.step >= 1) reply.journey = { step: entry.step, status: 'doing' };
  if (withButtons) {
    const buttons = topicButtons((entry.related ?? []).filter(id => id !== entry.id).slice(0, 3), env.entries, env.lang);
    if (entry.suggestFlow) buttons.push({ label: FLOW_LABELS[entry.suggestFlow][env.lang], action: { type: 'flow', id: entry.suggestFlow } });
    if (buttons.length > 0) reply.quickReplies = buttons;
  }
  return reply;
}

function noAnswer(env: Env): BotReply {
  const { lang, entries } = env;
  const known = POPULAR_TOPICS.filter(id => entries.some(entry => entry.id === id));
  const popular = known.length > 0 ? known : entries.slice(0, 2).map(entry => entry.id);
  return {
    text: GENERAL.none[lang],
    pose: 'reflexion',
    quickReplies: [
      ...FLOW_IDS.map((id): QuickReply => ({ label: FLOW_LABELS[id][lang], action: { type: 'flow', id } })),
      ...topicButtons(popular, entries, lang),
      { label: BUTTONS.contact[lang], action: { type: 'link', to: '/contact' } },
    ],
  };
}

// ── Reconnaissance du texte libre ──────────────────────────────────────────
const CANCEL_WORDS = new Set([
  'annuler', 'annule', 'annulez', 'stop', 'retour', 'quitter', 'arreter', 'arrete', 'abandonner', 'on arrete', 'on annule', 'je veux annuler',
  'j arrete', 'cancel', 'back', 'go back', 'quit', 'exit',
]);
const GREETINGS = new Set(['bonjour', 'bonsoir', 'salut', 'coucou', 'bjr', 'hello', 'hi', 'hey']);
const GREETING_FILLERS = new Set(['globi', 'a', 'tous', 'vous', 'there', 'tout', 'le', 'monde']);
const THANKS = ['merci', 'thanks', 'thank you', 'thx'];
const DEFINITIONS = ['c est quoi', 'qu est ce', 'ca veut dire', 'veut dire', 'definition', 'pourquoi', 'what is', 'what s', 'what does', 'what are', 'why', 'meaning'];

// Mots qui lancent directement un parcours.
const TRIGGERS: [FlowId, string[]][] = [
  ['estimate', ['combien vaut', 'combien ca vaut', 'estimer', 'estimation', 'estimez', 'prix de vente', 'evaluer', 'evaluation', 'valoriser',
    'how much is', 'worth', 'estimate', 'valuation', 'asking price', 'value my']],
  ['listing', ['annonce', 'publier', 'mettre en vente', 'listing', 'publish', 'put up for sale', 'advert']],
  ['start', ['par ou commencer', 'je veux vendre', 'je souhaite vendre', 'je voudrais vendre', 'comment vendre', 'where do i start',
    'where to start', 'want to sell', 'how do i sell', 'how to sell']],
];

// Les mots-clés se lisent en début de mot (« estimer » dans « estimerai »).
const startsWord = (text: string, phrase: string) => ` ${text}`.includes(` ${phrase}`);

const isCancel = (text: string) => CANCEL_WORDS.has(normalizeText(text));

function isGreeting(text: string): boolean {
  const words = text.split(' ');
  return words.length <= 4 && GREETINGS.has(words[0]) && words.slice(1).every(word => GREETINGS.has(word) || GREETING_FILLERS.has(word));
}

const isThanks = (text: string) => text.split(' ').length <= 5 && THANKS.some(word => startsWord(text, word));

function looksLikeQuestion(raw: string): boolean {
  if (raw.trim().endsWith('?')) return true;
  const text = normalizeText(raw);
  return DEFINITIONS.some(phrase => startsWord(text, phrase)) || /^(comment|combien|quel|quelle|quels|quelles|est ce que|how|which|when|quand|ou) /.test(text);
}

function triggeredFlow(text: string): FlowId | null {
  for (const [id, phrases] of TRIGGERS) {
    if (phrases.some(phrase => startsWord(text, phrase))) return id;
  }
  return null;
}

// ── Déroulé d'un parcours ──────────────────────────────────────────────────
// Une chaîne vide efface la valeur.
function merge(base: Memory, patch?: Memory): Memory {
  if (!patch) return base;
  const out: Memory = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === '') delete out[key];
    else out[key] = value;
  }
  return out;
}

const stepContext = (data: Memory, facts: Memory, env: Env): StepContext => ({ ...env, data, facts });
const stepOf = (def: FlowDef, id: string): FlowStep | undefined => def.steps.find(step => step.id === id);

function ask(step: FlowStep, c: StepContext, lead?: string): BotReply {
  return {
    text: [lead, step.question(c)].filter(Boolean).join('\n\n'),
    pose: 'guide',
    quickReplies: [...(step.replies?.(c) ?? []), cancelButton(c.lang)],
  };
}

// Pose la prochaine question à laquelle il reste à répondre, ou conclut le parcours.
function proceed(def: FlowDef, nextId: string | null, data: Memory, facts: Memory, env: Env, lead?: string, journey?: BotReply['journey']): EngineResult {
  const c = stepContext(data, facts, env);
  let step = nextId ? stepOf(def, nextId) : undefined;
  for (let guard = 0; step?.skip?.(c) && guard < def.steps.length; guard++) {
    const following = step.next(c);
    step = following ? stepOf(def, following) : undefined;
  }
  if (!step) {
    const done = def.finish(c);
    const replies = lead && done.replies.length > 0
      ? [{ ...done.replies[0], text: `${lead}\n\n${done.replies[0].text}` }, ...done.replies.slice(1)]
      : done.replies;
    return { replies, state: { flow: null, facts: merge(facts, done.facts) } };
  }
  const reply = ask(step, c, lead);
  if (journey) reply.journey = journey;
  return { replies: [reply], state: { flow: { flow: def.id, stepId: step.id, data }, facts } };
}

function readPending(raw: unknown): { stepId: string; data: Memory } | null {
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw) as { stepId?: unknown; data?: unknown };
    if (typeof parsed.stepId !== 'string' || !parsed.data || typeof parsed.data !== 'object') return null;
    const data: Memory = {};
    for (const [key, value] of Object.entries(parsed.data as Record<string, unknown>)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') data[key] = value;
    }
    return { stepId: parsed.stepId, data };
  } catch {
    return null;
  }
}

function startFlow(id: FlowId, state: EngineState, env: Env): EngineResult {
  const def = FLOWS[id];
  let facts = state.facts;
  let first = def.first;
  let data = def.seed?.(facts) ?? {};

  // « Estimer mon prix d'abord » au milieu de l'annonce : on garde l'annonce de côté.
  if (id === 'estimate' && state.flow?.flow === 'listing') {
    facts = merge(facts, { [PENDING_LISTING]: JSON.stringify({ stepId: state.flow.stepId, data: state.flow.data }) });
  }
  if (id === 'listing') {
    const pending = readPending(facts[PENDING_LISTING]);
    facts = merge(facts, { [PENDING_LISTING]: '' });
    if (pending && stepOf(def, pending.stepId)) {
      const kept = merge(pending.data, { [MISSES]: '' });
      // Le métier a changé entre-temps : le secteur choisi ne vaut plus.
      const changed = typeof facts.metier === 'string' && normalizeText(String(kept.metier ?? '')) !== normalizeText(facts.metier);
      data = { ...(changed ? merge(kept, { industry: '', secteurPlusTard: '', secteurRecherche: '' }) : kept), ...data, reprise: true };
      first = pending.stepId;
    }
  }

  const lead = def.intro(stepContext(data, facts, env));
  return proceed(def, first, data, facts, env, lead, { step: def.journeyStep, status: 'doing' });
}

function cancelFlow(state: EngineState, env: Env): EngineResult {
  return {
    replies: [{ text: GENERAL.cancelled[env.lang], pose: 'bonjour', quickReplies: homeButtons(env.lang) }],
    state: { flow: null, facts: state.facts },
  };
}

// Une fiche demandée au milieu d'un parcours : Globi répond, puis repose sa question.
function sideAnswer(entry: KnowledgeEntry, flow: FlowState, step: FlowStep, state: EngineState, env: Env): EngineResult {
  const c = stepContext(flow.data, state.facts, env);
  return { replies: [topicReply(entry, env, false), ask(step, c, GENERAL.backToQuestion[env.lang])], state };
}

function continueFlow(text: string, state: EngineState, flow: FlowState, env: Env): EngineResult {
  const def = FLOWS[flow.flow];
  const step = def ? stepOf(def, flow.stepId) : undefined;
  // Mémoire illisible (ancienne version) : on repart hors parcours.
  if (!def || !step) return freeText(text, { flow: null, facts: state.facts }, env);
  if (isCancel(text)) return cancelFlow(state, env);

  const c = stepContext(flow.data, state.facts, env);
  const sure = () => {
    const found = searchKnowledge(text, env.lang, env.entries);
    return found.confidence === 'sure' ? found.candidates[0] : null;
  };

  // À une question à réponse libre, tout texte serait « valide » : une vraie question passe d'abord.
  if (step.kind === 'text' && looksLikeQuestion(text)) {
    const entry = sure();
    if (entry) return sideAnswer(entry, flow, step, state, env);
  }

  const outcome = step.accept(text, c);
  if (outcome.ok) {
    const data = merge(merge(flow.data, outcome.data), { [MISSES]: '' });
    const facts = merge(state.facts, outcome.facts);
    return proceed(def, step.next(stepContext(data, facts, env)), data, facts, env, outcome.note);
  }

  // (sans le mode strict de TypeScript, `ok` ne suffit pas à distinguer les deux verdicts)
  const refused = outcome as Extract<Outcome, { ok: false }>;
  const data = merge(flow.data, refused.data);
  const again = stepContext(data, state.facts, env);
  const buttons = [...(step.replies?.(again) ?? []), cancelButton(env.lang)];
  if (refused.message) {
    return {
      replies: [{ text: refused.message, pose: 'reflexion', quickReplies: buttons }],
      state: { flow: { ...flow, data }, facts: state.facts },
    };
  }

  const entry = sure();
  if (entry) return sideAnswer(entry, flow, step, state, env);

  // Réponse incomprise : Globi reformule avec un exemple, sans avancer.
  const misses = (typeof data[MISSES] === 'number' ? (data[MISSES] as number) : 0) + 1;
  const opening = misses === 1 ? GENERAL.notUnderstood : GENERAL.notUnderstoodAgain;
  return {
    replies: [{ text: `${opening[env.lang]} ${step.example[env.lang]}`, pose: 'reflexion', quickReplies: buttons }],
    state: { flow: { ...flow, data: { ...data, [MISSES]: misses } }, facts: state.facts },
  };
}

// ── Hors parcours ──────────────────────────────────────────────────────────
function freeText(raw: string, state: EngineState, env: Env): EngineResult {
  const { lang } = env;
  const text = normalizeText(raw);
  if (!text) return { replies: [noAnswer(env)], state };

  if (isGreeting(text)) {
    const hello = env.ctx.firstName ? say(GENERAL.greetingNamed, lang, { name: env.ctx.firstName }) : GENERAL.greeting[lang];
    return { replies: [{ text: hello, pose: 'bonjour', quickReplies: homeButtons(lang) }], state };
  }
  if (isThanks(text)) {
    return { replies: [{ text: GENERAL.thanks[lang], pose: 'bravo', quickReplies: homeButtons(lang) }], state };
  }

  const found = searchKnowledge(raw, lang, env.entries);
  const trigger = triggeredFlow(text);
  // « C'est quoi une annonce ? » attend une explication, pas le lancement du parcours.
  const wantsExplanation = found.confidence === 'sure' && DEFINITIONS.some(phrase => startsWord(text, phrase));
  if (trigger && !wantsExplanation) return startFlow(trigger, state, env);

  if (found.confidence === 'sure') return { replies: [topicReply(found.candidates[0], env, true)], state };
  if (found.confidence === 'ambiguous') {
    return {
      replies: [{
        text: GENERAL.ambiguous[lang],
        pose: 'reflexion',
        quickReplies: found.candidates.map((entry): QuickReply => ({ label: entry.question[lang], action: { type: 'topic', id: entry.id } })),
      }],
      state,
    };
  }
  // Il écrit simplement son métier (« menuisier ») : Globi le retient et propose
  // la suite, au lieu de répondre qu'il n'a pas compris puis de le redemander.
  const trade = recognizeTrade(raw, lang);
  if (trade) {
    return {
      replies: [{ text: say(GENERAL.tradeNoted, lang, { trade: trade.toLowerCase() }), pose: 'guide', quickReplies: homeButtons(lang).slice(0, 3) }],
      state: { flow: null, facts: { ...state.facts, ...tradeMemory(trade, state.facts, lang) } },
    };
  }
  return { replies: [noAnswer(env)], state };
}

/**
 * Réponse de Globi à une entrée de l'utilisateur. `entries` (la base de
 * fiches) n'est passé que par les tests.
 */
export function respond(
  input: EngineInput,
  state: EngineState,
  lang: Lang,
  ctx: EngineContext = {},
  entries: KnowledgeEntry[] = KNOWLEDGE,
): EngineResult {
  const env: Env = { lang, ctx, entries };
  const flow = state.flow;

  if (typeof input === 'string') return flow ? continueFlow(input, state, flow, env) : freeText(input, state, env);

  switch (input.type) {
    case 'link':
      // La navigation est l'affaire de l'interface.
      return { replies: [], state };
    case 'cancel':
      if (flow) return cancelFlow(state, env);
      return { replies: [{ text: GENERAL.nothingToCancel[lang], pose: 'bonjour', quickReplies: homeButtons(lang) }], state };
    case 'flow':
      return FLOWS[input.id] ? startFlow(input.id, state, env) : { replies: [noAnswer(env)], state };
    case 'topic': {
      const entry = entries.find(e => e.id === input.id);
      const def = flow ? FLOWS[flow.flow] : undefined;
      const step = flow && def ? stepOf(def, flow.stepId) : undefined;
      if (!entry) return flow && step ? continueFlow(input.id, state, flow, env) : freeText(input.id, { flow: null, facts: state.facts }, env);
      if (flow && step) return sideAnswer(entry, flow, step, state, env);
      return { replies: [topicReply(entry, env, true)], state: { flow: null, facts: state.facts } };
    }
    case 'answer':
      return flow ? continueFlow(input.value, state, flow, env) : freeText(input.value, state, env);
  }
}
