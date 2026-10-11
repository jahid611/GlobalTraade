"use client";

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowRight, CheckCircle, Megaphone, Warning, X } from "phosphor-react";
import { getAnnouncement, type SiteAnnouncementValue } from "@/services/adminService";

/**
 * Bandeau d'annonce du site.
 *
 * L'administrateur l'écrit dans Administration › Bandeau d'annonce. Il s'affiche
 * en bas de l'écran, dans la pile des bandeaux (SiteBanners) et le visiteur
 * peut le fermer : on retient le texte fermé, le bandeau ne revient donc que si
 * le message change.
 *
 * Tailwind remplace ici emerald/amber/blue par des violets : les couleurs de
 * chaque niveau sont écrites en clair.
 */
const LEVELS: Record<SiteAnnouncementValue["level"], { background: string; border: string; Icon: React.ElementType }> = {
  info: { background: "#4338ca", border: "#a5b4fc", Icon: Megaphone },
  success: { background: "#047857", border: "#6ee7b7", Icon: CheckCircle },
  warning: { background: "#b45309", border: "#fcd34d", Icon: Warning },
};

const DISMISSED_KEY = "globly.announcement.dismissed";

/** Un lien n'est accepté que vers une page du site ou une adresse http(s). */
export function safeAnnouncementLink(link: string | undefined | null): string | null {
  const l = (link || "").trim();
  if (/^\/(?!\/)/.test(l) || /^https?:\/\//i.test(l)) return l;
  return null;
}

/** Le bandeau lui-même — aussi utilisé pour l'aperçu dans l'administration. */
export function AnnouncementBanner({ value, onClose, preview = false }: { value: SiteAnnouncementValue; onClose?: () => void; preview?: boolean }) {
  const { t } = useTranslation();
  const level = LEVELS[value.level] || LEVELS.info;
  const link = safeAnnouncementLink(value.link);
  const label = value.link_label?.trim();
  const linkCls = "shrink-0 inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-full text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-white";
  const linkStyle = { background: "#ffffff", color: level.background };
  const linkBody = <>{label}<ArrowRight size={16} weight="bold" aria-hidden /></>;

  return (
    <div
      role="status"
      className={`${preview ? "relative w-full" : "fixed left-1/2 -translate-x-1/2 z-[95] w-[calc(100%-1.5rem)] max-w-3xl"} rounded-2xl pl-4 pr-2 py-2 flex items-center gap-3 [text-shadow:none]`}
      style={{
        ...(preview ? {} : { bottom: "calc(var(--safe-bottom, 0px) + 0.75rem)" }),
        background: level.background, border: `1px solid ${level.border}`, color: "#ffffff", boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
      }}
    >
      <level.Icon size={22} weight="fill" className="shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 py-1.5">
        <p className="min-w-0 flex-1 text-sm sm:text-[15px] font-medium leading-snug break-words" style={{ color: "#ffffff" }}>{value.text}</p>
        {link && (link.startsWith("/")
          ? <Link to={link} aria-label={label || value.text} className={`${linkCls} self-start sm:self-auto`} style={linkStyle}>{linkBody}</Link>
          : <a href={link} target="_blank" rel="noopener noreferrer" aria-label={label || value.text} className={`${linkCls} self-start sm:self-auto`} style={linkStyle}>{linkBody}</a>)}
      </div>
      <button type="button" onClick={onClose} aria-label={t("modal.close", "Fermer")}
        className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-white hover:bg-white/15 transition-colors" style={{ color: "#ffffff" }}>
        <X size={18} weight="bold" />
      </button>
    </div>
  );
}

export function SiteAnnouncement() {
  const { data } = useQuery({
    queryKey: ["site", "announcement"],
    queryFn: getAnnouncement,
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  });
  const [dismissed, setDismissed] = useState<string | null>(null);
  useEffect(() => {
    try { setDismissed(window.localStorage.getItem(DISMISSED_KEY)); } catch { /* stockage indisponible */ }
  }, []);

  const text = data?.text?.trim();
  if (!data?.active || !text || dismissed === text) return null;

  const close = () => {
    setDismissed(text);
    try { window.localStorage.setItem(DISMISSED_KEY, text); } catch { /* stockage indisponible */ }
  };
  return <AnnouncementBanner preview value={{ ...data, text }} onClose={close} />;
}

export default SiteAnnouncement;
