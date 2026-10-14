"use client";

// Briques visuelles des pages Réglages et Profil : un bloc par sujet, un titre
// en clair, une phrase d'explication. Aucune logique métier ici.

import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

// tailwind.config.ts remappe emerald / red / amber / blue… : les vraies
// couleurs passent par des styles inline.
export const COLOR_OK = { rgb: "16,185,129", text: "#6ee7b7" };
export const COLOR_WARN = { rgb: "245,158,11", text: "#fcd34d" };
export const COLOR_BAD = { rgb: "239,68,68", text: "#fca5a5" };
export const COLOR_INFO = { rgb: "96,165,250", text: "#93c5fd" };

export const SURFACE = "rounded-[2rem] bg-[#232229]/90 border border-white/10 backdrop-blur-xl";

// ---------------------------------------------------------------------------
// Bloc titré : une icône, un titre, une phrase, puis le contenu
// ---------------------------------------------------------------------------
export function SectionCard({
  id, icon: Icon, title, description, action, children, className = "",
}: {
  id?: string;
  icon?: React.ElementType;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** bouton ou lien affiché à droite du titre */
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`${SURFACE} p-5 sm:p-8 scroll-mt-[calc(var(--nav-clearance)+1.5rem)] ${className}`}
    >
      <header className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {Icon && (
            <span className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
              <Icon className="w-6 h-6 text-[#a5b4fc]" />
            </span>
          )}
          <div className="min-w-0 pt-0.5">
            <h2 className="text-xl sm:text-[1.35rem] font-medium text-white leading-tight tracking-tight">{title}</h2>
            {description && <p className="text-sm sm:text-[0.95rem] text-white/65 font-light mt-1.5 leading-relaxed">{description}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {children && <div className="mt-6 sm:mt-7">{children}</div>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Champ : libellé en clair, aide courte juste dessous
// ---------------------------------------------------------------------------
export const inputCls =
  "w-full min-h-[48px] bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white text-base placeholder-white/30 outline-none focus:border-primary focus:bg-white/[0.07] transition-colors";

export const dropdownButtonCls =
  "w-full flex items-center justify-between gap-2 bg-white/5 border border-white/15 rounded-2xl px-4 min-h-[48px] text-white text-base text-left outline-none hover:border-white/30 focus-visible:border-primary transition-colors";

export const HINT = "text-[13px] text-white/60 font-light leading-relaxed";

export function Field({
  label, htmlFor, optional, required, hint, children, className = "",
}: {
  label: React.ReactNode;
  htmlFor?: string;
  optional?: boolean;
  /** champ obligatoire : une étoile après le libellé */
  required?: boolean;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={htmlFor} className="flex flex-wrap items-baseline gap-x-2 text-[0.95rem] font-medium text-white mb-2">
        <span>{label}{required && <span aria-hidden="true" className="text-[#fca5a5]"> *</span>}</span>
        {optional && !required && <span className="text-[13px] font-normal text-white/50">{t('pf.optional', 'facultatif')}</span>}
      </label>
      {children}
      {hint && <p className={`${HINT} mt-2`}>{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Interrupteur : toute la ligne est cliquable
// ---------------------------------------------------------------------------
export function ToggleRow({
  title, hint, active, onToggle, badge,
}: {
  title: React.ReactNode;
  hint?: React.ReactNode;
  active: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onToggle}
      className="group w-full min-h-[64px] flex items-center justify-between gap-4 text-left rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 px-4 sm:px-5 py-3.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50"
    >
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2 text-base text-white font-medium leading-snug">
          {title}
          {badge}
        </span>
        {hint && <span className="block text-sm text-white/60 font-light mt-1 leading-snug">{hint}</span>}
      </span>
      <span
        aria-hidden="true"
        className={`w-14 h-8 rounded-full flex items-center px-1 border shrink-0 transition-colors ${active ? "bg-primary border-primary" : "bg-white/5 border-white/25"}`}
      >
        <motion.span
          initial={false}
          animate={{ x: active ? 24 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="w-6 h-6 rounded-full shadow-md"
          style={{ background: active ? "#ffffff" : "rgba(255,255,255,0.55)" }}
        />
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Pastille à choisir (type de repreneur, délai…)
// ---------------------------------------------------------------------------
export function ChoicePill({
  selected, onClick, children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`px-5 min-h-[48px] rounded-full text-sm sm:text-[0.95rem] transition-all outline-none border focus-visible:ring-2 focus-visible:ring-white/50 ${
        selected
          ? "bg-primary text-white border-primary font-medium shadow-[0_8px_22px_rgba(89,85,232,0.45)]"
          : "bg-white/5 text-white/75 border-white/15 hover:text-white hover:border-white/35"
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Liste limitée à quelques éléments, avec « Voir tout (N) »
// ---------------------------------------------------------------------------
export function ShowAllButton({
  expanded, onToggle, moreLabel, lessLabel,
}: {
  expanded: boolean;
  onToggle: () => void;
  moreLabel: string;
  lessLabel: string;
}) {
  return (
    <div className="flex justify-center mt-6">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="min-h-[48px] px-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/20 text-white text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        {expanded ? lessLabel : moreLabel}
      </button>
    </div>
  );
}
