"use client";

import React, { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowSquareOut, Pause, Play } from "phosphor-react";
import { setListingStatus } from "@/services/adminService";
import { CONTENT_PAGE, countListings, listListings, type ListingFilter, type ListingSort } from "@/services/adminContentService";
import type { Listing } from "@/types/domain";
import { SectionHeader, SearchBox, Loading, Empty, ErrorBox, Pill, ConfirmDialog, btnSmall, fmtDate, type ToneName } from "../ui";
import {
  BoostControl, BoostPill, DeleteControl, Field, FilterChips, OwnerLink, Pager, SortSelect,
  eur, nb, useAdminAction, useDebounced, useFrenchLabels, useOwners,
} from "../content/shared";

// Annonces : toutes les annonces du site, en ligne ou non. La base cherche,
// filtre, trie et découpe en pages (src/services/adminContentService.ts).

type Filter = ListingFilter;
type Sort = ListingSort;

const STATUS: Record<string, { label: string; tone: ToneName }> = {
  active: { label: "En ligne", tone: "green" },
  pending_renewal: { label: "À renouveler", tone: "amber" },
  inactive: { label: "En pause", tone: "grey" },
  sold: { label: "Vendue", tone: "violet" },
};

function StatusAction({ listing }: { listing: Listing }) {
  const run = useAdminAction();
  const [open, setOpen] = useState(false);
  const online = listing.status === "active";
  // Une annonce « à renouveler » peut être confirmée (remise en ligne) ou mise en pause.
  const canPause = listing.status !== "inactive";
  const canPublish = !online;
  const [target, setTarget] = useState<"active" | "inactive">("inactive");
  const ask = (t: "active" | "inactive") => { setTarget(t); setOpen(true); };
  return (
    <>
      {canPublish && <button type="button" className={btnSmall + " !min-h-[44px]"} onClick={() => ask("active")}><Play size={15} /> Remettre en ligne</button>}
      {canPause && <button type="button" className={btnSmall + " !min-h-[44px]"} onClick={() => ask("inactive")}><Pause size={15} /> Mettre en pause</button>}
      <ConfirmDialog
        open={open}
        title={target === "inactive" ? `Mettre en pause « ${listing.name} » ?` : `Remettre en ligne « ${listing.name} » ?`}
        description={target === "inactive"
          ? "L'annonce disparaît du site pour le public. Rien n'est supprimé : elle reste visible de son vendeur et vous pourrez la remettre en ligne."
          : "L'annonce redevient visible de tous, et son délai de renouvellement repart de zéro."}
        confirmLabel={target === "inactive" ? "Mettre en pause" : "Remettre en ligne"}
        onConfirm={() => run(() => setListingStatus(listing.id, target), target === "inactive" ? "Annonce mise en pause" : "Annonce remise en ligne")}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

export default function Listings() {
  const fr = useFrenchLabels();
  const [search, setSearch] = useState("");
  const query = useDebounced(search.trim());
  const [page, setPage] = useState(0);
  // Une autre recherche repart de la première page.
  useEffect(() => { setPage(0); }, [query]);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["admin", "listings", "page", query, filter, sort, page],
    queryFn: () => listListings({ search: query, filter, sort, page }),
    placeholderData: keepPreviousData,
  });
  const { data: counts } = useQuery({ queryKey: ["admin", "listings", "counts"], queryFn: countListings });
  const rows = useMemo(() => data?.rows || [], [data]);
  const total = data?.total || 0;
  const owners = useOwners(useMemo(() => rows.map((l) => l.owner_id), [rows]));
  // Après une suppression, la page courante peut ne plus exister : on recule.
  useEffect(() => { if (data && rows.length === 0 && total > 0 && page > 0) setPage(Math.ceil(total / CONTENT_PAGE) - 1); }, [data, rows.length, total, page]);

  return (
    <div>
      <SectionHeader title="Annonces" description="Toutes les entreprises à vendre publiées sur le site, y compris celles en pause. Vous pouvez les mettre en pause, les remettre en ligne, offrir une mise en avant ou les supprimer.">
        <SearchBox value={search} onChange={setSearch} placeholder="Nom, secteur, ville ou vendeur" />
      </SectionHeader>

      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 mb-4">
        <FilterChips label="Filtrer les annonces" value={filter} onChange={(v: Filter) => { setFilter(v); setPage(0); }} options={[
          { value: "all", label: "Toutes", count: counts?.all },
          { value: "active", label: "En ligne", count: counts?.active },
          { value: "pending_renewal", label: "À renouveler", count: counts?.pending_renewal },
          { value: "inactive", label: "En pause", count: counts?.inactive },
          { value: "featured", label: "Mises en avant", count: counts?.featured },
        ]} />
        <SortSelect value={sort} onChange={(v: Sort) => { setSort(v); setPage(0); }} options={[
          { value: "newest", label: "Les plus récentes" },
          { value: "price_desc", label: "Prix décroissant" },
          { value: "price_asc", label: "Prix croissant" },
          { value: "views", label: "Les plus vues" },
        ]} />
      </div>

      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : (
        <>
          <p className="text-sm text-white/65 mb-3" aria-live="polite">
            <strong className="text-white tabular-nums">{nb(total)}</strong> annonce{total > 1 ? "s" : ""}{query ? ` pour « ${query} »` : ""}{isFetching ? " · mise à jour…" : ""}
          </p>
          {rows.length === 0 ? (
            <Empty title="Aucune annonce ne correspond" hint={counts?.all === 0 ? "Aucune annonce n'a encore été publiée." : "Essayez un autre mot ou un autre filtre. Un identifiant doit être recopié en entier."} />
          ) : (
            <>
              <ul className="space-y-3">
                {rows.map((l) => {
                  const st = STATUS[l.status || ""] || { label: l.status || "Inconnu", tone: "grey" as ToneName };
                  return (
                    <li key={l.id} className="rounded-2xl border border-white/10 bg-[#232229]/95 p-4 sm:p-5">
                      <div className="flex flex-col xl:flex-row xl:items-start gap-4">
                        <div className="flex items-start gap-3 min-w-0 xl:w-[34%] shrink-0">
                          {l.logo_url ? <img src={l.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0" /> : <span aria-hidden className="w-12 h-12 rounded-xl bg-white/10 shrink-0" />}
                          <div className="min-w-0">
                            <p className="text-[15px] font-medium text-white break-words">{l.name}</p>
                            <p className="text-[13px] text-white/60">{fr.sector(l.industry)}</p>
                            <p className="text-[13px] text-white/60 break-words">{l.address || "Ville non précisée"}</p>
                            <div className="flex items-center gap-1.5 mt-1 text-[13px] text-white/60 min-w-0"><span className="shrink-0">Vendeur :</span> <OwnerLink id={l.owner_id} name={owners[l.owner_id]} /></div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-3 flex-1 min-w-0">
                          <Field label="Prix demandé"><strong className="font-medium tabular-nums">{eur(l.price)}</strong></Field>
                          <Field label="Chiffre d'affaires"><span className="tabular-nums">{eur(l.revenue_n1)}</span></Field>
                          <Field label="Résultat (EBITDA)"><span className="tabular-nums">{eur(l.ebitda)}</span></Field>
                          <Field label="Publiée le">{fmtDate(l.created_at)}</Field>
                          <Field label="Vues"><span className="tabular-nums">{nb(l.view_count)}</span></Field>
                          <Field label="Favoris"><span className="tabular-nums">{nb(l.favorites_count)}</span></Field>
                          <Field label="Surface">{l.surface ? `${nb(l.surface)} m²` : "—"}</Field>
                          <Field label="Salariés">{l.employees != null ? nb(l.employees) : "—"}</Field>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-white/10">
                        <Pill tone={st.tone}>{st.label}</Pill>
                        <BoostPill until={l.boosted_until} />
                        <span className="flex flex-wrap gap-2 sm:ml-auto w-full sm:w-auto">
                          <Link to={`/app?focus=${l.id}`} target="_blank" rel="noreferrer" className={btnSmall + " !min-h-[44px]"} aria-label={`Voir l'annonce ${l.name} sur le site`}>Voir sur le site <ArrowSquareOut size={14} /></Link>
                          <StatusAction listing={l} />
                          <BoostControl type="listing" id={l.id} label={l.name} until={l.boosted_until} />
                          <DeleteControl type="listing" id={l.id} label={l.name} />
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <Pager page={page} size={CONTENT_PAGE} shown={rows.length} total={total} onPage={setPage} label="annonces" />
            </>
          )}
        </>
      )}
    </div>
  );
}
