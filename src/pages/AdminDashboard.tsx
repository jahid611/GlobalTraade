"use client";

import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChartLineUp, Users, Storefront, RocketLaunch, Binoculars, IdentificationCard, Flag, Star, EnvelopeSimple,
  CreditCard, Megaphone, ClockCounterClockwise, ShieldCheck, ShieldWarning, ArrowSquareOut,
} from "phosphor-react";
import { Navbar } from "@/components/Navbar";
import { SolarSystem } from "@/components/SolarSystem";
import { getOverview, isTwoFactorSession } from "@/services/adminService";
import { Loading, TONE } from "@/components/admin/ui";

/**
 * Administration — la tour de contrôle.
 *
 * Cette page n'est qu'un écran : chaque lecture et chaque action passe par la
 * base, qui vérifie elle-même que l'appelant est administrateur et qui écrit
 * l'action dans un journal (supabase/_claude_admin_tour.sql). Masquer un bouton
 * ici n'est jamais ce qui protège quelque chose.
 *
 * Une rubrique = un fichier dans src/components/admin/sections/.
 */
const SECTIONS = [
  { group: "Piloter", items: [
    { id: "overview", label: "Vue d'ensemble", Icon: ChartLineUp, load: () => import("@/components/admin/sections/Overview") },
  ] },
  { group: "Membres et publications", items: [
    { id: "members", label: "Membres", Icon: Users, load: () => import("@/components/admin/sections/Members") },
    { id: "listings", label: "Annonces", Icon: Storefront, load: () => import("@/components/admin/sections/Listings") },
    { id: "projects", label: "Projets", Icon: RocketLaunch, todo: "projects", load: () => import("@/components/admin/sections/Projects") },
    { id: "searchads", label: "Recherches de repreneurs", Icon: Binoculars, load: () => import("@/components/admin/sections/SearchAds") },
  ] },
  { group: "À traiter", items: [
    { id: "kyc", label: "Vérifications d'identité", Icon: IdentificationCard, todo: "kyc", load: () => import("@/components/admin/sections/Kyc") },
    { id: "reports", label: "Signalements", Icon: Flag, todo: "reports", load: () => import("@/components/admin/sections/Reports") },
    { id: "ratings", label: "Avis", Icon: Star, todo: "ratings", load: () => import("@/components/admin/sections/Ratings") },
    { id: "contact", label: "Messages de contact", Icon: EnvelopeSimple, todo: "contact", load: () => import("@/components/admin/sections/ContactInbox") },
  ] },
  { group: "Site", items: [
    { id: "purchases", label: "Paiements", Icon: CreditCard, load: () => import("@/components/admin/sections/Purchases") },
    { id: "announcement", label: "Bandeau d'annonce", Icon: Megaphone, load: () => import("@/components/admin/sections/Announcement") },
    { id: "audit", label: "Journal des actions", Icon: ClockCounterClockwise, load: () => import("@/components/admin/sections/AuditLog") },
  ] },
] as const;

type SectionId = (typeof SECTIONS)[number]["items"][number]["id"];
const ALL = SECTIONS.flatMap((g) => g.items as readonly { id: string; label: string; Icon: React.ElementType; todo?: string; load: () => Promise<{ default: React.ComponentType }> }[]);
const LAZY = Object.fromEntries(ALL.map((s) => [s.id, lazy(s.load)])) as Record<string, React.LazyExoticComponent<React.ComponentType>>;

export default function AdminDashboard() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("section");
  const section: SectionId = (ALL.some((s) => s.id === requested) ? requested : "overview") as SectionId;
  const go = (id: string) => { const next = new URLSearchParams(params); next.set("section", id); setParams(next); window.scrollTo({ top: 0 }); };

  // Ce qui attend une décision : les pastilles du menu.
  const { data: overview } = useQuery({ queryKey: ["admin", "overview"], queryFn: getOverview, refetchInterval: 60_000 });
  const todo = overview?.todo as Record<string, number> | undefined;
  const todoTotal = useMemo(() => (todo ? Object.values(todo).reduce((a, b) => a + b, 0) : 0), [todo]);

  // La double authentification protège-t-elle cette session ?
  const [twoFactor, setTwoFactor] = useState<boolean | null>(null);
  useEffect(() => { isTwoFactorSession().then(setTwoFactor).catch(() => setTwoFactor(false)); }, []);

  const Current = LAZY[section];
  const currentLabel = ALL.find((s) => s.id === section)?.label ?? "";

  return (
    <div className="min-h-screen bg-[#2b2a2f] text-white selection:bg-primary/30 [text-shadow:none]">
      <SolarSystem />
      <Navbar />

      <main className="relative z-10 pt-[calc(var(--nav-clearance)+2rem)] pb-24 px-4 sm:px-6 lg:px-10 2xl:px-14 w-full">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-light tracking-tight">Administration <span className="text-primary font-medium">Globly</span></h1>
            <p className="text-white/65 font-light mt-1.5">
              {todoTotal > 0
                ? `${todoTotal} élément${todoTotal > 1 ? "s" : ""} attend${todoTotal > 1 ? "ent" : ""} votre décision.`
                : "Rien n'attend votre décision pour le moment."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/radar" className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full border border-white/15 bg-white/[0.05] hover:bg-white/10 text-sm font-medium text-white transition-colors">
              <Binoculars size={18} /> Prospection <ArrowSquareOut size={14} className="text-white/50" />
            </Link>
          </div>
        </div>

        {/* Sécurité de la session */}
        {twoFactor !== null && (
          <div className="mb-6 rounded-2xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3" style={twoFactor ? TONE.green : TONE.amber}>
            {twoFactor ? <ShieldCheck size={22} weight="fill" className="shrink-0" /> : <ShieldWarning size={22} weight="fill" className="shrink-0" />}
            <p className="text-sm leading-relaxed flex-1" style={{ color: "#ffffff" }}>
              {twoFactor
                ? "Session protégée par la double authentification. Chaque action faite ici est enregistrée dans le journal."
                : "Votre compte administrateur n'est protégé que par un mot de passe. Activez la double authentification (code à 6 chiffres) : un mot de passe volé ne suffira plus pour entrer ici."}
            </p>
            {!twoFactor && (
              <Link to="/settings" className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-full bg-white text-black text-sm font-semibold shrink-0 hover:bg-white/90">
                Activer maintenant
              </Link>
            )}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          {/* Menu : une colonne sur ordinateur, une liste déroulante sur téléphone */}
          <nav aria-label="Rubriques de l'administration" className="w-full lg:w-[280px] shrink-0 lg:sticky lg:top-[calc(var(--nav-clearance)+1rem)]">
            <label htmlFor="admin-section" className="sr-only">Rubrique</label>
            <select id="admin-section" value={section} onChange={(e) => go(e.target.value)}
              className="lg:hidden w-full min-h-[48px] rounded-2xl bg-[#232229] border border-white/15 px-4 text-[15px] text-white outline-none focus:border-primary/60">
              {SECTIONS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map((s: any) => <option key={s.id} value={s.id}>{s.label}{s.todo && todo?.[s.todo] ? ` (${todo[s.todo]})` : ""}</option>)}
                </optgroup>
              ))}
            </select>
            <div className="hidden lg:block rounded-3xl border border-white/10 bg-[#232229]/95 p-3">
              {SECTIONS.map((g) => (
                <div key={g.group} className="mb-2 last:mb-0">
                  <p className="px-3 pt-2 pb-1.5 text-xs font-semibold uppercase tracking-widest text-white/45">{g.group}</p>
                  {g.items.map((s: any) => {
                    const active = s.id === section;
                    const n = s.todo ? todo?.[s.todo] ?? 0 : 0;
                    return (
                      <button key={s.id} type="button" onClick={() => go(s.id)} aria-current={active ? "page" : undefined}
                        className={`w-full flex items-center gap-3 min-h-[44px] px-3 rounded-xl text-left text-[15px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${active ? "bg-primary text-white font-medium" : "text-white/80 hover:bg-white/5 hover:text-white"}`}>
                        <s.Icon size={19} weight={active ? "fill" : "regular"} className="shrink-0" />
                        <span className="flex-1 min-w-0 truncate">{s.label}</span>
                        {n > 0 && <span className="min-w-[1.5rem] px-1.5 py-0.5 rounded-full text-xs font-bold text-center" style={{ background: active ? "rgba(255,255,255,0.25)" : "#dc2626", color: "#ffffff" }}>{n}</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </nav>

          <section aria-label={currentLabel} className="flex-1 min-w-0 w-full">
            <Suspense fallback={<Loading />}>
              <Current />
            </Suspense>
          </section>
        </div>
      </main>
    </div>
  );
}
