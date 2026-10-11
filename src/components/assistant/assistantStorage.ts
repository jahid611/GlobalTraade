import { useCallback, useEffect, useState } from 'react';
import { sanitizeDraft, type ListingDraft } from '@/services/assistantService';
import { EMPTY_ENGINE_STATE, type EngineState, type FlowId, type MascotPose, type QuickReply } from './engine/types';

// État de l'assistant Globi gardé dans le navigateur, par utilisateur (ou sous
// « anon » pour un visiteur non connecté).

export interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  draft?: ListingDraft;
  pose?: MascotPose;
  /** boutons de réponse : gardés sur le dernier message seulement */
  quickReplies?: QuickReply[];
}

/** La conversation et la mémoire du moteur, enregistrées ensemble pour reprendre un parcours après rechargement. */
export interface ChatSession {
  messages: ChatMsg[];
  engine: EngineState;
}

export type StepStatus = 'todo' | 'doing' | 'done';
export type JourneyState = Record<string, StepStatus>;

export const MAX_STORED_MESSAGES = 40;
export const TEASER_KEY = 'globi.teaser.v2.dismissed';
export const chatKey = (userId: string | undefined) => `globi.chat.${userId ?? 'anon'}`;
export const journeyKey = (userId: string | undefined) => `globi.journey.${userId ?? 'anon'}`;

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const EMPTY_MESSAGES: ChatMsg[] = [];
export const EMPTY_SESSION: ChatSession = { messages: EMPTY_MESSAGES, engine: EMPTY_ENGINE_STATE };
export const EMPTY_JOURNEY: JourneyState = {};

const FLOW_IDS: FlowId[] = ['estimate', 'listing', 'start'];
const POSES: MascotPose[] = ['bonjour', 'reflexion', 'bravo', 'guide'];

const isRecord = (raw: unknown): raw is Record<string, unknown> => !!raw && typeof raw === 'object' && !Array.isArray(raw);

function sanitizeAction(raw: unknown): QuickReply['action'] | null {
  if (!isRecord(raw)) return null;
  if (raw.type === 'answer' && typeof raw.value === 'string') return { type: 'answer', value: raw.value };
  if (raw.type === 'topic' && typeof raw.id === 'string') return { type: 'topic', id: raw.id };
  if (raw.type === 'flow' && FLOW_IDS.includes(raw.id as FlowId)) return { type: 'flow', id: raw.id as FlowId };
  if (raw.type === 'cancel') return { type: 'cancel' };
  // Seuls les liens internes au site sont rouverts.
  if (raw.type === 'link' && typeof raw.to === 'string' && raw.to.startsWith('/') && !raw.to.startsWith('//')) return { type: 'link', to: raw.to };
  return null;
}

function sanitizeQuickReplies(raw: unknown): QuickReply[] {
  if (!Array.isArray(raw)) return [];
  const out: QuickReply[] = [];
  for (const item of raw) {
    if (!isRecord(item) || typeof item.label !== 'string') continue;
    const action = sanitizeAction(item.action);
    if (action) out.push({ label: item.label, action });
  }
  return out;
}

// Les boutons n'ont de sens que sous le dernier message de Globi.
const onlyLastReplies = (messages: ChatMsg[]): ChatMsg[] =>
  messages.some((m, i) => m.quickReplies && i < messages.length - 1)
    ? messages.map((m, i) => (m.quickReplies && i < messages.length - 1 ? { ...m, quickReplies: undefined } : m))
    : messages;

export const sanitizeMessages = (raw: unknown): ChatMsg[] => {
  if (!Array.isArray(raw)) return EMPTY_MESSAGES;
  const out: ChatMsg[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const { id, role, content, draft, pose, quickReplies } = item as Record<string, unknown>;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') continue;
    const msg: ChatMsg = { id: typeof id === 'string' ? id : newId(), role, content };
    if (role === 'assistant') {
      if (draft) {
        const clean = sanitizeDraft(draft);
        if (Object.keys(clean).length > 0) msg.draft = clean;
      }
      if (POSES.includes(pose as MascotPose)) msg.pose = pose as MascotPose;
      const replies = sanitizeQuickReplies(quickReplies);
      if (replies.length > 0) msg.quickReplies = replies;
    }
    out.push(msg);
  }
  return onlyLastReplies(out.slice(-MAX_STORED_MESSAGES));
};

export const trimMessages = (messages: ChatMsg[]) => onlyLastReplies(messages.slice(-MAX_STORED_MESSAGES));

// Mémoire du moteur : uniquement des chaînes, nombres et booléens.
function sanitizeMemory(raw: unknown): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!isRecord(raw)) return out;
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) out[key] = value;
  }
  return out;
}

export const sanitizeEngineState = (raw: unknown): EngineState => {
  if (!isRecord(raw)) return EMPTY_ENGINE_STATE;
  const flow = raw.flow;
  return {
    flow: isRecord(flow) && FLOW_IDS.includes(flow.flow as FlowId) && typeof flow.stepId === 'string'
      ? { flow: flow.flow as FlowId, stepId: flow.stepId, data: sanitizeMemory(flow.data) }
      : null,
    facts: sanitizeMemory(raw.facts),
  };
};

export const sanitizeSession = (raw: unknown): ChatSession => {
  // Ancien format : la liste des messages seule.
  if (Array.isArray(raw)) return { messages: sanitizeMessages(raw), engine: EMPTY_ENGINE_STATE };
  if (!isRecord(raw)) return EMPTY_SESSION;
  return { messages: sanitizeMessages(raw.messages), engine: sanitizeEngineState(raw.engine) };
};

export const trimSession = (session: ChatSession): ChatSession => ({ messages: trimMessages(session.messages), engine: session.engine });

export const sanitizeJourney = (raw: unknown): JourneyState => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return EMPTY_JOURNEY;
  const out: JourneyState = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === 'todo' || value === 'doing' || value === 'done') out[key] = value;
  }
  return out;
};

// localStorage peut être indisponible (navigation privée, quota plein) : on
// continue alors en mémoire, sans erreur.
export const readFlag = (key: string): boolean => {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
};
export const writeFlag = (key: string) => {
  try { localStorage.setItem(key, '1'); } catch { /* stockage indisponible */ }
};
export const clearFlag = (key: string) => {
  try { localStorage.removeItem(key); } catch { /* stockage indisponible */ }
};

/** Globi rangé sur le bord gauche de l'écran (choix gardé d'une visite à l'autre). */
export const STOWED_KEY = 'globi.stowed';

function load<T>(key: string | null, fallback: T, sanitize: (raw: unknown) => T): T {
  if (!key) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? sanitize(JSON.parse(raw)) : fallback;
  } catch {
    return fallback;
  }
}

const RANK: Record<StepStatus, number> = { todo: 0, doing: 1, done: 2 };

// Un visiteur a discuté avec Globi puis s'est connecté : sa conversation et son
// parcours le suivent sur son compte. À appeler avant de lire les clés du
// compte ; sans effet s'il n'y a rien à reprendre.
export function adoptAnonymousSession(userId: string) {
  try {
    const anonChat = load(chatKey(undefined), EMPTY_SESSION, sanitizeSession);
    if (anonChat.messages.length > 0) localStorage.setItem(chatKey(userId), JSON.stringify(trimSession(anonChat)));
    localStorage.removeItem(chatKey(undefined));

    const anonJourney = load(journeyKey(undefined), EMPTY_JOURNEY, sanitizeJourney);
    if (Object.keys(anonJourney).length > 0) {
      const merged = { ...load(journeyKey(userId), EMPTY_JOURNEY, sanitizeJourney) };
      for (const [step, status] of Object.entries(anonJourney)) {
        if (RANK[status] > RANK[merged[step] ?? 'todo']) merged[step] = status;
      }
      localStorage.setItem(journeyKey(userId), JSON.stringify(merged));
    }
    localStorage.removeItem(journeyKey(undefined));
  } catch { /* stockage indisponible */ }
}

// Valeur mémorisée sous `key` (null = en mémoire seulement). La valeur est
// rechargée quand la clé change (autre utilisateur) et n'est jamais écrite sous
// la clé d'un autre. `paused` suspend l'écriture (pendant que Globi prépare sa réponse).
// `fallback`, `sanitize` et `serialize` doivent être stables (constantes de module).
export function useStored<T>(
  key: string | null,
  fallback: T,
  sanitize: (raw: unknown) => T,
  options: { paused?: boolean; serialize?: (value: T) => T } = {},
) {
  const { paused = false, serialize } = options;
  const [state, setState] = useState(() => ({ key, value: load(key, fallback, sanitize) }));

  useEffect(() => {
    setState(prev => (prev.key === key ? prev : { key, value: load(key, fallback, sanitize) }));
  }, [key, fallback, sanitize]);

  useEffect(() => {
    if (!state.key || paused) return;
    try {
      localStorage.setItem(state.key, JSON.stringify(serialize ? serialize(state.value) : state.value));
    } catch { /* stockage indisponible */ }
  }, [state, paused, serialize]);

  const setValue = useCallback((update: T | ((prev: T) => T)) => {
    setState(prev => ({
      key: prev.key,
      value: typeof update === 'function' ? (update as (p: T) => T)(prev.value) : update,
    }));
  }, []);

  return [state.value, setValue] as const;
}
