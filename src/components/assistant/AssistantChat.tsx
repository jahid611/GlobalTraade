import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Send } from '@/components/icons';
import type { ListingDraft } from '@/services/assistantService';
import { AssistantMarkdown } from './AssistantMarkdown';
import { DraftCard } from './DraftCard';
import { Mascot, MascotAvatar, type MascotPose } from './Mascot';
import type { ChatMsg } from './assistantStorage';
import type { BotReply, QuickReply } from './engine/types';

export const MAX_INPUT_LENGTH = 2000;

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70';

// Bulle de Globi, avec sa pastille à gauche.
function GlobiRow({ pose, children }: { pose?: MascotPose; children: React.ReactNode }) {
  return (
    <div className="flex items-end gap-2">
      <MascotAvatar pose={pose} className="w-7 h-7" />
      <div className="min-w-0 max-w-[85%]">{children}</div>
    </div>
  );
}

const globiBubble = 'allow-select rounded-[1.25rem] rounded-bl-[0.4rem] bg-white/[0.07] border border-white/10 px-4 py-3 text-sm font-light leading-relaxed text-white/90 break-words';
const quickButton = `text-left px-4 py-2.5 rounded-[1.25rem] bg-white/[0.05] hover:bg-primary/25 border border-white/15 hover:border-primary/60 text-sm font-light leading-snug text-white transition-colors disabled:opacity-50 ${focusRing}`;

export function AssistantChat({
  messages, thinking, welcome, input, onInputChange, onSend, onQuickReply, onOpenDraft, inputRef,
}: {
  messages: ChatMsg[];
  /** Globi prépare sa réponse (court délai, mascotte en réflexion) */
  thinking: boolean;
  /** message d'accueil du moteur, affiché tant que la discussion est vide */
  welcome: BotReply;
  input: string;
  onInputChange: (value: string) => void;
  onSend: (text: string) => void;
  onQuickReply: (reply: QuickReply) => void;
  onOpenDraft: (draft: ListingDraft) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  // Suit le bas du fil tant que l'utilisateur n'est pas remonté lire plus haut.
  const stickToBottom = useRef(true);
  // Messages déjà à l'écran : seuls les nouveaux apparaissent en fondu.
  const shown = useRef(new Set(messages.map(m => m.id)));

  const last = messages[messages.length - 1];
  // Les boutons ne vivent que sous le dernier message de Globi : ils disparaissent dès que l'utilisateur répond.
  const quickReplies = !thinking && last?.role === 'assistant' ? last.quickReplies ?? [] : [];

  useEffect(() => {
    for (const msg of messages) shown.current.add(msg.id);
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !stickToBottom.current) return;
    // Accueil (aucun message) : on reste en haut pour voir la mascotte.
    if (messages.length === 0) { el.scrollTo({ top: 0 }); return; }
    el.scrollTo({ top: el.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [messages, thinking, reduceMotion]);

  // Le champ grandit avec le texte, jusqu'à une hauteur maximale.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [input, inputRef]);

  const submit = () => {
    if (thinking || !input.trim()) return;
    stickToBottom.current = true;
    onSend(input);
  };

  const pick = (reply: QuickReply) => {
    stickToBottom.current = true;
    onQuickReply(reply);
  };

  // La réponse arrive d'un coup, en fondu : pas de faux texte tapé lettre à lettre.
  const fadeIn = (id: string) => ({
    initial: reduceMotion || shown.current.has(id) ? (false as const) : { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 },
  });

  return (
    <>
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        role="log" aria-live="polite" aria-busy={thinking}
        aria-label={t('globi.thread_label', 'Discussion avec Globi')}
        className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 sm:px-5 py-3 space-y-3"
      >
        {messages.length === 0 && (
          <div className="pt-1">
            <div className="flex flex-col items-center text-center">
              <Mascot pose={welcome.pose ?? 'bonjour'} className="w-28 h-28" />
              <div className={`${globiBubble} !rounded-[1.25rem] mt-2 text-left`}>
                <AssistantMarkdown text={welcome.text} />
              </div>
            </div>
            <div role="group" aria-label={t('globi.quick_replies', 'Réponses proposées')} className="mt-3 grid grid-cols-1 gap-2">
              {(welcome.quickReplies ?? []).map((reply, i) => (
                <button
                  key={i} type="button" disabled={thinking}
                  onClick={() => pick(reply)}
                  className={`w-full !rounded-full ${quickButton}`}
                >
                  {reply.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          msg.role === 'user' ? (
            <div key={msg.id} className="flex justify-end">
              <div className="allow-select max-w-[85%] rounded-[1.25rem] rounded-br-[0.4rem] bg-primary px-4 py-2.5 text-sm font-light leading-relaxed text-white whitespace-pre-wrap break-words">
                {msg.content}
              </div>
            </div>
          ) : (
            <motion.div key={msg.id} {...fadeIn(msg.id)} className="space-y-3">
              {msg.content && (
                <GlobiRow pose={msg.pose}>
                  <div className={globiBubble}><AssistantMarkdown text={msg.content} /></div>
                </GlobiRow>
              )}
              {msg.draft && <DraftCard draft={msg.draft} onOpen={onOpenDraft} />}
            </motion.div>
          )
        ))}

        {quickReplies.length > 0 && (
          <motion.div
            key={`replies-${last.id}`} {...fadeIn(last.id)}
            role="group" aria-label={t('globi.quick_replies', 'Réponses proposées')}
            className="flex flex-wrap gap-2 pl-9"
          >
            {quickReplies.map((reply, i) => (
              <button
                key={i} type="button"
                onClick={() => pick(reply)}
                className={reply.action.type === 'cancel' ? `${quickButton} !bg-transparent !text-white/70 hover:!text-white` : quickButton}
              >
                {reply.label}
              </button>
            ))}
          </motion.div>
        )}

        {thinking && (
          <div className="flex items-end gap-2">
            <Mascot pose="reflexion" className="w-14 h-14 shrink-0" />
            <div className="rounded-[1.25rem] rounded-bl-[0.4rem] bg-white/[0.07] border border-white/10 px-4 py-3.5 flex items-center gap-1.5">
              <span className="sr-only">{t('globi.thinking', 'Globi réfléchit…')}</span>
              {[0, 1, 2].map(i => (
                <span
                  key={i} aria-hidden="true"
                  className="w-2 h-2 rounded-full bg-white/70 animate-bounce motion-reduce:animate-none"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 sm:px-5 pt-2 pb-3">
        <form
          onSubmit={(e) => { e.preventDefault(); submit(); }}
          className="flex items-end gap-2 rounded-[1.5rem] bg-white/[0.06] border border-white/15 focus-within:border-primary/70 p-1.5 transition-colors"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value.slice(0, MAX_INPUT_LENGTH))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); }
            }}
            rows={1}
            maxLength={MAX_INPUT_LENGTH}
            aria-label={t('globi.input_label', 'Votre message à Globi')}
            placeholder={t('globi.input_placeholder', 'Écrivez votre question…')}
            className="flex-1 min-w-0 resize-none bg-transparent border-none outline-none px-3 py-2 text-[15px] font-light leading-snug text-white placeholder:text-white/40 custom-scrollbar"
          />
          <button
            type="submit" disabled={thinking || !input.trim()}
            aria-label={t('globi.send', 'Envoyer')} title={t('globi.send', 'Envoyer')}
            className={`shrink-0 w-10 h-10 rounded-full bg-primary hover:bg-primary/90 text-white flex items-center justify-center transition-colors disabled:bg-white/10 disabled:text-white/30 ${focusRing}`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-1.5 px-2 space-y-1 text-center">
          {input.length >= MAX_INPUT_LENGTH - 200 && (
            <p className="text-[11px] text-white/60 tabular-nums" aria-live="polite">
              {t('globi.char_count', '{{used}} / {{max}} caractères', { used: input.length, max: MAX_INPUT_LENGTH })}
            </p>
          )}
          <p className="text-[10px] leading-snug text-white/45 font-light">
            {t('globi.disclaimer', 'Globi est un guide automatique : ses réponses sont des repères, à valider avec votre expert-comptable.')}
          </p>
        </div>
      </div>
    </>
  );
}
