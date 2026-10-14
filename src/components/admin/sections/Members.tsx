"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CaretLeft, CaretRight } from "@/components/icons/ph";
import { listUsers, type AdminUserRow, type UserFilter } from "@/services/adminService";
import { SectionHeader, Card, SearchBox, Loading, Empty, ErrorBox, btnSmall, fmtDate } from "../ui";
import { FilterChips, PAGE, nb } from "../content/shared";
import { Avatar, KycPill, PlanPill, StatusPills } from "../members/memberMeta";
import MemberPanel from "../members/MemberPanel";

// Membres : la liste vient de la base (email, inscription et dernière connexion
// ne sont connus que d'elle), la fiche s'ouvre au clic.

const FILTERS: { value: UserFilter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "free", label: "Formule Gratuite" },
  { value: "pro", label: "Formule Pro" },
  { value: "business", label: "Formule Business" },
  { value: "suspended", label: "Suspendus" },
  { value: "admins", label: "Administrateurs" },
  { value: "kyc_pending", label: "Identité à vérifier" },
  { value: "never_connected", label: "Jamais connectés" },
];

const lastSeen = (u: AdminUserRow) => (u.last_sign_in_at ? fmtDate(u.last_sign_in_at) : "Jamais");
const displayName = (u: AdminUserRow) => u.full_name || "Membre sans nom";

function Counts({ u }: { u: AdminUserRow }) {
  return (
    <span className="text-[13px] text-white/75 tabular-nums">
      <span className="whitespace-nowrap">{u.listings_count} annonce{u.listings_count > 1 ? "s" : ""}</span> · <span className="whitespace-nowrap">{u.projects_count} projet{u.projects_count > 1 ? "s" : ""}</span> · <span className="whitespace-nowrap">{u.search_ads_count} recherche{u.search_ads_count > 1 ? "s" : ""}</span>
    </span>
  );
}

export default function Members() {
  const [params, setParams] = useSearchParams();
  const openId = params.get("member");
  const setOpenId = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set("member", id); else next.delete("member");
    setParams(next, { replace: !id });
  };

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");
  const [page, setPage] = useState(0);
  useEffect(() => { const t = setTimeout(() => { setQuery(search.trim()); setPage(0); }, 300); return () => clearTimeout(t); }, [search]);

  const offset = page * PAGE;
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["admin", "users", query, filter, PAGE, offset],
    queryFn: () => listUsers(query, filter, PAGE, offset),
    placeholderData: keepPreviousData,
  });
  const rows = data?.rows || [];
  const total = data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div>
      <SectionHeader title="Membres" description="Tous les comptes du site. Cliquez sur un membre pour ouvrir sa fiche : compte, profil, publications, et les actions (formule, identité, niveau, suspension).">
        <SearchBox value={search} onChange={setSearch} placeholder="Nom, email, entreprise ou identifiant" />
      </SectionHeader>

      <div className="mb-4">
        <FilterChips label="Filtrer les membres" value={filter} onChange={(v) => { setFilter(v); setPage(0); }} options={FILTERS} />
      </div>

      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : (
        <>
          <p className="text-sm text-white/65 mb-3" aria-live="polite">
            <strong className="text-white tabular-nums">{nb(total)}</strong> membre{total > 1 ? "s" : ""}{query ? ` pour « ${query} »` : ""}{isFetching ? " · mise à jour…" : ""}
          </p>

          {rows.length === 0 ? (
            <Empty title="Aucun membre ne correspond" hint="Essayez un autre mot ou un autre filtre. Un identifiant doit être recopié en entier." />
          ) : (
            <>
              {/* Ordinateur : tableau */}
              <Card className="hidden xl:block overflow-hidden">
                <table className="w-full table-fixed text-left text-sm">
                  <colgroup>
                    <col style={{ width: "23%" }} /><col style={{ width: "9%" }} /><col style={{ width: "12%" }} /><col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} /><col style={{ width: "18%" }} /><col style={{ width: "13%" }} /><col style={{ width: "5%" }} />
                  </colgroup>
                  <thead>
                    <tr className="text-[13px] text-white/55 border-b border-white/10">
                      <th scope="col" className="px-4 py-3 font-medium">Membre</th>
                      <th scope="col" className="px-3 py-3 font-medium">Formule</th>
                      <th scope="col" className="px-3 py-3 font-medium">Identité</th>
                      <th scope="col" className="px-3 py-3 font-medium">Inscription</th>
                      <th scope="col" className="px-3 py-3 font-medium">Dernière connexion</th>
                      <th scope="col" className="px-3 py-3 font-medium">Publications</th>
                      <th scope="col" className="px-3 py-3 font-medium">État</th>
                      <th scope="col" className="px-3 py-3"><span className="sr-only">Ouvrir</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.07]">
                    {rows.map((u) => (
                      <tr key={u.id} onClick={() => setOpenId(u.id)} className="cursor-pointer hover:bg-white/[0.04] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar name={u.full_name || u.email} url={u.avatar_url} />
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate">{displayName(u)}</p>
                              <p className="text-[13px] text-white/60 truncate">{u.email || "Pas d'email"}{u.company_name ? ` · ${u.company_name}` : ""}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3"><PlanPill plan={u.plan_type} /></td>
                        <td className="px-3 py-3"><KycPill status={u.kyc_status} /></td>
                        <td className="px-3 py-3 text-white/80">{fmtDate(u.created_at)}</td>
                        <td className="px-3 py-3 text-white/80">{lastSeen(u)}</td>
                        <td className="px-3 py-3"><Counts u={u} /></td>
                        <td className="px-3 py-3"><StatusPills user={u} /></td>
                        <td className="px-1 py-3 text-right">
                          <button type="button" onClick={(e) => { e.stopPropagation(); setOpenId(u.id); }} aria-label={`Ouvrir la fiche de ${displayName(u)}`}
                            className="w-11 h-11 rounded-full inline-flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-white/60">
                            <CaretRight size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              {/* Téléphone et petite fenêtre : cartes */}
              <ul className="xl:hidden space-y-3">
                {rows.map((u) => (
                  <li key={u.id}>
                    <button type="button" onClick={() => setOpenId(u.id)}
                      className="w-full text-left rounded-2xl border border-white/10 bg-[#232229]/95 p-4 hover:bg-white/[0.04] outline-none focus-visible:ring-2 focus-visible:ring-white/60">
                      <span className="flex items-center gap-3 min-w-0">
                        <Avatar name={u.full_name || u.email} url={u.avatar_url} />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-white truncate">{displayName(u)}</span>
                          <span className="block text-[13px] text-white/60 truncate">{u.email || "Pas d'email"}</span>
                        </span>
                        <CaretRight size={18} className="text-white/50 shrink-0" />
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5 mt-3">
                        <PlanPill plan={u.plan_type} />
                        <KycPill status={u.kyc_status} />
                        {(u.is_admin || u.suspended_at) && <StatusPills user={u} />}
                      </span>
                      <span className="block text-[13px] text-white/65 mt-3">Inscrit le {fmtDate(u.created_at)} · dernière connexion : {lastSeen(u).toLowerCase()}</span>
                      <span className="block mt-1"><Counts u={u} /></span>
                    </button>
                  </li>
                ))}
              </ul>

              <nav aria-label="Pages de la liste des membres" className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                <p className="text-sm text-white/60 tabular-nums">Membres {nb(offset + 1)} à {nb(Math.min(offset + rows.length, total))} sur {nb(total)} · page {page + 1} sur {pages}</p>
                <div className="flex gap-2">
                  <button type="button" className={btnSmall + " !min-h-[44px]"} disabled={page === 0} onClick={() => { setPage(page - 1); window.scrollTo({ top: 0 }); }}><CaretLeft size={15} /> Précédents</button>
                  <button type="button" className={btnSmall + " !min-h-[44px]"} disabled={page + 1 >= pages} onClick={() => { setPage(page + 1); window.scrollTo({ top: 0 }); }}>Suivants <CaretRight size={15} /></button>
                </div>
              </nav>
            </>
          )}
        </>
      )}

      {openId && <MemberPanel userId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
