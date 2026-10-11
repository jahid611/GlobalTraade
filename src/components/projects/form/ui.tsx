"use client";

// Briques visuelles du formulaire de projet (ProjectForm) et du bloc dossier
// (ProjectDossier). Aucune logique métier ici : uniquement de la présentation.

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, WarningCircle, X } from "phosphor-react";
import type { HelpType } from "@/services/projectService";

// tailwind.config.ts remappe emerald / red / amber / blue… sur des violets et des
// gris : les vraies couleurs passent donc par des styles inline (comme BusinessCard).
export interface Tone { rgb: string; text: string; }

export const HELP_TONES: Record<HelpType, Tone> = {
  financial: { rgb: "16,185,129", text: "#6ee7b7" },
  human: { rgb: "59,130,246", text: "#93c5fd" },
  material: { rgb: "245,158,11", text: "#fcd34d" },
  expertise: { rgb: "168,85,247", text: "#d8b4fe" },
  network: { rgb: "236,72,153", text: "#f9a8d4" },
};

export const TONE_SUCCESS: Tone = { rgb: "16,185,129", text: "#6ee7b7" };
export const TONE_WARNING: Tone = { rgb: "245,158,11", text: "#fcd34d" };
export const TONE_DANGER: Tone = { rgb: "239,68,68", text: "#fca5a5" };
export const TONE_NEUTRAL: Tone = { rgb: "210,209,221", text: "#d2d1dd" };

export const toneBg = (tone: Tone, alpha = 0.14) => `rgba(${tone.rgb},${alpha})`;
export const toneBorder = (tone: Tone, alpha = 0.4) => `rgba(${tone.rgb},${alpha})`;

// 16 px sur mobile : en dessous, iOS zoome sur le champ au focus.
export const inputCls =
  "w-full min-h-[48px] bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white text-base sm:text-sm placeholder-white/30 outline-none focus:border-primary focus:bg-white/[0.07] transition-colors";

export const dropdownButtonCls =
  "w-full flex items-center justify-between gap-2 bg-white/5 border border-white/15 rounded-2xl px-4 min-h-[48px] text-white text-base sm:text-sm text-left outline-none hover:border-white/30 focus-visible:border-primary transition-colors";

export const invalidStyle = (invalid?: boolean): React.CSSProperties | undefined =>
  invalid ? { borderColor: toneBorder(TONE_DANGER, 0.75) } : undefined;

// ---------------------------------------------------------------------------
// Champ : libellé en clair, aide courte, erreur au plus près
// ---------------------------------------------------------------------------
export function Field({
  label, htmlFor, required, optional, hint, error, children, className = "",
}: {
  label: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className={className} data-error={error ? "true" : undefined}>
      <label htmlFor={htmlFor} className="flex items-baseline gap-2 text-sm font-medium text-white/90 mb-2">
        <span>
          {label}
          {required && <span aria-hidden="true" style={{ color: TONE_DANGER.text }}> *</span>}
        </span>
        {optional && <span className="text-xs font-normal text-white/40">{t('pf.optional', 'facultatif')}</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="flex items-start gap-1.5 text-xs mt-2 leading-snug" style={{ color: TONE_DANGER.text }}>
          <WarningCircle className="w-4 h-4 shrink-0" weight="fill" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="text-xs text-white/50 font-light mt-2 leading-relaxed">{hint}</p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Indicateur d'étapes : pastilles numérotées, cliquables
// ---------------------------------------------------------------------------
export function StepIndicator({
  steps, current, onSelect,
}: {
  steps: string[];
  current: number;
  onSelect: (i: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('pf.steps_nav', 'Étapes du formulaire')}>
      <ol className="flex items-center">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={s} className={`flex items-center ${i < steps.length - 1 ? "flex-1" : ""}`}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-current={active ? "step" : undefined}
                aria-label={`${i + 1}. ${s}`}
                className="group flex items-center gap-2 min-h-[44px] min-w-[44px] justify-center sm:justify-start outline-none"
              >
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-all group-focus-visible:ring-2 group-focus-visible:ring-white/60 ${
                    active
                      ? "bg-primary text-white shadow-[0_6px_18px_rgba(89,85,232,0.55)]"
                      : done
                        ? "bg-primary/30 text-white border border-primary/60"
                        : "bg-white/5 text-white/50 border border-white/15 group-hover:border-white/40 group-hover:text-white"
                  }`}
                >
                  {done ? <Check className="w-4 h-4" weight="bold" /> : i + 1}
                </span>
                <span className={`hidden sm:block text-xs whitespace-nowrap transition-colors ${active ? "text-white font-semibold" : done ? "text-white/70" : "text-white/45 group-hover:text-white/80"}`}>
                  {s}
                </span>
              </button>
              {i < steps.length - 1 && (
                <span aria-hidden="true" className={`flex-1 h-0.5 rounded-full mx-1.5 sm:mx-2.5 transition-colors ${done ? "bg-primary" : "bg-white/10"}`} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Grande carte à cocher (type d'aide)
// ---------------------------------------------------------------------------
export function HelpCard({
  tone, icon: Icon, title, description, checked, onToggle, className = "",
}: {
  tone: Tone;
  icon: React.ElementType;
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={`group w-full text-left rounded-3xl border p-4 flex items-center gap-4 min-h-[84px] outline-none transition-all active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-white/50 ${checked ? "" : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/25"} ${className}`}
      style={checked ? { background: toneBg(tone, 0.13), borderColor: toneBorder(tone, 0.65), boxShadow: `0 10px 30px rgba(${tone.rgb},0.14)` } : undefined}
    >
      <span
        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border"
        style={{ background: toneBg(tone, checked ? 0.28 : 0.14), borderColor: toneBorder(tone, 0.35), color: tone.text }}
      >
        <Icon className="w-6 h-6" weight={checked ? "fill" : "regular"} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-base font-medium text-white leading-tight">{title}</span>
        <span className="block text-sm text-white/60 font-light mt-1 leading-snug">{description}</span>
      </span>
      <span
        aria-hidden="true"
        className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${checked ? "" : "border-white/25 group-hover:border-white/50"}`}
        style={checked ? { background: `rgb(${tone.rgb})`, borderColor: `rgb(${tone.rgb})`, color: "#0f0e13" } : undefined}
      >
        {checked && <Check className="w-4 h-4" weight="bold" />}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Bloc coloré d'une aide (détails financement, équipe, matériel, expertise)
// ---------------------------------------------------------------------------
export function ToneSection({
  tone, icon: Icon, title, description, children,
}: {
  tone: Tone;
  icon: React.ElementType;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border p-4 sm:p-5" style={{ background: toneBg(tone, 0.06), borderColor: toneBorder(tone, 0.28) }}>
      <header className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border" style={{ background: toneBg(tone, 0.2), borderColor: toneBorder(tone, 0.35), color: tone.text }}>
          <Icon className="w-5 h-5" weight="fill" />
        </span>
        <div className="min-w-0 pt-0.5">
          <h4 className="text-base font-medium leading-tight" style={{ color: tone.text }}>{title}</h4>
          {description && <p className="text-sm text-white/60 font-light mt-1 leading-snug">{description}</p>}
        </div>
      </header>
      {children && <div className="mt-4 space-y-4">{children}</div>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Pastille d'état colorée
// ---------------------------------------------------------------------------
export function TonePill({
  tone, icon: Icon, children, className = "",
}: {
  tone: Tone;
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${className}`}
      style={{ background: toneBg(tone, 0.16), color: tone.text, borderColor: toneBorder(tone, 0.4) }}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" weight="fill" />}
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Saisie d'une liste de mots (domaines d'expertise) sous forme d'étiquettes
// ---------------------------------------------------------------------------
export function TagInput({
  id, value, onChange, placeholder, tone, removeLabel,
}: {
  id?: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  tone: Tone;
  removeLabel: (tag: string) => string;
}) {
  const [text, setText] = useState("");

  const commit = (raw: string) => {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) onChange([...value, ...parts.filter((p) => !value.includes(p))]);
    setText("");
  };

  return (
    <div className="space-y-2.5">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <li key={tag} className="inline-flex items-center gap-1 pl-3 pr-1 min-h-[36px] rounded-full border text-sm"
              style={{ background: toneBg(tone, 0.16), borderColor: toneBorder(tone, 0.4), color: tone.text }}>
              <span className="break-all">{tag}</span>
              <button type="button" onClick={() => onChange(value.filter((x) => x !== tag))} aria-label={removeLabel(tag)}
                className="w-8 h-8 -my-1 rounded-full flex items-center justify-center hover:bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-white/50">
                <X className="w-3.5 h-3.5" weight="bold" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={id}
        className={inputCls}
        placeholder={placeholder}
        value={text}
        enterKeyHint="done"
        onChange={(e) => {
          const v = e.target.value;
          if (v.includes(",")) commit(v); else setText(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(text); }
          else if (e.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => commit(text)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hauteur réellement visible sur mobile : quand le clavier s'ouvre, la feuille
// se réduit avec lui et la barre de validation reste au-dessus des touches.
// ---------------------------------------------------------------------------
export function useMobileViewport(active: boolean) {
  const [box, setBox] = useState<{ height: number; top: number } | null>(null);

  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!active || !vv) { setBox(null); return; }
    const update = () => {
      if (!window.matchMedia("(max-width: 639px)").matches) { setBox(null); return; }
      setBox({ height: vv.height, top: vv.offsetTop });
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [active]);

  return box;
}
