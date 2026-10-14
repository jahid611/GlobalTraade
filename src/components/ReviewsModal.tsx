"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { X, ChatCircleDots, PencilSimple, Trash, CircleNotch } from "@/components/icons/ph";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { StarsDisplay } from "@/components/RatingStars";
import { showError, showSuccess } from "@/utils/toast";
import { formatDate } from "@/lib/markets";

/**
 * Les avis reçus par un membre : on les lit tous, et le membre concerné peut
 * répondre à chacun (une réponse par avis, modifiable ou retirable).
 *
 * La réponse passe par la fonction `reply_to_rating` (supabase/_claude_avis_reponses.sql) :
 * le membre noté ne peut écrire que sa réponse, jamais la note ni le commentaire.
 */
interface Review {
  id: string;
  rater_id: string;
  score: number;
  comment: string | null;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
  rater?: { full_name: string | null; avatar_url: string | null } | null;
}

const REPLY_MAX = 1000;

export function ReviewsModal({ userId, userName, isOpen, onClose }: {
  userId: string;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  useScrollLock(isOpen);
  const isMine = !!user && user.id === userId;

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviews", userId],
    enabled: isOpen && !!userId,
    queryFn: async (): Promise<Review[]> => {
      const { data, error } = await supabase
        .from("ratings")
        .select("id, rater_id, score, comment, reply, replied_at, created_at")
        .eq("rated_id", userId)
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data || []) as Review[];
      const ids = Array.from(new Set(rows.map((r) => r.rater_id)));
      if (!ids.length) return rows;
      const { data: people } = await supabase.from("safe_profiles").select("id, full_name, avatar_url").in("id", ids);
      const byId = new Map((people || []).map((p: any) => [p.id, p]));
      return rows.map((r) => ({ ...r, rater: byId.get(r.rater_id) || null }));
    },
  });

  const date = (iso: string) => formatDate(iso, i18n.language, "long");

  const saveReply = async (reviewId: string, text: string) => {
    setSaving(true);
    const { error } = await supabase.rpc("reply_to_rating", { p_rating_id: reviewId, p_reply: text });
    setSaving(false);
    if (error) { showError(t("reviews.reply_error", "Votre réponse n'a pas pu être enregistrée. Réessayez.")); return; }
    showSuccess(text.trim() ? t("reviews.reply_saved", "Votre réponse est publiée.") : t("reviews.reply_removed", "Votre réponse est retirée."));
    setEditing(null); setDraft("");
    queryClient.invalidateQueries({ queryKey: ["reviews", userId] });
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-label={t("reviews.title", "Les avis") as string}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} transition={{ duration: 0.2 }}
            className="relative w-full sm:max-w-2xl max-h-[92dvh] flex flex-col rounded-t-[1.75rem] sm:rounded-[1.75rem] border border-white/15 text-white"
            style={{ background: "#232229", boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}
          >
            <header className="flex items-start justify-between gap-4 px-5 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-white/10 shrink-0">
              <div className="min-w-0">
                <h2 className="text-xl font-medium text-white leading-tight">
                  {isMine ? t("reviews.title_mine", "Les avis que vous avez reçus") : t("reviews.title_other", { defaultValue: "Les avis sur {{name}}", name: userName })}
                </h2>
                <p className="text-sm text-white/60 font-light mt-1">
                  {isMine
                    ? t("reviews.sub_mine", "Vous pouvez répondre à chaque avis : votre réponse s'affiche juste dessous, visible de tous.")
                    : t("reviews.sub_other", "Laissés par des membres qui ont échangé avec cette personne.")}
                </p>
              </div>
              <button type="button" onClick={onClose} aria-label={t("common.close", "Fermer") as string}
                className="w-11 h-11 -mt-1 -mr-1 shrink-0 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60">
                <X size={20} />
              </button>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-7 py-5 space-y-4 custom-scrollbar">
              {isLoading ? (
                <div className="py-16 flex justify-center"><CircleNotch size={28} className="animate-spin text-white/60" /></div>
              ) : reviews.length === 0 ? (
                <p className="py-14 text-center text-white/60 font-light">{t("reviews.empty", "Aucun avis pour le moment.")}</p>
              ) : reviews.map((r) => {
                const name = r.rater?.full_name || t("reviews.member", "Un membre");
                const isEditing = editing === r.id;
                return (
                  <article key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <Link to={`/profile/${r.rater_id}`} onClick={onClose} className="shrink-0 w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                        style={{ background: "rgba(120,114,251,0.18)", border: "1px solid rgba(120,114,251,0.4)", color: "#c7c4ff" }}>
                        {r.rater?.avatar_url ? <img src={r.rater.avatar_url} alt="" className="w-full h-full object-cover" /> : name.trim().charAt(0).toUpperCase()}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-[15px] font-medium text-white">{name}</span>
                          <span className="inline-flex items-center gap-1.5"><StarsDisplay value={Number(r.score)} size={15} /><span className="text-sm text-white/70 tabular-nums">{Number(r.score).toFixed(1).replace(".0", "")}/5</span></span>
                        </div>
                        <p className="text-xs text-white/50 mt-0.5">{date(r.created_at)}</p>
                      </div>
                    </div>

                    {r.comment
                      ? <p className="text-[15px] text-white/85 font-light leading-relaxed mt-3 whitespace-pre-line">{r.comment}</p>
                      : <p className="text-sm text-white/45 font-light italic mt-3">{t("reviews.no_comment", "Note laissée sans commentaire.")}</p>}

                    {/* La réponse du membre noté */}
                    {r.reply && !isEditing && (
                      <div className="mt-4 rounded-xl p-3.5" style={{ background: "rgba(120,114,251,0.1)", borderLeft: "3px solid #7872fb" }}>
                        <p className="text-xs font-semibold" style={{ color: "#a5b4fc" }}>
                          {isMine ? t("reviews.your_reply", "Votre réponse") : t("reviews.reply_of", { defaultValue: "Réponse de {{name}}", name: userName })}
                          {r.replied_at && <span className="font-normal text-white/50"> · {date(r.replied_at)}</span>}
                        </p>
                        <p className="text-[15px] text-white/85 font-light leading-relaxed mt-1 whitespace-pre-line">{r.reply}</p>
                        {isMine && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            <button type="button" onClick={() => { setEditing(r.id); setDraft(r.reply || ""); }}
                              className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-sm text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60">
                              <PencilSimple size={15} /> {t("reviews.edit_reply", "Modifier")}
                            </button>
                            <button type="button" disabled={saving} onClick={() => saveReply(r.id, "")}
                              className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-sm text-white/80 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50">
                              <Trash size={15} /> {t("reviews.remove_reply", "Retirer ma réponse")}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {isMine && !r.reply && !isEditing && (
                      <button type="button" onClick={() => { setEditing(r.id); setDraft(""); }}
                        className="mt-4 inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full text-sm font-medium text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                        style={{ background: "#5955e8" }}>
                        <ChatCircleDots size={17} weight="fill" /> {t("reviews.reply", "Répondre à cet avis")}
                      </button>
                    )}

                    {isMine && isEditing && (
                      <form className="mt-4" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) saveReply(r.id, draft); }}>
                        <label htmlFor={`reply-${r.id}`} className="block text-sm font-medium text-white mb-1.5">{t("reviews.reply_label", "Votre réponse")}</label>
                        <textarea
                          id={`reply-${r.id}`} autoFocus rows={4} maxLength={REPLY_MAX} value={draft} onChange={(e) => setDraft(e.target.value)}
                          placeholder={t("reviews.reply_ph", "Remerciez, expliquez, apportez une précision… Restez courtois : tout le monde peut lire cette réponse.") as string}
                          className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3 text-[15px] text-white placeholder:text-white/35 outline-none focus:border-primary/60 resize-none"
                        />
                        <div className="flex items-center justify-between gap-3 mt-2">
                          <span className="text-xs text-white/50 tabular-nums">{draft.length} / {REPLY_MAX}</span>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => { setEditing(null); setDraft(""); }}
                              className="min-h-[44px] px-4 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-sm text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60">
                              {t("common.cancel", "Annuler")}
                            </button>
                            <button type="submit" disabled={saving || !draft.trim()}
                              className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-full text-sm font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50"
                              style={{ background: "#5955e8" }}>
                              {saving && <CircleNotch size={16} className="animate-spin" />} {t("reviews.publish_reply", "Publier ma réponse")}
                            </button>
                          </div>
                        </div>
                      </form>
                    )}
                  </article>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
