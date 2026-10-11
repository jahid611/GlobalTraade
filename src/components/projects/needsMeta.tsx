"use client";

// Les précisions demandées pour chaque type d'aide d'un projet.
//
// Un besoin vague (« je cherche quelqu'un », « il me faut du matériel ») ne
// permet à personne de répondre. Chaque aide est donc précisée par quelques
// choix fermés — combien, quand, à quelles conditions — partagés ici entre le
// formulaire (ProjectForm) et la fiche du projet (ProjectDetail), pour que les
// deux affichent exactement les mêmes libellés.

import React from "react";
import type { TFunction } from "i18next";
import type { MaterialItem, TeamRole } from "@/services/projectService";
import { toneBg, toneBorder, type Tone } from "./form/ui";

export interface Choice { value: string; label: string }

/** Comment la personne recherchée est rémunérée. */
export const payChoices = (t: TFunction): Choice[] => [
  { value: "salary", label: t("need.pay_salary", "Salaire") },
  { value: "equity", label: t("need.pay_equity", "Parts de l'entreprise") },
  { value: "both", label: t("need.pay_both", "Salaire et parts") },
  { value: "fees", label: t("need.pay_fees", "Prestation facturée") },
  { value: "none", label: t("need.pay_none", "Bénévole") },
];

/** Où elle travaille. */
export const placeChoices = (t: TFunction): Choice[] => [
  { value: "onsite", label: t("need.place_onsite", "Sur place") },
  { value: "remote", label: t("need.place_remote", "À distance") },
  { value: "hybrid", label: t("need.place_hybrid", "Les deux") },
];

/** Quand le besoin commence (équipe, matériel). */
export const startChoices = (t: TFunction): Choice[] => [
  { value: "now", label: t("need.start_now", "Dès que possible") },
  { value: "soon", label: t("need.start_soon", "Dans 1 à 3 mois") },
  { value: "later", label: t("need.start_later", "Dans plus de 3 mois") },
];

/** Comment le matériel peut être apporté. */
export const materialModeChoices = (t: TFunction): Choice[] => [
  { value: "buy", label: t("need.mode_buy", "À acheter") },
  { value: "rent", label: t("need.mode_rent", "À louer") },
  { value: "loan", label: t("need.mode_loan", "Prêt") },
  { value: "gift", label: t("need.mode_gift", "Don") },
];

export const materialConditionChoices = (t: TFunction): Choice[] => [
  { value: "new", label: t("need.cond_new", "Neuf uniquement") },
  { value: "used", label: t("need.cond_used", "Occasion acceptée") },
];

/** Sous quelle forme l'avis d'expert est attendu. */
export const expertiseFormatChoices = (t: TFunction): Choice[] => [
  { value: "oneoff", label: t("need.exp_oneoff", "Un avis ponctuel (1 ou 2 échanges)") },
  { value: "regular", label: t("need.exp_regular", "Un suivi régulier (mentorat)") },
  { value: "mission", label: t("need.exp_mission", "Une mission à réaliser") },
];

export const expertisePayChoices = (t: TFunction): Choice[] => [
  { value: "free", label: t("need.exp_free", "Bénévole") },
  { value: "paid", label: t("need.exp_paid", "Rémunéré") },
  { value: "open", label: t("need.exp_open", "À discuter") },
];

/** Les domaines d'expertise les plus demandés, proposés en un clic. */
export const expertiseSuggestions = (t: TFunction): string[] => [
  t("need.exp_s_legal", "Juridique"), t("need.exp_s_accounting", "Comptabilité"), t("need.exp_s_finance", "Financement"),
  t("need.exp_s_marketing", "Marketing"), t("need.exp_s_digital", "Site internet"), t("need.exp_s_hr", "Recrutement"),
  t("need.exp_s_sales", "Vente"), t("need.exp_s_tax", "Fiscalité"),
];

/** Qui le porteur de projet veut rencontrer. */
export const networkTargetChoices = (t: TFunction): Choice[] => [
  { value: "banks", label: t("need.net_banks", "Banques") },
  { value: "investors", label: t("need.net_investors", "Investisseurs") },
  { value: "suppliers", label: t("need.net_suppliers", "Fournisseurs") },
  { value: "clients", label: t("need.net_clients", "Premiers clients") },
  { value: "distributors", label: t("need.net_distributors", "Distributeurs / revendeurs") },
  { value: "partners", label: t("need.net_partners", "Partenaires du métier") },
  { value: "advisors", label: t("need.net_advisors", "Comptable, avocat, notaire") },
  { value: "institutions", label: t("need.net_institutions", "Mairie, chambre de commerce, région") },
];

export const networkScopeChoices = (t: TFunction): Choice[] => [
  { value: "local", label: t("need.scope_local", "Dans ma ville") },
  { value: "regional", label: t("need.scope_regional", "Dans ma région") },
  { value: "national", label: t("need.scope_national", "Partout en France") },
  { value: "international", label: t("need.scope_international", "À l'étranger aussi") },
];

export const labelOf = (choices: Choice[], value: string | null | undefined): string =>
  choices.find((c) => c.value === value)?.label ?? "";

/** Nombre total de personnes recherchées. */
export const totalPeople = (roles: TeamRole[] | null | undefined): number =>
  (roles || []).reduce((sum, r) => sum + Math.max(1, Number(r.count) || 1), 0);

/** Quantité d'un élément de matériel, en nombre (au moins 1). */
export const quantityOf = (m: MaterialItem): number => {
  const n = parseInt(String(m.quantity ?? "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
};

/** Valeur totale du matériel à acheter ou à louer (quantité × valeur à l'unité). */
export const totalMaterialValue = (items: MaterialItem[] | null | undefined): number =>
  (items || []).reduce((sum, m) => sum + quantityOf(m) * (Number(m.estimated_value) || 0), 0);

/**
 * Un choix parmi quelques-uns, en gros boutons (plus lisible qu'une liste
 * déroulante quand il y a peu d'options). `multiple` autorise plusieurs choix.
 */
export function ChoicePills({
  choices, value, onChange, tone, label, multiple = false,
}: {
  choices: Choice[];
  value: string | string[] | null | undefined;
  onChange: (value: any) => void;
  tone: Tone;
  /** nom du groupe, lu par les lecteurs d'écran */
  label: string;
  multiple?: boolean;
}) {
  const selected = multiple ? (Array.isArray(value) ? value : []) : [value].filter(Boolean) as string[];
  const toggle = (v: string) => {
    if (multiple) onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
    else onChange(selected[0] === v ? "" : v);
  };
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {choices.map((c) => {
        const on = selected.includes(c.value);
        return (
          <button
            key={c.value}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(c.value)}
            className="min-h-[44px] px-4 rounded-full border text-sm text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            style={on
              ? { background: toneBg(tone, 0.24), borderColor: toneBorder(tone, 0.75), color: "#ffffff", fontWeight: 600 }
              : { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.8)" }}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
