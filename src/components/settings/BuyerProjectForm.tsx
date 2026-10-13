"use client";

// Saisie du projet de reprise. Chaque champ se choisit dans les listes du site
// (secteurs, régions, départements, tranches de montants) : les mêmes valeurs
// que la marketplace, donc directement utilisables par la recherche.

import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { MultiSelect } from "@/components/MultiSelect";
import { Dropdown } from "@/components/PickerKit";
import { ChoicePill, Field, inputCls, dropdownButtonCls } from "@/components/settings/ui";
import { industryOptions } from "@/lib/industries";
import { marketCountryOptions, pruneRegions, regionOptionsFor } from "@/lib/geoRegions";
import { DEPARTMENTS } from "@/lib/departments";
import { AMOUNT_RANGE_OPTIONS, type AmountRange } from "@/lib/ranges";
import { rangeBounds } from "@/lib/rangeBounds";
import {
  BUYER_TYPES, EXPERIENCE_LEVELS, EXPERIENCE_DEFAULTS, TIMELINES, TIMELINE_DEFAULTS,
  departmentLabel, formatEurosInput, parseEurosInput,
  type BuyerProject, type ExperienceLevel,
} from "@/lib/buyerProject";

// Ancienne saisie libre : affichée telle quelle, à remplacer par un choix.
function LegacyValues({ label, values, onRemove, removeLabel }: {
  label: string;
  values: string[];
  onRemove?: (v: string) => void;
  removeLabel?: (v: string) => string;
}) {
  if (!values.length) return null;
  return (
    <div className="mt-2.5 rounded-2xl border px-4 py-3" style={{ background: "rgba(245,158,11,0.07)", borderColor: "rgba(245,158,11,0.3)" }}>
      <p className="text-sm font-light leading-snug" style={{ color: "#fcd34d" }}>{label}</p>
      <ul className="flex flex-wrap gap-2 mt-2">
        {values.map((v) => (
          <li key={v} className="inline-flex items-center gap-1 pl-4 pr-0.5 min-h-[44px] rounded-full bg-white/[0.07] border border-white/15 text-sm text-white/90">
            <span className="break-all">{v}</span>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(v)}
                aria-label={removeLabel?.(v)}
                className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BuyerProjectForm({ value, onChange }: { value: BuyerProject; onChange: (p: BuyerProject) => void }) {
  const { t, i18n } = useTranslation();
  const set = (patch: Partial<BuyerProject>) => onChange({ ...value, ...patch });
  const setLegacy = (patch: Partial<BuyerProject["legacy"]>) => ({ ...value.legacy, ...patch });

  const sectorOptions = useMemo(() => industryOptions(t, i18n.language), [t, i18n.language]);
  const countryOptions = useMemo(() => marketCountryOptions(i18n.language), [i18n.language]);
  const regionOptions = useMemo(() => regionOptionsFor(value.countries, i18n.language), [value.countries, i18n.language]);
  // Les départements sont français : on ne les propose que si la France est visée.
  const franceInScope = value.countries.length === 0 || value.countries.includes("FR");
  const departmentOptions = useMemo(() => DEPARTMENTS.map((d) => ({ value: d.code, label: departmentLabel(d.code) })), []);
  const any = t("bp.not_set", "Non précisé") as string;
  const amountOptions = useMemo(() => [{ value: "", label: any }, ...AMOUNT_RANGE_OPTIONS], [any]);
  const expOptions = useMemo(() => [
    { value: "", label: any },
    ...EXPERIENCE_LEVELS.map((k) => ({ value: k as string, label: t(`buyer.exp_${k}`, EXPERIENCE_DEFAULTS[k]) as string })),
  ], [t, any]);

  const legacyHint = t("bp.legacy_hint", "Ancienne saisie libre. Remplacez-la par un choix dans la liste ci-dessus, puis retirez-la :") as string;
  const removeLabel = (v: string) => t("bp.legacy_remove", { defaultValue: "Retirer « {{value}} »", value: v }) as string;

  // Ce que l'apport représente par rapport au prix visé : le repère que regarde une banque.
  const budget = rangeBounds(value.budget);
  const pct = (n: number) => Math.round((value.apport! / n) * 100);
  const apportHelp = value.apport && budget && budget.max !== null && budget.min > 0
    ? t("bp.apport_share", {
        defaultValue: "Cela représente entre {{low}} % et {{high}} % du prix que vous visez. Les banques demandent souvent 20 à 30 %.",
        low: pct(budget.max), high: pct(budget.min),
      })
    : value.apport && budget && budget.max !== null
      ? t("bp.apport_share_min", { defaultValue: "Cela représente au moins {{low}} % du prix que vous visez. Les banques demandent souvent 20 à 30 %.", low: pct(budget.max) })
      : t("bp.apport_hint", "L'argent que vous apportez vous-même, sans compter le prêt de la banque. Écrivez le montant en euros.");

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-7">
      <Field className="xl:col-span-2" label={t("bp.q_type", "Vous reprenez en tant que")}>
        <div className="flex flex-wrap gap-2.5">
          {BUYER_TYPES.map((type) => (
            <ChoicePill
              key={type}
              selected={value.buyerType === type}
              onClick={() => set({ buyerType: value.buyerType === type ? "" : type, legacy: setLegacy({ buyerType: "" }) })}
            >
              {t(`buyer.type_${type}`)}
            </ChoicePill>
          ))}
        </div>
        <LegacyValues label={legacyHint} values={value.legacy.buyerType ? [value.legacy.buyerType] : []}
          onRemove={() => set({ legacy: setLegacy({ buyerType: "" }) })} removeLabel={removeLabel} />
      </Field>

      <Field
        className="xl:col-span-2"
        label={t("bp.q_sectors", "Quels secteurs vous intéressent ?")}
        hint={t("bp.q_sectors_hint", "Choisissez un ou plusieurs métiers dans la liste : ce sont les mêmes que ceux des annonces.")}
      >
        <MultiSelect
          options={sectorOptions}
          selected={value.sectors}
          onChange={(v) => set({ sectors: v })}
          placeholder={t("bp.sectors_ph", "Choisir un ou plusieurs secteurs") as string}
          className="!rounded-2xl !border-white/15"
        />
        <LegacyValues label={legacyHint} values={value.legacy.sectors}
          onRemove={(v) => set({ legacy: setLegacy({ sectors: value.legacy.sectors.filter((x) => x !== v) }) })} removeLabel={removeLabel} />
      </Field>

      <Field
        className="xl:col-span-2"
        label={t("bp.q_countries", "Dans quels pays ?")}
        hint={t("bp.q_countries_hint", "Choisissez un ou plusieurs pays. Laissez vide si tous les pays vous conviennent.")}
      >
        <MultiSelect
          options={countryOptions}
          selected={value.countries}
          onChange={(v) => set({
            countries: v,
            // un pays retiré emporte ses régions ; sans la France, plus de départements
            regions: pruneRegions(value.regions, v),
            departments: v.length === 0 || v.includes("FR") ? value.departments : [],
          })}
          searchable={false}
          placeholder={t("bp.countries_ph", "Tous les pays") as string}
          className="!rounded-2xl !border-white/15"
        />
      </Field>

      <Field
        className={franceInScope ? "" : "xl:col-span-2"}
        label={t("bp.q_regions", "Dans quelles régions ?")}
        hint={t("bp.q_regions_hint_multi", "Les régions des pays choisis. Laissez vide si tout le pays vous convient.")}
      >
        <MultiSelect
          options={regionOptions}
          selected={value.regions}
          onChange={(v) => set({ regions: v })}
          placeholder={t("bp.regions_ph_all", "Toutes les régions") as string}
          className="!rounded-2xl !border-white/15"
        />
      </Field>

      {franceInScope && (
      <Field
        label={t("bp.q_departments", "Des départements précis ?")}
        optional
        hint={t("bp.q_departments_hint_fr", "En France seulement : pour viser plus fin qu'une région, ou l'outre-mer.")}
      >
        <MultiSelect
          options={departmentOptions}
          selected={value.departments}
          onChange={(v) => set({ departments: v })}
          placeholder={t("bp.departments_ph", "Choisir un ou plusieurs départements") as string}
          className="!rounded-2xl !border-white/15"
        />
      </Field>
      )}

      {value.legacy.zones.length > 0 && (
        <div className="xl:col-span-2 -mt-4">
          <LegacyValues label={legacyHint} values={value.legacy.zones}
            onRemove={(v) => set({ legacy: setLegacy({ zones: value.legacy.zones.filter((x) => x !== v) }) })} removeLabel={removeLabel} />
        </div>
      )}

      <Field
        label={t("bp.q_budget", "Quel prix d'achat visez-vous ?")}
        hint={value.legacy.budget
          ? t("bp.legacy_amount", { defaultValue: "Vous aviez écrit « {{value}} ». Choisissez la tranche qui correspond.", value: value.legacy.budget })
          : t("bp.q_budget_hint", "Le prix de l'entreprise que vous pouvez envisager, prêt bancaire compris.")}
      >
        <Dropdown
          value={value.budget}
          onChange={(v) => set({ budget: v as AmountRange | "", legacy: setLegacy({ budget: "" }) })}
          options={amountOptions}
          placeholder={any}
          buttonClassName={dropdownButtonCls}
        />
      </Field>

      <Field
        label={t("bp.q_apport", "Votre apport personnel")}
        htmlFor="bp-apport"
        hint={value.legacy.apport && value.apport === null
          ? t("bp.legacy_apport", { defaultValue: "Vous aviez indiqué « {{value}} ». Écrivez le montant précis en euros pour le remplacer.", value: value.legacy.apport })
          : apportHelp}
      >
        <div className="relative">
          <input
            id="bp-apport"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className={`${inputCls} pr-12`}
            placeholder={t("bp.apport_ph", "Ex. : 80 000") as string}
            value={formatEurosInput(value.apport)}
            onChange={(e) => {
              const amount = parseEurosInput(e.target.value);
              // Champ vidé : l'ancienne valeur (s'il y en avait une) reste en place.
              set({ apport: amount, legacy: amount === null ? value.legacy : setLegacy({ apport: "" }) });
            }}
          />
          <span aria-hidden="true" className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 text-base">€</span>
        </div>
      </Field>

      <Field
        label={t("bp.q_revenue", "Chiffre d'affaires recherché")}
        optional
        hint={value.legacy.revenue
          ? t("bp.legacy_amount", { defaultValue: "Vous aviez écrit « {{value}} ». Choisissez la tranche qui correspond.", value: value.legacy.revenue })
          : t("bp.q_revenue_hint", "Le chiffre d'affaires est le total des ventes de l'entreprise sur un an.")}
      >
        <Dropdown
          value={value.revenue}
          onChange={(v) => set({ revenue: v as AmountRange | "", legacy: setLegacy({ revenue: "" }) })}
          options={amountOptions}
          placeholder={any}
          buttonClassName={dropdownButtonCls}
        />
      </Field>

      <Field
        label={t("settings.experience", "Votre expérience")}
        optional
        hint={value.legacy.experience
          ? t("bp.legacy_experience", { defaultValue: "Vous aviez écrit « {{value}} ». Choisissez le niveau qui s'en rapproche.", value: value.legacy.experience })
          : undefined}
      >
        <Dropdown
          value={value.experience}
          onChange={(v) => set({ experience: v as ExperienceLevel | "", legacy: setLegacy({ experience: "" }) })}
          options={expOptions}
          placeholder={t("settings.experience_ph2", "Votre niveau d'expérience") as string}
          buttonClassName={dropdownButtonCls}
        />
      </Field>

      <Field className="xl:col-span-2" label={t("bp.q_timeline", "Quand voulez-vous reprendre ?")}>
        <div className="flex flex-wrap gap-2.5">
          {TIMELINES.map((k) => (
            <ChoicePill key={k} selected={value.timeline === k} onClick={() => set({ timeline: value.timeline === k ? "" : k })}>
              {t(`bp.timeline_${k}`, TIMELINE_DEFAULTS[k])}
            </ChoicePill>
          ))}
        </div>
      </Field>

      <Field
        className="xl:col-span-2"
        label={t("bp.q_ambitions", "Présentez votre projet en quelques phrases")}
        htmlFor="bp-ambitions"
        optional
        hint={t("bp.q_ambitions_hint", "Ce texte est visible sur votre profil. Dites ce que vous cherchez et pourquoi.")}
      >
        <textarea
          id="bp-ambitions"
          rows={4}
          spellCheck={false}
          maxLength={1500}
          className={`${inputCls} resize-y leading-relaxed`}
          placeholder={t("bp.ambitions_ph", "Ex. : Boulanger depuis 12 ans, je cherche à reprendre une boulangerie de quartier près de Lyon pour m'installer à mon compte.") as string}
          value={value.ambitions}
          onChange={(e) => set({ ambitions: e.target.value })}
        />
      </Field>
    </div>
  );
}
