import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, MessageCircle } from 'lucide-react';
import { JOURNEY_STEPS, type JourneyStep } from './journeySteps';
import type { JourneyState, StepStatus } from './assistantStorage';

// Vert réel en hex : la palette Tailwind remappe emerald/green sur des violets.
const DONE_COLOR = '#34d399';

const NEXT_STATUS: Record<StepStatus, StepStatus> = { todo: 'doing', doing: 'done', done: 'todo' };

export function AssistantJourney({
  journey, onSetStatus, onDiscuss,
}: {
  journey: JourneyState;
  onSetStatus: (stepId: string, status: StepStatus) => void;
  onDiscuss: (step: JourneyStep) => void;
}) {
  const { t } = useTranslation();
  const total = JOURNEY_STEPS.length;
  const doneCount = JOURNEY_STEPS.filter(s => journey[s.id] === 'done').length;
  const percent = Math.round((doneCount / total) * 100);

  const statusLabel: Record<StepStatus, string> = {
    todo: t('globi.status_todo', 'À faire'),
    doing: t('globi.status_doing', 'En cours'),
    done: t('globi.status_done', 'Fait'),
  };
  const nextActionLabel: Record<StepStatus, string> = {
    todo: t('globi.mark_doing', 'Marquer comme en cours'),
    doing: t('globi.mark_done', 'Marquer comme fait'),
    done: t('globi.mark_todo', 'Remettre à faire'),
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 sm:px-5 pb-5">
      <div className="pt-1 pb-4">
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <p className="text-sm font-light text-white/80">{t('globi.journey_intro', 'Votre cession, une étape après l\'autre.')}</p>
          <span className="text-xs text-white/60 tabular-nums shrink-0">
            {t('globi.journey_progress', '{{done}} sur {{total}}', { done: doneCount, total })}
          </span>
        </div>
        <div
          role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={doneCount}
          aria-label={t('globi.journey_progress_label', 'Avancement de votre cession')}
          className="h-2 w-full rounded-full bg-white/10 overflow-hidden"
        >
          <div className="h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${percent}%`, backgroundColor: DONE_COLOR }} />
        </div>
      </div>

      <ol className="space-y-2.5">
        {JOURNEY_STEPS.map((step, index) => {
          const status: StepStatus = journey[step.id] ?? 'todo';
          const title = t(step.titleKey, step.title);
          return (
            <li key={step.id} className="rounded-[1.5rem] bg-white/[0.05] border border-white/10 p-4">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => onSetStatus(step.id, NEXT_STATUS[status])}
                  aria-label={`${title} - ${statusLabel[status]}. ${nextActionLabel[status]}`}
                  title={nextActionLabel[status]}
                  className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium tabular-nums border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                    status === 'doing' ? 'bg-primary/25 border-primary text-white' : status === 'todo' ? 'bg-white/5 border-white/20 text-white/70 hover:border-white/50' : ''
                  }`}
                  style={status === 'done' ? { backgroundColor: DONE_COLOR, borderColor: DONE_COLOR, color: '#10261d' } : undefined}
                >
                  {status === 'done' ? <Check className="w-4 h-4" strokeWidth={3} /> : index + 1}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium text-white leading-snug">{title}</h4>
                    <span
                      className={`shrink-0 text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full ${
                        status === 'doing' ? 'bg-primary/25 text-white' : status === 'todo' ? 'bg-white/10 text-white/60' : ''
                      }`}
                      style={status === 'done' ? { backgroundColor: 'rgba(52, 211, 153, 0.18)', color: DONE_COLOR } : undefined}
                    >
                      {statusLabel[status]}
                    </span>
                  </div>
                  <p className="text-[13px] font-light text-white/65 leading-relaxed mt-1">{t(step.descKey, step.desc)}</p>
                  <button
                    type="button"
                    onClick={() => onDiscuss(step)}
                    className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/[0.07] hover:bg-primary/30 border border-white/15 hover:border-primary/60 text-xs text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> {t('globi.discuss', 'En parler avec Globi')}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
