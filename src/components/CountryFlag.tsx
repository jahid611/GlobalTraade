import React from "react";
import { Globe2 } from "@/components/icons";
import { useTranslation } from "react-i18next";
import flagFr from "@/assets/flags/fr.svg";
import flagGb from "@/assets/flags/gb.svg";
import flagEs from "@/assets/flags/es.svg";
import flagIt from "@/assets/flags/it.svg";
import flagPt from "@/assets/flags/pt.svg";
import flagDe from "@/assets/flags/de.svg";
import { countryLabel } from "@/lib/countries";

// Les vrais drapeaux, les mêmes que ceux du menu des langues (jeu libre « flag-icons »,
// embarqué avec le site) : ronds, complets (armoiries de l'Espagne et du Portugal comprises).
// Les six pays ouverts sur Globly ont leur drapeau ; tout autre pays reçoit un globe neutre.
// (Avant, ce fichier redessinait des drapeaux simplifiés : ils ne ressemblaient pas aux vrais.)
const FLAGS: Record<string, string> = { FR: flagFr, GB: flagGb, ES: flagEs, IT: flagIt, PT: flagPt, DE: flagDe };

/** Petit drapeau rond d'un pays (code ISO à deux lettres). Décoratif : le nom du pays doit être écrit à côté. */
export function CountryFlag({ code, className = "" }: { code: string | null | undefined; className?: string }) {
  const flag = FLAGS[(code || "").toUpperCase()];
  if (!flag) return <Globe2 aria-hidden="true" className={`inline-block w-[1.1em] h-[1.1em] shrink-0 opacity-80 ${className}`} strokeWidth={1.5} />;
  return (
    <img
      src={flag} alt="" aria-hidden="true" draggable={false}
      className={`inline-block h-[1.1em] w-[1.1em] shrink-0 rounded-full object-cover align-[-0.15em] ring-1 ring-white/25 ${className}`}
    />
  );
}

/** Drapeau + nom du pays, dans la langue affichée (le drapeau est un dessin, pas un émoji). */
export function CountryTag({ country, className = "" }: { country: string | null | undefined; className?: string }) {
  const { i18n } = useTranslation();
  const code = (country || "FR").toUpperCase();
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${className}`}>
      <CountryFlag code={code} />
      <span>{countryLabel(code, i18n.language)}</span>
    </span>
  );
}
