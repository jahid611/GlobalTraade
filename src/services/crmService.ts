// CRM de prospection — fiche étendue, historique (prospect_activities) et
// tâches (prospect_tasks). Schéma : supabase/_claude_crm.sql.
// supabase-js ne lève pas d'exception : chaque fonction lit `error` et la relance.
import { supabase } from "@/integrations/supabase/client";
import type { Prospect, ProspectPriority, ProspectStatus } from "./prospectService";
import type { CrmTask } from "@/lib/crm";

export type { CrmTask } from "@/lib/crm";

export type ActivityType = "note" | "call" | "email" | "meeting" | "status" | "task" | "system";

export interface ProspectActivity {
  id: string;
  prospect_id: string;
  type: ActivityType;
  content: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Les champs de la fiche que le membre peut modifier. */
export type ProspectPatch = Partial<{
  status: ProspectStatus;
  email: string | null;
  notes: string | null;
  mail_lang: "fr" | "en";
  dirigeant_nom: string | null;
  phone: string | null;
  contact_role: string | null;
  website: string | null;
  tags: string[];
  priority: ProspectPriority;
  estimated_value: number | null;
  next_action_at: string | null;
  next_action_label: string | null;
  last_contacted_at: string | null;
  archived: boolean;
}>;

export const ACTIVITY_MAX_LENGTH = 5000;
export const TASK_TITLE_MAX_LENGTH = 200;

/**
 * Met à jour un ou plusieurs prospects. Une mise à jour refusée par les règles
 * d'accès ne renvoie pas d'erreur mais ne touche aucune ligne : on le détecte.
 */
export async function patchProspects(ids: string[], fields: ProspectPatch): Promise<void> {
  if (ids.length === 0) return;
  const { data, error } = await supabase
    .from("prospects")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .in("id", ids)
    .select("id");
  if (error) throw error;
  if ((data || []).length !== ids.length) throw new Error("Mise à jour refusée.");
}

export const patchProspect = (id: string, fields: ProspectPatch) => patchProspects([id], fields);

export async function getProspect(id: string): Promise<Prospect | null> {
  const { data, error } = await supabase.from("prospects").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Prospect) || null;
}

export async function deleteProspects(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { data, error } = await supabase.from("prospects").delete().in("id", ids).select("id");
  if (error) throw error;
  if ((data || []).length !== ids.length) throw new Error("Suppression refusée.");
}

// ------------------------------------------------------------------
// Historique
// ------------------------------------------------------------------

export async function listActivities(prospectId: string): Promise<ProspectActivity[]> {
  const { data, error } = await supabase
    .from("prospect_activities")
    .select("id, prospect_id, type, content, metadata, created_at")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return (data || []) as ProspectActivity[];
}

export type NewActivity = {
  prospect_id: string;
  type: ActivityType;
  content?: string | null;
  metadata?: Record<string, unknown>;
};

export async function addActivities(rows: NewActivity[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase.from("prospect_activities").insert(
    rows.map((r) => ({
      prospect_id: r.prospect_id,
      type: r.type,
      content: r.content ? r.content.slice(0, ACTIVITY_MAX_LENGTH) : null,
      metadata: r.metadata || {},
    })),
  );
  if (error) throw error;
}

export const addActivity = (row: NewActivity) => addActivities([row]);

/**
 * Change l'étape d'un ou plusieurs prospects et l'inscrit dans leur historique.
 * L'historique est secondaire : s'il échoue alors que l'étape est enregistrée,
 * on ne fait pas échouer l'opération (`logged` passe à false).
 */
export async function changeStatus(
  prospects: Pick<Prospect, "id" | "status">[],
  to: ProspectStatus,
): Promise<{ logged: boolean }> {
  const moved = prospects.filter((p) => p.status !== to);
  if (moved.length === 0) return { logged: true };
  await patchProspects(moved.map((p) => p.id), { status: to });
  try {
    await addActivities(moved.map((p) => ({ prospect_id: p.id, type: "status" as const, metadata: { from: p.status, to } })));
    return { logged: true };
  } catch {
    return { logged: false };
  }
}

// ------------------------------------------------------------------
// Tâches
// ------------------------------------------------------------------

/** Toutes les tâches du membre (les règles d'accès le limitent aux siennes). */
export async function listTasks(): Promise<CrmTask[]> {
  const { data, error } = await supabase
    .from("prospect_tasks")
    .select("id, prospect_id, title, due_at, done_at, created_at")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw error;
  return (data || []) as CrmTask[];
}

export async function addTask(prospectId: string, title: string, dueAt: string | null): Promise<void> {
  const { error } = await supabase.from("prospect_tasks").insert({
    prospect_id: prospectId,
    title: title.trim().slice(0, TASK_TITLE_MAX_LENGTH),
    due_at: dueAt,
  });
  if (error) throw error;
}

/** Coche ou décoche une tâche ; cocher l'inscrit dans l'historique. */
export async function setTaskDone(task: CrmTask, done: boolean): Promise<void> {
  const { data, error } = await supabase
    .from("prospect_tasks")
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq("id", task.id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Mise à jour refusée.");
  if (done) {
    try {
      await addActivity({ prospect_id: task.prospect_id, type: "task", content: task.title, metadata: { task_id: task.id } });
    } catch { /* l'historique est secondaire : la tâche est bien cochée */ }
  }
}

export async function deleteTask(id: string): Promise<void> {
  const { data, error } = await supabase.from("prospect_tasks").delete().eq("id", id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Suppression refusée.");
}
