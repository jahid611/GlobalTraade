"use client";

// Libellés et pastilles d'un membre, partagés par la liste et par la fiche.

import React from "react";
import { ShieldStar, Prohibit } from "phosphor-react";
import type { AdminUserRow, PlanType } from "@/services/adminService";
import { Pill, type ToneName } from "../ui";

export const PLAN_LABEL: Record<PlanType, string> = { free: "Gratuite", pro: "Pro", business: "Business" };
const PLAN_TONE: Record<PlanType, ToneName> = { free: "grey", pro: "violet", business: "amber" };

export const KYC_LABEL: Record<string, string> = { none: "Non demandée", pending: "En attente", verified: "Vérifiée", rejected: "Refusée" };
const KYC_TONE: Record<string, ToneName> = { none: "grey", pending: "amber", verified: "green", rejected: "red" };

/** Mêmes valeurs que l'ancienne page d'administration. */
export const BUYER_LEVELS = [
  { value: "profil_cree", label: "Profil créé", hint: "le niveau de départ" },
  { value: "qualifie", label: "Repreneur qualifié", hint: "son projet de reprise est sérieux et complet" },
  { value: "finance_verifie", label: "Financement vérifié", hint: "il a prouvé qu'il a les moyens de son projet" },
] as const;
export const buyerLevelLabel = (v: string | null | undefined) => BUYER_LEVELS.find((l) => l.value === (v || "profil_cree"))?.label ?? v ?? "Profil créé";

export const ACCOUNT_TYPE: Record<string, string> = { buyer: "Repreneur", seller: "Vendeur", investor: "Investisseur", advisor: "Conseiller" };

export const PlanPill = ({ plan }: { plan: PlanType }) => <Pill tone={PLAN_TONE[plan] || "grey"}>{PLAN_LABEL[plan] || plan}</Pill>;
export const KycPill = ({ status }: { status: string | null | undefined }) => {
  const s = status || "none";
  return <Pill tone={KYC_TONE[s] || "grey"}>{KYC_LABEL[s] || s}</Pill>;
};

export function StatusPills({ user }: { user: Pick<AdminUserRow, "is_admin" | "suspended_at"> }) {
  if (!user.is_admin && !user.suspended_at) return <span className="text-[13px] text-white/50">Actif</span>;
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {user.suspended_at && <Pill tone="red"><Prohibit size={13} weight="bold" /> Suspendu</Pill>}
      {user.is_admin && <Pill tone="violet"><ShieldStar size={13} weight="fill" /> Administrateur</Pill>}
    </span>
  );
}

export function Avatar({ name, url, size = 40 }: { name: string | null | undefined; url?: string | null; size?: number }) {
  const style = { width: size, height: size };
  if (url) return <img src={url} alt="" style={style} className="rounded-full object-cover shrink-0 border border-white/10" />;
  return (
    <span aria-hidden style={style} className="rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-sm font-medium text-white/80 shrink-0 uppercase">
      {(name || "?").trim().charAt(0) || "?"}
    </span>
  );
}

/** Colonnes du profil, dans l'ordre où la fiche les présente. */
export const PROFILE_FIELDS: [string, string][] = [
  ["full_name", "Nom"],
  ["account_type", "Type de compte"],
  ["company_name", "Entreprise"],
  ["legal_form", "Forme juridique"],
  ["role_function", "Fonction"],
  ["siret", "SIRET"],
  ["phone", "Téléphone"],
  ["contact_email", "Email de contact"],
  ["show_email", "Affiche son email"],
  ["show_phone", "Affiche son téléphone"],
  ["country", "Pays"],
  ["city", "Ville"],
  ["address", "Adresse"],
  ["language", "Langue"],
  ["bio", "Présentation"],
  ["buyer_type", "Type de repreneur"],
  ["target_sectors", "Secteurs visés"],
  ["target_geo", "Zones visées"],
  ["target_budget", "Budget visé"],
  ["target_revenue", "Chiffre d'affaires visé"],
  ["apport", "Apport"],
  ["experience", "Expérience"],
  ["ambitions", "Ambitions"],
  ["onboarding_completed", "Inscription terminée"],
  ["profile_views_count", "Vues du profil"],
  ["updated_at", "Profil modifié le"],
];

/** Colonnes déjà montrées ailleurs dans la fiche (ou sans intérêt à l'écran). */
export const PROFILE_HIDDEN = new Set([
  "id", "avatar_url", "plan_type", "plan", "kyc_status", "is_admin", "buyer_level", "suspended_at", "suspended_reason", "has_subscription", "created_at",
]);
