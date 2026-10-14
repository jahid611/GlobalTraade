"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "@/components/icons";
import { projectCompleteness, type BuyerProject, type ProjectField } from "@/lib/buyerProject";
import { COLOR_OK } from "@/components/settings/ui";

/** Nom en clair de chaque information du projet. */
export function useProjectFieldLabels(): Record<ProjectField, string> {
  const { t } = useTranslation();
  return {
    sectors: t("bp.field_sectors", "les secteurs recherchés"),
    zones: t("bp.field_zones", "la zone géographique"),
    budget: t("bp.field_budget", "le prix d'achat visé"),
    apport: t("bp.field_apport", "votre apport personnel"),
    timeline: t("bp.field_timeline", "la date souhaitée"),
    buyerType: t("bp.field_buyer_type", "votre statut de repreneur"),
    experience: t("bp.field_experience", "votre expérience"),
    revenue: t("bp.field_revenue", "le chiffre d'affaires recherché"),
    ambitions: t("bp.field_ambitions", "la présentation du projet"),
  };
}

// Jauge « projet rempli à X % » et ce qu'il reste à indiquer, le plus utile d'abord.
export function ProjectCompleteness({ project, className = "" }: { project: BuyerProject; className?: string }) {
  const { t } = useTranslation();
  const labels = useProjectFieldLabels();
  const { score, missing, imprecise } = projectCompleteness(project);
  const done = score === 100;

  return (
    <div className={`rounded-2xl bg-white/[0.04] border border-white/10 p-4 sm:p-5 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-medium text-white">
          {done
            ? t("bp.complete_done", "Votre projet est complet")
            : t("bp.complete_score", { defaultValue: "Votre projet est rempli à {{score}} %", score })}
        </p>
        {done && <CheckCircle2 className="w-6 h-6 shrink-0" style={{ color: COLOR_OK.text }} />}
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        aria-label={t("bp.complete_aria", "Part du projet renseignée") as string}
        className="mt-3 h-2.5 rounded-full bg-white/10 overflow-hidden"
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.max(score, 3)}%`, background: done ? `rgb(${COLOR_OK.rgb})` : "linear-gradient(90deg,#5955e8,#a5b4fc)" }}
        />
      </div>
      {done ? (
        <p className="text-sm text-white/65 font-light mt-3 leading-relaxed">
          {t("bp.complete_done_hint", "Les vendeurs voient d'un coup d'œil ce que vous cherchez.")}
        </p>
      ) : (
        <>
          <p className="text-sm text-white/65 font-light mt-3 leading-relaxed">
            {t("bp.complete_missing", "Un projet complet inspire confiance aux vendeurs. Il reste à indiquer :")}
          </p>
          <ul className="flex flex-wrap gap-2 mt-2.5">
            {missing.map((f) => (
              <li key={f} className="text-sm text-white/85 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/15">{labels[f]}</li>
            ))}
          </ul>
        </>
      )}
      {imprecise.length > 0 && (
        <p className="text-sm font-light mt-3 leading-relaxed" style={{ color: "#fcd34d" }}>
          {t("bp.complete_imprecise", { defaultValue: "À préciser dans les listes : {{fields}}.", fields: imprecise.map((f) => labels[f]).join(", ") })}
        </p>
      )}
    </div>
  );
}
