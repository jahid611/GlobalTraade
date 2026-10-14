"use client";

import { MARKET_CODES } from '@/lib/markets';
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SearchableSelect } from "@/components/PickerKit";
import { canonicalCountry, countryOptions } from "@/lib/countries";

/**
 * LE champ « Pays » du site : tous les pays du monde, avec recherche.
 *
 * À utiliser partout où l'on demande un pays, pour que tous les formulaires
 * proposent la même liste et enregistrent la même valeur (le code ISO à deux
 * lettres, voir src/lib/countries.ts). `value` accepte aussi un ancien nom
 * (« France ») et le relit comme son code.
 */
export function CountrySelect({
  value, onChange, className = "", placeholder,
}: {
  value: string | null | undefined;
  /** reçoit le code ISO du pays choisi (« FR ») */
  onChange: (code: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const { t, i18n } = useTranslation();
  // Les six pays où Globly est ouvert passent en tête de liste ; les autres suivent
  // (un membre peut habiter ailleurs : la liste reste complète, on y cherche par nom).
  const options = useMemo(() => {
    const all = countryOptions(i18n.language);
    const first = MARKET_CODES.map((c) => all.find((o) => o.value === c)).filter(Boolean) as typeof all;
    return [...first, ...all.filter((o) => !(MARKET_CODES as readonly string[]).includes(o.value))];
  }, [i18n.language]);
  // SearchableSelect affiche la valeur devant le libellé quand ils diffèrent
  // (pratique pour un code APE, pas pour « FR France ») : on lui passe donc le
  // nom du pays des deux côtés, et on retraduit en code à la sélection.
  const byLabel = useMemo(() => new Map(options.map((o) => [o.label, o.value])), [options]);
  const byCode = useMemo(() => new Map(options.map((o) => [o.value, o.label])), [options]);
  const labelOptions = useMemo(() => options.map((o) => ({ value: o.label, label: o.label })), [options]);

  return (
    <SearchableSelect
      value={byCode.get(canonicalCountry(value)) ?? ""}
      onChange={(label) => onChange(byLabel.get(label) ?? "")}
      options={labelOptions}
      className={className}
      placeholder={placeholder ?? (t("country.placeholder", "Choisir un pays") as string)}
      searchPlaceholder={t("country.search", "Chercher un pays…") as string}
      emptyLabel={t("country.none", "Aucun pays trouvé") as string}
    />
  );
}
