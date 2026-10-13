"use client";

// Le « projet de reprise » tel qu'il s'affiche sur un profil : ce que le
// repreneur cherche, où, avec quel budget et quel apport, et quand. Un vendeur
// doit le comprendre en cinq secondes.

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Target, Briefcase, MapPin, Coins, CalendarClock, Users, GraduationCap, TrendingUp, Search, Pencil } from "lucide-react";
import { SectionCard } from "@/components/settings/ui";
import { ProjectCompleteness } from "@/components/profile/ProjectCompleteness";
import {
  EXPERIENCE_DEFAULTS, TIMELINE_DEFAULTS, apportLabel, budgetLabel, revenueLabel, zoneLabels,
  hasSearchCriteria, isEmptyProject, type BuyerProject,
} from "@/lib/buyerProject";

const CHIP = "text-sm text-white/90 px-3 py-1.5 rounded-full bg-white/[0.07] border border-white/15";
const MAX_CHIPS = 5;

// Une des quatre réponses que cherche un vendeur : quoi, où, combien, quand.
function Fact({ icon: Icon, question, children, empty }: {
  icon: React.ElementType;
  question: string;
  children?: React.ReactNode;
  empty: string;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 sm:p-5 min-w-0">
      <p className="flex items-center gap-2 text-sm font-semibold text-[#a5b4fc]">
        <Icon className="w-5 h-5 shrink-0" /> {question}
      </p>
      <div className="mt-3 min-w-0">
        {children ?? <p className="text-sm text-white/45 font-light">{empty}</p>}
      </div>
    </div>
  );
}

function Chips({ items, moreLabel, lessLabel }: { items: string[]; moreLabel: (n: number) => string; lessLabel: string }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, MAX_CHIPS);
  const hidden = items.length - MAX_CHIPS;
  return (
    <ul className="flex flex-wrap gap-2">
      {shown.map((c) => <li key={c} className={CHIP}>{c}</li>)}
      {hidden > 0 && (
        <li>
          <button
            type="button"
            onClick={() => setAll(!all)}
            aria-expanded={all}
            className="min-h-[36px] px-3 rounded-full text-sm text-[#a5b4fc] hover:text-white underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            {all ? lessLabel : moreLabel(items.length)}
          </button>
        </li>
      )}
    </ul>
  );
}

export function BuyerProjectCard({
  project, isOwn, onEdit, onSearch,
}: {
  project: BuyerProject;
  /** le membre regarde son propre profil : complétude et raccourcis */
  isOwn: boolean;
  onEdit?: () => void;
  onSearch?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const empty = isEmptyProject(project);

  // Profil d'un autre membre sans projet : rien à montrer.
  if (empty && !isOwn) return null;

  const editButton = (label: string, primary = false) => (
    <button
      type="button"
      onClick={onEdit}
      className={`inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-full text-sm font-medium text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
        primary ? "bg-primary hover:bg-primary/90 shadow-[0_10px_30px_rgba(89,85,232,0.45)]" : "bg-white/[0.06] hover:bg-white/[0.12] border border-white/20"
      }`}
    >
      <Pencil className="w-4 h-4 shrink-0" /> {label}
    </button>
  );

  // Son propre profil, projet vide : on dit à quoi il sert et comment le remplir.
  if (empty) {
    return (
      <SectionCard
        icon={Target}
        title={t("profile.buyer_project", "Projet de reprise")}
        description={t("bp.empty_own", "Vous cherchez une entreprise à reprendre ? Décrivez votre projet en deux minutes : les vendeurs le verront ici, et vous pourrez chercher les annonces qui vous correspondent en un clic.")}
        action={editButton(t("bp.fill_cta", "Décrire mon projet"), true)}
      />
    );
  }

  const sectors = [
    ...project.sectors.map((k) => t(`industry.${k}`, { defaultValue: k }) as string),
    ...project.legacy.sectors,
  ];
  const zones = zoneLabels(project, i18n.language);
  const budget = budgetLabel(project);
  const apport = apportLabel(project, i18n.language);
  const revenue = revenueLabel(project);
  const buyerType = project.buyerType ? (t(`buyer.type_${project.buyerType}`, project.buyerType) as string) : project.legacy.buyerType;
  const experience = project.experience ? (t(`buyer.exp_${project.experience}`, EXPERIENCE_DEFAULTS[project.experience]) as string) : project.legacy.experience;
  const moreLabel = (n: number) => t("acc.see_all", { defaultValue: "Voir tout ({{n}})", n: n }) as string;
  const lessLabel = t("acc.see_less", "Voir moins") as string;
  const extras = [
    buyerType && { icon: Users, label: t("bp.extra_type", "Statut"), value: buyerType },
    experience && { icon: GraduationCap, label: t("buyer.experience", "Expérience"), value: experience },
    revenue && { icon: TrendingUp, label: t("bp.extra_revenue", "Chiffre d'affaires recherché"), value: revenue },
  ].filter(Boolean) as { icon: React.ElementType; label: string; value: string }[];

  return (
    <SectionCard
      icon={Target}
      title={t("profile.buyer_project", "Projet de reprise")}
      description={isOwn
        ? t("bp.card_sub_own", "Ce que les vendeurs voient de votre recherche.")
        : t("bp.card_sub", "L'entreprise que ce membre cherche à reprendre.")}
      action={isOwn ? editButton(t("bp.edit_cta", "Modifier mon projet")) : undefined}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-3 sm:gap-4">
        <Fact icon={Briefcase} question={t("bp.fact_what", "Quelle activité ?")} empty={t("bp.fact_what_empty", "Tous secteurs")}>
          {sectors.length > 0 ? <Chips items={sectors} moreLabel={moreLabel} lessLabel={lessLabel} /> : undefined}
        </Fact>
        <Fact icon={MapPin} question={t("bp.fact_where", "Où ?")} empty={t("bp.fact_where_empty", "Toute la France")}>
          {zones.length > 0 ? <Chips items={zones} moreLabel={moreLabel} lessLabel={lessLabel} /> : undefined}
        </Fact>
        <Fact icon={Coins} question={t("bp.fact_budget", "Avec quel budget ?")} empty={t("bp.fact_budget_empty", "Budget non précisé")}>
          {budget || apport ? (
            <dl className="space-y-2">
              {budget && (
                <div>
                  <dt className="text-sm text-white/55 font-light">{t("bp.fact_price", "Prix d'achat visé")}</dt>
                  <dd className="text-lg font-medium text-white leading-snug break-words">{budget}</dd>
                </div>
              )}
              {apport && (
                <div>
                  <dt className="text-sm text-white/55 font-light">{t("bp.fact_apport", "Apport personnel")}</dt>
                  <dd className="text-lg font-medium text-white leading-snug break-words">{apport}</dd>
                </div>
              )}
            </dl>
          ) : undefined}
        </Fact>
        <Fact icon={CalendarClock} question={t("bp.fact_when", "Quand ?")} empty={t("bp.fact_when_empty", "Date non précisée")}>
          {project.timeline ? (
            <p className="text-lg font-medium text-white leading-snug">{t(`bp.timeline_${project.timeline}`, TIMELINE_DEFAULTS[project.timeline])}</p>
          ) : undefined}
        </Fact>
      </div>

      {extras.length > 0 && (
        <dl className="flex flex-wrap gap-x-8 gap-y-3 mt-5">
          {extras.map((e) => (
            <div key={e.label} className="flex items-start gap-2.5 min-w-0">
              <e.icon className="w-5 h-5 text-white/45 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <dt className="text-sm text-white/55 font-light">{e.label}</dt>
                <dd className="text-base text-white break-words">{e.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      )}

      {project.ambitions && (
        <div className="mt-5 pt-5 border-t border-white/10">
          <p className="text-sm font-semibold text-white/80 mb-2">{t("bp.ambitions_title", "Le projet en quelques mots")}</p>
          <p className="text-base text-white/80 font-light leading-relaxed whitespace-pre-line break-words max-w-4xl">{project.ambitions}</p>
        </div>
      )}

      {isOwn && (
        <div className="mt-6 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] gap-4 xl:items-center">
          <ProjectCompleteness project={project} />
          {hasSearchCriteria(project) && (
            <button
              type="button"
              onClick={onSearch}
              className="inline-flex items-center justify-center gap-2 min-h-[52px] px-7 rounded-full bg-primary hover:bg-primary/90 text-white text-base font-semibold shadow-[0_10px_30px_rgba(89,85,232,0.55)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <Search className="w-5 h-5 shrink-0" /> {t("bp.search_cta", "Chercher avec mon projet de reprise")}
            </button>
          )}
        </div>
      )}
    </SectionCard>
  );
}
