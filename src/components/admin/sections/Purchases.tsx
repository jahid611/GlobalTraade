"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowSquareOut, Info } from "@/components/icons/ph";
import { euros, getOverview, listPurchases, type AdminPurchase } from "@/services/adminService";
import { Card, Empty, ErrorBox, Loading, Pill, SectionHeader, Stat, TONE, btnPrimary, fmtDateTime } from "../ui";
import { FilterTabs, MemberLink } from "./_moderation";

type KindFilter = "all" | AdminPurchase["kind"];

const LIMIT = 500;
const TARGET: Record<string, string> = { listing: "d'une annonce", project: "d'un projet", search_ad: "d'une recherche de repreneur" };

function what(p: AdminPurchase) {
  if (p.kind === "unlock") return `Déblocage ${TARGET[p.detail || ""] || "d'une fiche"}`;
  return `Contact de prospection${p.detail ? ` - ${p.detail}` : ""}`;
}
function reference(p: AdminPurchase) {
  if (!p.target_id) return null;
  return p.kind === "prospection" ? `SIREN ${p.target_id}` : `Réf. ${p.target_id.slice(0, 8)}`;
}

export default function Purchases() {
  const [kind, setKind] = useState<KindFilter>("all");

  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "purchases"], queryFn: () => listPurchases(LIMIT) });
  // Les totaux exacts viennent de la vue d'ensemble (calculés en base sur tous les achats).
  const { data: overview } = useQuery({ queryKey: ["admin", "overview"], queryFn: getOverview, refetchInterval: 60_000 });
  const rev = overview?.revenue;

  const counts = useMemo(() => ({
    unlock: (data || []).filter((p) => p.kind === "unlock").length,
    prospection: (data || []).filter((p) => p.kind === "prospection").length,
  }), [data]);
  const rows = useMemo(() => (data || []).filter((p) => kind === "all" || p.kind === kind), [data, kind]);
  const shownTotal = useMemo(() => rows.reduce((s, p) => s + (p.amount_cents || 0), 0), [rows]);

  return (
    <div>
      <SectionHeader
        title="Paiements"
        description="Les achats à l'unité enregistrés dans la base : déblocages de fiches et contacts de prospection payants."
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <Stat label="Total encaissé" value={rev ? euros(rev.unlocks_cents_total + rev.prospection_cents_total) : "…"} hint="Achats à l'unité, depuis le début" />
        <Stat label="30 derniers jours" value={rev ? euros(rev.unlocks_cents_30d + rev.prospection_cents_30d) : "…"} hint="Achats à l'unité" />
        <Stat label="Déblocages" value={rev ? euros(rev.unlocks_cents_total) : "…"} hint={rev ? `${rev.unlocks_count} achat${rev.unlocks_count > 1 ? "s" : ""} · ${euros(rev.unlocks_cents_30d)} sur 30 jours` : undefined} />
        <Stat label="Prospection" value={rev ? euros(rev.prospection_cents_total) : "…"} hint={rev ? `${euros(rev.prospection_cents_30d)} sur 30 jours` : undefined} />
      </div>

      <div className="rounded-2xl border p-4 sm:p-5 mb-6 flex flex-col md:flex-row md:items-center gap-4" style={{ background: TONE.violet.background, borderColor: TONE.violet.borderColor }}>
        <Info size={24} weight="fill" className="shrink-0" style={{ color: TONE.violet.color }} aria-hidden />
        <p className="text-sm text-white leading-relaxed flex-1">
          <strong className="font-semibold">Les abonnements (Pro, Business) et les mises en avant payantes ne figurent pas ici.</strong>{" "}
          Ces paiements, les factures et les remboursements se consultent et se gèrent dans votre tableau de bord Stripe.
          {rev ? ` La base compte ${rev.subscribers} abonné${rev.subscribers > 1 ? "s" : ""} en cours.` : ""}
        </p>
        <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className={`${btnPrimary} shrink-0`} style={{ color: "#ffffff" }}>
          Ouvrir Stripe <ArrowSquareOut size={16} />
        </a>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
        <FilterTabs label="Filtrer les achats" value={kind} onChange={(k) => setKind(k as typeof kind)}
          options={[
            { id: "all", label: "Tous", count: data?.length ?? 0 },
            { id: "unlock", label: "Déblocages", count: counts.unlock },
            { id: "prospection", label: "Prospection", count: counts.prospection },
          ]} />
        {rows.length > 0 && (
          <p className="text-sm text-white/65">
            {rows.length} achat{rows.length > 1 ? "s" : ""} affiché{rows.length > 1 ? "s" : ""} · <span className="text-white font-medium tabular-nums">{euros(shownTotal)}</span>
          </p>
        )}
      </div>

      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : rows.length === 0 ? (
        <Empty title="Aucun achat enregistré" hint={kind === "all" ? "Les achats à l'unité apparaîtront ici dès le premier paiement." : "Aucun achat de ce type pour le moment."} />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden md:grid grid-cols-[11rem_minmax(0,1fr)_minmax(0,1.4fr)_8rem] gap-4 px-5 py-3 border-b border-white/10 text-[13px] font-semibold text-white/55">
            <span>Date</span><span>Membre</span><span>Achat</span><span className="text-right">Montant</span>
          </div>
          <ul className="divide-y divide-white/10">
            {rows.map((p) => (
              <li key={`${p.kind}-${p.id}`} className="px-4 sm:px-5 py-4 md:py-3 flex flex-col gap-1.5 md:grid md:grid-cols-[11rem_minmax(0,1fr)_minmax(0,1.4fr)_8rem] md:gap-4 md:items-center">
                <span className="text-[13px] md:text-sm text-white/60 order-3 md:order-none">{fmtDateTime(p.created_at)}</span>
                <span className="min-w-0 text-sm order-2 md:order-none flex">
                  <MemberLink id={p.user_id} name={p.member_name} className="text-white max-w-full" />
                </span>
                <span className="min-w-0 order-1 md:order-none">
                  <span className="flex flex-wrap items-center gap-2">
                    <Pill tone={p.kind === "unlock" ? "violet" : "green"}>{p.kind === "unlock" ? "Déblocage" : "Prospection"}</Pill>
                    <span className="text-[15px] md:text-sm text-white break-words">{what(p)}</span>
                  </span>
                  {reference(p) && <span className="block text-[13px] text-white/45 mt-1">{reference(p)}</span>}
                </span>
                <span className="text-lg md:text-[15px] font-medium text-white tabular-nums md:text-right order-4 md:order-none">
                  {p.amount_cents == null ? "—" : euros(p.amount_cents)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(data?.length ?? 0) >= LIMIT && (
        <p className="text-sm text-white/55 mt-3">Seuls les {LIMIT} achats les plus récents sont listés. Les totaux en haut de page, eux, portent sur tous les achats.</p>
      )}
    </div>
  );
}
