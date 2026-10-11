"use client";

import React, { useEffect, useRef } from "react";
import { AccountStatusBanner } from "@/components/AccountStatusBanner";
import { MemberNotices } from "@/components/MemberNotices";
import { SiteAnnouncement } from "@/components/SiteAnnouncement";

/**
 * La pile des bandeaux du site, en bas de l'écran.
 *
 * Un seul bandeau à la fois, pour ne jamais manger l'écran : le plus important
 * d'abord, le suivant apparaît quand celui-ci est fermé.
 *   1. compte suspendu (permanent tant que la suspension dure) ;
 *   2. avis de l'équipe au membre (identité, projet…) ;
 *   3. annonce générale du site.
 * Chaque bandeau ne rend rien quand il n'a rien à dire : le premier présent
 * dans la page est donc le plus important, les autres sont masqués.
 *
 * La hauteur de la pile est publiée dans la variable CSS --banner-stack : ce qui
 * est accroché en bas de l'écran (l'onglet de Globi) se décale d'autant sur
 * téléphone, où il n'y a pas la place de les mettre côte à côte.
 */
export function SiteBanners() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const root = document.documentElement;
    const publish = () => {
      const h = el.getBoundingClientRect().height;
      const narrow = window.innerWidth < 1024;
      root.style.setProperty("--banner-stack", h > 0 && narrow ? `${Math.round(h) + 8}px` : "0px");
    };
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    window.addEventListener("resize", publish);
    publish();
    return () => { observer.disconnect(); window.removeEventListener("resize", publish); root.style.setProperty("--banner-stack", "0px"); };
  }, []);

  return (
    <div ref={ref}
      className="fixed left-1/2 -translate-x-1/2 z-[140] w-[calc(100%-1.5rem)] max-w-3xl pointer-events-none [&>*]:pointer-events-auto [&>*:nth-child(n+2)]:hidden"
      style={{ bottom: "calc(var(--safe-bottom, 0px) + 0.75rem)" }}>
      <AccountStatusBanner />
      <MemberNotices />
      <SiteAnnouncement />
    </div>
  );
}
