"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { format, formatDistanceToNow, differenceInCalendarDays } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import {
  Flame, Sparkles, Crosshair, StickyNote, Phone, Mail, CalendarDays, ArrowRightLeft, CheckSquare, Zap,
  ChevronsUp, ChevronsDown, Minus, Clock, AlertTriangle,
} from "lucide-react";
import { STATUS_META, type ProspectPriority, type ProspectStatus } from "@/services/prospectService";
import type { ActivityType } from "@/services/crmService";
import { dueState } from "@/lib/crm";

// tailwind.config.ts remappe emerald/red/amber/blue… sur des violets : les vraies
// couleurs (étapes, priorités, retard, succès) passent par des styles inline.
export const RED = "#fca5a5";
export const RED_RGB = "239,68,68";
export const GREEN = "#6ee7b7";
export const GREEN_RGB = "16,185,129";
export const AMBER = "#fcd34d";
export const AMBER_RGB = "245,158,11";

/** Couleur pleine de chaque étape (mêmes teintes que STATUS_META). */
export const STATUS_HEX: Record<ProspectStatus, string> = {
  a_qualifier: "#b4b3c2",
  email_trouve: "#93c5fd",
  contacte: "#a5b4fc",
  relance_1: "#c4b5fd",
  relance_2: "#d8b4fe",
  reponse: "#67e8f9",
  interesse: "#6ee7b7",
  refus: "#fda4af",
};

// Fond + texte de chaque étape. STATUS_META (prospectService) utilise des opacités
// « /18 » que Tailwind ne génère pas : ici, uniquement des valeurs qu'il connaît.
export const STATUS_CLS: Record<ProspectStatus, string> = {
  a_qualifier: "bg-white/10 text-white/80",
  email_trouve: "bg-[#5b8def]/20 text-[#93c5fd]",
  contacte: "bg-[#5955e8]/25 text-[#a5b4fc]",
  relance_1: "bg-[#7872fb]/25 text-[#c4b5fd]",
  relance_2: "bg-[#8b5cf6]/25 text-[#d8b4fe]",
  reponse: "bg-[#06b6d4]/20 text-[#67e8f9]",
  interesse: "bg-[#10b981]/20 text-[#6ee7b7]",
  refus: "bg-[#f43f5e]/20 text-[#fda4af]",
};

export const PRIORITY_META: Record<ProspectPriority, { label: string; color: string; rgb: string; Icon: React.ElementType }> = {
  high: { label: "Haute", color: RED, rgb: RED_RGB, Icon: ChevronsUp },
  normal: { label: "Normale", color: "#d2d1dd", rgb: "210,209,221", Icon: Minus },
  low: { label: "Basse", color: "#93c5fd", rgb: "59,130,246", Icon: ChevronsDown },
};

export const ACTIVITY_META: Record<ActivityType, { label: string; color: string; rgb: string; Icon: React.ElementType }> = {
  note: { label: "Note", color: AMBER, rgb: AMBER_RGB, Icon: StickyNote },
  call: { label: "Appel", color: GREEN, rgb: GREEN_RGB, Icon: Phone },
  email: { label: "Email", color: "#93c5fd", rgb: "59,130,246", Icon: Mail },
  meeting: { label: "Rendez-vous", color: "#f9a8d4", rgb: "236,72,153", Icon: CalendarDays },
  status: { label: "Étape", color: "#c4b5fd", rgb: "139,92,246", Icon: ArrowRightLeft },
  task: { label: "Tâche", color: "#67e8f9", rgb: "6,182,212", Icon: CheckSquare },
  system: { label: "Système", color: "#b4b3c2", rgb: "180,179,194", Icon: Zap },
};

export const tint = (color: string, rgb: string): React.CSSProperties => ({
  color, background: `rgba(${rgb},0.14)`, borderColor: `rgba(${rgb},0.36)`,
});

// Champs de saisie : 44 px de haut, 16 px sur mobile (pas de zoom iOS à la mise au point).
export const fieldCls =
  "w-full h-11 rounded-xl bg-white/5 border border-white/15 px-3.5 text-base sm:text-sm text-white placeholder:text-white/35 outline-none focus:border-primary/70 focus:bg-white/[0.07] transition-colors";
export const areaCls =
  "w-full rounded-xl bg-white/5 border border-white/15 px-3.5 py-3 text-base sm:text-sm text-white placeholder:text-white/35 outline-none focus:border-primary/70 focus:bg-white/[0.07] transition-colors resize-none leading-relaxed";
export const labelCls = "block text-xs font-medium text-white/60 mb-1.5";
export const sectionTitleCls = "text-xs font-semibold uppercase tracking-widest text-white/60";
export const ghostBtnCls =
  "inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-primary/70";
export const primaryBtnCls =
  "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-primary hover:bg-primary/90 text-sm font-medium text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-white/60";
export const iconBtnCls =
  "inline-flex items-center justify-center w-11 h-11 shrink-0 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/70";

export function useStatusLabel() {
  const { t } = useTranslation();
  return (s: ProspectStatus) => t(`crm.status.${s}`, STATUS_META[s]?.label || s) as string;
}

/** Dates et montants dans la langue du site. */
export function useCrmFormat() {
  const { i18n } = useTranslation();
  const en = !!i18n.language?.startsWith("en");
  const locale = en ? enUS : fr;
  const intl = en ? "en-GB" : "fr-FR";
  const safe = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  return {
    en,
    money: (n: number) => new Intl.NumberFormat(intl, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n),
    moneyShort: (n: number) =>
      new Intl.NumberFormat(intl, { style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 1 }).format(n),
    day: (iso: string) => { const d = safe(iso); return d ? format(d, "d MMM yyyy", { locale }) : ""; },
    shortDay: (iso: string) => { const d = safe(iso); return d ? format(d, "d MMM", { locale }) : ""; },
    dayTime: (iso: string) => { const d = safe(iso); return d ? format(d, en ? "d MMM yyyy, HH:mm" : "d MMM yyyy 'à' HH:mm", { locale }) : ""; },
    ago: (iso: string) => { const d = safe(iso); return d ? formatDistanceToNow(d, { addSuffix: true, locale }) : ""; },
    /** valeur d'un <input type="date"> */
    inputDay: (iso: string | null | undefined) => { const d = iso ? safe(iso) : null; return d ? format(d, "yyyy-MM-dd") : ""; },
  };
}

/** <input type="date"> → horodatage (9 h, heure locale) ; null si vide ou illisible. */
export function dayToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T09:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function ScoreBadge({ score, className = "" }: { score: number; className?: string }) {
  const { t } = useTranslation();
  const hot = score >= 5, warm = score >= 3;
  const Icon = hot ? Flame : warm ? Sparkles : Crosshair;
  const style = hot ? tint(RED, RED_RGB) : warm ? tint(AMBER, AMBER_RGB) : tint("#b4b3c2", "255,255,255");
  return (
    <span
      className={`inline-flex items-center gap-1 h-6 px-2 rounded-full text-xs font-bold border shrink-0 ${className}`}
      style={style}
      title={t("crm.score_tip", "Score de cession : plus il est élevé, plus une transmission est probable") as string}
    >
      <Icon size={12} aria-hidden /> {score}
    </span>
  );
}

export function StatusPill({ status, className = "" }: { status: ProspectStatus; className?: string }) {
  const label = useStatusLabel();
  return (
    <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_CLS[status] || ""} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS_HEX[status] }} aria-hidden />
      {label(status)}
    </span>
  );
}

export function PriorityBadge({ priority, compact = false }: { priority: ProspectPriority; compact?: boolean }) {
  const { t } = useTranslation();
  const m = PRIORITY_META[priority];
  const label = t(`crm.priority.${priority}`, m.label) as string;
  return (
    <span
      className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-xs font-medium border whitespace-nowrap shrink-0"
      style={tint(m.color, m.rgb)}
      title={`${t("crm.priority.label", "Priorité")} : ${label}`}
    >
      <m.Icon size={12} aria-hidden />
      {compact ? <span className="sr-only">{label}</span> : label}
    </span>
  );
}

/** Échéance : rouge si dépassée, ambre si c'est aujourd'hui, neutre sinon. */
export function DueBadge({ iso, label, className = "" }: { iso: string; label?: string | null; className?: string }) {
  const { t } = useTranslation();
  const f = useCrmFormat();
  const st = dueState(iso);
  if (!st) return null;
  const late = differenceInCalendarDays(new Date(), new Date(iso));
  const when =
    st === "overdue"
      ? (t("crm.due.overdue", { count: late, defaultValue: "En retard de {{count}} j" }) as string)
      : st === "today"
        ? (t("crm.due.today", "Aujourd'hui") as string)
        : f.shortDay(iso);
  const style =
    st === "overdue" ? tint(RED, RED_RGB) : st === "today" ? tint(AMBER, AMBER_RGB) : tint("#d2d1dd", "255,255,255");
  const Icon = st === "overdue" ? AlertTriangle : Clock;
  return (
    <span
      className={`inline-flex items-center gap-1 min-h-6 px-2 py-0.5 rounded-full text-xs font-medium border max-w-full ${className}`}
      style={style}
      title={f.day(iso)}
    >
      <Icon size={12} className="shrink-0" aria-hidden />
      <span className="truncate">{label ? `${label} · ${when}` : when}</span>
    </span>
  );
}

export const annuaireUrl = (siren: string) => `https://annuaire-entreprises.data.gouv.fr/entreprise/${siren}`;
