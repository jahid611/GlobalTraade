"use client";
import React from "react";
import { PencilSimple, Trash, RocketLaunch, DownloadSimple, CheckCircle, ClockCounterClockwise, Pause, Crown } from "@/components/icons/ph";
import { useTranslation } from "react-i18next";
import { BusinessCard } from "@/components/BusinessCard";
import { BOOST_PRICE } from "@/services/planService";
import { formatMoney } from "@/lib/markets";
import type { Listing } from "@/types/domain";

// Vraies couleurs en inline (tailwind.config.ts remappe emerald/amber/red sur des violets).
const STATUS = {
  active: { color: "#6ee7b7", background: "rgba(16,185,129,0.15)", borderColor: "rgba(16,185,129,0.38)" },
  pending_renewal: { color: "#fcd34d", background: "rgba(245,158,11,0.15)", borderColor: "rgba(245,158,11,0.38)" },
  inactive: { color: "rgba(255,255,255,0.75)", background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.25)" },
} as const;

const actionBtn =
  "inline-flex items-center justify-center gap-2 min-h-[44px] px-3 rounded-xl border border-white/12 bg-white/[0.04] hover:bg-white/10 text-[13px] font-medium text-white/90 leading-tight transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60";

// Action secondaire sur téléphone : icône au-dessus, nom dessous, sans cadre.
const miniBtn =
  "flex-1 min-w-0 flex flex-col items-center justify-center gap-1 min-h-[56px] px-1 rounded-xl text-xs font-medium text-white/85 text-center leading-tight hover:bg-white/5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60";

// Une de mes annonces : la carte habituelle, et dessous ses boutons écrits en
// toutes lettres (plus d'icônes muettes posées sur la photo).
export function MyListingCard({
  listing, onOpen, onEdit, onDelete, onBoost, onDownloadPdf,
}: {
  listing: Listing;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Absent quand l'annonce est déjà mise en avant. */
  onBoost?: () => void;
  /** Absent pour la formule gratuite. */
  onDownloadPdf?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const status = listing.status === "pending_renewal" || listing.status === "inactive" ? listing.status : "active";

  return (
    <div className="flex flex-col gap-0 sm:gap-2 min-w-0">
      <div className="flex-1 min-w-0">
        <BusinessCard listing={listing} onClick={onOpen} />
      </div>

      {/* Téléphone : un seul bloc soudé sous la carte. L'état, le bouton principal
          (Modifier) bien visible, puis les actions secondaires en petit. */}
      <div className="sm:hidden -mt-5 pt-7 pb-3 px-3 rounded-b-3xl border border-t-0 border-white/10" style={{ background: "#1f1e25" }}>
        <div className="flex items-center justify-between gap-2 mb-3 px-1">
          <span className="text-[13px] text-white/60">{t("dashboard.listing_status", "État de l'annonce")}</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold" style={STATUS[status]}>
            {status === "active" && <><CheckCircle size={14} weight="fill" />{t("dashboard.status_online", "En ligne")}</>}
            {status === "pending_renewal" && <><ClockCounterClockwise size={14} />{t("lifecycle.status_pending", "À confirmer")}</>}
            {status === "inactive" && <><Pause size={14} />{t("lifecycle.status_paused", "En pause")}</>}
          </span>
        </div>
        <button onClick={onEdit} className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] rounded-2xl text-[15px] font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-white/60" style={{ background: "#5955e8" }}>
          <PencilSimple size={18} weight="bold" /> {t("dashboard.edit_listing", "Modifier l'annonce")}
        </button>
        <div className="flex items-stretch justify-between gap-1 mt-2">
          {onBoost ? (
            <button onClick={onBoost} className={miniBtn}>
              <RocketLaunch size={20} style={{ color: "#fcd34d" }} />
              <span>{t("dashboard.boost_short", { price: BOOST_PRICE, defaultValue: "Mettre en avant · {{price}} €" })}</span>
            </button>
          ) : (
            <span className={miniBtn} style={{ color: "#c7d2fe" }}>
              <Crown size={20} weight="fill" />
              <span>{t("dashboard.boosted_short", "En avant")}</span>
            </span>
          )}
          {onDownloadPdf && (
            <button onClick={onDownloadPdf} className={miniBtn}>
              <DownloadSimple size={20} />
              <span>{t("dashboard.pdf_short", "PDF")}</span>
            </button>
          )}
          <button onClick={onDelete} className={miniBtn} style={{ color: "#fca5a5" }}>
            <Trash size={20} />
            <span>{t("dash.remove", "Supprimer")}</span>
          </button>
        </div>
      </div>

      {/* Tablette et ordinateur : inchangé */}
      <div className="hidden sm:block rounded-2xl bg-[#232229]/95 border border-white/10 p-3">
        <div className="flex items-center justify-between gap-2 mb-3 px-1">
          <span className="text-[13px] text-white/60 font-light">{t("dashboard.listing_status", "État de l'annonce")}</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold" style={STATUS[status]}>
            {status === "active" && <><CheckCircle size={14} weight="fill" />{t("dashboard.status_online", "En ligne")}</>}
            {status === "pending_renewal" && <><ClockCounterClockwise size={14} />{t("lifecycle.status_pending", "À confirmer")}</>}
            {status === "inactive" && <><Pause size={14} />{t("lifecycle.status_paused", "En pause")}</>}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={onEdit} className={actionBtn}>
            <PencilSimple size={18} className="shrink-0" /> {t("dash.edit", "Modifier")}
          </button>
          <button onClick={onDelete} className={actionBtn} style={{ color: "#fca5a5" }}>
            <Trash size={18} className="shrink-0" /> {t("dash.remove", "Supprimer")}
          </button>
          {onBoost ? (
            <button
              onClick={onBoost}
              title={t("boost.cta", "Mettre en avant - {{price}}", { price: formatMoney(BOOST_PRICE, i18n.language) }) as string}
              className={`${actionBtn} ${onDownloadPdf ? "" : "col-span-2"}`}
            >
              <RocketLaunch size={18} className="shrink-0 text-[#fcd34d]" />
              <span>{t("dashboard.boost", { price: BOOST_PRICE, defaultValue: "Mettre en avant ({{price}} €)" })}</span>
            </button>
          ) : (
            <span className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-3 rounded-xl text-[13px] font-medium leading-tight text-[#c7d2fe] bg-primary/15 border border-primary/30 ${onDownloadPdf ? "" : "col-span-2"}`}>
              <Crown size={18} weight="fill" className="shrink-0" /> {t("dashboard.boosted", "Déjà mise en avant")}
            </span>
          )}
          {onDownloadPdf && (
            <button
              onClick={onDownloadPdf}
              title={t("premium.download_pdf", "Télécharger la présentation PDF") as string}
              className={actionBtn}
            >
              <DownloadSimple size={18} className="shrink-0" />
              <span>{t("dashboard.pdf", "Présentation PDF")}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
