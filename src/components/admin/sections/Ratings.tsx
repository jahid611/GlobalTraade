"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChatCircleDots, Check, Star, Trash, X } from "@/components/icons/ph";
import { supabase } from "@/integrations/supabase/client";
import { moderateRating } from "@/services/adminService";
import { showSuccess } from "@/utils/toast";
import { Card, ConfirmDialog, Empty, ErrorBox, Loading, Pill, SearchBox, SectionHeader, TONE, btn, fmtDateTime, type ToneName } from "../ui";
import { FilterTabs, MemberLink, Quote, toneBtn, useProfiles, useRefresh } from "./_moderation";

type RatingStatus = "under_review" | "published" | "rejected";
type RatingFilter = RatingStatus | "all";
type RatingAction = "publish" | "reject" | "clear_reply" | "delete";

interface RatingRow {
  id: string;
  rater_id: string;
  rated_id: string;
  score: number;
  comment: string | null;
  justification: string | null;
  status: RatingStatus;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
}

const STATUS: Record<RatingStatus, { label: string; tone: ToneName }> = {
  under_review: { label: "À modérer", tone: "amber" },
  published: { label: "Publié", tone: "green" },
  rejected: { label: "Refusé", tone: "red" },
};
const ORDER: Record<RatingStatus, number> = { under_review: 0, published: 1, rejected: 2 };

const ACTION: Record<RatingAction, { title: string; description: string; confirm: string; done: string; danger?: boolean }> = {
  publish: {
    title: "Publier cet avis ?",
    description: "L'avis sera visible sur le profil du membre noté et comptera dans sa note moyenne.",
    confirm: "Publier l'avis",
    done: "Avis publié",
  },
  reject: {
    title: "Refuser cet avis ?",
    description: "L'avis ne sera pas (ou plus) visible du public et ne comptera pas dans la note moyenne. Il reste conservé ici.",
    confirm: "Refuser l'avis",
    done: "Avis refusé",
    danger: true,
  },
  clear_reply: {
    title: "Retirer la réponse du membre ?",
    description: "La réponse écrite par le membre noté sera effacée. L'avis lui-même ne change pas, et le membre pourra répondre à nouveau.",
    confirm: "Retirer la réponse",
    done: "Réponse retirée",
    danger: true,
  },
  delete: {
    title: "Supprimer cet avis ?",
    description: "L'avis, sa justification et sa réponse seront effacés définitivement. Pour seulement le masquer, préférez « Refuser ».",
    confirm: "Supprimer l'avis",
    done: "Avis supprimé",
    danger: true,
  },
};

const score = (n: number) => Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 1 });

export default function Ratings() {
  const [filter, setFilter] = useState<RatingFilter>("under_review");
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<{ row: RatingRow; action: RatingAction } | null>(null);
  const refresh = useRefresh("ratings");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "ratings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ratings").select("*").order("created_at", { ascending: false }).limit(1000);
      if (error) throw new Error(error.message);
      return (data || []) as RatingRow[];
    },
  });
  const profiles = useProfiles((data || []).flatMap((r) => [r.rater_id, r.rated_id]));

  const counts = useMemo(() => {
    const c = { under_review: 0, published: 0, rejected: 0 };
    (data || []).forEach((r) => { if (r.status in c) c[r.status] += 1; });
    return c;
  }, [data]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data || [])
      .filter((r) => filter === "all" || r.status === filter)
      .filter((r) => !q || [r.comment, r.justification, r.reply, profiles.get(r.rater_id)?.full_name, profiles.get(r.rated_id)?.full_name].some((v) => v?.toLowerCase().includes(q)))
      .sort((a, b) => (ORDER[a.status] ?? 3) - (ORDER[b.status] ?? 3));
  }, [data, filter, search, profiles]);

  const run = async () => {
    if (!pending) return;
    await moderateRating(pending.row.id, pending.action);
    showSuccess(ACTION[pending.action].done);
    refresh();
  };

  return (
    <div>
      <SectionHeader
        title="Avis"
        description="Les notes que les membres se donnent entre eux. Une note inférieure à 2,5 sur 5 doit être justifiée et attend votre accord avant d'être publiée."
      />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-5">
        <FilterTabs label="Filtrer les avis" value={filter} onChange={(f) => setFilter(f as typeof filter)}
          options={[
            { id: "under_review", label: "À modérer", count: counts.under_review },
            { id: "published", label: "Publiés", count: counts.published },
            { id: "rejected", label: "Refusés", count: counts.rejected },
            { id: "all", label: "Tous", count: data?.length ?? 0 },
          ]} />
        <SearchBox value={search} onChange={setSearch} placeholder="Rechercher un membre ou un texte" />
      </div>

      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : rows.length === 0 ? (
        <Empty
          title={search ? "Aucun avis ne correspond à cette recherche" : filter === "under_review" ? "Aucun avis à modérer" : "Aucun avis dans cette catégorie"}
          hint={!search && filter === "under_review" ? "Les notes basses à vérifier apparaîtront ici." : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {rows.map((r) => {
            const rater = profiles.get(r.rater_id);
            const rated = profiles.get(r.rated_id);
            const st = STATUS[r.status] || { label: r.status, tone: "grey" as ToneName };
            const low = Number(r.score) < 2.5;
            return (
              <Card key={r.id} className="p-4 sm:p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-medium text-white">
                      <MemberLink id={r.rater_id} name={rater?.full_name} className="max-w-full" />
                      <span className="inline-flex items-center gap-1 text-[13px] font-normal text-white/55">a noté <ArrowRight size={14} aria-hidden /></span>
                      <MemberLink id={r.rated_id} name={rated?.full_name} className="max-w-full" />
                    </div>
                    <p className="text-[13px] text-white/55 mt-1">{fmtDateTime(r.created_at)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1.5 text-xl font-semibold tabular-nums" style={{ color: low ? TONE.red.color : "#fcd34d" }}
                      aria-label={`Note : ${score(r.score)} sur 5`}>
                      <Star size={20} weight="fill" aria-hidden /> {score(r.score)}<span className="text-sm font-normal text-white/50">/5</span>
                    </span>
                    <Pill tone={st.tone}>{st.label}</Pill>
                  </div>
                </div>

                {r.comment ? <Quote label="Commentaire">{r.comment}</Quote> : <p className="text-sm text-white/50">Aucun commentaire.</p>}
                {r.justification && <Quote label="Justification de la note basse" tone="amber">{r.justification}</Quote>}
                {r.reply && (
                  <Quote label={`Réponse de ${rated?.full_name || "du membre noté"}${r.replied_at ? ` · ${fmtDateTime(r.replied_at)}` : ""}`} tone="violet">{r.reply}</Quote>
                )}

                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 pt-4 border-t border-white/10 mt-auto">
                  {r.status !== "published" && (
                    <button type="button" onClick={() => setPending({ row: r, action: "publish" })} className={`${toneBtn} flex-1`} style={TONE.green}>
                      <Check size={18} weight="bold" /> Publier
                    </button>
                  )}
                  {r.status !== "rejected" && (
                    <button type="button" onClick={() => setPending({ row: r, action: "reject" })} className={`${btn} flex-1`}>
                      <X size={18} weight="bold" /> Refuser
                    </button>
                  )}
                  {r.reply && (
                    <button type="button" onClick={() => setPending({ row: r, action: "clear_reply" })} className={`${btn} flex-1`}>
                      <ChatCircleDots size={18} /> Retirer la réponse
                    </button>
                  )}
                  <button type="button" onClick={() => setPending({ row: r, action: "delete" })} className={`${toneBtn} flex-1`} style={TONE.red}>
                    <Trash size={18} /> Supprimer
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!pending}
        title={pending ? ACTION[pending.action].title : ""}
        description={pending && (
          <>
            Avis de <strong className="text-white font-medium">{profiles.get(pending.row.rater_id)?.full_name || "un membre"}</strong> sur{" "}
            <strong className="text-white font-medium">{profiles.get(pending.row.rated_id)?.full_name || "un membre"}</strong> ({score(pending.row.score)}/5). {ACTION[pending.action].description}
          </>
        )}
        confirmLabel={pending ? ACTION[pending.action].confirm : ""}
        danger={!!pending && !!ACTION[pending.action].danger}
        onConfirm={run}
        onClose={() => setPending(null)}
      />
    </div>
  );
}
