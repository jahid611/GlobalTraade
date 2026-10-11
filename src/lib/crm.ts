// CRM de prospection — fonctions PURES (aucun accès réseau) : indicateurs,
// « à relancer », filtres, tri, validation des champs de la fiche.
// Testées dans crm.test.ts.
import type { Prospect, ProspectPriority, ProspectStatus } from "@/services/prospectService";

/** Même ordre que STATUS_ORDER (prospectService) — vérifié par un test. */
export const PIPELINE_ORDER: ProspectStatus[] = [
  "a_qualifier", "email_trouve", "contacte", "relance_1", "relance_2", "reponse", "interesse", "refus",
];

/** Étapes où un premier message est déjà parti. */
export const CONTACTED_STATUSES: ProspectStatus[] = ["contacte", "relance_1", "relance_2", "reponse", "interesse", "refus"];
/** Étapes où le dirigeant a répondu (oui, non ou « à voir »). */
export const ANSWERED_STATUSES: ProspectStatus[] = ["reponse", "interesse", "refus"];

export const PRIORITY_ORDER: ProspectPriority[] = ["high", "normal", "low"];

export interface CrmTask {
  id: string;
  prospect_id: string;
  title: string;
  due_at: string | null;
  done_at: string | null;
  created_at: string;
}

export type DueState = "overdue" | "today" | "upcoming";

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Situe une échéance par rapport à aujourd'hui (jours calendaires locaux). */
export function dueState(iso: string | null | undefined, now: Date = new Date()): DueState | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const today = startOfDay(now).getTime();
  const day = startOfDay(d).getTime();
  if (day < today) return "overdue";
  if (day === today) return "today";
  return "upcoming";
}

export const priorityOf = (p: Prospect): ProspectPriority =>
  p.priority === "high" || p.priority === "low" ? p.priority : "normal";

export const isArchived = (p: Prospect) => p.archived === true;

/** Un dossier « actif » : ni archivé, ni refusé. */
export const isActiveProspect = (p: Prospect) => !isArchived(p) && p.status !== "refus";

// ------------------------------------------------------------------
// À faire : tâches ouvertes + prochaines actions, échues ou du jour
// ------------------------------------------------------------------

export interface AgendaItem {
  key: string;
  kind: "task" | "action";
  prospectId: string;
  prospectName: string;
  label: string;
  dueAt: string;
  state: "overdue" | "today";
  taskId?: string;
}

/**
 * Ce qu'il faut traiter aujourd'hui : les tâches non cochées et les prochaines
 * actions dont l'échéance est passée ou tombe aujourd'hui. Les prospects
 * archivés n'y figurent pas. Les plus anciennes d'abord.
 */
export function buildAgenda(prospects: Prospect[], tasks: CrmTask[], now: Date = new Date()): AgendaItem[] {
  const byId = new Map(prospects.map((p) => [p.id, p]));
  const items: AgendaItem[] = [];

  for (const p of prospects) {
    if (isArchived(p)) continue;
    const st = dueState(p.next_action_at, now);
    if (st === "overdue" || st === "today") {
      items.push({
        key: `action-${p.id}`, kind: "action", prospectId: p.id, prospectName: p.nom,
        label: (p.next_action_label || "").trim(), dueAt: p.next_action_at!, state: st,
      });
    }
  }
  for (const task of tasks) {
    if (task.done_at) continue;
    const p = byId.get(task.prospect_id);
    if (!p || isArchived(p)) continue;
    const st = dueState(task.due_at, now);
    if (st === "overdue" || st === "today") {
      items.push({
        key: `task-${task.id}`, kind: "task", prospectId: p.id, prospectName: p.nom,
        label: task.title, dueAt: task.due_at!, state: st, taskId: task.id,
      });
    }
  }
  return items.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
}

/** Les prospects qui ont au moins une chose à traiter aujourd'hui ou en retard. */
export function dueProspectIds(agenda: AgendaItem[]): Set<string> {
  return new Set(agenda.map((a) => a.prospectId));
}

// ------------------------------------------------------------------
// Indicateurs du tableau de bord
// ------------------------------------------------------------------

export interface CrmMetrics {
  /** prospects non archivés */
  total: number;
  /** non archivés et non refusés */
  active: number;
  /** prospects à relancer aujourd'hui (rien en retard chez eux) */
  dueToday: number;
  /** prospects dont au moins une échéance est dépassée */
  overdue: number;
  contacted: number;
  answered: number;
  /** réponses / contactés, entre 0 et 1 ; null tant que personne n'a été contacté */
  responseRate: number | null;
  /** somme des valeurs estimées des dossiers actifs */
  pipelineValue: number;
  byStatus: Record<ProspectStatus, { count: number; value: number }>;
}

const amountOf = (p: Prospect) => {
  const v = Number(p.estimated_value);
  return Number.isFinite(v) && v > 0 ? v : 0;
};

export function computeMetrics(prospects: Prospect[], agenda: AgendaItem[]): CrmMetrics {
  const byStatus = Object.fromEntries(PIPELINE_ORDER.map((s) => [s, { count: 0, value: 0 }])) as CrmMetrics["byStatus"];
  let total = 0, active = 0, contacted = 0, answered = 0, pipelineValue = 0;

  for (const p of prospects) {
    if (isArchived(p)) continue;
    total++;
    const slot = byStatus[p.status];
    if (slot) { slot.count++; slot.value += amountOf(p); }
    if (isActiveProspect(p)) { active++; pipelineValue += amountOf(p); }
    if (CONTACTED_STATUSES.includes(p.status)) contacted++;
    if (ANSWERED_STATUSES.includes(p.status)) answered++;
  }

  // Un prospect compte une fois, même avec plusieurs échéances ; « en retard » l'emporte.
  const late = new Set(agenda.filter((a) => a.state === "overdue").map((a) => a.prospectId));
  const today = new Set(agenda.filter((a) => a.state === "today" && !late.has(a.prospectId)).map((a) => a.prospectId));

  return {
    total, active, contacted, answered, pipelineValue, byStatus,
    dueToday: today.size,
    overdue: late.size,
    responseRate: contacted > 0 ? answered / contacted : null,
  };
}

// ------------------------------------------------------------------
// Recherche et filtres
// ------------------------------------------------------------------

export interface CrmFilterState {
  query: string;
  status: ProspectStatus | null;
  priority: ProspectPriority | null;
  tag: string | null;
  dueOnly: boolean;
  noEmail: boolean;
  showArchived: boolean;
}

export const EMPTY_FILTERS: CrmFilterState = {
  query: "", status: null, priority: null, tag: null, dueOnly: false, noEmail: false, showArchived: false,
};

/** Minuscules sans accents, pour chercher « rhone » et trouver « Rhône ». */
export function fold(s: string | null | undefined): string {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export const tagsOf = (p: Prospect): string[] => (Array.isArray(p.tags) ? p.tags : []);

export function filterProspects(prospects: Prospect[], f: CrmFilterState, dueIds: Set<string> = new Set()): Prospect[] {
  const words = fold(f.query).split(/\s+/).filter(Boolean);
  const tag = f.tag ? fold(f.tag) : null;

  return prospects.filter((p) => {
    if (!f.showArchived && isArchived(p)) return false;
    if (f.status && p.status !== f.status) return false;
    if (f.priority && priorityOf(p) !== f.priority) return false;
    if (tag && !tagsOf(p).some((x) => fold(x) === tag)) return false;
    if (f.dueOnly && !dueIds.has(p.id)) return false;
    if (f.noEmail && (p.email || "").trim()) return false;
    if (words.length) {
      const hay = fold([p.nom, p.dirigeant_nom, p.ville, p.code_postal, p.email, p.siren, ...tagsOf(p)].filter(Boolean).join(" "));
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
}

export function countActiveFilters(f: CrmFilterState): number {
  return [f.query.trim(), f.status, f.priority, f.tag, f.dueOnly, f.noEmail, f.showArchived].filter(Boolean).length;
}

/** Toutes les étiquettes utilisées, sans doublon (casse et accents ignorés), triées. */
export function collectTags(prospects: Prospect[]): string[] {
  const seen = new Map<string, string>();
  for (const p of prospects) for (const tg of tagsOf(p)) {
    const k = fold(tg);
    if (k && !seen.has(k)) seen.set(k, tg.trim());
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
}

// ------------------------------------------------------------------
// Tri de la liste
// ------------------------------------------------------------------

export type SortKey = "nom" | "status" | "score" | "priority" | "next_action" | "last_contact" | "value";
export type SortDir = "asc" | "desc";

const time = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const n = new Date(iso).getTime();
  return Number.isNaN(n) ? null : n;
};

/**
 * Tri stable. Les valeurs absentes (pas de date, pas de montant) restent
 * toujours en fin de liste, quel que soit le sens.
 */
export function sortProspects(prospects: Prospect[], key: SortKey, dir: SortDir): Prospect[] {
  const sign = dir === "asc" ? 1 : -1;
  const value = (p: Prospect): number | string | null => {
    switch (key) {
      case "nom": return fold(p.nom);
      case "status": return PIPELINE_ORDER.indexOf(p.status);
      case "score": return p.score ?? 0;
      // asc = de la moins à la plus prioritaire
      case "priority": return PRIORITY_ORDER.length - 1 - PRIORITY_ORDER.indexOf(priorityOf(p));
      case "next_action": return time(p.next_action_at);
      case "last_contact": return time(p.last_contacted_at);
      case "value": return p.estimated_value == null ? null : Number(p.estimated_value);
    }
  };
  return prospects
    .map((p, i) => ({ p, i, v: value(p) }))
    .sort((a, b) => {
      if (a.v === null && b.v === null) return a.i - b.i;
      if (a.v === null) return 1;
      if (b.v === null) return -1;
      const c = typeof a.v === "string" ? a.v.localeCompare(b.v as string) : (a.v as number) - (b.v as number);
      return c !== 0 ? c * sign : a.i - b.i;
    })
    .map((x) => x.p);
}

// ------------------------------------------------------------------
// Validation des champs de la fiche
// ------------------------------------------------------------------

export function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
}

/** Téléphone : chiffres, espaces, points, tirets, parenthèses, « + » en tête ; 6 à 15 chiffres. */
export function isValidPhone(s: string): boolean {
  const v = s.trim();
  if (!/^\+?[\d\s().-]+$/.test(v)) return false;
  const digits = v.replace(/\D/g, "").length;
  return digits >= 6 && digits <= 15;
}

/** Pour le lien `tel:` : ne garde que les chiffres et le « + » initial. */
export function phoneHref(s: string): string {
  const v = s.trim();
  return `tel:${v.startsWith("+") ? "+" : ""}${v.replace(/\D/g, "")}`;
}

/**
 * Site web : accepte « exemple.fr », ajoute https:// au besoin.
 * Renvoie l'adresse normalisée, ou null si ce n'est pas une adresse http(s) valide.
 */
export function normalizeWebsite(s: string): string | null {
  const v = s.trim();
  if (!v || /\s/.test(v)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(u.hostname)) return null;
    return u.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** Montant saisi (« 250 000 », « 1,5 », « 300k ») → nombre ; null si vide ; NaN si illisible. */
export function parseAmount(s: string): number | null {
  const v = s.replace(/[\s  €]/g, "").replace(",", ".").toLowerCase();
  if (!v) return null;
  const m = /^(\d+(?:\.\d+)?)(k|m)?$/.exec(v);
  if (!m) return NaN;
  const n = parseFloat(m[1]) * (m[2] === "k" ? 1_000 : m[2] === "m" ? 1_000_000 : 1);
  return Math.round(n * 100) / 100;
}

export const TAG_MAX_LENGTH = 30;
export const TAGS_MAX = 12;

/** Ajoute une étiquette sans doublon (casse et accents ignorés) ; renvoie la liste inchangée si refusée. */
export function addTag(tags: string[], raw: string): string[] {
  const tg = raw.replace(/[,;]/g, " ").replace(/\s+/g, " ").trim().slice(0, TAG_MAX_LENGTH);
  if (!tg || tags.length >= TAGS_MAX) return tags;
  if (tags.some((x) => fold(x) === fold(tg))) return tags;
  return [...tags, tg];
}

// ------------------------------------------------------------------
// Score de cession : pourquoi ce chiffre
// ------------------------------------------------------------------

// Mêmes règles que computeScore (sireneService), relues depuis la fiche.
const SERIOUS_NATURE = new Set(["5710", "5720", "5499", "5498", "5505", "5510", "5515", "5385"]);

export type ScoreReason =
  | { kind: "mature" | "seniority"; years: number }
  | { kind: "retirement" | "transmission" | "age"; age: number }
  | { kind: "legal_form" };

export function scoreReasons(p: Prospect): ScoreReason[] {
  const out: ScoreReason[] = [];
  const a = p.anciennete, age = p.dirigeant_age;
  if (a != null) {
    if (a >= 15) out.push({ kind: "mature", years: a });
    else if (a >= 10) out.push({ kind: "seniority", years: a });
  }
  if (age != null) {
    if (age >= 60) out.push({ kind: "retirement", age });
    else if (age >= 55) out.push({ kind: "transmission", age });
    else if (age >= 50) out.push({ kind: "age", age });
  }
  const nature = p.raw && typeof p.raw === "object" ? String(p.raw.nature_juridique || "") : "";
  if (SERIOUS_NATURE.has(nature)) out.push({ kind: "legal_form" });
  return out;
}

/** Étape après l'envoi d'un premier message : un prospect pas encore contacté passe à « Contacté ». */
export function statusAfterContact(status: ProspectStatus): ProspectStatus {
  return status === "a_qualifier" || status === "email_trouve" ? "contacte" : status;
}
