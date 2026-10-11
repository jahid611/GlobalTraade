"use client";

// Briques communes aux rubriques de modération (vérifications, signalements,
// avis, contact, paiements, journal) : noms des membres, filtres, écritures
// vérifiées.

import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowSquareOut } from "phosphor-react";
import { supabase } from "@/integrations/supabase/client";
import { TONE } from "../ui";

export interface MiniProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  contact_email: string | null;
  company_name: string | null;
}

/** Noms et photos des membres cités dans une liste (une seule lecture pour tous). */
export function useProfiles(ids: (string | null | undefined)[]) {
  const unique = Array.from(new Set(ids.filter((x): x is string => !!x))).sort();
  const { data } = useQuery({
    queryKey: ["admin", "mini-profiles", unique.join(",")],
    enabled: unique.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("safe_profiles")
        .select("id, full_name, avatar_url, contact_email, company_name")
        .in("id", unique);
      if (error) throw new Error(error.message);
      return (data || []) as MiniProfile[];
    },
  });
  return new Map((data || []).map((p) => [p.id, p]));
}

/**
 * Une écriture directe (update / delete terminés par `.select('id')`) : la base
 * peut ne toucher aucune ligne sans renvoyer d'erreur — c'est alors un échec.
 */
export async function mustWrite(write: PromiseLike<{ data: unknown[] | null; error: { message?: string } | null }>) {
  const { data, error } = await write;
  if (error) throw new Error(error.message || "La base a refusé cette action.");
  if (!data || data.length === 0) throw new Error("La base n'a rien modifié : l'élément n'existe plus ou vos droits ne le permettent pas.");
}

/** Recharge les listes concernées et les pastilles du menu. */
export function useRefresh(...keys: string[]) {
  const qc = useQueryClient();
  return () => {
    keys.forEach((k) => qc.invalidateQueries({ queryKey: ["admin", k] }));
    qc.invalidateQueries({ queryKey: ["admin", "overview"] });
  };
}

export const errorText = (e: unknown) => (e instanceof Error ? e.message : "L'action a échoué.");

export function Avatar({ name, url, size = 40 }: { name?: string | null; url?: string | null; size?: number }) {
  const style = { width: size, height: size };
  if (url) return <img src={url} alt="" style={style} className="rounded-full object-cover border border-white/10 shrink-0" />;
  return (
    <span style={style} aria-hidden className="rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-sm font-medium text-white/80 shrink-0">
      {(name || "?").trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

/** Le nom d'un membre, qui ouvre son profil public dans un nouvel onglet. */
export function MemberLink({ id, name, className = "" }: { id: string | null | undefined; name?: string | null; className?: string }) {
  const label = name?.trim() || "Membre sans nom";
  if (!id) return <span className={className}>{label}</span>;
  return (
    <a href={`/profile/${id}`} target="_blank" rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 min-w-0 underline decoration-white/30 underline-offset-4 hover:decoration-white outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded ${className}`}>
      <span className="truncate">{label}</span>
      <ArrowSquareOut size={14} className="shrink-0 text-white/50" aria-hidden />
    </a>
  );
}

/** Filtres en pastilles, avec le nombre d'éléments de chaque catégorie. */
export function FilterTabs<T extends string>({ value, onChange, options, label }: {
  value: T;
  onChange: (v: T) => void;
  // NoInfer : le type vient de `value`, pas des identifiants écrits dans la liste
  options: { id: NoInfer<T>; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button key={o.id} type="button" onClick={() => onChange(o.id)} aria-pressed={active}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full border text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            style={active ? { ...TONE.violet, color: "#ffffff" } : { borderColor: "rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.8)" }}>
            {o.label}
            {o.count !== undefined && <span className="tabular-nums text-[13px]" style={{ color: active ? "#ffffff" : "rgba(255,255,255,0.55)" }}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Un bloc de texte cité (message, commentaire, justification). */
export function Quote({ label, children, tone }: { label?: string; children: React.ReactNode; tone?: keyof typeof TONE }) {
  return (
    <div className="rounded-xl border px-4 py-3" style={tone ? { background: TONE[tone].background, borderColor: TONE[tone].borderColor } : { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }}>
      {label && <p className="text-[13px] font-semibold text-white/60 mb-1">{label}</p>}
      <div className="text-[15px] text-white/90 leading-relaxed whitespace-pre-wrap break-words">{children}</div>
    </div>
  );
}

/** Bouton coloré (vert « valider », rouge « supprimer ») : vraies couleurs en inline. */
export const toneBtn =
  "inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-full border text-sm font-semibold transition-opacity hover:opacity-85 outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50 disabled:pointer-events-none";
