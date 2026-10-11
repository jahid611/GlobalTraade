"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import { CaretLeft, CaretRight } from "phosphor-react";

// Pagination des résultats : précédent, « Page x / y », suivant.
export function ResultsPager({ page, totalPages, disabled, onPage }: { page: number; totalPages: number; disabled: boolean; onPage: (p: number) => void }) {
  const { t } = useTranslation();
  const btnClass =
    "inline-flex items-center justify-center gap-2 min-h-[48px] px-4 sm:px-5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-sm font-medium text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-35 disabled:pointer-events-none";

  return (
    <nav
      aria-label={t("prospection.pager_label", "Pages de résultats") as string}
      className="flex items-center justify-center gap-3 sm:gap-5 pt-2"
    >
      <button onClick={() => onPage(page - 1)} disabled={page <= 1 || disabled} className={btnClass} aria-label={t("prospection.prev_page", "Page précédente") as string}>
        <CaretLeft size={16} weight="bold" />
        <span className="hidden sm:inline">{t("prospection.prev", "Précédente")}</span>
      </button>
      <span className="text-sm text-white/75 whitespace-nowrap" aria-live="polite">
        {t("radar.page_of", { page, total: totalPages, defaultValue: "Page {{page}} / {{total}}" })}
      </span>
      <button onClick={() => onPage(page + 1)} disabled={page >= totalPages || disabled} className={btnClass} aria-label={t("prospection.next_page", "Page suivante") as string}>
        <span className="hidden sm:inline">{t("prospection.next", "Suivante")}</span>
        <CaretRight size={16} weight="bold" />
      </button>
    </nav>
  );
}
