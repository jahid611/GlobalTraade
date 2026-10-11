"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import { Buildings, User, Scales } from "phosphor-react";
import { ScoreGauge } from "./ScoreBadge";
import { SCORE_MAX } from "./score";

// « Comment lire ce score ? » : les trois niveaux, puis d'où viennent les points.
export function ScoreLegend({ id }: { id?: string }) {
  const { t } = useTranslation();

  const levels = [
    { score: 6, title: t("prospection.legend_strong_title", "5 ou 6 : signal fort"), desc: t("prospection.legend_strong_desc", "Plusieurs indices réunis. À contacter en priorité.") },
    { score: 3, title: t("prospection.legend_medium_title", "3 ou 4 : signal moyen"), desc: t("prospection.legend_medium_desc", "Quelques indices. Une cession est possible dans les années qui viennent.") },
    { score: 1, title: t("prospection.legend_low_title", "0 à 2 : à creuser"), desc: t("prospection.legend_low_desc", "Peu d'indices publics. Cela ne veut pas dire que l'entreprise n'est pas à vendre.") },
  ];

  const rules = [
    { Icon: User, title: t("prospection.rule_age_title", "L'âge du dirigeant"), desc: t("prospection.rule_age_desc", "50 ans : 1 point. 55 ans : 2 points. 60 ans et plus : 3 points.") },
    { Icon: Buildings, title: t("prospection.rule_seniority_title", "L'ancienneté de l'entreprise"), desc: t("prospection.rule_seniority_desc", "10 ans : 1 point. 15 ans et plus : 2 points.") },
    { Icon: Scales, title: t("prospection.rule_legal_title", "La forme juridique"), desc: t("prospection.rule_legal_desc", "Une société (SAS, SARL, SA…) : 1 point, car elle se transmet plus facilement.") },
  ];

  return (
    <div id={id} className="liquid-glass rounded-3xl border border-white/10 p-5 sm:p-6">
      <p className="text-sm text-white/75 font-light leading-relaxed max-w-4xl">
        {t("prospection.legend_intro", { max: SCORE_MAX, defaultValue: "Le score de cession va de 0 à {{max}}. Il estime, à partir d'informations publiques, la probabilité que l'entreprise soit transmise prochainement. C'est un indice pour choisir qui contacter en premier, pas une certitude." })}
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">
        <ul className="space-y-3">
          {levels.map((l) => (
            <li key={l.score} className="flex items-center gap-3.5">
              <ScoreGauge score={l.score} size={48} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white leading-tight">{l.title}</p>
                <p className="text-xs text-white/60 font-light mt-0.5 leading-snug">{l.desc}</p>
              </div>
            </li>
          ))}
        </ul>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-3">
            {t("prospection.rules_label", "D'où viennent les points")}
          </p>
          <ul className="space-y-3">
            {rules.map((r, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
                  <r.Icon size={18} className="text-[#a5b4fc]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white leading-tight">{r.title}</p>
                  <p className="text-xs text-white/60 font-light mt-0.5 leading-snug">{r.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
