"use client";

// Briques communes de l'administration : mêmes cartes, mêmes pastilles, mêmes
// confirmations dans toutes les rubriques.
//
// Rappel couleurs : tailwind.config.ts remplace emerald/red/amber/blue par des
// violets. Une vraie couleur (vert « en ligne », rouge « danger ») s'écrit donc
// en style inline, comme ici.

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CircleNotch, Warning, X, MagnifyingGlass } from "@/components/icons/ph";

export const TONE = {
  green: { color: "#6ee7b7", background: "rgba(16,185,129,0.14)", borderColor: "rgba(16,185,129,0.38)" },
  amber: { color: "#fcd34d", background: "rgba(245,158,11,0.14)", borderColor: "rgba(245,158,11,0.38)" },
  red: { color: "#fca5a5", background: "rgba(239,68,68,0.14)", borderColor: "rgba(239,68,68,0.4)" },
  violet: { color: "#c7c4ff", background: "rgba(120,114,251,0.16)", borderColor: "rgba(120,114,251,0.42)" },
  grey: { color: "rgba(255,255,255,0.75)", background: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.2)" },
} as const;
export type ToneName = keyof typeof TONE;

/** Titre d'une rubrique, avec sa phrase d'explication et ses actions à droite. */
export function SectionHeader({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h2 className="text-2xl md:text-[1.7rem] font-medium text-white leading-tight tracking-tight">{title}</h2>
        {description && <p className="text-sm md:text-[15px] text-white/65 font-light mt-1.5 leading-relaxed max-w-3xl">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 shrink-0">{children}</div>}
    </header>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-white/10 bg-[#232229]/95 ${className}`}>{children}</div>;
}

/** Un chiffre clé. `tone` colore la valeur quand elle demande l'attention. */
export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: ToneName }) {
  return (
    <Card className="p-4 sm:p-5">
      <p className="text-[13px] text-white/60">{label}</p>
      <p className="text-3xl font-light tabular-nums mt-1" style={{ color: tone ? TONE[tone].color : "#ffffff" }}>{value}</p>
      {hint && <p className="text-xs text-white/50 font-light mt-1.5 leading-relaxed">{hint}</p>}
    </Card>
  );
}

export function Pill({ tone = "grey", children }: { tone?: ToneName; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap" style={TONE[tone]}>
      {children}
    </span>
  );
}

export const btn =
  "inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-full border border-white/15 bg-white/[0.05] hover:bg-white/10 text-sm font-medium text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50 disabled:pointer-events-none";
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-full bg-primary hover:bg-primary/90 text-sm font-semibold text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50 disabled:pointer-events-none [text-shadow:none]";
export const btnSmall =
  "inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 rounded-full border border-white/15 bg-white/[0.05] hover:bg-white/10 text-[13px] font-medium text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50 disabled:pointer-events-none";
export const inputCls =
  "w-full min-h-[44px] rounded-xl bg-white/5 border border-white/15 px-4 text-[15px] text-white placeholder:text-white/35 outline-none focus:border-primary/60";

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full sm:max-w-sm">
      <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/45 pointer-events-none" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className={`${inputCls} pl-10`} />
    </div>
  );
}

export function Loading({ label = "Chargement…" }: { label?: string }) {
  return <div className="py-16 flex items-center justify-center gap-3 text-white/60"><CircleNotch size={22} className="animate-spin" /> {label}</div>;
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="py-12 px-6 text-center rounded-2xl border border-dashed border-white/20 bg-black/20">
      <p className="text-white font-medium">{title}</p>
      {hint && <p className="text-sm text-white/60 font-light mt-1.5">{hint}</p>}
    </div>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  return (
    <div role="alert" className="rounded-2xl border p-4 text-sm" style={TONE.red}>
      {error instanceof Error ? error.message : "Une erreur est survenue."}
    </div>
  );
}

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";
export const fmtDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

/**
 * Confirmation d'une action d'administration.
 * - `danger` : bouton rouge ;
 * - `typeToConfirm` : il faut recopier ce mot pour valider (suppressions) ;
 * - `reason` : demande un motif (transmis à onConfirm).
 * Le bouton attend la fin de l'action et affiche l'erreur de la base s'il y en a une.
 */
export function ConfirmDialog({
  open, title, description, confirmLabel, danger = false, typeToConfirm, reason, onConfirm, onClose,
}: {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  typeToConfirm?: string;
  reason?: { label: string; placeholder?: string; minLength?: number };
  onConfirm: (reason: string) => Promise<void> | void;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setTyped(""); setWhy(""); setError(null); setBusy(false); } }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);
  if (!open || typeof document === "undefined") return null;

  const ready = (!typeToConfirm || typed.trim().toLowerCase() === typeToConfirm.trim().toLowerCase())
    && (!reason || why.trim().length >= (reason.minLength ?? 5));

  const run = async () => {
    setBusy(true); setError(null);
    try { await onConfirm(why.trim()); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : "L'action a échoué."); setBusy(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => !busy && onClose()} />
      <div className="relative w-full max-w-md rounded-3xl border border-white/15 p-6 text-white" style={{ background: "#232229", boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Fermer" className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-white/60">
          <X size={18} />
        </button>
        <div className="flex items-start gap-3 pr-8">
          {danger && <span className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border" style={TONE.red}><Warning size={20} weight="fill" /></span>}
          <div className="min-w-0">
            <h3 className="text-lg font-medium leading-snug">{title}</h3>
            {description && <div className="text-sm text-white/70 font-light leading-relaxed mt-1.5">{description}</div>}
          </div>
        </div>
        {reason && (
          <div className="mt-4">
            <label htmlFor="confirm-reason" className="block text-sm font-medium mb-1.5">{reason.label}</label>
            <textarea id="confirm-reason" rows={3} maxLength={500} value={why} onChange={(e) => setWhy(e.target.value)} placeholder={reason.placeholder}
              className="w-full rounded-xl bg-white/5 border border-white/15 px-4 py-3 text-[15px] text-white placeholder:text-white/35 outline-none focus:border-primary/60 resize-none" />
          </div>
        )}
        {typeToConfirm && (
          <div className="mt-4">
            <label htmlFor="confirm-typed" className="block text-sm text-white/80 mb-1.5">Pour confirmer, recopiez : <strong className="text-white">{typeToConfirm}</strong></label>
            <input id="confirm-typed" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className={inputCls} />
          </div>
        )}
        {error && <p role="alert" className="mt-4 text-sm rounded-xl border px-3 py-2" style={TONE.red}>{error}</p>}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className={btn}>Annuler</button>
          <button type="button" onClick={run} disabled={!ready || busy}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-full text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-50 disabled:pointer-events-none"
            style={{ background: danger ? "#dc2626" : "#5955e8" }}>
            {busy && <CircleNotch size={16} className="animate-spin" />} {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
