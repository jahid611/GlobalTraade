"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import { LockSimple, Check, Crown, ArrowRight } from "phosphor-react";
import { Button } from "@/components/ui/button";
import { PLAN_PRICES, EXTRA_PROSPECT_PRICE } from "@/services/planService";
import { PROSPECTION_MONTHLY_INCLUDED } from "@/services/prospectService";

// Formule gratuite : la prospection n'est pas accessible. On dit ce que chaque
// formule débloque, puis on envoie vers la page des formules.
export function LockedScreen({ onSeePlans }: { onSeePlans: () => void }) {
  const { t } = useTranslation();

  const plans = [
    {
      key: "pro",
      name: t("prospection.plan_pro", "Pro"),
      price: PLAN_PRICES.pro,
      highlight: false,
      features: [
        t("prospection.pro_f1", "Recherche d'entreprises dans votre secteur d'activité (votre code APE)"),
        t("prospection.pro_f2", "Score de cession sur chaque entreprise trouvée"),
        t("prospection.pro_f3", "CRM individuel pour classer et suivre vos prospects"),
      ],
    },
    {
      key: "business",
      name: t("prospection.plan_business", "Business"),
      price: PLAN_PRICES.business,
      highlight: true,
      features: [
        t("prospection.business_f1", "Tout ce qu'offre la formule Pro"),
        t("prospection.business_f2", "Recherche dans tous les secteurs (tous les codes APE)"),
        t("prospection.business_f3", {
          n: PROSPECTION_MONTHLY_INCLUDED, price: EXTRA_PROSPECT_PRICE,
          defaultValue: "{{n}} entreprises contactées par mois incluses, puis {{price}} € par contact",
        }),
        t("prospection.business_f4", "Envoi de vos emails de prise de contact depuis Globly"),
      ],
    },
  ];

  return (
    <section
      className="relative rounded-[2rem] p-[1.5px] shadow-[0_20px_70px_rgba(89,85,232,0.35)] max-w-4xl mx-auto"
      style={{ background: "linear-gradient(135deg, rgba(120,114,251,0.95) 0%, rgba(89,85,232,0.45) 40%, rgba(255,255,255,0.12) 100%)" }}
    >
      <div className="rounded-[calc(2rem-1.5px)] bg-[#232229]/95 backdrop-blur-xl p-6 sm:p-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-7">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-[0_8px_24px_rgba(89,85,232,0.5)]">
            <LockSimple size={24} className="text-white" weight="fill" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-[1.7rem] font-medium text-white leading-tight tracking-tight">
              {t("prospection.locked_title", "La prospection n'est pas incluse dans la formule gratuite")}
            </h1>
            <p className="text-sm md:text-base text-white/65 font-light mt-1.5 leading-relaxed">
              {t("prospection.locked_desc", "Cette page sert à trouver, dans le registre public, des entreprises susceptibles d'être à céder, puis à les suivre dans un CRM. Voici ce que débloque chaque formule.")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((p) => (
            <div
              key={p.key}
              className={`rounded-2xl p-5 sm:p-6 border ${p.highlight ? "bg-primary/10 border-primary/50" : "bg-white/[0.04] border-white/10"}`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="flex items-center gap-2 text-lg font-semibold text-white">
                  {p.highlight && <Crown size={20} weight="fill" className="text-[#a5b4fc]" />}
                  {p.name}
                </p>
                <p className="text-white whitespace-nowrap">
                  <span className="text-2xl font-medium">{p.price} €</span>
                  <span className="text-sm text-white/60 font-light"> {t("prospection.per_month", "/ mois")}</span>
                </p>
              </div>
              <ul className="mt-4 space-y-2.5">
                {p.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-white/80 font-light leading-snug">
                    <Check size={16} weight="bold" className="shrink-0 mt-0.5 text-[#a5b4fc]" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-4">
          <Button
            onClick={onSeePlans}
            className="h-14 px-8 rounded-full bg-primary hover:bg-primary/90 text-white text-base font-semibold shadow-[0_10px_30px_rgba(89,85,232,0.55)] outline-none [text-shadow:none]"
          >
            {t("quota.see_plans", "Voir les formules")}
            <ArrowRight size={18} className="ml-2" />
          </Button>
          <p className="text-xs text-white/55 font-light leading-relaxed">
            {t("prospection.locked_note", "Vous choisissez et réglez votre formule sur la page suivante.")}
          </p>
        </div>
      </div>
    </section>
  );
}
