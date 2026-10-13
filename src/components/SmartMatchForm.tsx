"use client";

import React, { useState, useMemo } from "react";
import { Loader2, Sparkles, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { industryOptions } from "@/lib/industries";
import { isCountryKey, marketCountryOptions, pruneRegions, regionOptionsFor } from "@/lib/geoRegions";
import { MARKET_CODES } from "@/lib/markets";
import { countryLabel } from "@/lib/countries";
import { MultiSelect } from "@/components/MultiSelect";
import { RangeSlider } from "@/components/RangeSlider";
import { useTranslation } from "react-i18next";

export interface MatchCriteria {
  industries: string[];
  /** codes de pays (« ES ») ; absent ou vide = tous les pays */
  countries?: string[];
  regions: string[];      // clés de région (geoRegions) : « idf », « ES-CT »
  budgetMin: number;      // €
  budgetMax: number;      // €
}

interface SmartMatchFormProps {
  onResults: (criteria: MatchCriteria) => void;
  onReset?: () => void;
  /** @deprecated la liste est désormais toujours la liste maîtresse complète */
  availableIndustries?: string[];
  /**
   * « card » : carte compacte en colonne. « hero » : grand bandeau horizontal,
   * pensé pour être l'élément principal de la page (marketplace).
   */
  variant?: 'card' | 'hero';
  /** Critères déjà remplis à l'ouverture (ex. : le projet de reprise du membre). */
  initial?: MatchCriteria;
}

export const BUDGET_MIN = 5000;
export const BUDGET_MAX = 3000000;

const fmtEur = (n: number) =>
  n >= 1000000 ? `${(n / 1000000).toFixed(n % 1000000 ? 1 : 0)} M€` : `${Math.round(n / 1000)} k€`;

export function SmartMatchForm({ onResults, onReset, variant = 'card', initial }: SmartMatchFormProps) {
  const { t, i18n } = useTranslation();
  const [industries, setIndustries] = useState<string[]>(initial?.industries ?? []);
  const [countries, setCountriesState] = useState<string[]>(initial?.countries ?? []);
  const [regions, setRegions] = useState<string[]>(initial?.regions ?? []);
  // Retirer un pays retire aussi ses régions.
  const setCountries = (next: string[]) => { setCountriesState(next); setRegions((r) => pruneRegions(r, next)); };
  const [budget, setBudget] = useState<[number, number]>([initial?.budgetMin ?? BUDGET_MIN, initial?.budgetMax ?? BUDGET_MAX]);
  const [loading, setLoading] = useState(false);

  // Toujours la liste maîtresse complète — la même que partout sur le site.
  const sectorOptions = useMemo(() => industryOptions(t, i18n.language), [t, i18n.language]);

  const countryOptions = useMemo(() => marketCountryOptions(i18n.language), [i18n.language]);
  const regionOptions = useMemo((() => {
    // Les régions des pays en jeu, rangées sous le nom de leur pays dès qu'il y en a plusieurs.
    const wanted = (countries).filter(isCountryKey);
    const scope = MARKET_CODES.filter((c) => !wanted.length || wanted.includes(c));
    if (scope.length < 2) return regionOptionsFor(scope, i18n.language);
    return scope.flatMap((c) => regionOptionsFor([c], i18n.language).map((o) => ({ ...o, group: countryLabel(c, i18n.language) })));
  }), [countries, i18n.language]);

  const submit = () => {
    setLoading(true);
    const c: MatchCriteria = {
      industries, countries, regions,
      budgetMin: budget[0], budgetMax: budget[1],
    };
    setTimeout(() => { onResults(c); setLoading(false); }, 350);
  };

  const reset = () => {
    setIndustries([]);
    setCountriesState([]);
    setRegions([]);
    setBudget([BUDGET_MIN, BUDGET_MAX]);
    onReset?.();
  };

  const isDirty = industries.length > 0 || countries.length > 0 || regions.length > 0 || budget[0] !== BUDGET_MIN || budget[1] !== BUDGET_MAX;

  const labelClass = "text-xs font-semibold uppercase tracking-widest text-white/50";

  if (variant === 'hero') {
    return (
      <section
        aria-label={t("smart.panel_tag", { defaultValue: "Recherche intelligente" }) as string}
        className="relative rounded-[2rem] p-[1.5px] shadow-[0_20px_70px_rgba(89,85,232,0.35)]"
        style={{ background: 'linear-gradient(135deg, rgba(120,114,251,0.95) 0%, rgba(89,85,232,0.45) 40%, rgba(255,255,255,0.12) 100%)' }}
      >
        <div className="rounded-[calc(2rem-1.5px)] bg-[#232229]/95 backdrop-blur-xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-7">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-[0_8px_24px_rgba(89,85,232,0.5)]">
              <Sparkles size={22} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl md:text-[1.7rem] font-medium text-white leading-tight tracking-tight">
                {t("smart.hero_title", { defaultValue: "Quelle entreprise cherchez-vous ?" }) as string}
              </h2>
              <p className="text-sm md:text-base text-white/65 font-light mt-1">
                {t("smart.hero_desc", { defaultValue: "Indiquez vos critères : la recherche intelligente classe les annonces de la plus adaptée à la moins adaptée." }) as string}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1.15fr_0.9fr_1.15fr_1fr_auto] gap-x-6 gap-y-5 xl:items-end">
            <div className="space-y-2.5 min-w-0">
              <label className="text-xs font-semibold uppercase tracking-widest text-white/70">{t("smart.f_sectors", { defaultValue: "Secteurs" }) as string}</label>
              <MultiSelect options={sectorOptions} selected={industries} onChange={setIndustries} placeholder={t("smart.ph_sectors", { defaultValue: "Tous les secteurs" }) as string} allowSelectAll selectAllLabel={t("smart.ph_sectors", { defaultValue: "Tous les secteurs" }) as string} />
            </div>

            <div className="space-y-2.5 min-w-0">
              <label className="text-xs font-semibold uppercase tracking-widest text-white/70">{t("smart.f_countries", { defaultValue: "Pays" }) as string}</label>
              <MultiSelect options={countryOptions} selected={countries} onChange={setCountries} searchable={false} placeholder={t("smart.ph_countries", { defaultValue: "Tous les pays" }) as string} />
            </div>

            <div className="space-y-2.5 min-w-0">
              <label className="text-xs font-semibold uppercase tracking-widest text-white/70">{t("smart.f_regions", { defaultValue: "Régions" }) as string}</label>
              <MultiSelect options={regionOptions} selected={regions} onChange={setRegions} placeholder={t("smart.ph_regions_all", { defaultValue: "Toutes les régions" }) as string} />
            </div>

            <div className="space-y-2 min-w-0 xl:pb-1">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-white/70">{t("smart.f_budget", { defaultValue: "Budget" }) as string}</label>
                <span className="text-[#a5b4fc] text-sm font-semibold whitespace-nowrap">{fmtEur(budget[0])} – {fmtEur(budget[1])}</span>
              </div>
              <RangeSlider value={budget} onValueChange={setBudget} min={BUDGET_MIN} max={BUDGET_MAX} step={5000} />
            </div>

            <div className="flex items-center gap-3 xl:col-span-1">
              {isDirty && (
                <button
                  onClick={reset}
                  className="h-14 px-4 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm flex items-center gap-2 shrink-0 transition-colors"
                  title={t("smart.reset", { defaultValue: "Réinitialiser" }) as string}
                  aria-label={t("smart.reset", { defaultValue: "Réinitialiser" }) as string}
                >
                  <RotateCcw size={16} />
                </button>
              )}
              <Button onClick={submit} disabled={loading} className="flex-1 xl:flex-none h-14 px-8 rounded-full bg-primary hover:bg-primary/90 text-white text-base font-semibold shadow-[0_10px_30px_rgba(89,85,232,0.55)] whitespace-nowrap">
                {loading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Search className="w-5 h-5 mr-2" />}
                {t("smart.see_results", { defaultValue: "Voir les résultats" }) as string}
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="liquid-glass rounded-[2rem] p-6 sm:p-7 border border-white/10 space-y-5">
      <div className="flex items-center gap-2 text-primary">
        <Sparkles size={16} />
        <span className="text-xs uppercase tracking-widest font-semibold">{t("smart.panel_tag", { defaultValue: "Recherche intelligente" }) as string}</span>
      </div>

      <div className="space-y-2">
        <label className={labelClass}>{t("smart.f_sectors", { defaultValue: "Secteurs" }) as string}</label>
        <MultiSelect options={sectorOptions} selected={industries} onChange={setIndustries} placeholder={t("smart.ph_sectors", { defaultValue: "Tous les secteurs" }) as string} allowSelectAll selectAllLabel={t("smart.ph_sectors", { defaultValue: "Tous les secteurs" }) as string} />
      </div>

      <div className="space-y-2">
        <label className={labelClass}>{t("smart.f_countries", { defaultValue: "Pays" }) as string}</label>
        <MultiSelect options={countryOptions} selected={countries} onChange={setCountries} searchable={false} placeholder={t("smart.ph_countries", { defaultValue: "Tous les pays" }) as string} />
      </div>

      <div className="space-y-2">
        <label className={labelClass}>{t("smart.f_regions", { defaultValue: "Régions" }) as string}</label>
        <MultiSelect options={regionOptions} selected={regions} onChange={setRegions} placeholder={t("smart.ph_regions_all", { defaultValue: "Toutes les régions" }) as string} />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className={labelClass}>{t("smart.f_budget", { defaultValue: "Budget" }) as string}</label>
          <span className="text-primary text-sm font-medium">{fmtEur(budget[0])} – {fmtEur(budget[1])}</span>
        </div>
        <RangeSlider value={budget} onValueChange={setBudget} min={BUDGET_MIN} max={BUDGET_MAX} step={5000} />
      </div>

      <div className="flex items-center gap-3">
        {isDirty && (
          <button
            onClick={reset}
            className="h-12 px-4 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm flex items-center gap-2 shrink-0 transition-colors"
            title={t("smart.reset", { defaultValue: "Réinitialiser" }) as string}
          >
            <RotateCcw size={15} /> <span className="hidden sm:inline">{t("smart.reset", { defaultValue: "Réinitialiser" }) as string}</span>
          </button>
        )}
        <Button onClick={submit} disabled={loading} className="flex-1 h-12 rounded-full bg-primary hover:bg-primary/90 text-white font-medium">
          {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
          {t("smart.see_results", { defaultValue: "Voir les résultats" }) as string}
        </Button>
      </div>
    </div>
  );
}
