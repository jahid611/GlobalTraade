"use client";

import React, { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowSquareOut, CaretDown, CaretUp, CheckCircle, Eye, EyeSlash, Warning, XCircle } from "@/components/icons/ph";
import { decideProject, setProject } from "@/services/adminService";
import { CONTENT_PAGE, countProjects, listProjects, type AdminProject, type ProjectFilter } from "@/services/adminContentService";
import { SectionHeader, SearchBox, Loading, Empty, ErrorBox, Pill, ConfirmDialog, TONE, btnSmall, fmtDate, type ToneName } from "../ui";
import {
  BoostControl, BoostPill, DeleteControl, Field, FilterChips, OwnerLink, Pager,
  eur, nb, useAdminAction, useDebounced, useFrenchLabels, useOwners,
} from "../content/shared";

// Projets : tous les projets, et la vérification de leur fiche de financement.
// La base cherche, filtre et découpe en pages (src/services/adminContentService.ts).

type Row = AdminProject;
type Filter = ProjectFilter;
type Verification = "verifie" | "rejete" | "en_attente";

const VERIF: Record<string, { label: string; tone: ToneName }> = {
  non_soumis: { label: "Vérification non demandée", tone: "grey" },
  en_attente: { label: "À vérifier", tone: "amber" },
  verifie: { label: "Vérifié", tone: "green" },
  rejete: { label: "Vérification refusée", tone: "red" },
};
const FINANCING: Record<string, string> = { pret_bancaire: "Prêt bancaire", investisseur: "Investisseur", associe: "Associé", aides: "Aides" };
const verif = (p: Row) => p.verification_status || "non_soumis";

/** La fiche de financement, telle que le porteur l'a remplie. */
function FinancingSheet({ p }: { p: Row }) {
  const budget = p.budget_min != null || p.budget_max != null
    ? [p.budget_min != null ? eur(p.budget_min) : null, p.budget_max != null ? eur(p.budget_max) : null].filter(Boolean).join(" à ")
    : null;
  const types = (p.financing_types || []).map((f) => FINANCING[f] || f);
  const empty = !budget && !p.apport_personnel && !p.revenue_current && !p.revenue_forecast && !p.funds_usage && types.length === 0;
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-sm font-medium text-white mb-3">Fiche de financement</p>
      {empty ? <p className="text-sm text-white/60">Le porteur n'a rien renseigné sur le financement.</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-5 gap-y-3">
          <Field label="Montant recherché">{budget || "—"}</Field>
          <Field label="Apport personnel">{p.apport_personnel || "—"}</Field>
          <Field label="Chiffre d'affaires actuel">{p.revenue_current || "—"}</Field>
          <Field label="Chiffre d'affaires prévu">{p.revenue_forecast || "—"}</Field>
          <Field label="Financements envisagés" className="sm:col-span-2">{types.length ? types.join(", ") : "—"}</Field>
          <Field label="Type d'investissement">{p.investment_type || "—"}{p.equity_offered ? ` · ${p.equity_offered} % du capital proposés` : ""}</Field>
          <Field label="Utilisation des fonds" className="sm:col-span-2 xl:col-span-4"><span className="whitespace-pre-wrap">{p.funds_usage || "—"}</span></Field>
        </div>
      )}
      <p className="text-[13px] text-white/50 mt-3">Les projets n'ont pas de pièces jointes privées : la vérification se fait sur ces informations, et sur la fiche complète du projet (« Voir sur le site »).</p>
    </div>
  );
}

type Ask = { kind: "verification"; value: Verification } | { kind: "publish"; value: boolean };

function ProjectActions({ p }: { p: Row }) {
  const run = useAdminAction();
  const [ask, setAsk] = useState<Ask | null>(null);
  const v = verif(p);
  const copy = ask?.kind === "verification" ? {
    verifie: { title: `Valider le projet « ${p.title} » ?`, text: "Le projet affichera la pastille « vérifié » et son porteur sera prévenu. Ne validez qu'après avoir relu sa fiche de financement.", label: "Valider le projet", done: "Projet vérifié" },
    rejete: { title: `Refuser la vérification de « ${p.title} » ?`, text: "Le projet n'aura pas la pastille « vérifié ». Son porteur verra le motif ci-dessous dans son espace et le recevra par email. Le projet reste en ligne s'il est publié : dépubliez-le aussi si son contenu pose problème.", label: "Refuser la vérification", done: "Vérification refusée" },
    en_attente: { title: `Remettre « ${p.title} » en attente de vérification ?`, text: "Le projet reviendra dans la liste des projets à vérifier.", label: "Remettre en attente", done: "Projet remis en attente" },
  }[ask.value] : ask?.kind === "publish" ? (ask.value
    ? { title: `Publier le projet « ${p.title} » ?`, text: "Le projet devient visible de tous sur le site.", label: "Publier", done: "Projet publié" }
    : { title: `Dépublier le projet « ${p.title} » ?`, text: "Le projet disparaît du site pour le public. Rien n'est supprimé : son porteur le voit toujours et vous pourrez le republier.", label: "Dépublier", done: "Projet dépublié" }) : null;

  return (
    <>
      {v !== "verifie" && <button type="button" className={btnSmall + " !min-h-[44px]"} style={{ color: TONE.green.color, borderColor: TONE.green.borderColor }} onClick={() => setAsk({ kind: "verification", value: "verifie" })}><CheckCircle size={16} /> Valider</button>}
      {v !== "rejete" && <button type="button" className={btnSmall + " !min-h-[44px]"} onClick={() => setAsk({ kind: "verification", value: "rejete" })}><XCircle size={16} /> Refuser</button>}
      {(v === "verifie" || v === "rejete") && <button type="button" className={btnSmall + " !min-h-[44px]"} onClick={() => setAsk({ kind: "verification", value: "en_attente" })}>Remettre en attente</button>}
      {p.is_published
        ? <button type="button" className={btnSmall + " !min-h-[44px]"} onClick={() => setAsk({ kind: "publish", value: false })}><EyeSlash size={16} /> Dépublier</button>
        : <button type="button" className={btnSmall + " !min-h-[44px]"} onClick={() => setAsk({ kind: "publish", value: true })}><Eye size={16} /> Publier</button>}
      <ConfirmDialog
        open={!!ask}
        danger={ask?.kind === "verification" && ask.value === "rejete"}
        title={copy?.title || ""}
        description={copy?.text}
        confirmLabel={copy?.label || ""}
        reason={ask?.kind === "verification" && ask.value === "rejete"
          ? { label: "Motif du refus (envoyé au porteur du projet)", placeholder: "Ex. : le chiffre d'affaires prévu n'est appuyé par aucun élément. Précisez vos hypothèses, puis redemandez la vérification.", minLength: 10 }
          : undefined}
        onConfirm={(reason) => (ask && copy
          ? run(() => (ask.kind === "verification"
            ? decideProject(p.id, ask.value, ask.value === "rejete" ? reason : undefined)
            : setProject(p.id, { published: ask.value })), copy.done)
          : undefined)}
        onClose={() => setAsk(null)}
      />
    </>
  );
}

function ProjectRow({ p, owner, sector }: { p: Row; owner?: string | null; sector: string }) {
  const pending = verif(p) === "en_attente";
  const [open, setOpen] = useState(pending);
  const vs = VERIF[verif(p)] || { label: verif(p), tone: "grey" as ToneName };
  return (
    <li className="rounded-2xl border bg-[#232229]/95 p-4 sm:p-5" style={{ borderColor: pending ? TONE.amber.borderColor : "rgba(255,255,255,0.1)" }}>
      <div className="flex flex-col xl:flex-row xl:items-start gap-4">
        <div className="min-w-0 xl:w-[40%] shrink-0">
          <p className="text-[15px] font-medium text-white break-words">{p.title}</p>
          {p.tagline && <p className="text-[13px] text-white/65 break-words">{p.tagline}</p>}
          <div className="flex items-center gap-1.5 mt-1 text-[13px] text-white/60 min-w-0"><span className="shrink-0">Porteur :</span> <OwnerLink id={p.owner_id} name={owner || p.owner_full_name} /></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-3 flex-1 min-w-0">
          <Field label="Secteur">{sector}</Field>
          <Field label="Lieu">{[p.city, p.country].filter(Boolean).join(", ") || "—"}</Field>
          <Field label="Créé le">{fmtDate(p.created_at)}</Field>
          <Field label="Vues · intérêts"><span className="tabular-nums">{nb(p.view_count)} · {nb(p.interest_count)}</span></Field>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-4">
        <Pill tone={p.is_published ? "green" : "grey"}>{p.is_published ? "Publié" : "Non publié"}</Pill>
        <Pill tone={vs.tone}>{vs.label}</Pill>
        {p.is_urgent && <Pill tone="amber">Urgent</Pill>}
        <BoostPill until={p.boosted_until} />
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className={btnSmall + " !min-h-[44px] sm:ml-auto"}>
          Fiche de financement {open ? <CaretUp size={14} /> : <CaretDown size={14} />}
        </button>
      </div>

      {open && <div className="mt-3"><FinancingSheet p={p} /></div>}

      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
        <Link to={`/projects?focus=${p.id}`} target="_blank" rel="noreferrer" className={btnSmall + " !min-h-[44px]"} aria-label={`Voir le projet ${p.title} sur le site`}>Voir sur le site <ArrowSquareOut size={14} /></Link>
        <ProjectActions p={p} />
        <BoostControl type="project" id={p.id} label={p.title} until={p.boosted_until} />
        <DeleteControl type="project" id={p.id} label={p.title} />
      </div>
    </li>
  );
}

export default function Projects() {
  const fr = useFrenchLabels();
  const [search, setSearch] = useState("");
  const query = useDebounced(search.trim());
  const [page, setPage] = useState(0);
  // Une autre recherche repart de la première page.
  useEffect(() => { setPage(0); }, [query]);
  const { data: counts, isLoading: countsLoading } = useQuery({ queryKey: ["admin", "projects", "counts"], queryFn: countProjects });
  // Tant qu'aucun onglet n'est choisi, la rubrique s'ouvre sur « À vérifier » s'il y en a.
  const [chosen, setChosen] = useState<Filter | null>(null);
  const [initial, setInitial] = useState<Filter | null>(null);
  useEffect(() => { if (!initial && !countsLoading) setInitial(counts && counts.en_attente > 0 ? "en_attente" : "all"); }, [initial, counts, countsLoading]);
  const filter = chosen ?? initial;

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["admin", "projects", "page", query, filter, page],
    queryFn: () => listProjects({ search: query, filter: filter || "all", page }),
    enabled: !!filter,
    placeholderData: keepPreviousData,
  });
  const rows = useMemo(() => data?.rows || [], [data]);
  const total = data?.total || 0;
  const owners = useOwners(useMemo(() => rows.map((p) => p.owner_id), [rows]));
  // Après une suppression, la page courante peut ne plus exister : on recule.
  useEffect(() => { if (data && rows.length === 0 && total > 0 && page > 0) setPage(Math.ceil(total / CONTENT_PAGE) - 1); }, [data, rows.length, total, page]);
  const pick = (v: Filter) => { setChosen(v); setPage(0); };
  const pending = counts?.en_attente || 0;

  return (
    <div>
      <SectionHeader title="Projets" description="Tous les projets déposés sur le site. C'est aussi ici que vous vérifiez la fiche de financement d'un projet avant de lui accorder la pastille « vérifié ».">
        <SearchBox value={search} onChange={setSearch} placeholder="Titre, secteur, ville ou porteur" />
      </SectionHeader>

      {pending > 0 && filter && filter !== "en_attente" && (
        <div className="mb-4 rounded-2xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3" style={TONE.amber}>
          <Warning size={22} weight="fill" className="shrink-0" />
          <p className="text-sm flex-1" style={{ color: "#ffffff" }}>
            {pending > 1 ? `${pending} projets attendent leur vérification.` : "Un projet attend sa vérification."}
          </p>
          <button type="button" onClick={() => pick("en_attente")} className={btnSmall + " !min-h-[44px] shrink-0"}>Voir les projets à vérifier</button>
        </div>
      )}

      <div className="mb-4">
        <FilterChips label="Filtrer les projets" value={filter || "all"} onChange={pick} options={[
          { value: "all", label: "Tous", count: counts?.all },
          { value: "en_attente", label: "À vérifier", count: counts?.en_attente },
          { value: "verifie", label: "Vérifiés", count: counts?.verifie },
          { value: "rejete", label: "Vérification refusée", count: counts?.rejete },
          { value: "published", label: "Publiés", count: counts?.published },
          { value: "unpublished", label: "Non publiés", count: counts?.unpublished },
        ]} />
      </div>

      {isLoading || !filter ? <Loading /> : error ? <ErrorBox error={error} /> : (
        <>
          <p className="text-sm text-white/65 mb-3" aria-live="polite">
            <strong className="text-white tabular-nums">{nb(total)}</strong> projet{total > 1 ? "s" : ""}{query ? ` pour « ${query} »` : ""}{isFetching ? " · mise à jour…" : ""}
          </p>
          {rows.length === 0 ? (
            <Empty
              title={filter === "en_attente" && !query ? "Aucun projet en attente de vérification" : "Aucun projet ne correspond"}
              hint={counts?.all === 0 ? "Aucun projet n'a encore été déposé." : "Essayez un autre mot ou un autre onglet. Un identifiant doit être recopié en entier."} />
          ) : (
            <>
              <ul className="space-y-3">
                {rows.map((p) => <ProjectRow key={`${p.id}-${verif(p)}`} p={p} owner={owners[p.owner_id]} sector={fr.sector(p.category)} />)}
              </ul>
              <Pager page={page} size={CONTENT_PAGE} shown={rows.length} total={total} onPage={setPage} label="projets" />
            </>
          )}
        </>
      )}
    </div>
  );
}
