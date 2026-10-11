"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, SquarePen, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/components/AuthProvider';
import { ConfirmDialog } from '@/components/PickerKit';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import type { ListingDraft } from '@/services/assistantService';
import { AssistantChat, MAX_INPUT_LENGTH } from './AssistantChat';
import { AssistantJourney } from './AssistantJourney';
import { Mascot, MascotAvatar } from './Mascot';
import { respond, welcome, type EngineInput } from './engine/engine';
import type { BotReply, Lang, QuickReply } from './engine/types';
import { LISTING_STEP_ID, type JourneyStep } from './journeySteps';
import {
  EMPTY_JOURNEY, EMPTY_SESSION, STOWED_KEY, TEASER_KEY, adoptAnonymousSession, chatKey, clearFlag, journeyKey, newId, readFlag, writeFlag,
  sanitizeJourney, sanitizeSession, trimMessages, trimSession, useStored,
  type ChatMsg, type ChatSession, type JourneyState, type StepStatus,
} from './assistantStorage';

// Le formulaire d'annonce (react-hook-form, zod…) n'est chargé que si Globi a préparé un brouillon.
const ListingForm = React.lazy(() => import('@/components/ListingForm').then(m => ({ default: m.ListingForm })));

type Tab = 'chat' | 'journey';

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70';
const HIDDEN_ROUTES = ['/login', '/admin'];
// Posé avant d'envoyer un visiteur se connecter pour ouvrir son annonce pré-remplie.
const PENDING_DRAFT_KEY = 'globi.draft.pending';

// Globi, la mascotte-assistant de cession : bouton flottant en bas à gauche,
// panneau de discussion et parcours guidé. Monté une seule fois dans App.
export function CessionAssistant() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();
  const userId = user?.id;

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('chat');
  const [teaser, setTeaser] = useState(false);
  // Globi rangé : il glisse hors de l'écran à gauche, une languette reste pour le rappeler.
  const [stowed, setStowed] = useState(() => readFlag(STOWED_KEY));
  const [input, setInput] = useState('');
  // Globi « réfléchit » un court instant avant d'afficher sa réponse (calculée sur place, sans réseau).
  const [thinking, setThinking] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [draftToOpen, setDraftToOpen] = useState<ListingDraft | null>(null);

  // Le visiteur vient de se connecter : sa discussion le suit sur son compte
  // (avant que les clés du compte ne soient lues, juste en dessous).
  const adoptedFor = useRef<string | undefined>(undefined);
  if (userId && adoptedFor.current !== userId) {
    adoptedFor.current = userId;
    adoptAnonymousSession(userId);
  }

  const [session, setSession] = useStored<ChatSession>(
    chatKey(userId), EMPTY_SESSION, sanitizeSession,
    { paused: thinking, serialize: trimSession },
  );
  const [journey, setJourney] = useStored<JourneyState>(journeyKey(userId), EMPTY_JOURNEY, sanitizeJourney);
  const messages = session.messages;

  const lang: Lang = i18n.language?.startsWith('en') ? 'en' : 'fr';
  const fullName = user?.user_metadata?.full_name;
  const firstName = typeof fullName === 'string' ? fullName.trim().split(/\s+/)[0] || undefined : undefined;
  // L'année en cours est donnée au moteur, qui ne lit pas l'horloge lui-même.
  const engineCtx = useMemo(() => ({ firstName, currentYear: new Date().getFullYear() }), [firstName]);
  const welcomeReply = useMemo(() => welcome(lang, engineCtx), [lang, engineCtx]);

  const sessionRef = useRef(session);
  sessionRef.current = session;
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  const hidden = HIDDEN_ROUTES.some(route => location.pathname === route || location.pathname.startsWith(`${route}/`));
  const visible = open && !hidden;

  useScrollLock(visible && isMobile);

  const cancelPendingReply = useCallback(() => {
    if (replyTimer.current) clearTimeout(replyTimer.current);
    replyTimer.current = null;
    setThinking(false);
  }, []);

  // Changement de compte (ou déconnexion) : la réponse en préparation ne concerne plus personne.
  useEffect(() => cancelPendingReply, [userId, cancelPendingReply]);

  // Bulle d'accroche : une seule fois, tant qu'elle n'a pas été refermée.
  useEffect(() => {
    if (readFlag(TEASER_KEY)) return;
    const timer = setTimeout(() => setTeaser(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const dismissTeaser = useCallback(() => {
    setTeaser(false);
    writeFlag(TEASER_KEY);
  }, []);

  const stow = useCallback(() => {
    dismissTeaser();
    setStowed(true);
    writeFlag(STOWED_KEY);
  }, [dismissTeaser]);

  const unstow = useCallback(() => {
    setStowed(false);
    clearFlag(STOWED_KEY);
  }, []);

  const openPanel = useCallback(() => {
    dismissTeaser();
    setOpen(true);
  }, [dismissTeaser]);

  // Focus sur le champ à l'ouverture, puis retour sur le bouton à la fermeture.
  useEffect(() => {
    if (visible) {
      wasOpen.current = true;
      if (tab !== 'chat') return;
      const frame = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
      return () => cancelAnimationFrame(frame);
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      const frame = requestAnimationFrame(() => launcherRef.current?.focus({ preventScroll: true }));
      return () => cancelAnimationFrame(frame);
    }
  }, [visible, tab]);

  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (confirmReset) setConfirmReset(false);
      else setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [visible, confirmReset]);

  // Étapes de « Mon parcours » touchées par la réponse : « en cours » ne fait jamais reculer une étape faite.
  const applyJourney = useCallback((replies: BotReply[]) => {
    const updates = replies.flatMap(reply => (reply.journey ? [reply.journey] : []));
    if (updates.length === 0) return;
    setJourney(prev => {
      const next = { ...prev };
      for (const { step, status } of updates) {
        const id = String(step);
        if (status === 'done' || (next[id] ?? 'todo') === 'todo') next[id] = status;
      }
      return next;
    });
  }, [setJourney]);

  // Affiche `label` comme message de l'utilisateur, puis la réponse du moteur
  // après un court délai. Renvoie true si le message est parti.
  const dispatch = useCallback((label: string, engineInput: EngineInput): boolean => {
    if (replyTimer.current) return false;
    const current = sessionRef.current;
    const result = respond(engineInput, current.engine, lang, engineCtx);
    setSession({
      messages: trimMessages([...current.messages, { id: newId(), role: 'user', content: label }]),
      engine: current.engine,
    });
    setThinking(true);

    const length = result.replies.reduce((sum, reply) => sum + reply.text.length, 0);
    replyTimer.current = setTimeout(() => {
      replyTimer.current = null;
      const replies: ChatMsg[] = result.replies.map(reply => ({
        id: newId(), role: 'assistant', content: reply.text, draft: reply.draft, pose: reply.pose, quickReplies: reply.quickReplies,
      }));
      setSession(prev => ({ messages: trimMessages([...prev.messages, ...replies]), engine: result.state }));
      applyJourney(result.replies);
      setThinking(false);
    }, Math.min(600, 300 + Math.round(length / 2)));
    return true;
  }, [lang, engineCtx, setSession, applyJourney]);

  // Renvoie true si le message est parti.
  const send = useCallback((raw: string): boolean => {
    const text = raw.trim().slice(0, MAX_INPUT_LENGTH);
    if (!text) return false;
    return dispatch(text, text);
  }, [dispatch]);

  const closeAndGo = useCallback((to: string) => {
    setOpen(false);
    navigate(to);
  }, [navigate]);

  // Un bouton de réponse : son libellé devient le message de l'utilisateur, son action part au moteur.
  const pickQuickReply = useCallback((reply: QuickReply) => {
    if (reply.action.type === 'link') { closeAndGo(reply.action.to); return; }
    dispatch(reply.label, reply.action);
  }, [dispatch, closeAndGo]);

  const resetConversation = useCallback(() => {
    cancelPendingReply();
    setSession(EMPTY_SESSION);
    setInput('');
    setTab('chat');
  }, [cancelPendingReply, setSession]);

  const setStepStatus = useCallback((stepId: string, status: StepStatus) => {
    setJourney(prev => ({ ...prev, [stepId]: status }));
  }, [setJourney]);

  const discussStep = useCallback((step: JourneyStep) => {
    setTab('chat');
    dispatch(t(step.titleKey, step.title), step.action);
  }, [dispatch, t]);

  // Le formulaire d'annonce s'ouvre sous le panneau (z-[200]) : on referme Globi.
  // Discuter est ouvert à tous ; publier exige un compte.
  const openDraft = useCallback((draft: ListingDraft) => {
    setOpen(false);
    if (!userId) {
      try { sessionStorage.setItem(PENDING_DRAFT_KEY, '1'); } catch { /* stockage indisponible */ }
      navigate('/login', { state: { from: location } });
      return;
    }
    setDraftToOpen(draft);
  }, [userId, navigate, location]);

  // De retour de la connexion demandée par « Ouvrir mon annonce pré-remplie » : on rouvre le brouillon.
  useEffect(() => {
    if (!userId) return;
    try {
      if (sessionStorage.getItem(PENDING_DRAFT_KEY) !== '1') return;
      sessionStorage.removeItem(PENDING_DRAFT_KEY);
    } catch { return; }
    const pending = [...sessionRef.current.messages].reverse().find(m => m.draft)?.draft;
    if (pending) setDraftToOpen(pending);
  }, [userId]);

  const listingForm = draftToOpen && (
    <Suspense fallback={null}>
      <ListingForm
        isOpen
        prefill={draftToOpen}
        onClose={() => setDraftToOpen(null)}
        onSuccess={() => setStepStatus(LISTING_STEP_ID, 'done')}
      />
    </Suspense>
  );

  if (hidden) return <>{listingForm}</>;

  // Sur le globe, le coin bas-gauche porte déjà le bouton « + » (publier une
  // annonce) : Globi se place au-dessus pour ne pas le recouvrir.
  const launcherLift = location.pathname === '/app';
  const fade = reduceMotion ? { duration: 0 } : { duration: 0.2 };
  const spring = reduceMotion ? { duration: 0 } : { type: 'spring' as const, damping: 28, stiffness: 320 };
  const offset = reduceMotion ? 0 : 24;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'chat', label: t('globi.tab_chat', 'Discussion') },
    { id: 'journey', label: t('globi.tab_journey', 'Mon parcours') },
  ];

  return (
    <>
      {/* Bouton flottant, et sa bulle d'accroche posée au-dessus (en bas à gauche :
          la droite porte les boutons « + ») */}
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.8 }}
            animate={stowed
              ? { opacity: 0, scale: reduceMotion ? 1 : 0.85, x: reduceMotion ? 0 : -140, rotate: reduceMotion ? 0 : -18 }
              : { opacity: 1, scale: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.8 }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', damping: 17, stiffness: 210, mass: 0.9 }}
            className="fixed z-[90] flex flex-col-reverse items-start gap-2.5 pointer-events-none"
            style={{ left: 'calc(var(--safe-left) + 1rem)', bottom: `calc(var(--safe-bottom) + var(--banner-stack, 0px) + ${launcherLift ? '6.5rem' : '1rem'})`, maxWidth: 'calc(100vw - 2rem)' }}
            aria-hidden={stowed}
          >
            <div className="relative shrink-0 group/launcher">
            <button
              ref={launcherRef}
              type="button"
              onClick={openPanel}
              aria-label={t('globi.open', 'Ouvrir Globi, votre assistant pour vendre votre entreprise')}
              aria-haspopup="dialog"
              tabIndex={stowed ? -1 : 0}
              disabled={stowed}
              title={t('globi.name', 'Globi')}
              className={`pointer-events-auto relative shrink-0 w-16 h-16 rounded-full bg-[#2b2a2f] border border-white/20 shadow-[0_10px_40px_rgba(0,0,0,0.5),0_0_24px_rgba(89,85,232,0.45)] flex items-center justify-center overflow-hidden hover:scale-105 active:scale-95 motion-reduce:transform-none transition-transform ${focusRing}`}
            >
              <span className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/40 to-transparent" aria-hidden="true" />
              <Mascot pose="bonjour" className="relative w-16 h-16 origin-top scale-[1.6]" />
            </button>

              {/* Ranger Globi sur le bord de l'écran */}
              <button
                type="button"
                onClick={stow}
                tabIndex={stowed ? -1 : 0}
                disabled={stowed}
                aria-label={t('globi.stow', 'Ranger Globi sur le côté')}
                title={t('globi.stow', 'Ranger Globi sur le côté')}
                className={`pointer-events-auto absolute -top-1.5 -left-1.5 w-7 h-7 rounded-full bg-[#2b2a2f] border border-white/25 text-white/80 hover:text-white hover:bg-[#3a3940] shadow-[0_4px_14px_rgba(0,0,0,0.45)] flex items-center justify-center transition-all hover:scale-110 active:scale-95 motion-reduce:transform-none ${focusRing}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <AnimatePresence>
              {teaser && !stowed && (
                <motion.div
                  initial={{ opacity: 0, y: offset / 2 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: offset / 2 }}
                  transition={fade}
                  className="pointer-events-auto relative flex items-start w-[min(280px,calc(100vw-2rem))] rounded-[1.25rem] rounded-bl-[0.4rem] bg-[#2b2a2f] border border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
                >
                  <button
                    type="button" onClick={openPanel}
                    className={`text-left pl-4 pr-1 py-3 text-sm font-light leading-snug text-white rounded-[1.25rem] ${focusRing}`}
                  >
                    {t('globi.teaser', 'Vous ne connaissez pas les termes techniques pour céder votre entreprise ? Globi s\'en occupe pour vous.')}
                  </button>
                  <button
                    type="button" onClick={dismissTeaser}
                    aria-label={t('globi.teaser_close', 'Fermer ce message')}
                    className={`shrink-0 m-1.5 w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors ${focusRing}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Languette : Globi est rangé, un clic le fait revenir */}
      <AnimatePresence>
        {!open && stowed && (
          <motion.button
            type="button"
            onClick={unstow}
            initial={{ x: reduceMotion ? 0 : -60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reduceMotion ? 0 : -60, opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', damping: 20, stiffness: 260, delay: 0.12 }}
            whileTap={reduceMotion ? undefined : { scale: 0.94 }}
            aria-label={t('globi.unstow', 'Faire revenir Globi')}
            title={t('globi.unstow', 'Faire revenir Globi')}
            // Petite poignée discrète collée au bord : la zone cliquable est plus
            // large que ce qui se voit, pour rester facile à toucher sur mobile.
            className={`fixed z-[90] left-0 h-14 w-9 flex items-center justify-start group/tab ${focusRing}`}
            style={{ bottom: `calc(var(--safe-bottom) + var(--banner-stack, 0px) + ${launcherLift ? '6.75rem' : '1.25rem'})` }}
          >
            <span
              aria-hidden="true"
              className="h-11 w-[18px] rounded-r-xl bg-[#2b2a2f]/90 backdrop-blur-md border border-l-0 border-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.45)] flex items-center justify-center text-white/60 group-hover/tab:text-white group-hover/tab:w-[22px] group-hover/tab:border-primary/60 transition-all"
            >
              <ChevronRight className="w-3.5 h-3.5 -ml-0.5" strokeWidth={2.25} />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panneau : carte ancrée en bas à gauche sur ordinateur, feuille plein écran sur mobile */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: offset }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: offset }}
            transition={spring}
            className={`fixed z-[300] bg-[#2b2a2f] overflow-hidden ${isMobile ? 'inset-0' : 'rounded-[2rem] shadow-[0_24px_70px_rgba(0,0,0,0.6)]'}`}
            style={isMobile ? undefined : {
              left: 'calc(var(--safe-left) + 1rem)',
              bottom: 'calc(var(--safe-bottom) + 1rem)',
              width: 'min(400px, calc(100vw - 2rem))',
              height: 'min(620px, calc(100dvh - 2rem))',
            }}
          >
            <div
              role="dialog" aria-modal={isMobile} aria-labelledby="globi-title"
              className={`liquid-glass-heavy h-full w-full flex flex-col text-white ${isMobile ? '' : 'rounded-[2rem]'}`}
              style={isMobile ? {
                paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)',
                paddingLeft: 'var(--safe-left)', paddingRight: 'var(--safe-right)',
              } : undefined}
            >
              <header className="shrink-0 flex items-center gap-3 px-4 sm:px-5 pt-4 pb-3">
                <MascotAvatar pose={thinking ? 'reflexion' : 'bonjour'} className="w-11 h-11" />
                <div className="min-w-0 flex-1">
                  <h2 id="globi-title" className="text-base font-medium text-white leading-tight">{t('globi.name', 'Globi')}</h2>
                  <p className="text-xs font-light text-white/65 truncate">{t('globi.subtitle', 'Votre assistant pour vendre votre entreprise')}</p>
                </div>
                <button
                  type="button" onClick={() => setConfirmReset(true)} disabled={messages.length === 0}
                  aria-label={t('globi.new_chat', 'Nouvelle conversation')} title={t('globi.new_chat', 'Nouvelle conversation')}
                  className={`shrink-0 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors disabled:opacity-35 disabled:hover:bg-white/10 ${focusRing}`}
                >
                  <SquarePen className="w-4 h-4" strokeWidth={1.75} />
                </button>
                <button
                  type="button" onClick={() => setOpen(false)}
                  aria-label={t('globi.close', 'Fermer Globi')} title={t('globi.close', 'Fermer Globi')}
                  className={`shrink-0 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors ${focusRing}`}
                >
                  <X className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </header>

              <div role="tablist" aria-label={t('globi.tabs_label', 'Sections de Globi')} className="shrink-0 mx-4 sm:mx-5 mb-2 p-1 rounded-full bg-white/[0.06] border border-white/10 grid grid-cols-2 gap-1">
                {tabs.map(item => (
                  <button
                    key={item.id} type="button" role="tab" id={`globi-tab-${item.id}`}
                    aria-selected={tab === item.id} aria-controls="globi-tabpanel"
                    onClick={() => setTab(item.id)}
                    className={`h-9 rounded-full text-sm transition-colors ${focusRing} ${
                      tab === item.id ? 'bg-primary text-white font-medium' : 'text-white/70 hover:text-white hover:bg-white/5 font-light'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div id="globi-tabpanel" role="tabpanel" aria-labelledby={`globi-tab-${tab}`} className="flex-1 min-h-0 flex flex-col">
                {tab === 'chat' ? (
                  <AssistantChat
                    messages={messages}
                    thinking={thinking}
                    welcome={welcomeReply}
                    input={input}
                    onInputChange={setInput}
                    onSend={(text) => { if (send(text) && text === input) setInput(''); }}
                    onQuickReply={pickQuickReply}
                    onOpenDraft={openDraft}
                    inputRef={inputRef}
                  />
                ) : (
                  <AssistantJourney journey={journey} onSetStatus={setStepStatus} onDiscuss={discussStep} />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmReset}
        title={t('globi.reset_title', 'Commencer une nouvelle conversation ?')}
        message={t('globi.reset_message', 'La discussion actuelle avec Globi sera effacée. Votre parcours est conservé.')}
        confirmLabel={t('globi.reset_confirm', 'Effacer')}
        cancelLabel={t('globi.reset_cancel', 'Annuler')}
        onConfirm={resetConversation}
        onClose={() => setConfirmReset(false)}
        danger={false}
      />

      {listingForm}
    </>
  );
}
