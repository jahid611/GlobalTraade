"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, RefreshCw, ArrowRight } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { STATUS_ORDER, type Prospect, type ProspectStatus } from "@/services/prospectService";
import {
  ACTIVITY_MAX_LENGTH, addActivity, listActivities, type ActivityType, type ProspectActivity, type ProspectPatch,
} from "@/services/crmService";
import { ACTIVITY_META, areaCls, ghostBtnCls, primaryBtnCls, tint, useCrmFormat, useStatusLabel, StatusPill } from "./crmMeta";

interface ActivityTimelineProps {
  prospect: Prospect;
  /** enregistre des champs de la fiche (mise à jour optimiste côté CrmWorkspace) */
  onPatch: (fields: ProspectPatch) => Promise<boolean>;
}

const QUICK_TYPES: ActivityType[] = ["note", "call", "meeting"];
const isStatus = (v: unknown): v is ProspectStatus => typeof v === "string" && (STATUS_ORDER as string[]).includes(v);

export function ActivityTimeline({ prospect, onPatch }: ActivityTimelineProps) {
  const { t } = useTranslation();
  const f = useCrmFormat();
  const queryClient = useQueryClient();
  const statusLabel = useStatusLabel();
  const [type, setType] = useState<ActivityType>("note");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const key = ["prospect-activities", prospect.id];
  const { data: activities = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: key,
    queryFn: () => listActivities(prospect.id),
  });

  const typeLabel = (ty: ActivityType) => t(`crm.activity.type.${ty}`, ACTIVITY_META[ty].label) as string;
  const placeholder: Record<string, string> = {
    note: t("crm.activity.ph_note", "Ce qu'il faut retenir sur ce dossier…") as string,
    call: t("crm.activity.ph_call", "Qui a décroché, ce qui s'est dit, la suite convenue…") as string,
    meeting: t("crm.activity.ph_meeting", "Date, lieu, participants, points abordés…") as string,
  };

  const submit = async () => {
    const content = text.trim();
    if (!content || saving) return;
    setSaving(true);
    try {
      await addActivity({ prospect_id: prospect.id, type, content });
      setText("");
      queryClient.invalidateQueries({ queryKey: key });
      // Un appel ou un rendez-vous est un contact : la fiche en garde la date.
      if (type === "call" || type === "meeting") await onPatch({ last_contacted_at: new Date().toISOString() });
      showSuccess(t("crm.activity.added", "Ajouté à l'historique"));
    } catch {
      showError(t("crm.activity.add_err", "Impossible d'ajouter à l'historique. Réessaie."));
    } finally {
      setSaving(false);
    }
  };

  const describe = (a: ProspectActivity): React.ReactNode => {
    const m = a.metadata || {};
    if (a.type === "status" && isStatus(m.to)) {
      return (
        <span className="flex flex-wrap items-center gap-1.5">
          {isStatus(m.from) && <><StatusPill status={m.from} /><ArrowRight size={13} className="text-white/50" aria-label={t("crm.activity.to", "vers") as string} /></>}
          <StatusPill status={m.to} />
        </span>
      );
    }
    if (a.type === "email") {
      const to = typeof m.to === "string" ? m.to : "";
      const via = m.channel === "server"
        ? t("crm.activity.email_server", "Envoyé depuis Globly")
        : t("crm.activity.email_mailbox", "Ouvert dans la messagerie");
      return (
        <>
          <span className="block text-sm text-white break-words">{a.content || t("crm.activity.email_default", "Email de prise de contact")}</span>
          <span className="block text-xs text-white/55 break-all">{[via, to].filter(Boolean).join(" · ")}</span>
        </>
      );
    }
    if (a.type === "task") {
      return <span className="block text-sm text-white break-words">{t("crm.activity.task_done", { title: a.content || "", defaultValue: "Tâche terminée : {{title}}" })}</span>;
    }
    return <span className="block text-sm text-white whitespace-pre-wrap break-words">{a.content}</span>;
  };

  return (
    <div className="space-y-5">
      {/* Ajout rapide */}
      <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3 space-y-2.5">
        <div role="group" aria-label={t("crm.activity.add_label", "Type d'entrée") as string} className="flex gap-1.5">
          {QUICK_TYPES.map((ty) => {
            const m = ACTIVITY_META[ty];
            const on = type === ty;
            return (
              <button
                key={ty}
                type="button"
                onClick={() => setType(ty)}
                aria-pressed={on}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 h-11 px-2 rounded-xl border text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${on ? "font-medium" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"}`}
                style={on ? tint(m.color, m.rgb) : undefined}
              >
                <m.Icon size={15} className="shrink-0" aria-hidden /> <span className="truncate">{typeLabel(ty)}</span>
              </button>
            );
          })}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit(); }}
          rows={3}
          maxLength={ACTIVITY_MAX_LENGTH}
          placeholder={placeholder[type]}
          aria-label={typeLabel(type)}
          className={areaCls}
        />
        <div className="flex justify-end">
          <button type="button" onClick={submit} disabled={!text.trim() || saving} className={primaryBtnCls}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            {t("crm.activity.add", "Ajouter à l'historique")}
          </button>
        </div>
      </div>

      {/* Fil chronologique */}
      {isLoading ? (
        <div className="space-y-3" role="status" aria-label={t("crm.state.loading", "Chargement…") as string}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-white/10 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2 pt-1"><div className="h-3 w-1/3 rounded bg-white/10 animate-pulse" /><div className="h-3 w-3/4 rounded bg-white/5 animate-pulse" /></div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/75">
          <p>{t("crm.activity.load_err", "L'historique n'a pas pu être chargé.")}</p>
          <button type="button" onClick={() => refetch()} className={`${ghostBtnCls} mt-3`}>
            <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} /> {t("crm.state.retry", "Réessayer")}
          </button>
        </div>
      ) : (
        <ol className="relative">
          {activities.map((a) => {
            const m = ACTIVITY_META[a.type] || ACTIVITY_META.system;
            return (
              <li key={a.id} className="relative flex gap-3 pb-4">
                <span className="absolute left-[17px] top-9 bottom-0 w-px bg-white/10" aria-hidden />
                <span className="relative w-9 h-9 rounded-full border flex items-center justify-center shrink-0" style={tint(m.color, m.rgb)}>
                  <m.Icon size={15} aria-hidden />
                </span>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex flex-wrap items-baseline gap-x-2 text-xs">
                    <span className="font-semibold" style={{ color: m.color }}>{typeLabel(a.type)}</span>
                    <time className="text-white/50" dateTime={a.created_at} title={f.dayTime(a.created_at)}>{f.ago(a.created_at)}</time>
                  </div>
                  <div className="mt-1">{describe(a)}</div>
                </div>
              </li>
            );
          })}
          {/* Point de départ : l'entrée dans le CRM (date de création de la fiche) */}
          <li className="relative flex gap-3">
            <span className="w-9 h-9 rounded-full border flex items-center justify-center shrink-0" style={tint(ACTIVITY_META.system.color, ACTIVITY_META.system.rgb)}>
              <Plus size={15} aria-hidden />
            </span>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="text-sm text-white/80">{t("crm.activity.created", "Ajouté au CRM")}</div>
              <time className="text-xs text-white/50" dateTime={prospect.created_at}>{f.dayTime(prospect.created_at)}</time>
            </div>
          </li>
        </ol>
      )}
      {!isLoading && !isError && activities.length === 0 && (
        <p className="text-sm text-white/55">
          {t("crm.activity.empty", "Rien pour l'instant. Les changements d'étape et les emails envoyés s'inscriront ici tout seuls.")}
        </p>
      )}
    </div>
  );
}
