"use client";

import React from "react";
import { Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from "framer-motion";
import { X, SlidersHorizontal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { industryOptions } from "@/lib/industries";
import { marketCountryOptions, regionOptionsFor, withCountries } from "@/lib/geoRegions";
import { MultiSelect } from "@/components/MultiSelect";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { useTranslation } from "react-i18next";

export interface FilterState {
  industries: string[];
  /** codes de pays (« ES ») ; vide = tous les pays */
  countries: string[];
  regions: string[];      // clés de région (geoRegions) : « idf », « ES-CT »
  priceMin: string;
  priceMax: string;
  revenueMin: string;
  ebitdaMin: string;
  /** taille de l'équipe ; "" = toutes */
  teamSize: "" | "1-5" | "6-20" | "21+";
  /** ancienneté minimale de l'entreprise, en années ; "" = toutes */
  minAge: "" | "3" | "5" | "10";
  /** seulement les annonces dont le cédant partage ses chiffres */
  sharedFinancials: boolean;
  sortBy: "recent" | "price_asc" | "price_desc" | "roi" | "views";
}

/** Correspondance d'un effectif avec une tranche du filtre « Taille de l'équipe ». */
export const matchesTeamSize = (employees: unknown, size: FilterState["teamSize"]): boolean => {
  if (!size) return true;
  const n = Number(employees);
  if (!Number.isFinite(n) || n <= 0) return false;
  if (size === "1-5") return n <= 5;
  if (size === "6-20") return n >= 6 && n <= 20;
  return n >= 21;
};

/** L'entreprise existe-t-elle depuis au moins `minAge` années ? */
export const matchesMinAge = (establishedYear: unknown, minAge: FilterState["minAge"]): boolean => {
  if (!minAge) return true;
  const year = Number(establishedYear);
  if (!Number.isFinite(year) || year < 1800) return false;
  return new Date().getFullYear() - year >= Number(minAge);
};

interface AdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  onReset: () => void;
  /**
   * Les chiffres d'affaires et résultats sont-ils lisibles pour ce visiteur ?
   * Ils ne le sont qu'avec une formule payante ou une annonce débloquée : sans
   * cela, filtrer dessus ne renverrait jamais rien, sans explication.
   */
  financialsVisible?: boolean;
}

const formatFilterNumber = (val: string) => {
  if (!val) return "";
  const digits = val.replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};
const parseFilterNumber = (val: string) => val.replace(/[^\d]/g, "");

export function AdvancedFilters({ isOpen, onClose, filters, setFilters, onReset, financialsVisible = true }: AdvancedFiltersProps) {
  useScrollLock(isOpen);
  const { t, i18n } = useTranslation();
  // Téléphone : lecture confortable (textes plus blancs, moins fins, un peu plus grands)
  const isMobile = useIsMobile();

  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) => setFilters({ ...filters, [key]: value });

  const inputClass = "w-full bg-white/5 max-sm:bg-white/[0.09] border border-white/10 max-sm:border-white/30 text-base font-light text-white focus:outline-none focus:border-primary/50 max-sm:focus:border-primary transition-all placeholder:text-white/30 rounded-xl px-4 py-3 max-sm:py-3.5";
  const labelClass = "text-xs font-semibold uppercase tracking-widest text-white/50 mb-2 max-sm:mb-2.5 block mt-6 max-sm:mt-7";

  const sectorOptions = industryOptions(t, i18n.language);
  const countryOptions = marketCountryOptions(i18n.language);
  const regionOptions = regionOptionsFor(filters.countries, i18n.language);

  const chipClass = (active: boolean) => `px-4 py-2 max-sm:py-2.5 rounded-full text-xs max-sm:text-sm border transition-all ${
    active
      ? "bg-primary border-primary text-white font-medium"
      : "bg-white/5 max-sm:bg-white/[0.08] border-white/10 max-sm:border-white/25 text-white/70 hover:text-white hover:bg-white/10"
  }`;
  const teamOptions: { id: FilterState["teamSize"]; label: string }[] = [
    { id: "", label: t("filters.any", "Toutes") },
    { id: "1-5", label: t("filters.team_small", "1 à 5 salariés") },
    { id: "6-20", label: t("filters.team_medium", "6 à 20") },
    { id: "21+", label: t("filters.team_large", "21 et plus") },
  ];
  const ageOptions: { id: FilterState["minAge"]; label: string }[] = [
    { id: "", label: t("filters.any", "Toutes") },
    { id: "3", label: t("filters.age_3", "3 ans et plus") },
    { id: "5", label: t("filters.age_5", "5 ans et plus") },
    { id: "10", label: t("filters.age_10", "10 ans et plus") },
  ];

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
            className={`${isMobile ? 'lisible ' : ''}fixed top-0 right-0 h-full w-[100vw] sm:w-[440px] bg-[#2b2a2f]/80 max-sm:bg-[#19181e]/[0.97] backdrop-blur-[40px] border-l border-white/10 sm:rounded-l-[2.5rem] z-[210] flex flex-col overflow-hidden shadow-[-20px_0_60px_rgba(0,0,0,0.5)]`}
          >
            <div className="h-20 px-6 sm:px-8 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <SlidersHorizontal className="w-5 h-5 text-white" />
                <h3 className="text-xl font-light text-white">{t("filters.title", "Filtres")}</h3>
              </div>
              <button onClick={onClose} aria-label={t("modal.close", "Fermer") as string} className="p-2 max-sm:p-2.5 text-white/50 hover:text-white transition-colors bg-white/5 max-sm:bg-white/10 max-sm:border max-sm:border-white/20 rounded-full hover:bg-white/10">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 custom-scrollbar">
              {/* Tri */}
              <label className={`${labelClass} mt-0`}>{t("filters.sortBy", "Trier par")}</label>
              <div className="flex flex-wrap gap-2">
                {sortOptions.filter((opt) => financialsVisible || opt.id !== "roi").map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => set("sortBy", opt.id as FilterState["sortBy"])}
                    aria-pressed={filters.sortBy === opt.id}
                    className={`px-4 py-2 max-sm:py-2.5 rounded-full text-xs max-sm:text-sm border transition-all ${
                      filters.sortBy === opt.id
                        ? "bg-primary border-primary text-white font-medium"
                        : "bg-white/5 max-sm:bg-white/[0.08] border-white/10 max-sm:border-white/25 text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Secteurs (multi) */}
              <label className={labelClass}>{t("filters.industry", "Secteurs")}</label>
              <MultiSelect options={sectorOptions} selected={filters.industries} onChange={(v) => set("industries", v)} className="max-sm:bg-white/[0.09] max-sm:border-white/30 max-sm:min-h-[52px]" placeholder={t("filters.all_sectors", "Tous les secteurs") as string} />

              {/* Pays (multi) : aucun choix = tous les pays */}
              <label className={labelClass}>{t("filters.country", "Pays")}</label>
              <MultiSelect options={countryOptions} selected={filters.countries} onChange={(v) => setFilters(withCountries(filters, v))} searchable={false} className="max-sm:bg-white/[0.09] max-sm:border-white/30 max-sm:min-h-[52px]" placeholder={t("filters.all_countries", "Tous les pays") as string} />

              {/* Régions (multi) : celles des pays choisis */}
              <label className={labelClass}>{t("filters.region", "Régions")}</label>
              <MultiSelect options={regionOptions} selected={filters.regions} onChange={(v) => set("regions", v)} className="max-sm:bg-white/[0.09] max-sm:border-white/30 max-sm:min-h-[52px]" placeholder={t("filters.all_regions", "Toutes les régions") as string} />

              {/* Prix */}
              <label className={labelClass}>{t("filters.price", "Prix de cession (€)")}</label>
              <div className="flex items-center gap-3">
                <input type="text" inputMode="numeric" placeholder={t("filters.min", "Min") as string} value={formatFilterNumber(filters.priceMin)} onChange={(e) => set("priceMin", parseFilterNumber(e.target.value))} className={inputClass} />
                <span className="text-white/40">–</span>
                <input type="text" inputMode="numeric" placeholder={t("filters.max", "Max") as string} value={formatFilterNumber(filters.priceMax)} onChange={(e) => set("priceMax", parseFilterNumber(e.target.value))} className={inputClass} />
              </div>

              {/* Taille de l'équipe */}
              <label className={labelClass}>{t("filters.team", "Taille de l'équipe")}</label>
              <div className="flex flex-wrap gap-2">
                {teamOptions.map((opt) => (
                  <button key={opt.id || "all"} type="button" aria-pressed={filters.teamSize === opt.id} onClick={() => set("teamSize", opt.id)} className={chipClass(filters.teamSize === opt.id)}>
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Ancienneté */}
              <label className={labelClass}>{t("filters.age", "Ancienneté de l'entreprise")}</label>
              <div className="flex flex-wrap gap-2">
                {ageOptions.map((opt) => (
                  <button key={opt.id || "all"} type="button" aria-pressed={filters.minAge === opt.id} onClick={() => set("minAge", opt.id)} className={chipClass(filters.minAge === opt.id)}>
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Chiffres partagés */}
              <label className={labelClass}>{t("filters.transparency", "Transparence")}</label>
              <button
                type="button"
                role="switch"
                aria-checked={filters.sharedFinancials}
                onClick={() => set("sharedFinancials", !filters.sharedFinancials)}
                className="w-full flex items-center justify-between gap-4 text-left rounded-xl px-4 py-3 bg-white/5 max-sm:bg-white/[0.09] border border-white/10 max-sm:border-white/30 transition-colors hover:bg-white/10"
              >
                <span>
                  <span className="block text-sm text-white font-medium">{t("filters.shared_financials", "Chiffres partagés par le cédant")}</span>
                  <span className="block text-xs text-white/60 mt-0.5">{t("filters.shared_financials_hint", "Seulement les annonces dont le cédant accepte de montrer ses comptes.")}</span>
                </span>
                <span className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${filters.sharedFinancials ? "bg-primary" : "bg-white/20"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${filters.sharedFinancials ? "translate-x-5" : ""}`} />
                </span>
              </button>

              {/* CA & EBE */}
              <label className={labelClass}>{t("filters.performance", "Performances (€)")}</label>
              {financialsVisible ? (
                <div className="flex items-center gap-3">
                  <input type="text" inputMode="numeric" placeholder={t("filters.revenue", "CA Min") as string} value={formatFilterNumber(filters.revenueMin)} onChange={(e) => set("revenueMin", parseFilterNumber(e.target.value))} className={inputClass} />
                  <input type="text" inputMode="numeric" placeholder={t("filters.ebitda", "EBE Min") as string} value={formatFilterNumber(filters.ebitdaMin)} onChange={(e) => set("ebitdaMin", parseFilterNumber(e.target.value))} className={inputClass} />
                </div>
              ) : (
                // Sans formule payante, les chiffres des annonces ne sont pas visibles :
                // on l'explique au lieu de laisser un filtre qui ne renverrait rien.
                <div className="rounded-xl px-4 py-3.5 bg-white/5 max-sm:bg-white/[0.09] border border-white/10 max-sm:border-white/30">
                  <p className="text-sm text-white/80 leading-relaxed">
                    {t("filters.performance_locked", "Le chiffre d'affaires et le résultat des annonces sont réservés aux formules payantes. Ces deux filtres s'activeront avec votre formule.")}
                  </p>
                  <Link to="/payment" onClick={onClose} className="inline-block mt-2 text-sm font-medium text-[#cfccff] hover:text-white">
                    {t("filters.see_plans", "Voir les formules")}
                  </Link>
                </div>
              )}
            </div>

            <div className="p-6 max-sm:px-5 max-sm:pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:p-8 border-t border-white/10 max-sm:border-white/20 shrink-0 flex justify-center gap-4 max-sm:gap-3">
              {/* Téléphone : le mot « Réinitialiser » à côté de l'icône, plus clair qu'une flèche seule */}
              <Button variant="ghost" onClick={onReset} className="w-14 max-sm:w-auto max-sm:px-5 max-sm:gap-2 h-14 rounded-full bg-white/5 max-sm:bg-white/10 border border-white/10 max-sm:border-white/25 text-white/60 max-sm:text-white hover:text-white shrink-0 p-0 hover:bg-white/10 transition-all" title={t("filters.reset", "Réinitialiser") as string}>
                <RotateCcw className="w-5 h-5" />
                <span className="sm:hidden text-sm font-medium">{t("filters.reset", "Réinitialiser")}</span>
              </Button>
              <Button onClick={onClose} className="flex-1 max-w-xs h-14 bg-primary text-white rounded-full text-base hover:bg-primary/90 transition-all font-medium max-sm:font-semibold">
                {t("filters.submit", "Voir les résultats")}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
