"use client";

import React from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowRight, CheckCircle, Info, WarningCircle, X } from "phosphor-react";
import { useAuth } from "@/components/AuthProvider";
import { listMyNotices, markNoticesRead, type MemberNotice, type NoticeKind } from "@/services/noticeService";

/** Les avis du membre connecté, partagés par le bandeau et par les rappels de motif. */
export function useMyNotices() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["member-notices", user?.id],
    queryFn: () => listMyNotices(user!.id),
    enabled: !!user,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
}

type Tone = "good" | "bad" | "neutral";
const TONES: Record<Tone, { background: string; border: string; Icon: React.ElementType }> = {
  good: { background: "#065f46", border: "#6ee7b7", Icon: CheckCircle },
  bad: { background: "#7f1d1d", border: "#fca5a5", Icon: WarningCircle },
  neutral: { background: "#3730a3", border: "#a5b4fc", Icon: Info },
};

/** Titre, phrase, bouton et couleur de chaque type d'avis. */
export function useNoticeText() {
  const { t } = useTranslation();
  return (n: MemberNotice): { tone: Tone; title: string; text: string; cta: string; to: string } => {
    const name = n.target_label ? `« ${n.target_label} »` : "";
    const project = `/projects?focus=${n.target_id}`;
    const map: Record<NoticeKind, { tone: Tone; title: string; text: string; cta: string; to: string }> = {
      kyc_verified: { tone: "good", title: t("notice.kyc_verified_title", "Votre identité est vérifiée"), text: t("notice.kyc_verified_text", "Le badge « Vérifié » apparaît maintenant sur votre profil."), cta: t("notice.see_profile", "Voir mon profil"), to: "/profile" },
      kyc_rejected: { tone: "bad", title: t("notice.kyc_rejected_title", "Votre vérification d'identité n'a pas été validée"), text: t("notice.kyc_rejected_text", "Vous pouvez envoyer un nouveau document depuis votre profil."), cta: t("notice.kyc_retry", "Envoyer un nouveau document"), to: "/profile" },
      kyc_reset: { tone: "neutral", title: t("notice.kyc_reset_title", "Votre vérification d'identité a été retirée"), text: t("notice.kyc_reset_text", "Vous pouvez refaire une demande depuis votre profil."), cta: t("notice.see_profile", "Voir mon profil"), to: "/profile" },
      project_verified: { tone: "good", title: t("notice.project_verified_title", "Votre projet {{name}} est vérifié", { name }).replace(/\s+/g, " "), text: t("notice.project_verified_text", "Le badge « Projet vérifié » s'affiche sur sa fiche."), cta: t("notice.see_project", "Voir mon projet"), to: project },
      project_rejected: { tone: "bad", title: t("notice.project_rejected_title", "Votre projet {{name}} n'a pas été validé", { name }).replace(/\s+/g, " "), text: t("notice.project_rejected_text", "Corrigez votre dossier puis renvoyez-le : il sera relu."), cta: t("notice.fix_project", "Corriger mon dossier"), to: project },
      account_suspended: { tone: "bad", title: t("account.suspended_title", "Votre compte est suspendu"), text: t("account.suspended_text", "Vous ne pouvez plus publier ni envoyer de messages pour le moment."), cta: t("account.suspended_contact", "Nous contacter"), to: "/contact" },
      account_restored: { tone: "good", title: t("notice.restored_title", "Votre compte est réactivé"), text: t("notice.restored_text", "Vous pouvez de nouveau publier et échanger avec les autres membres."), cta: t("notice.open_dashboard", "Ouvrir mon tableau de bord"), to: "/dashboard" },
    };
    return map[n.kind];
  };
}

/**
 * Bandeau des avis non lus : un seul à la fois (le plus récent), avec le motif
 * donné par l'équipe. Le fermer le marque comme lu ; le suivant apparaît alors.
 * La suspension a son propre bandeau permanent (AccountStatusBanner).
 */
export function MemberNotices() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data } = useMyNotices();
  const textOf = useNoticeText();

  const unread = (data || []).filter((n) => !n.read_at && n.kind !== "account_suspended");
  const notice = unread[0];
  if (!user || !notice) return null;

  const c = textOf(notice);
  const tone = TONES[c.tone];
  const close = () => {
    // Disparition immédiate, puis enregistrement en base.
    qc.setQueryData<MemberNotice[]>(["member-notices", user.id], (old) =>
      (old || []).map((n) => (n.id === notice.id ? { ...n, read_at: new Date().toISOString() } : n)));
    markNoticesRead([notice.id]);
  };

  return (
    <div role="status" className="relative w-full rounded-2xl pl-4 pr-2 py-3 flex items-start gap-3 [text-shadow:none]"
      style={{ background: tone.background, border: `1px solid ${tone.border}`, color: "#ffffff", boxShadow: "0 16px 40px rgba(0,0,0,0.45)" }}>
      <tone.Icon size={22} weight="fill" className="shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4">
        <div className="min-w-0 flex-1 text-sm leading-relaxed">
          <p className="font-semibold text-[15px] break-words" style={{ color: "#ffffff" }}>{c.title}</p>
          {notice.reason && (
            <p className="break-words" style={{ color: "#ffffff" }}>
              <span style={{ color: "rgba(255,255,255,0.8)" }}>{t("notice.reason", "Motif :")}</span> {notice.reason}
            </p>
          )}
          <p className="hidden sm:block" style={{ color: "rgba(255,255,255,0.85)" }}>{c.text}</p>
          {unread.length > 1 && (
            <p className="text-[13px] mt-0.5" style={{ color: "rgba(255,255,255,0.7)" }}>
              {unread.length === 2
                ? t("notice.more_one", "1 autre message après celui-ci.")
                : t("notice.more_many", "{{count}} autres messages après celui-ci.", { count: unread.length - 1 })}
            </p>
          )}
        </div>
        <Link to={c.to} onClick={close}
          className="shrink-0 self-start sm:self-auto inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-full text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-white"
          style={{ background: "#ffffff", color: tone.background }}>
          {c.cta}<ArrowRight size={16} weight="bold" aria-hidden />
        </Link>
      </div>
      <button type="button" onClick={close} aria-label={t("modal.close", "Fermer")}
        className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-white hover:bg-white/15 transition-colors" style={{ color: "#ffffff" }}>
        <X size={18} weight="bold" />
      </button>
    </div>
  );
}

/** Rappel du motif d'un refus, à placer près de l'élément concerné (profil, dossier du projet). */
export function RefusalReason({ kind, targetId }: { kind: "kyc_rejected" | "project_rejected"; targetId?: string | null }) {
  const { t } = useTranslation();
  const { data } = useMyNotices();
  const notice = (data || []).find((n) => n.kind === kind && (!targetId || n.target_id === targetId));
  if (!notice?.reason) return null;
  return (
    <div className="mt-2.5 rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed" style={{ background: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.38)" }}>
      <p className="text-[13px] font-semibold" style={{ color: "#fca5a5" }}>{t("notice.reason_title", "Motif indiqué par notre équipe")}</p>
      <p className="break-words whitespace-pre-wrap" style={{ color: "#ffffff" }}>{notice.reason}</p>
    </div>
  );
}
