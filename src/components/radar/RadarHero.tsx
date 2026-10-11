"use client";
import React, { useMemo } from "react";
import { departmentOptions } from "@/lib/departments";
import { useTranslation } from "react-i18next";
import { Binoculars, MagnifyingGlass, CircleNotch, LockSimple, Info, Crown, ArrowRight, Check, ChartBar, AddressBook } from "phosphor-react";
import { Button } from "@/components/ui/button";
import { SearchableSelect, type Option } from "@/components/PickerKit";
import { PLAN_PRICES } from "@/services/planService";
import { PROSPECTION_MONTHLY_INCLUDED } from "@/services/prospectService";

interface RadarHeroProps {
  ape: string;
  onApeChange: (v: string) => void;
  apeOptions: Option[];
  /** le code APE est imposé (formule Pro) : on ne cherche que dans son secteur */
  apeLocked: boolean;
  /** code APE enregistré sur le profil, s'il y en a un */
  profileApe?: string | null;
  savingApe: boolean;
  onSaveApe: () => void;
  dept: string;
  onDeptChange: (v: string) => void;
  strictDept: boolean;
  onStrictDeptChange: (v: boolean) => void;
  searching: boolean;
  onSearch: () => void;
  /** affiche l'encart « passer à Business » (formule Pro) */
  showUpgrade: boolean;
  onUpgrade: () => void;
}

const labelClass = "text-xs font-semibold uppercase tracking-widest text-white/70";

// Bandeau principal : la recherche d'entreprises dans le registre public.
export function RadarHero(props: RadarHeroProps) {
  const {
    ape, onApeChange, apeOptions, apeLocked, profileApe, savingApe, onSaveApe,
    dept, onDeptChange, strictDept, onStrictDeptChange, searching, onSearch, showUpgrade, onUpgrade,
  } = props;
  const { t } = useTranslation();

  const deptOptions = useMemo(() => departmentOptions(t("prospection.dept_all", "Toute la France") as string), [t]);
  const lockedLabel =profileApe ? apeOptions.find((o) => o.value === profileApe)?.label : undefined;
  const mustChooseApe = apeLocked && !profileApe;

  const steps = [
    { Icon: MagnifyingGlass, title: t("prospection.step1_title", "Cherchez"), desc: t("prospection.step1_desc", "Une activité et un département : la liste des entreprises en activité s'affiche.") },
    { Icon: ChartBar, title: t("prospection.step2_title", "Repérez"), desc: t("prospection.step2_desc", "Le score de cession met en avant celles qui ont le plus de chances d'être à céder.") },
    { Icon: AddressBook, title: t("prospection.step3_title", "Suivez"), desc: t("prospection.step3_desc", "Ajoutez les meilleures à votre CRM pour les contacter et suivre vos échanges.") },
  ];

  return (
    <section
      aria-label={t("prospection.hero_label", "Recherche d'entreprises") as string}
      className="relative rounded-[2rem] p-[1.5px] shadow-[0_20px_70px_rgba(89,85,232,0.35)]"
      style={{ background: "linear-gradient(135deg, rgba(120,114,251,0.95) 0%, rgba(89,85,232,0.45) 40%, rgba(255,255,255,0.12) 100%)" }}
    >
      <div className="rounded-[calc(2rem-1.5px)] bg-[#232229]/95 backdrop-blur-xl p-5 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-7">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-[0_8px_24px_rgba(89,85,232,0.5)]">
            <Binoculars size={24} className="text-white" weight="fill" />
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl md:text-[1.7rem] font-medium text-white leading-tight tracking-tight">
              {t("prospection.hero_title", "Trouvez des entreprises à reprendre")}
            </h2>
            <p className="text-sm md:text-base text-white/65 font-light mt-1 leading-relaxed">
              {t("prospection.hero_desc", "Les données viennent du registre public des entreprises françaises. Choisissez une activité et un département : chaque entreprise reçoit un score de cession.")}
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); if (!searching) onSearch(); }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto_auto] gap-x-5 gap-y-5 xl:items-end"
        >
          {/* Activité */}
          <div className="space-y-2.5 min-w-0 md:col-span-2 xl:col-span-1">
            <label className={labelClass}>{t("prospection.f_activity", "Activité (code APE)")}</label>
            {apeLocked && profileApe ? (
              <div className="w-full bg-white/5 border border-white/15 rounded-xl px-4 min-h-12 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="text-white text-sm min-w-0 leading-snug">
                  <span className="text-white/50 mr-2">{profileApe}</span>
                  {lockedLabel || ""}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/60 shrink-0">
                  <LockSimple size={13} /> {t("radar.your_sector", "Votre secteur")}
                </span>
              </div>
            ) : mustChooseApe ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 min-w-0">
                  <SearchableSelect
                    value={ape} onChange={onApeChange} options={apeOptions}
                    placeholder={t("prospection.ape_ph", "Choisir une activité…") as string}
                    searchPlaceholder={t("prospection.ape_search_ph", "Tapez un métier ou un code APE…") as string}
                    emptyLabel={t("prospection.ape_empty", "Aucune activité trouvée") as string}
                  />
                </div>
                <Button type="button" onClick={onSaveApe} disabled={savingApe || !ape} className="h-12 rounded-xl px-5 bg-white/10 hover:bg-white/20 text-white shrink-0 outline-none [text-shadow:none]">
                  {savingApe ? <CircleNotch size={16} className="animate-spin" /> : <><Check size={16} className="mr-1.5" /> {t("radar.ape_save", "Valider")}</>}
                </Button>
              </div>
            ) : (
              <SearchableSelect
                value={ape} onChange={onApeChange} options={apeOptions}
                placeholder={t("prospection.ape_ph", "Choisir une activité…") as string}
                searchPlaceholder={t("prospection.ape_search_ph", "Tapez un métier ou un code APE…") as string}
                emptyLabel={t("prospection.ape_empty", "Aucune activité trouvée") as string}
              />
            )}
          </div>

          {/* Département */}
          <div className="space-y-2.5 min-w-0">
            <label className={labelClass}>{t("radar.dept_label", "Département")}</label>
            {/* Une liste, pas une saisie libre : seuls les vrais départements existent. */}
            <SearchableSelect
              value={dept} onChange={onDeptChange} options={deptOptions}
              placeholder={t("prospection.dept_all", "Toute la France") as string}
              searchPlaceholder={t("prospection.dept_search_ph", "Tapez un numéro ou un nom…") as string}
              emptyLabel={t("prospection.dept_empty", "Aucun département trouvé") as string}
            />
          </div>

          {/* Département strict */}
          <label className="flex items-center gap-3 h-12 px-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 cursor-pointer transition-colors min-w-0">
            <input
              type="checkbox"
              checked={strictDept}
              onChange={(e) => onStrictDeptChange(e.target.checked)}
              className="accent-primary w-[18px] h-[18px] shrink-0 cursor-pointer"
            />
            <span className="text-sm text-white/85 leading-tight">{t("prospection.strict", "Département strict")}</span>
          </label>

          <Button
            type="submit"
            disabled={searching}
            className="w-full md:col-span-2 xl:col-span-1 xl:w-auto h-14 px-8 rounded-full bg-primary hover:bg-primary/90 text-white text-base font-semibold shadow-[0_10px_30px_rgba(89,85,232,0.55)] whitespace-nowrap outline-none [text-shadow:none]"
          >
            {searching ? <CircleNotch className="animate-spin w-5 h-5 mr-2" /> : <MagnifyingGlass className="w-5 h-5 mr-2" weight="bold" />}
            {t("prospection.search_btn", "Rechercher")}
          </Button>
        </form>

        {/* Les explications, en clair et toujours visibles */}
        <ul className="mt-5 space-y-2 text-xs sm:text-[13px] text-white/60 font-light leading-relaxed">
          <li className="flex items-start gap-2">
            <Info size={15} className="shrink-0 mt-0.5 text-[#a5b4fc]" />
            <span>
              {mustChooseApe
                ? t("radar.ape_onboard", "Renseignez le code APE de votre entreprise. La prospection sera limitée à ce secteur.")
                : apeLocked
                ? t("radar.sector_locked_tip", "Pour protéger les entreprises de tout démarchage hors sujet, la prospection est limitée à votre propre secteur d'activité (votre code APE).")
                : t("prospection.ape_help", "Le code APE est le code officiel qui décrit l'activité d'une entreprise (par exemple 10.71C pour une boulangerie). Tapez simplement un métier : le code est trouvé pour vous.")}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Info size={15} className="shrink-0 mt-0.5 text-[#a5b4fc]" />
            <span>
              {t("prospection.dept_help", "Département : choisissez-le dans la liste (tapez son numéro ou son nom), ou gardez « Toute la France ». « Département strict » ne garde que les entreprises dont le siège s'y trouve.")}
            </span>
          </li>
        </ul>

        {/* Formule Pro : secteur imposé, ce que débloque Business */}
        {showUpgrade && (
          <div className="mt-6 rounded-2xl border border-primary/40 bg-primary/10 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-primary/25 border border-primary/50 flex items-center justify-center shrink-0">
              <LockSimple size={22} className="text-[#a5b4fc]" weight="fill" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-white leading-tight">
                {t("prospection.pro_lock_title", "Formule Pro : la recherche porte sur votre secteur d'activité")}
              </p>
              <p className="text-sm text-white/70 font-light mt-1.5 leading-relaxed">
                {t("prospection.pro_lock_desc", {
                  price: PLAN_PRICES.business, n: PROSPECTION_MONTHLY_INCLUDED,
                  defaultValue: "Pour éviter tout démarchage hors sujet, la formule Pro cherche uniquement dans votre propre code APE. La formule Business ({{price}} €/mois) ouvre tous les secteurs et inclut {{n}} entreprises contactées par mois.",
                })}
              </p>
            </div>
            <Button
              type="button"
              onClick={onUpgrade}
              className="h-12 px-6 rounded-full bg-primary hover:bg-primary/90 text-white font-semibold shrink-0 outline-none [text-shadow:none] whitespace-nowrap"
            >
              <Crown size={18} weight="fill" className="mr-2" />
              {t("prospection.pro_lock_cta", "Passer à Business")}
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        )}

        {/* Le parcours, en trois étapes */}
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/10">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3 rounded-2xl bg-white/[0.04] border border-white/10 p-4">
              <div className="relative w-11 h-11 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
                <s.Icon size={22} className="text-[#a5b4fc]" />
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center border border-white/25">
                  {i + 1}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white leading-tight">{s.title}</p>
                <p className="text-xs text-white/60 font-light mt-1 leading-snug">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
