"use client";

import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Plus, Trash2, Square, CheckSquare, RefreshCw } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { addTask, deleteTask, setTaskDone, TASK_TITLE_MAX_LENGTH, type CrmTask } from "@/services/crmService";
import { DueBadge, GREEN, fieldCls, ghostBtnCls, iconBtnCls, labelCls, primaryBtnCls, dayToIso, useCrmFormat } from "./crmMeta";

interface TaskListProps {
  prospectId: string;
  /** les tâches de ce prospect */
  tasks: CrmTask[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  /** recharge les tâches (et l'historique quand une tâche est cochée) */
  onChanged: () => void;
}

export function TaskList({ prospectId, tasks, loading, error, onRetry, onChanged }: TaskListProps) {
  const { t } = useTranslation();
  const f = useCrmFormat();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // À faire d'abord (échéance la plus proche en tête, sans échéance à la fin), puis les tâches faites.
  const { open, done } = useMemo(() => {
    const ts = (iso: string | null) => (iso ? new Date(iso).getTime() : Number.POSITIVE_INFINITY);
    return {
      open: tasks.filter((x) => !x.done_at).sort((a, b) => ts(a.due_at) - ts(b.due_at)),
      done: tasks.filter((x) => x.done_at).sort((a, b) => ts(b.done_at) - ts(a.done_at)),
    };
  }, [tasks]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await addTask(prospectId, title, dayToIso(due));
      setTitle("");
      setDue("");
      onChanged();
      showSuccess(t("crm.task.added", "Tâche ajoutée"));
    } catch {
      showError(t("crm.task.add_err", "Impossible d'ajouter la tâche. Réessaie."));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (task: CrmTask) => {
    if (busy) return;
    setBusy(task.id);
    try {
      await setTaskDone(task, !task.done_at);
      onChanged();
    } catch {
      showError(t("crm.task.update_err", "Impossible de mettre la tâche à jour. Réessaie."));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (task: CrmTask) => {
    if (busy) return;
    setBusy(task.id);
    try {
      await deleteTask(task.id);
      onChanged();
      showSuccess(t("crm.task.deleted", "Tâche supprimée"));
    } catch {
      showError(t("crm.task.delete_err", "Impossible de supprimer la tâche. Réessaie."));
    } finally {
      setBusy(null);
    }
  };

  const row = (task: CrmTask) => {
    const isDone = !!task.done_at;
    return (
      <li key={task.id} className="flex items-start gap-1 rounded-xl bg-white/[0.04] border border-white/10 pr-1">
        <button
          type="button"
          role="checkbox"
          aria-checked={isDone}
          aria-label={isDone
            ? (t("crm.task.reopen", { title: task.title, defaultValue: "Rouvrir la tâche : {{title}}" }) as string)
            : (t("crm.task.complete", { title: task.title, defaultValue: "Marquer comme faite : {{title}}" }) as string)}
          onClick={() => toggle(task)}
          disabled={busy === task.id}
          className={iconBtnCls}
        >
          {busy === task.id ? <Loader2 size={18} className="animate-spin" /> : isDone ? <CheckSquare size={18} style={{ color: GREEN }} /> : <Square size={18} />}
        </button>
        <div className="flex-1 min-w-0 py-2.5">
          <div className={`text-sm break-words ${isDone ? "text-white/50 line-through" : "text-white"}`}>{task.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/50">
            {isDone
              ? <span>{t("crm.task.done_on", { date: f.day(task.done_at!), defaultValue: "Faite le {{date}}" })}</span>
              : task.due_at
                ? <DueBadge iso={task.due_at} />
                : <span>{t("crm.task.no_due", "Sans échéance")}</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => remove(task)}
          disabled={busy === task.id}
          aria-label={t("crm.task.delete", { title: task.title, defaultValue: "Supprimer la tâche : {{title}}" }) as string}
          title={t("crm.task.delete_short", "Supprimer") as string}
          className={iconBtnCls}
        >
          <Trash2 size={16} />
        </button>
      </li>
    );
  };

  return (
    <div className="space-y-5">
      <form onSubmit={create} className="rounded-2xl bg-white/[0.04] border border-white/10 p-3 space-y-2.5">
        <div>
          <label htmlFor="crm-task-title" className={labelCls}>{t("crm.task.title_label", "Nouvelle tâche")}</label>
          <input
            id="crm-task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={TASK_TITLE_MAX_LENGTH}
            placeholder={t("crm.task.title_ph", "Relancer par téléphone, envoyer le NDA…") as string}
            className={fieldCls}
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end gap-2.5">
          <div className="flex-1 min-w-0">
            <label htmlFor="crm-task-due" className={labelCls}>{t("crm.task.due_label", "Échéance (facultative)")}</label>
            <input id="crm-task-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className={`${fieldCls} [color-scheme:dark]`} />
          </div>
          <button type="submit" disabled={!title.trim() || saving} className={primaryBtnCls}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            {t("crm.task.add", "Ajouter la tâche")}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="space-y-2" role="status" aria-label={t("crm.state.loading", "Chargement…") as string}>
          {[0, 1].map((i) => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/75">
          <p>{t("crm.task.load_err", "Les tâches n'ont pas pu être chargées.")}</p>
          <button type="button" onClick={onRetry} className={`${ghostBtnCls} mt-3`}><RefreshCw size={15} /> {t("crm.state.retry", "Réessayer")}</button>
        </div>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-white/55">{t("crm.task.empty", "Aucune tâche. Note ici ce qu'il te reste à faire pour ce dossier, avec une échéance.")}</p>
      ) : (
        <>
          {open.length > 0 && <ul className="space-y-2">{open.map(row)}</ul>}
          {done.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-2">
                {t("crm.task.done_title", { n: done.length, defaultValue: "Faites ({{n}})" })}
              </h4>
              <ul className="space-y-2">{done.map(row)}</ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
