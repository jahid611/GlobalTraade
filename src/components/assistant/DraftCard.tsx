import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from '@/components/icons';
import type { ListingDraft } from '@/services/assistantService';
import { Mascot } from './Mascot';
import { formatMoney } from '@/lib/markets';

// Carte du fil de discussion : brouillon d'annonce préparé par Globi.
export function DraftCard({ draft, onOpen }: { draft: ListingDraft; onOpen: (draft: ListingDraft) => void }) {
  const { t, i18n } = useTranslation();
  const euros = (value: number) => formatMoney(value, i18n.language);

  const rows: { label: string; value: string }[] = [];
  if (draft.name) rows.push({ label: t('globi.draft_name', 'Nom'), value: draft.name });
  if (draft.industry) rows.push({ label: t('globi.draft_industry', 'Secteur'), value: t(`industry.${draft.industry}`, { defaultValue: draft.industry }) });
  if (typeof draft.price === 'number') rows.push({ label: t('globi.draft_price', 'Prix de vente'), value: euros(draft.price) });
  if (typeof draft.revenue_n1 === 'number') rows.push({ label: t('globi.draft_revenue', 'Chiffre d\'affaires'), value: euros(draft.revenue_n1) });
  if (typeof draft.ebitda === 'number') rows.push({ label: t('globi.draft_ebitda', 'Résultat (EBE)'), value: euros(draft.ebitda) });

  return (
    <div className="rounded-[1.5rem] bg-primary/15 border border-primary/40 p-4">
      <div className="flex items-center gap-3">
        <Mascot pose="bravo" className="w-14 h-14 shrink-0" />
        <div className="min-w-0">
          <h4 className="text-sm font-medium text-white leading-snug">{t('globi.draft_title', 'Votre annonce est prête à relire')}</h4>
          <p className="text-xs font-light text-white/65 mt-0.5">{t('globi.draft_desc', 'Vérifiez chaque champ : vous pourrez tout modifier avant de publier.')}</p>
        </div>
      </div>

      {rows.length > 0 && (
        <dl className="mt-3 space-y-1.5">
          {rows.map(row => (
            <div key={row.label} className="flex items-baseline justify-between gap-3 text-[13px]">
              <dt className="text-white/60 font-light shrink-0">{row.label}</dt>
              <dd className="text-white font-medium text-right truncate tabular-nums allow-select">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <button
        type="button"
        onClick={() => onOpen(draft)}
        className="mt-4 w-full min-h-11 px-4 py-2 rounded-full bg-primary hover:bg-primary/90 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        {t('globi.draft_open', 'Ouvrir mon annonce pré-remplie')} <ArrowRight className="w-4 h-4 shrink-0" />
      </button>
    </div>
  );
}
