"use client";

// Briques communes aux rubriques Vue d'ensemble, Membres, Annonces, Projets et
// Recherches : exécution d'une action, propriétaire d'une publication, filtres,
// mise en avant et suppression.

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CaretLeft, CaretRight, RocketLaunch, Trash, User } from "@/components/icons/ph";
import { supabase } from "@/integrations/supabase/client";
import { deleteContent, setBoost, type ContentType } from "@/services/adminService";
import { showSuccess } from "@/utils/toast";
import { regionLabel } from "@/lib/geoRegions";
import { ConfirmDialog, Pill, TONE, btnSmall, fmtDate, inputCls } from "../ui";

/** Membres par page. */
export const PAGE = 50;

export const eur = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
export const nb = (n: number | null | undefined) => new Intl.NumberFormat("fr-FR").format(n || 0);
export const isBoosted = (until: string | null | undefined) => !!until && new Date(until).getTime() > Date.now();
export const toList = (s: string | string[] | null | undefined): string[] =>
  typeof s === "string" && s.trim() ? s.split(",").map((x) => x.trim()).filter(Boolean) : Array.isArray(s) ? s : [];

/**
 * Exécute une action d'administration : en cas de succès, rafraîchit toutes les
 * données de l'administration (dont ["admin", "overview"], les pastilles du
 * menu) et confirme ; en cas de refus, l'erreur de la base remonte à la
 * fenêtre de confirmation, qui l'affiche et reste ouverte.
 */
export function useAdminAction() {
  const queryClient = useQueryClient();
  return async (action: () => Promise<unknown>, success: string) => {
    // Un refus de la base remonte tel quel : la fenêtre de confirmation l'affiche.
    await action();
    await queryClient.invalidateQueries({ queryKey: ["admin"] });
    showSuccess(success);
  };
}

/** Passe à une autre rubrique (et, au besoin, ouvre la fiche d'un membre). */
export function useAdminNav() {
  const [params, setParams] = useSearchParams();
  return (section: string, memberId?: string) => {
    const next = new URLSearchParams(params);
    next.set("section", section);
    if (memberId) next.set("member", memberId); else next.delete("member");
    setParams(next);
    if (!memberId) window.scrollTo({ top: 0 });
  };
}

/** Noms des propriétaires d'une liste de publications. */
export function useOwners(ids: (string | null | undefined)[]) {
  const unique = useMemo(() => Array.from(new Set(ids.filter(Boolean) as string[])).sort(), [ids]);
  const { data } = useQuery({
    queryKey: ["admin", "owners", unique],
    enabled: unique.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("safe_profiles").select("id, full_name, company_name").in("id", unique);
      if (error) throw new Error(error.message);
      return Object.fromEntries((data || []).map((p: any) => [p.id, p.full_name || p.company_name || "Membre sans nom"])) as Record<string, string>;
    },
  });
  return data || {};
}

/** Le propriétaire d'une publication : ouvre sa fiche dans la rubrique Membres. */
export function OwnerLink({ id, name }: { id: string | null | undefined; name?: string | null }) {
  const go = useAdminNav();
  if (!id) return <span className="text-white/50">Inconnu</span>;
  return (
    <button type="button" onClick={() => go("members", id)} title="Ouvrir la fiche de ce membre"
      className="inline-flex items-center gap-1.5 max-w-full min-h-[44px] sm:min-h-0 sm:py-1 text-left text-[13px] font-medium underline underline-offset-4 decoration-white/30 hover:decoration-white outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded"
      style={{ color: TONE.violet.color }}>
      <User size={15} className="shrink-0" /> <span className="truncate">{name || "Voir le membre"}</span>
    </button>
  );
}

/** Une rangée de filtres : un seul choix à la fois. */
export function FilterChips<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} type="button" aria-pressed={active} onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full border text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${active ? "bg-primary border-primary text-white font-semibold [text-shadow:none]" : "border-white/15 bg-white/[0.04] text-white/80 hover:bg-white/10"}`}>
            {o.label}
            {o.count != null && <span className={`text-xs tabular-nums ${active ? "text-white/85" : "text-white/50"}`}>{nb(o.count)}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function SortSelect<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <label className="flex items-center gap-2 text-sm text-white/65 shrink-0">
      <span className="whitespace-nowrap">Trier par</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className={`${inputCls} !w-auto pr-8 bg-[#232229]`}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

/** Une information d'une fiche : petit libellé, valeur dessous. */
export function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-xs text-white/50">{label}</p>
      <div className="text-sm text-white mt-0.5 break-words">{children}</div>
    </div>
  );
}

export function BoostPill({ until }: { until: string | null | undefined }) {
  if (!isBoosted(until)) return null;
  return <Pill tone="violet"><RocketLaunch size={13} weight="fill" /> En avant jusqu'au {fmtDate(until)}</Pill>;
}

/** Vrai quand la valeur n'a pas bougé depuis `ms` : évite une requête par lettre tapée. */
export function useDebounced<T>(value: T, ms = 300): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => { const t = setTimeout(() => setSettled(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return settled;
}

/** Précédents / Suivants d'une liste paginée par la base, avec « X à Y sur N ». */
export function Pager({ page, size, shown, total, onPage, label }: {
  page: number; size: number; shown: number; total: number; onPage: (page: number) => void; label: string;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  const from = total === 0 ? 0 : page * size + 1;
  const go = (next: number) => { onPage(next); window.scrollTo({ top: 0 }); };
  return (
    <nav aria-label={`Pages de la liste des ${label}`} className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
      <p className="text-sm text-white/60 tabular-nums" aria-live="polite">{nb(from)} à {nb(Math.min(page * size + shown, total))} sur {nb(total)} · page {page + 1} sur {pages}</p>
      <div className="flex gap-2">
        <button type="button" className={btnSmall + " !min-h-[44px]"} disabled={page === 0} onClick={() => go(page - 1)}><CaretLeft size={15} /> Précédents</button>
        <button type="button" className={btnSmall + " !min-h-[44px]"} disabled={page + 1 >= pages} onClick={() => go(page + 1)}>Suivants <CaretRight size={15} /></button>
      </div>
    </nav>
  );
}

const NOUN: Record<ContentType, { the: string; this: string; done: string }> = {
  listing: { the: "l'annonce", this: "cette annonce", done: "Annonce" },
  project: { the: "le projet", this: "ce projet", done: "Projet" },
  search_ad: { the: "la recherche", this: "cette recherche", done: "Recherche" },
};

/** Offrir une mise en avant de 7 ou 30 jours, ou la retirer. */
export function BoostControl({ type, id, label, until }: { type: ContentType; id: string; label: string; until: string | null | undefined }) {
  const run = useAdminAction();
  const [open, setOpen] = useState<"give" | "remove" | null>(null);
  const [days, setDays] = useState(7);
  const boosted = isBoosted(until);
  return (
    <>
      <button type="button" className={btnSmall + " !min-h-[44px]"} onClick={() => { setDays(7); setOpen("give"); }}>
        <RocketLaunch size={16} /> {boosted ? "Prolonger" : "Mettre en avant"}
      </button>
      {boosted && <button type="button" className={btnSmall + " !min-h-[44px]"} onClick={() => setOpen("remove")}>Retirer la mise en avant</button>}
      <ConfirmDialog
        open={open === "give"}
        title={`Mettre en avant ${NOUN[type].the} « ${label} » ?`}
        description={
          <>
            <p>La mise en avant est <strong className="text-white">offerte</strong> : rien n'est facturé au membre. Elle commence maintenant{boosted ? " et remplace celle en cours" : ""}.</p>
            <div role="radiogroup" aria-label="Durée de la mise en avant" className="grid grid-cols-2 gap-2 mt-3">
              {[7, 30].map((d) => (
                <button key={d} type="button" role="radio" aria-checked={days === d} onClick={() => setDays(d)}
                  className="min-h-[44px] rounded-xl border text-sm font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  style={days === d ? TONE.violet : { borderColor: "rgba(255,255,255,0.15)" }}>
                  {d} jours
                </button>
              ))}
            </div>
          </>
        }
        confirmLabel={`Offrir ${days} jours`}
        onConfirm={() => run(() => setBoost(type, id, days), `Mise en avant offerte pour ${days} jours`)}
        onClose={() => setOpen(null)}
      />
      <ConfirmDialog
        open={open === "remove"}
        title={`Retirer la mise en avant de « ${label} » ?`}
        description={`Elle devait durer jusqu'au ${fmtDate(until)}. La publication reste en ligne, à sa place normale.`}
        confirmLabel="Retirer la mise en avant"
        onConfirm={() => run(() => setBoost(type, id, 0), "Mise en avant retirée")}
        onClose={() => setOpen(null)}
      />
    </>
  );
}

/** Supprimer définitivement une publication (il faut recopier SUPPRIMER). */
export function DeleteControl({ type, id, label }: { type: ContentType; id: string; label: string }) {
  const run = useAdminAction();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={btnSmall + " !min-h-[44px]"} style={{ color: TONE.red.color, borderColor: TONE.red.borderColor }} onClick={() => setOpen(true)}>
        <Trash size={16} /> Supprimer
      </button>
      <ConfirmDialog
        open={open}
        danger
        typeToConfirm="SUPPRIMER"
        title={`Supprimer ${NOUN[type].this} ?`}
        description={<>« {label} » sera supprimée définitivement, avec ce qui lui est rattaché. <strong className="text-white">Cette action ne peut pas être annulée.</strong> Pour la retirer du site sans la perdre, mettez-la plutôt en pause.</>}
        confirmLabel="Supprimer définitivement"
        onConfirm={() => run(() => deleteContent(type, id), `${NOUN[type].done} supprimé${type === "project" ? "" : "e"}`)}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

/** Libellés français des secteurs et des régions, quelle que soit la langue du compte. */
export function useFrenchLabels() {
  const { i18n } = useTranslation();
  return useMemo(() => {
    const t = i18n.getFixedT("fr");
    return {
      sector: (key: string | null | undefined) => (key ? (t(`industry.${key}`, { defaultValue: key }) as string) : "—"),
      sectors: (s: string | null | undefined) => toList(s).map((k) => t(`industry.${k}`, { defaultValue: k }) as string),
      regions: (s: string | null | undefined) => toList(s).map((k) => regionLabel(k) || k),
    };
  }, [i18n]);
}

// ── Lectures (vues sécurisées : la base renvoie tout à un administrateur) ────
async function readAll<T>(view: string): Promise<T[]> {
  const { data, error } = await supabase.from(view).select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as T[];
}
export const useAdminListings = () => useQuery({ queryKey: ["admin", "listings"], queryFn: () => readAll<import("@/types/domain").Listing>("listings_secure") });
