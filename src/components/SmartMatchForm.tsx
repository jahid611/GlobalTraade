"use client";

import React, { useState, useMemo } from "react";
import { Loader2, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INDUSTRIES } from "@/lib/industries";
import { FR_REGIONS } from "@/lib/geoRegions";
import { MultiSelect } from "@/components/MultiSelect";
import { RangeSlider } from "@/components/RangeSlider";
import { useTranslation } from "react-i18next";

export interface MatchCriteria {
  industries: string[];
  regions: string[];      // clés de région (geoRegions)
  stakeMin: number;       // 0-100 %
  stakeMax: number;       // 0-100 %
  budgetMin: number;      // €
  budgetMax: number;      // €
}

interface SmartMatchFormProps {
  onResults: (criteria: MatchCriteria) => void;
  onReset?: () => void;
  availableIndustries?: string[];
}

export const BUDGET_MIN = 5000;
export const BUDGET_MAX = 3000000;

const fmtEur = (n: number) =>
  n >= 1000000 ? `${(n / 1000000).toFixed(n % 1000000 ? 1 : 0)} M€` : `${Math.round(n / 1000)} k€`;

export function SmartMatchForm({ onResults, onReset, availableIndustries }: SmartMatchFormProps) {
  const { t } = useTranslation();
  const [industries, setIndustries] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [stake, setStake] = useState<[number, number]>([0, 100]);
  const [budget, setBudget] = useState<[number, number]>([BUDGET_MIN, BUDGET_MAX]);
  const [loading, setLoading] = useState(false);

  const sectorOptions = useMemo(() => {
    const base = availableIndustries && availableIndustries.length ? availableIndustries : INDUSTRIES;
    return base.map((i) => ({ value: i, label: t(`industry.${i}`, { defaultValue: i }) as string }));
  }, [availableIndustries, t]);

  const regionOptions = useMemo(() => FR_REGIONS.map((r) => ({ value: r.key, label: r.label })), []);

  const submit = () => {
    setLoading(true);
    const c: MatchCriteria = {
      industries, regions,
      stakeMin: stake[0], stakeMax: stake[1],
      budgetMin: budget[0], budgetMax: budget[1],
    };
    setTimeout(() => { onResults(c); setLoading(false); }, 350);
  };

  const reset = () => {
    setIndustries([]);
    setRegions([]);
    setStake([0, 100]);
    setBudget([BUDGET_MIN, BUDGET_MAX]);
    onReset?.();
  };

  const isDirty = industries.length > 0 || regions.length > 0 || stake[0] !== 0 || stake[1] !== 100 || budget[0] !== BUDGET_MIN || budget[1] !== BUDGET_MAX;

  const labelClass = "text-xs font-semibold uppercase tracking-widest text-white/50";

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
        <label className={labelClass}>{t("smart.f_regions", { defaultValue: "Régions" }) as string}</label>
        <MultiSelect options={regionOptions} selected={regions} onChange={setRegions} placeholder={t("smart.ph_regions", { defaultValue: "Toute la France" }) as string} allowSelectAll selectAllLabel={t("smart.all_regions_opt", { defaultValue: "Toutes les régions" }) as string} />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className={labelClass}>{t("smart.f_stake", { defaultValue: "Part visée" }) as string}</label>
          <span className="text-primary text-sm font-medium">{stake[0]}% – {stake[1]}%</span>
        </div>
        <RangeSlider value={stake} onValueChange={setStake} min={0} max={100} step={5} />
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
