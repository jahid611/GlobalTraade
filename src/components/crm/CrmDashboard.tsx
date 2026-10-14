"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Users2, BellRing, MessageSquareReply, Wallet, Send, CheckSquare, CalendarClock, ChevronRight, CheckCircle2 } from "@/components/icons";
import type { AgendaItem, CrmMetrics } from "@/lib/crm";
import type { ProspectionQuota } from "@/services/prospectService";
import { AMBER, GREEN, RED, RED_RGB, DueBadge, sectionTitleCls, useCrmFormat } from "./crmMeta";

export type DrawerTab = "details" | "history" | "tasks" | "email";

interface CrmDashboardProps {
  metrics: CrmMetrics;
  agenda: AgendaItem[];
  /** null tant que le quota n'est pas connu */
  quota: ProspectionQuota | null;
  isBusiness: boolean;
  dueFilterActive: boolean;
  onToggleDueFilter: () => void;
  onOpen: (prospectId: string, tab: DrawerTab) => void;
}

const AGENDA_PREVIEW = 6;

function Tile({
  icon: Icon, label, value, sub, accent, onClick, pressed, className = "", children,
}: {
  icon: React.ElementType; label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: string;
  onClick?: () => void; pressed?: boolean; className?: string; children?: React.ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-center gap-2 text-xs text-white/60">
        <Icon size={14} className="shrink-0" style={accent ? { color: accent } : undefined} aria-hidden />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-2 text-2xl sm:text-[1.7rem] leading-none font-light text-white tabular-nums">{value}</div>
      {sub && <div className="mt-2 text-xs text-white/55 leading-snug">{sub}</div>}
      {children}
    </>
  );
  const cls = `liquid-glass rounded-2xl border border-white/10 p-4 text-left min-w-0 flex flex-col justify-start ${className}`;
  if (!onClick) return <div className={cls}>{body}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={`${cls} hover:bg-white/[0.04] outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${pressed ? "ring-2 ring-primary/70" : ""}`}
    >
      {body}
    </button>
  );
}

export function CrmDashboard({ metrics, agenda, quota, isBusiness, dueFilterActive, onToggleDueFilter, onOpen }: CrmDashboardProps) {
  const { t } = useTranslation();
  const f = useCrmFormat();
  const [showAll, setShowAll] = useState(false);

  const due = metrics.dueToday + metrics.overdue;
  const rate = metrics.responseRate == null ? "—" : `${Math.round(metrics.responseRate * 100)} %`;
  const used = quota?.used ?? 0;
  const included = quota?.included ?? 0;
  const pct = included > 0 ? Math.min(100, Math.round((used / included) * 100)) : 0;
  const shown = showAll ? agenda : agenda.slice(0, AGENDA_PREVIEW);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Tile
          icon={Users2}
          label={t("crm.dash.active", "Prospects actifs")}
          value={metrics.active}
          sub={t("crm.dash.active_sub", { n: metrics.total, defaultValue: "sur {{n}} au total (hors archivés)" })}
        />
        <Tile
          icon={BellRing}
          accent={metrics.overdue > 0 ? RED : due > 0 ? AMBER : undefined}
          label={t("crm.dash.due", "À relancer")}
          value={due}
          onClick={onToggleDueFilter}
          pressed={dueFilterActive}
          sub={
            due === 0 ? t("crm.dash.due_none", "Rien en attente") : (
              <>
                {t("crm.dash.due_today", { n: metrics.dueToday, defaultValue: "{{n}} aujourd'hui" })}
                {metrics.overdue > 0 && (
                  <> · <span className="font-medium" style={{ color: RED }}>{t("crm.dash.due_overdue", { n: metrics.overdue, defaultValue: "{{n}} en retard" })}</span></>
                )}
              </>
            )
          }
        />
        <Tile
          icon={MessageSquareReply}
          accent={GREEN}
          label={t("crm.dash.rate", "Taux de réponse")}
          value={rate}
          sub={
            metrics.contacted === 0
              ? t("crm.dash.rate_none", "Aucun prospect contacté pour l'instant")
              : t("crm.dash.rate_sub", { a: metrics.answered, c: metrics.contacted, defaultValue: "{{a}} réponse(s) sur {{c}} contacté(s)" })
          }
        />
        <Tile
          icon={Wallet}
          label={t("crm.dash.value", "Valeur du pipeline")}
          value={metrics.pipelineValue > 0 ? f.moneyShort(metrics.pipelineValue) : "—"}
          sub={
            metrics.pipelineValue > 0
              ? t("crm.dash.value_sub", "Somme des valeurs estimées des dossiers actifs")
              : t("crm.dash.value_none", "Renseigne une valeur estimée sur tes fiches")
          }
        />
        <Tile
          className="col-span-2 lg:col-span-1"
          icon={Send}
          label={t("crm.dash.quota", "Contacts ce mois")}
          value={quota ? <>{used} <span className="text-base text-white/50">/ {included}</span></> : "—"}
          sub={
            !isBusiness
              ? t("crm.dash.quota_business", "L'envoi et l'export sont réservés à la formule Business")
              : quota?.extra
                ? t("crm.dash.quota_extra", "Forfait atteint : chaque contact supplémentaire est payant")
                : t("crm.dash.quota_sub", { n: Math.max(0, included - used), defaultValue: "{{n}} contact(s) encore inclus" })
          }
        >
          {quota && (
            <div className="mt-2.5 h-1.5 rounded-full bg-white/10 overflow-hidden" role="presentation">
              <div className={`h-full rounded-full ${quota.extra ? "" : "bg-primary"}`} style={{ width: `${pct}%`, ...(quota.extra ? { background: RED } : {}) }} />
            </div>
          )}
        </Tile>
      </div>

      <div className="liquid-glass rounded-2xl border border-white/10 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className={`${sectionTitleCls} flex items-center gap-2`}>
            <CalendarClock size={14} aria-hidden /> {t("crm.dash.todo", "À faire aujourd'hui")}
            {agenda.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold tracking-normal" style={{ color: metrics.overdue > 0 ? RED : AMBER, background: metrics.overdue > 0 ? `rgba(${RED_RGB},0.14)` : "rgba(245,158,11,0.14)" }}>
                {agenda.length}
              </span>
            )}
          </h3>
        </div>

        {agenda.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-white/60 py-1">
            <CheckCircle2 size={16} style={{ color: GREEN }} aria-hidden />
            {t("crm.dash.todo_empty", "Rien à traiter aujourd'hui. Ajoute une prochaine action ou une tâche sur une fiche pour ne rien oublier.")}
          </p>
        ) : (
          <>
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {shown.map((item) => (
                <li key={item.key} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onOpen(item.prospectId, item.kind === "task" ? "tasks" : "details")}
                    className="w-full min-h-[52px] flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/10 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                  >
                    {item.kind === "task"
                      ? <CheckSquare size={16} className="shrink-0 text-white/60" aria-hidden />
                      : <BellRing size={16} className="shrink-0 text-white/60" aria-hidden />}
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-white truncate">
                        {item.label || t("crm.dash.todo_action", "Prochaine action")}
                      </span>
                      <span className="block text-xs text-white/55 truncate">{item.prospectName}</span>
                      {/* mobile : l'échéance passe sous le libellé, qui garde toute la largeur */}
                      <DueBadge iso={item.dueAt} className="mt-1.5 sm:hidden" />
                    </span>
                    <DueBadge iso={item.dueAt} className="shrink-0 hidden sm:inline-flex" />
                    <ChevronRight size={16} className="shrink-0 text-white/40" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            {agenda.length > AGENDA_PREVIEW && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="mt-2 h-11 px-3 text-sm text-white/70 hover:text-white underline underline-offset-4"
              >
                {showAll
                  ? t("crm.dash.todo_less", "Réduire")
                  : t("crm.dash.todo_more", { n: agenda.length, defaultValue: "Tout afficher ({{n}})" })}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
