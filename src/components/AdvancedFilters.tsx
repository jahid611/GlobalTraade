"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, SlidersHorizontal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INDUSTRIES } from "@/lib/industries";
import { FR_REGIONS } from "@/lib/geoRegions";
import { MultiSelect } from "@/components/MultiSelect";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { useTranslation } from "react-i18next";

export interface FilterState {
  industries: string[];
  regions: string[];      // clés de région (geoRegions)
  priceMin: string;
  priceMax: string;
  revenueMin: string;
  ebitdaMin: string;
  sortBy: "recent" | "price_asc" | "price_desc" | "roi" | "views";
}

interface AdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  onReset: () => void;
}

const formatFilterNumber = (val: string) => {
  if (!val) return "";
  const digits = val.replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};
const parseFilterNumber = (val: string) => val.replace(/[^\d]/g, "");

export function AdvancedFilters({ isOpen, onClose, filters, setFilters, onReset }: AdvancedFiltersProps) {
  useScrollLock(isOpen);
  const { t } = useTranslation();

  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) => setFilters({ ...filters, [key]: value });

  const inputClass = "w-full bg-white/5 border border-white/10 text-base font-light text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/30 rounded-xl px-4 py-3";
  const labelClass = "text-xs font-semibold uppercase tracking-widest text-white/50 mb-2 block mt-6";

  const sectorOptions = INDUSTRIES.map((i) => ({ value: i, label: t(`industry.${i}`, { defaultValue: i }) as string }));
  const regionOptions = FR_REGIONS.map((r) => ({ value: r.key, label: r.label }));

  const sortOptions = [
    { id: "recent", label: t("filters.sort.recent", "Plus récentes") },
    { id: "roi", label: t("filters.sort.roi", "Meilleure rentabilité") },
    { id: "views", label: t("filters.sort.views", "Plus vues") },
    { id: "price_asc", label: t("filters.sort.price_asc", "Prix croissant") },
    { id: "price_desc", label: t("filters.sort.price_desc", "Prix décroissant") },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-[8px] z-[200]" onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed top-0 right-0 h-full w-[100vw] sm:w-[440px] bg-[#2b2a2f]/80 backdrop-blur-[40px] border-l border-white/10 sm:rounded-l-[2.5rem] z-[210] flex flex-col overflow-hidden shadow-[-20px_0_60px_rgba(0,0,0,0.5)]"
          >
            <div className="h-20 px-6 sm:px-8 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <SlidersHorizontal className="w-5 h-5 text-white" />
                <h3 className="text-xl font-light text-white">{t("filters.title", "Filtres")}</h3>
              </div>
              <button onClick={onClose} className="p-2 text-white/50 hover:text-white transition-colors bg-white/5 rounded-full hover:bg-white/10">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 custom-scrollbar">
              {/* Tri */}
              <label className={`${labelClass} mt-0`}>{t("filters.sortBy", "Trier par")}</label>
              <div className="flex flex-wrap gap-2">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => set("sortBy", opt.id as FilterState["sortBy"])}
                    className={`px-4 py-2 rounded-full text-xs transition-all ${
                      filters.sortBy === opt.id
                        ? "bg-primary text-white font-medium"
                        : "bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Secteurs (multi) */}
              <label className={labelClass}>{t("filters.industry", "Secteurs")}</label>
              <MultiSelect options={sectorOptions} selected={filters.industries} onChange={(v) => set("industries", v)} placeholder={t("filters.all_sectors", "Tous les secteurs") as string} />

              {/* Régions (multi) */}
              <label className={labelClass}>{t("filters.region", "Régions")}</label>
              <MultiSelect options={regionOptions} selected={filters.regions} onChange={(v) => set("regions", v)} placeholder={t("filters.all_france", "Toute la France") as string} />

              {/* Prix */}
              <label className={labelClass}>{t("filters.price", "Prix de cession (€)")}</label>
              <div className="flex items-center gap-3">
                <input type="text" inputMode="numeric" placeholder={t("filters.min", "Min") as string} value={formatFilterNumber(filters.priceMin)} onChange={(e) => set("priceMin", parseFilterNumber(e.target.value))} className={inputClass} />
                <span className="text-white/40">–</span>
                <input type="text" inputMode="numeric" placeholder={t("filters.max", "Max") as string} value={formatFilterNumber(filters.priceMax)} onChange={(e) => set("priceMax", parseFilterNumber(e.target.value))} className={inputClass} />
              </div>

              {/* CA & EBE */}
              <label className={labelClass}>{t("filters.performance", "Performances (€)")}</label>
              <div className="flex items-center gap-3">
                <input type="text" inputMode="numeric" placeholder={t("filters.revenue", "CA Min") as string} value={formatFilterNumber(filters.revenueMin)} onChange={(e) => set("revenueMin", parseFilterNumber(e.target.value))} className={inputClass} />
                <input type="text" inputMode="numeric" placeholder={t("filters.ebitda", "EBE Min") as string} value={formatFilterNumber(filters.ebitdaMin)} onChange={(e) => set("ebitdaMin", parseFilterNumber(e.target.value))} className={inputClass} />
              </div>
            </div>

            <div className="p-6 sm:p-8 border-t border-white/10 shrink-0 flex justify-center gap-4">
              <Button variant="ghost" onClick={onReset} className="w-14 h-14 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white shrink-0 p-0 hover:bg-white/10 transition-all" title={t("filters.reset", "Réinitialiser") as string}>
                <RotateCcw className="w-5 h-5" />
              </Button>
              <Button onClick={onClose} className="flex-1 max-w-xs h-14 bg-primary text-white rounded-full text-base hover:bg-primary/90 transition-all font-medium">
                {t("filters.submit", "Voir les résultats")}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
