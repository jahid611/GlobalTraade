"use client";

import React, { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Pause, Play } from "@/components/icons/ph";
import { setSearchAdStatus } from "@/services/adminService";
import { BUYER_TYPE_LABEL as BUYER_TYPE, CONTENT_PAGE, countSearchAds, listSearchAds, type SearchAdFilter } from "@/services/adminContentService";
import type { SearchAd } from "@/types/domain";
import { SectionHeader, SearchBox, Loading, Empty, ErrorBox, Pill, ConfirmDialog, btnSmall, fmtDate } from "../ui";
import {
  BoostControl, BoostPill, DeleteControl, Field, FilterChips, OwnerLink, Pager,
  eur, nb, useAdminAction, useDebounced, useFrenchLabels, useOwners,
} from "../content/shared";

// Recherches de repreneurs : les annonces où un repreneur décrit ce qu'il cherche.
// La base cherche, filtre et découpe en pages (src/services/adminContentService.ts).

type Filter = SearchAdFilter;
const titleOf = (a: SearchAd) => a.title || "Recherche sans titre";

function StatusAction({ ad }: { ad: SearchAd }) {
  const run = useAdminAction();
  const [open, setOpen] = useState(false);
  const active = ad.status === "active";
  return (
    <>
      <button type="button" className={btnSmall + " !min-h-[44px]"} onClick={() => setOpen(true)}>
        {active ? <><Pause size={15} /> Mettre en pause</> : <><Play size={15} /> Réactiver</>}
      </button>
      <ConfirmDialog
        open={open}
        title={active ? `Mettre en pause « ${titleOf(ad)} » ?` : `Réactiver « ${titleOf(ad)} » ?`}
        description={active
          ? "La recherche disparaît du site pour les vendeurs. Rien n'est supprimé : le repreneur la voit toujours et vous pourrez la réactiver."
          : "La recherche redevient visible des vendeurs."}
        confirmLabel={active ? "Mettre en pause" : "Réactiver"}
        onConfirm={() => run(() => setSearchAdStatus(ad.id, active ? "paused" : "active"), active ? "Recherche mise en pause" : "Recherche réactivée")}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

export default function SearchAds() {
  const fr = useFrenchLabels();
  const [search, setSearch] = useState("");
  const query = useDebounced(search.trim());
  const [page, setPage] = useState(0);
  // Une autre recherche repart de la première page.
  useEffect(() => { setPage(0); }, [query]);
  const [filter, setFilter] = useState<Filter>("all");

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["admin", "search-ads", "page", query, filter, page],
    queryFn: () => listSearchAds({ search: query, filter, page }),
    placeholderData: keepPreviousData,
  });
  const { data: counts } = useQuery({ queryKey: ["admin", "search-ads", "counts"], queryFn: countSearchAds });
  const rows = useMemo(() => data?.rows || [], [data]);
  const total = data?.total || 0;
  const owners = useOwners(useMemo(() => rows.map((a) => a.owner_id), [rows]));
  // Après une suppression, la page courante peut ne plus exister : on recule.
  useEffect(() => { if (data && rows.length === 0 && total > 0 && page > 0) setPage(Math.ceil(total / CONTENT_PAGE) - 1); }, [data, rows.length, total, page]);

  return (
    <div>
      <SectionHeader title="Recherches de repreneurs" description="Les annonces où un repreneur décrit l'entreprise qu'il cherche. Vous pouvez les mettre en pause, les réactiver, offrir une mise en avant ou les supprimer.">
        <SearchBox value={search} onChange={setSearch} placeholder="Titre, secteur, région ou repreneur" />
      </SectionHeader>

      <div className="mb-4">
        <FilterChips label="Filtrer les recherches" value={filter} onChange={(v: Filter) => { setFilter(v); setPage(0); }} options={[
          { value: "all", label: "Toutes", count: counts?.all },
          { value: "active", label: "Actives", count: counts?.active },
          { value: "paused", label: "En pause", count: counts?.paused },
        ]} />
      </div>

      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : (
        <>
          <p className="text-sm text-white/65 mb-3" aria-live="polite">
            <strong className="text-white tabular-nums">{nb(total)}</strong> recherche{total > 1 ? "s" : ""}{query ? ` pour « ${query} »` : ""}{isFetching ? " · mise à jour…" : ""}
          </p>
          {rows.length === 0 ? (
            <Empty title="Aucune recherche ne correspond" hint={counts?.all === 0 ? "Aucun repreneur n'a encore publié de recherche." : "Essayez un autre mot ou un autre filtre. Un identifiant doit être recopié en entier."} />
          ) : (
            <>
              <ul className="space-y-3">
                {rows.map((a) => {
                  const sectors = fr.sectors(a.sectors);
                  const regions = fr.regions(a.regions);
                  const financing = [a.apport_available ? "apport disponible" : null, a.bank_financing ? "prêt bancaire prévu" : null].filter(Boolean).join(", ");
                  return (
                    <li key={a.id} className="rounded-2xl border border-white/10 bg-[#232229]/95 p-4 sm:p-5">
                      <div className="flex flex-col xl:flex-row xl:items-start gap-4">
                        <div className="min-w-0 xl:w-[34%] shrink-0">
                          <p className="text-[15px] font-medium text-white break-words">{titleOf(a)}</p>
                          <p className="text-[13px] text-white/60">{BUYER_TYPE[a.buyer_type || ""] || a.buyer_type || "Type de repreneur non précisé"}</p>
                          <div className="flex items-center gap-1.5 mt-1 text-[13px] text-white/60 min-w-0"><span className="shrink-0">Repreneur :</span> <OwnerLink id={a.owner_id} name={owners[a.owner_id]} /></div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-3 flex-1 min-w-0">
                          <Field label="Secteurs" className="col-span-2">{sectors.length ? sectors.join(", ") : "—"}</Field>
                          <Field label="Régions" className="col-span-2">{regions.length ? regions.join(", ") : "—"}</Field>
                          <Field label="Budget">{a.budget || "—"}</Field>
                          <Field label="Apport">{a.apport_amount != null ? <strong className="font-medium tabular-nums">{eur(a.apport_amount)}</strong> : "Montant non précisé"}{financing && <span className="block text-[13px] text-white/55">{financing}</span>}</Field>
                          <Field label="Chiffre d'affaires visé">{a.revenue_range || "—"}</Field>
                          <Field label="Publiée le">{fmtDate(a.created_at)}</Field>
                          {a.description && <Field label="Description" className="col-span-2 sm:col-span-4"><span className="whitespace-pre-wrap line-clamp-3">{a.description}</span></Field>}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-white/10">
                        <Pill tone={a.status === "active" ? "green" : "grey"}>{a.status === "active" ? "Active" : "En pause"}</Pill>
                        <BoostPill until={a.boosted_until} />
                        <span className="flex flex-wrap gap-2 sm:ml-auto w-full sm:w-auto">
                          <StatusAction ad={a} />
                          <BoostControl type="search_ad" id={a.id} label={titleOf(a)} until={a.boosted_until} />
                          <DeleteControl type="search_ad" id={a.id} label={titleOf(a)} />
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <Pager page={page} size={CONTENT_PAGE} shown={rows.length} total={total} onPage={setPage} label="recherches" />
            </>
          )}
        </>
      )}
    </div>
  );
}
