"use client";

// Pour un vendeur qui regarde le profil d'un repreneur : en quoi le projet de
// ce repreneur correspond à SES annonces (secteur, zone, prix), dit en clair.
// Tout est calculé par src/lib/buyerProject.ts à partir du projet public du
// repreneur et des annonces du vendeur lui-même.

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Handshake, CheckCircle2, XCircle, HelpCircle, MinusCircle } from "lucide-react";
import { SectionCard, ShowAllButton, COLOR_OK, COLOR_WARN, COLOR_BAD } from "@/components/settings/ui";
import {
  budgetLabel, rankListingsForProject, type BuyerProject, type BudgetFit, type FitStatus, type ListingFit,
} from "@/lib/buyerProject";

export interface FitCardListing {
  id: string;
  name: string | null;
  industry: string | null;
  address: string | null;
  price: number | null;
}

const NEUTRAL = { rgb: "210,209,221", text: "#d2d1dd" };
const LIMIT = 2;

function Line({ status, children }: { status: FitStatus | BudgetFit; children: React.ReactNode }) {
  const ok = status === "match" || status === "below";
  const Icon = ok ? CheckCircle2 : status === "miss" ? XCircle : status === "open" ? MinusCircle : HelpCircle;
  const color = ok ? COLOR_OK.text : status === "miss" ? COLOR_BAD.text : NEUTRAL.text;
  return (
    <li className="flex items-start gap-2.5 text-[0.95rem] text-white/85 leading-snug">
      <Icon className="w-5 h-5 shrink-0 mt-0.5" style={{ color }} />
      <span className="min-w-0">{children}</span>
    </li>
  );
}

export function ProjectFitCard({ project, listings }: { project: BuyerProject; listings: FitCardListing[] }) {
  const { t } = useTranslation();
  const [all, setAll] = useState(false);
  if (!listings.length) return null;

  const ranked = rankListingsForProject(project, listings);
  const shown = all ? ranked : ranked.slice(0, LIMIT);
  const budget = budgetLabel(project);

  const levels: Record<ListingFit["level"], { label: string; tone: { rgb: string; text: string } }> = {
    strong: { label: t("fit.level_strong", "Correspond bien"), tone: COLOR_OK },
    partial: { label: t("fit.level_partial", "Correspond en partie"), tone: COLOR_WARN },
    weak: { label: t("fit.level_weak", "Correspond peu"), tone: COLOR_BAD },
    unknown: { label: t("fit.level_unknown", "À voir avec lui"), tone: NEUTRAL },
  };

  const sectorText = (s: FitStatus, industry: string | null) => {
    const name = industry ? (t(`industry.${industry}`, { defaultValue: industry }) as string) : "";
    if (s === "match") return t("fit.sector_match", { defaultValue: "Secteur : votre activité ({{sector}}) fait partie de celles qu'il recherche.", sector: name });
    if (s === "miss") return t("fit.sector_miss", { defaultValue: "Secteur : votre activité ({{sector}}) ne fait pas partie de celles qu'il recherche.", sector: name });
    if (s === "open") return t("fit.sector_open", "Secteur : il n'a pas précisé de secteur, tous peuvent l'intéresser.");
    return t("fit.sector_unknown", "Secteur : impossible de comparer, à vérifier avec lui.");
  };
  const zoneText = (s: FitStatus) => {
    if (s === "match") return t("fit.zone_match", "Lieu : votre entreprise se trouve dans une zone qu'il recherche.");
    if (s === "miss") return t("fit.zone_miss", "Lieu : votre entreprise est en dehors des zones qu'il recherche.");
    if (s === "open") return t("fit.zone_open", "Lieu : il n'a pas précisé de zone, il cherche partout.");
    return t("fit.zone_unknown", "Lieu : impossible de comparer, à vérifier avec lui.");
  };
  const budgetText = (s: BudgetFit) => {
    if (s === "match") return t("fit.budget_match", { defaultValue: "Prix : votre prix entre dans son budget ({{budget}}).", budget });
    if (s === "below") return t("fit.budget_below", { defaultValue: "Prix : votre prix est en dessous du budget qu'il vise ({{budget}}).", budget });
    if (s === "miss") return t("fit.budget_miss", { defaultValue: "Prix : votre prix dépasse son budget ({{budget}}).", budget });
    if (s === "open") return t("fit.budget_open", "Prix : il n'a pas précisé de budget.");
    return t("fit.budget_unknown", "Prix : impossible de comparer, votre annonce n'indique pas de prix.");
  };

  return (
    <SectionCard
      icon={Handshake}
      title={t("fit.title", "Ce repreneur et vos annonces")}
      description={t("fit.desc", "Nous avons comparé son projet de reprise à vos annonces. C'est une indication pour vous aider, pas une promesse d'achat.")}
    >
      <ul className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
        {shown.map(({ listing, fit }) => {
          const level = levels[fit.level];
          return (
            <li key={listing.id} className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 sm:p-5 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <p className="text-base font-medium text-white min-w-0 break-words">{listing.name || t("fit.listing_untitled", "Votre annonce")}</p>
                <span
                  className="inline-flex items-center text-sm font-semibold px-3 py-1 rounded-full border whitespace-nowrap"
                  style={{ background: `rgba(${level.tone.rgb},0.16)`, color: level.tone.text, borderColor: `rgba(${level.tone.rgb},0.4)` }}
                >
                  {level.label}
                </span>
              </div>
              <ul className="space-y-2.5 mt-4">
                <Line status={fit.sector}>{sectorText(fit.sector, listing.industry)}</Line>
                <Line status={fit.zone}>{zoneText(fit.zone)}</Line>
                <Line status={fit.budget}>{budgetText(fit.budget)}</Line>
                {fit.apportShare !== null && (
                  <Line status={fit.apportShare >= 0.2 ? "match" : "open"}>
                    {t("fit.apport_share", {
                      defaultValue: "Apport : il dispose d'environ {{pct}} % de votre prix. Les banques demandent souvent 20 à 30 %.",
                      pct: fit.apportShare >= 1 ? 100 : Math.max(1, Math.round(fit.apportShare * 100)),
                    })}
                  </Line>
                )}
              </ul>
            </li>
          );
        })}
      </ul>
      {ranked.length > LIMIT && (
        <ShowAllButton
          expanded={all}
          onToggle={() => setAll(!all)}
          moreLabel={t("acc.see_all", { defaultValue: "Voir tout ({{n}})", n: ranked.length }) as string}
          lessLabel={t("acc.see_less", "Voir moins") as string}
        />
      )}
    </SectionCard>
  );
}
