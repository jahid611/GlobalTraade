"use client";

import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowSquareOut, ArrowCounterClockwise, Check, Prohibit, Storefront, Trash } from "@/components/icons/ph";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Card, ConfirmDialog, Empty, ErrorBox, Loading, Pill, SearchBox, SectionHeader, TONE, btn, fmtDateTime, type ToneName } from "../ui";
import { Avatar, FilterTabs, MemberLink, Quote, errorText, mustWrite, toneBtn, useProfiles, useRefresh } from "./_moderation";

type ReportStatus = "pending" | "resolved" | "dismissed";
type ReportFilter = ReportStatus | "all";

interface ReportRow {
  id: string;
  reporter_id: string;
  listing_id: string;
  content: string;
  status: ReportStatus | null;
  created_at: string;
  listings: { id: string; name: string | null } | null;
}

const STATUS: Record<ReportStatus, { label: string; tone: ToneName; done: string }> = {
  pending: { label: "À traiter", tone: "amber", done: "Signalement remis en attente" },
  resolved: { label: "Résolu", tone: "green", done: "Signalement marqué comme résolu" },
  dismissed: { label: "Classé sans suite", tone: "grey", done: "Signalement classé sans suite" },
};
const ORDER: Record<ReportStatus, number> = { pending: 0, resolved: 1, dismissed: 2 };

export default function Reports() {
  const [filter, setFilter] = useState<ReportFilter>("pending");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ReportRow | null>(null);
  const refresh = useRefresh("reports");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reports").select("*, listings(id, name)").order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []).map((r: any) => ({ ...r, status: r.status || "pending" })) as ReportRow[];
    },
  });
  const profiles = useProfiles((data || []).map((r) => r.reporter_id));

  const counts = useMemo(() => {
    const c = { pending: 0, resolved: 0, dismissed: 0 };
    (data || []).forEach((r) => { c[r.status as ReportStatus] += 1; });
    return c;
  }, [data]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data || [])
      .filter((r) => filter === "all" || r.status === filter)
      .filter((r) => !q || [r.content, r.listings?.name, profiles.get(r.reporter_id)?.full_name].some((v) => v?.toLowerCase().includes(q)))
      .sort((a, b) => ORDER[a.status as ReportStatus] - ORDER[b.status as ReportStatus]);
  }, [data, filter, search, profiles]);

  const setStatus = async (r: ReportRow, status: ReportStatus) => {
    setBusy(r.id);
    try {
      await mustWrite(supabase.from("reports").update({ status }).eq("id", r.id).select("id"));
      showSuccess(STATUS[status].done);
      refresh();
    } catch (e) {
      showError(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    await mustWrite(supabase.from("reports").delete().eq("id", toDelete.id).select("id"));
    showSuccess("Signalement supprimé");
    refresh();
  };

  return (
    <div>
      <SectionHeader
        title="Signalements"
        description="Les annonces signalées par les membres. Lisez le signalement, ouvrez l'annonce, puis décidez : résolu (vous avez agi), classé sans suite (rien à reprocher), ou supprimé."
      />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-5">
        <FilterTabs label="Filtrer les signalements" value={filter} onChange={(f) => setFilter(f as typeof filter)}
          options={[
            { id: "pending", label: "À traiter", count: counts.pending },
            { id: "resolved", label: "Résolus", count: counts.resolved },
            { id: "dismissed", label: "Classés sans suite", count: counts.dismissed },
            { id: "all", label: "Tous", count: data?.length ?? 0 },
          ]} />
        <SearchBox value={search} onChange={setSearch} placeholder="Rechercher dans les signalements" />
      </div>

      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : rows.length === 0 ? (
        <Empty
          title={search ? "Aucun signalement ne correspond à cette recherche" : filter === "pending" ? "Aucun signalement à traiter" : "Aucun signalement dans cette catégorie"}
          hint={!search && filter === "pending" ? "Quand un membre signalera une annonce, elle apparaîtra ici." : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {rows.map((r) => {
            const reporter = profiles.get(r.reporter_id);
            const status = r.status as ReportStatus;
            const working = busy === r.id;
            return (
              <Card key={r.id} className="p-4 sm:p-5 flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <Avatar name={reporter?.full_name} url={reporter?.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-white/55">Signalé par</p>
                    <MemberLink id={r.reporter_id} name={reporter?.full_name} className="text-[15px] font-medium text-white max-w-full" />
                    <p className="text-[13px] text-white/55 mt-0.5">{fmtDateTime(r.created_at)}</p>
                  </div>
                  <Pill tone={STATUS[status].tone}>{STATUS[status].label}</Pill>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                  <p className="text-[13px] text-white/55">Annonce signalée</p>
                  <p className="text-[15px] font-medium text-white break-words mt-0.5">{r.listings?.name || "Annonce masquée ou sans nom"}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <a href={`/app?focus=${r.listings?.id || r.listing_id}`} target="_blank" rel="noopener noreferrer" className={`${btn} flex-1 sm:flex-none`}>
                      <ArrowSquareOut size={18} /> Voir l'annonce sur le site
                    </a>
                    <Link to="/admin?section=listings" className={`${btn} flex-1 sm:flex-none`}>
                      <Storefront size={18} /> Agir sur l'annonce
                    </Link>
                  </div>
                </div>

                <Quote label="Ce que dit le signalement" tone={status === "pending" ? "red" : undefined}>{r.content}</Quote>

                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 pt-4 border-t border-white/10 mt-auto">
                  {status !== "resolved" && (
                    <button type="button" disabled={working} onClick={() => setStatus(r, "resolved")} className={`${toneBtn} flex-1`} style={TONE.green}>
                      <Check size={18} weight="bold" /> Marquer résolu
                    </button>
                  )}
                  {status !== "dismissed" && (
                    <button type="button" disabled={working} onClick={() => setStatus(r, "dismissed")} className={`${btn} flex-1`}>
                      <Prohibit size={18} /> Classer sans suite
                    </button>
                  )}
                  {status !== "pending" && (
                    <button type="button" disabled={working} onClick={() => setStatus(r, "pending")} className={`${btn} flex-1`}>
                      <ArrowCounterClockwise size={18} /> Remettre à traiter
                    </button>
                  )}
                  <button type="button" disabled={working} onClick={() => setToDelete(r)} className={`${toneBtn} flex-1`} style={TONE.red}>
                    <Trash size={18} /> Supprimer
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer ce signalement ?"
        description={<>Le signalement {toDelete?.listings?.name ? <>sur « {toDelete.listings.name} » </> : ""}sera effacé définitivement. L'annonce elle-même n'est pas touchée. Pour garder une trace, préférez « Classer sans suite ».</>}
        confirmLabel="Supprimer le signalement"
        danger
        onConfirm={remove}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
