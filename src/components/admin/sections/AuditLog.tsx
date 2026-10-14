"use client";

import React, { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowRight, CaretLeft, CaretRight, LockSimple } from "@/components/icons/ph";
import { listAudit, type AuditEntry } from "@/services/adminService";
import { Card, Empty, ErrorBox, Loading, Pill, SearchBox, SectionHeader, TONE, btn, fmtDateTime, inputCls, type ToneName } from "../ui";
import { MemberLink, useProfiles } from "./_moderation";

const PAGE = 100;

// ── Traduction du journal en français courant ───────────────────────────────
const TARGETS: Record<string, { label: string; one: string; fem: boolean }> = {
  profiles: { label: "Membres", one: "Membre", fem: false },
  listings: { label: "Annonces", one: "Annonce", fem: true },
  projects: { label: "Projets", one: "Projet", fem: false },
  search_ads: { label: "Recherches de repreneurs", one: "Recherche de repreneur", fem: true },
  ratings: { label: "Avis", one: "Avis", fem: false },
  reports: { label: "Signalements", one: "Signalement", fem: false },
  contact_messages: { label: "Messages de contact", one: "Message de contact", fem: false },
  setting: { label: "Réglages du site", one: "Réglage du site", fem: false },
};

function actionLabel(e: AuditEntry): { text: string; tone: ToneName } {
  const [table, verb] = e.action.split(".");
  if (table === "setting") return { text: "Réglage du site modifié", tone: "violet" };
  const t = TARGETS[table];
  if (!t) return { text: e.action, tone: "grey" };
  if (verb === "delete") return { text: `${t.one} supprimé${t.fem ? "e" : ""}`, tone: "red" };
  if (verb === "update") return { text: `${t.one} modifié${t.fem ? "e" : ""}`, tone: "violet" };
  return { text: `${t.one} : ${verb}`, tone: "grey" };
}

const FIELDS: Record<string, string> = {
  plan_type: "Formule", kyc_status: "Vérification d'identité", buyer_level: "Niveau du repreneur",
  suspended_at: "Suspension", suspended_reason: "Motif de la suspension", is_admin: "Administrateur",
  status: "Statut", boosted_until: "Mise en avant", is_premium: "Annonce premium",
  is_published: "Publication", verification_status: "Vérification du projet", reply: "Réponse",
  active: "Bandeau affiché", text: "Message", level: "Couleur", link: "Lien", link_label: "Texte du bouton",
};

const VALUES: Record<string, Record<string, string>> = {
  plan_type: { free: "Gratuite", pro: "Pro", business: "Business" },
  kyc_status: { none: "Non demandée", pending: "En attente", verified: "Validée", rejected: "Refusée" },
  buyer_level: { profil_cree: "Profil créé", qualifie: "Qualifié", finance_verifie: "Financement vérifié" },
  status: {
    active: "En ligne", inactive: "Hors ligne", paused: "En pause", pending_renewal: "À renouveler",
    published: "Publié", under_review: "À modérer", rejected: "Refusé",
    pending: "À traiter", resolved: "Résolu", dismissed: "Classé sans suite",
    new: "Nouveau", read: "Lu", archived: "Archivé",
  },
  verification_status: { non_soumis: "Non soumis", en_attente: "En attente", verifie: "Vérifié", rejete: "Rejeté" },
  level: { info: "Information (violet)", success: "Bonne nouvelle (vert)", warning: "Attention (orange)" },
  is_published: { true: "Publié", false: "Non publié" },
};

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function formatValue(field: string, v: unknown): string {
  if (v === null || v === undefined || v === "") {
    if (field === "suspended_at") return "Non suspendu";
    if (field === "boosted_until") return "Aucune";
    return "vide";
  }
  const mapped = VALUES[field]?.[String(v)];
  if (mapped) return mapped;
  if (typeof v === "boolean") return v ? "Oui" : "Non";
  if (typeof v === "string" && ISO.test(v)) {
    if (field === "suspended_at") return `Suspendu le ${fmtDateTime(v)}`;
    if (field === "boosted_until") return `Jusqu'au ${fmtDateTime(v)}`;
    return fmtDateTime(v);
  }
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

interface Change { field: string; label: string; before: string; after: string }

/** { colonne: { avant, apres } } — ou, pour un réglage, { avant: {…}, apres: {…} }. */
function changesOf(e: AuditEntry): Change[] {
  const d = e.details || {};
  let pairs: [string, unknown, unknown][];
  if (e.action.startsWith("setting") && ("avant" in d || "apres" in d)) {
    const before = (d.avant || {}) as Record<string, unknown>;
    const after = (d.apres || {}) as Record<string, unknown>;
    pairs = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
      .filter((k) => JSON.stringify(before[k] ?? null) !== JSON.stringify(after[k] ?? null))
      .map((k) => [k, before[k], after[k]]);
  } else {
    pairs = Object.entries(d)
      .filter(([, v]) => v && typeof v === "object" && ("avant" in v || "apres" in v))
      .map(([k, v]) => [k, (v as any).avant, (v as any).apres]);
  }
  return pairs.map(([field, a, b]) => ({ field, label: FIELDS[field] || field, before: formatValue(field, a), after: formatValue(field, b) }));
}

function targetLabel(e: AuditEntry) {
  if (e.target_type === "setting") return e.target_id === "announcement" ? "Bandeau d'annonce" : e.target_label || e.target_id || "Réglage";
  return e.target_label?.trim() || "Sans nom";
}

export default function AuditLog() {
  const [page, setPage] = useState(0);
  const [kind, setKind] = useState("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["admin", "audit", page],
    queryFn: () => listAudit(PAGE, page * PAGE),
    placeholderData: keepPreviousData,
  });
  const admins = useProfiles((data?.rows || []).map((e) => e.admin_id));
  // le décompte peut manquer : on ne dit jamais « aucune action » quand des lignes sont là
  const total = Math.max(data?.total ?? 0, page * PAGE + (data?.rows.length ?? 0));
  const pages = Math.max(1, Math.ceil(total / PAGE));

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.rows || [])
      .filter((e) => kind === "all" || e.target_type === kind)
      .map((e) => ({ e, action: actionLabel(e), changes: changesOf(e), target: targetLabel(e), admin: e.admin_id ? admins.get(e.admin_id)?.full_name || null : null }))
      .filter((r) => !q || [r.action.text, r.target, r.admin, r.e.target_id, ...r.changes.flatMap((c) => [c.label, c.before, c.after])].some((v) => v?.toLowerCase().includes(q)));
  }, [data, kind, search, admins]);

  const filtering = kind !== "all" || !!search.trim();
  const from = total === 0 ? 0 : page * PAGE + 1;
  const to = Math.min(total, (page + 1) * PAGE);

  return (
    <div>
      <SectionHeader
        title="Journal des actions"
        description="Tout ce que les administrateurs ont fait sur le site : qui, quand, sur quoi, et ce qui a changé."
      />

      <div className="rounded-2xl border px-4 py-3 mb-5 flex items-start gap-3" style={{ background: TONE.green.background, borderColor: TONE.green.borderColor }}>
        <LockSimple size={22} weight="fill" className="shrink-0 mt-0.5" style={{ color: TONE.green.color }} aria-hidden />
        <p className="text-sm text-white leading-relaxed">
          Ce journal est écrit par la base de données elle-même. <strong className="font-semibold">Il ne peut être ni modifié ni effacé depuis l'application</strong>, par personne, administrateurs compris.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
        <div className="w-full sm:w-72">
          <label htmlFor="audit-kind" className="sr-only">Type d'élément</label>
          <select id="audit-kind" value={kind} onChange={(e) => setKind(e.target.value)} className={inputCls} style={{ background: "#232229" }}>
            <option value="all">Tous les types d'éléments</option>
            {Object.entries(TARGETS).map(([id, t]) => <option key={id} value={id}>{t.label}</option>)}
          </select>
        </div>
        <SearchBox value={search} onChange={setSearch} placeholder="Rechercher une action, un nom, une valeur" />
      </div>
      <p className="text-[13px] text-white/50 mb-5">
        {total === 0 ? "Aucune action enregistrée." : `Actions ${from} à ${to} sur ${total}, de la plus récente à la plus ancienne.`}
        {filtering && total > PAGE ? " Le filtre et la recherche portent sur cette page : changez de page pour chercher plus loin." : ""}
      </p>

      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : rows.length === 0 ? (
        <Empty
          title={filtering ? "Aucune action ne correspond sur cette page" : "Le journal est vide"}
          hint={filtering ? undefined : "Les actions d'administration s'inscriront ici au fur et à mesure."}
        />
      ) : (
        <Card className="overflow-hidden" >
          <ul className="divide-y divide-white/10" style={{ opacity: isFetching ? 0.6 : 1 }}>
            {rows.map(({ e, action, changes, target }) => (
              <li key={e.id} className="px-4 sm:px-5 py-4 flex flex-col lg:flex-row gap-3 lg:gap-6">
                <div className="lg:w-56 shrink-0">
                  <p className="text-sm text-white tabular-nums">{fmtDateTime(e.created_at)}</p>
                  <p className="text-[13px] text-white/60 mt-1 flex flex-wrap items-center gap-x-1.5">
                    par {e.admin_id
                      ? <MemberLink id={e.admin_id} name={admins.get(e.admin_id)?.full_name || "Administrateur"} className="text-white/85 max-w-full" />
                      : <span className="text-white/85">un compte supprimé</span>}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <Pill tone={action.tone}>{action.text}</Pill>
                    {e.target_type === "profiles" && e.target_id && !e.action.endsWith(".delete")
                      ? <MemberLink id={e.target_id} name={target} className="text-[15px] font-medium text-white max-w-full" />
                      : <span className="text-[15px] font-medium text-white break-words line-clamp-2">{target}</span>}
                  </div>
                  {changes.length > 0 && (
                    <dl className="mt-3 flex flex-col gap-2">
                      {changes.map((c) => (
                        <div key={c.field} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 text-sm">
                          <dt className="sm:w-52 shrink-0 text-white/60">{c.label}</dt>
                          <dd className="min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <span className="text-white/60 line-through decoration-white/30 break-words">{c.before}</span>
                            <ArrowRight size={14} className="text-white/45 self-center shrink-0" aria-label="devient" />
                            <span className="text-white font-medium break-words">{c.after}</span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {pages > 1 && (
        <nav aria-label="Pages du journal" className="flex items-center justify-between gap-3 mt-5">
          <button type="button" disabled={page === 0 || isFetching} onClick={() => { setPage((p) => p - 1); window.scrollTo({ top: 0 }); }} className={btn}>
            <CaretLeft size={16} /> <span className="hidden sm:inline">Plus récentes</span>
          </button>
          <p className="text-sm text-white/65 tabular-nums">Page {page + 1} sur {pages}</p>
          <button type="button" disabled={page >= pages - 1 || isFetching} onClick={() => { setPage((p) => p + 1); window.scrollTo({ top: 0 }); }} className={btn}>
            <span className="hidden sm:inline">Plus anciennes</span> <CaretRight size={16} />
          </button>
        </nav>
      )}
    </div>
  );
}
