"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { MagnifyingGlass, CaretDown, Check, X } from "phosphor-react";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import type { IndustryOption } from "@/lib/industries";

// Sans accents ni majuscules : « patisserie » trouve « Pâtisserie ».
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Choix d'un secteur dans la liste maîtresse (src/lib/industries.ts) : une
// fenêtre avec recherche, lisible sur téléphone, lignes de 48 px.
export function SectorPicker({
  value, options, mySectors, onChange,
}: {
  value: string | null;
  options: IndustryOption[];
  /** secteurs des annonces de l'utilisateur, proposés en premier */
  mySectors: string[];
  onChange: (sector: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    // Le clavier ne s'ouvre tout seul que sur ordinateur.
    const fine = window.matchMedia?.("(pointer: fine)").matches;
    const id = fine ? window.setTimeout(() => searchRef.current?.focus(), 80) : undefined;
    return () => { document.removeEventListener("keydown", onKey); if (id) window.clearTimeout(id); };
  }, [open]);

  const current = options.find((o) => o.value === value);
  const mine = useMemo(() => options.filter((o) => mySectors.includes(o.value)), [options, mySectors]);
  const filtered = useMemo(() => {
    const q = fold(query.trim());
    return q ? options.filter((o) => fold(o.label).includes(q) || fold(o.value).includes(q)) : options;
  }, [options, query]);

  const pick = (v: string) => { onChange(v); setOpen(false); };

  const row = (o: IndustryOption) => (
    <li key={o.value}>
      <button
        type="button"
        onClick={() => pick(o.value)}
        className={`w-full min-h-12 text-left px-4 py-2.5 rounded-xl text-[15px] flex items-center justify-between gap-3 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          o.value === value ? "bg-primary/25 text-white font-medium" : "text-white/85 hover:bg-white/10"
        }`}
      >
        <span className="min-w-0 leading-snug">{o.label}</span>
        {o.value === value && <Check size={18} className="shrink-0 text-[#a5b4fc]" weight="bold" />}
      </button>
    </li>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => { setQuery(""); setOpen(true); }}
        aria-haspopup="dialog"
        className="w-full flex items-center justify-between gap-3 bg-white/5 border border-white/20 rounded-xl px-4 min-h-12 py-2 text-left text-white text-[15px] outline-none hover:border-white/40 focus-visible:ring-2 focus-visible:ring-primary transition-colors"
      >
        <span className="flex items-center gap-3 min-w-0">
          <MagnifyingGlass size={18} className="shrink-0 text-white/55" />
          <span className="truncate">{current?.label || t("sector.picker_placeholder", "Choisir un secteur…")}</span>
        </span>
        <CaretDown size={16} className="shrink-0 text-white/60" />
      </button>

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {open && (
            <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4">
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#141318]/80 backdrop-blur-sm"
                onClick={() => setOpen(false)}
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label={t("sector.picker_title", "Choisir un secteur d'activité") as string}
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
                transition={{ duration: 0.18 }}
                className="relative w-full sm:max-w-lg h-[85vh] sm:h-auto sm:max-h-[80vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#232229] border border-white/15 shadow-2xl overflow-hidden"
              >
                <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
                  <h3 className="text-lg font-medium text-white">{t("sector.picker_title", "Choisir un secteur d'activité")}</h3>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label={t("sector.picker_close", "Fermer") as string}
                    className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="px-5 pb-3">
                  <div className="flex items-center gap-3 bg-white/5 border border-white/15 rounded-xl px-4 h-12 focus-within:border-primary/70">
                    <MagnifyingGlass size={18} className="text-white/50 shrink-0" />
                    <input
                      ref={searchRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t("sector.picker_search", "Tapez un métier : boulangerie, garage, coiffure…") as string}
                      aria-label={t("sector.picker_search_label", "Chercher un secteur") as string}
                      type="text"
                      inputMode="search"
                      enterKeyHint="search"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      className="flex-1 min-w-0 bg-transparent text-[15px] text-white outline-none placeholder:text-white/40"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4" style={{ WebkitOverflowScrolling: "touch" }}>
                  {!query.trim() && mine.length > 0 && (
                    <>
                      <p className="px-4 pt-2 pb-1.5 text-[13px] font-semibold uppercase tracking-wider text-white/60">
                        {t("sector.picker_mine", "Vos secteurs")}
                      </p>
                      <ul className="mb-3">{mine.map(row)}</ul>
                      <p className="px-4 pt-2 pb-1.5 text-[13px] font-semibold uppercase tracking-wider text-white/60">
                        {t("sector.picker_all", "Tous les secteurs")}
                      </p>
                    </>
                  )}
                  {filtered.length === 0 ? (
                    <p className="px-4 py-10 text-center text-white/60 text-[15px]">
                      {t("sector.picker_empty", "Aucun secteur ne correspond. Essayez un autre mot.")}
                    </p>
                  ) : (
                    <ul>{filtered.map(row)}</ul>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
