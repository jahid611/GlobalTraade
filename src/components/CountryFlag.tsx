import React from "react";
import { Globe2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { countryLabel } from "@/lib/countries";

// Drapeaux dessinés ici, sans image externe : les drapeaux en émoji s'affichent
// mal sous Windows (deux lettres à la place du drapeau). Les six pays ouverts
// sur Globly ont leur drapeau ; tout autre pays reçoit un globe neutre.

const FLAGS: Record<string, React.ReactNode> = {
  FR: (<><rect width="8" height="16" fill="#1f3fa8" /><rect x="8" width="8" height="16" fill="#fff" /><rect x="16" width="8" height="16" fill="#e1000f" /></>),
  IT: (<><rect width="8" height="16" fill="#008c45" /><rect x="8" width="8" height="16" fill="#f4f5f0" /><rect x="16" width="8" height="16" fill="#cd212a" /></>),
  DE: (<><rect width="24" height="5.34" fill="#000" /><rect y="5.33" width="24" height="5.34" fill="#dd0000" /><rect y="10.66" width="24" height="5.34" fill="#ffce00" /></>),
  ES: (<><rect width="24" height="16" fill="#aa151b" /><rect y="4" width="24" height="8" fill="#f1bf00" /></>),
  PT: (<><rect width="24" height="16" fill="#da291c" /><rect width="9.6" height="16" fill="#046a38" /><circle cx="9.6" cy="8" r="3" fill="#ffe900" /></>),
  GB: (
    <>
      <rect width="24" height="16" fill="#012169" />
      <path d="M0 0 24 16M24 0 0 16" stroke="#fff" strokeWidth="3.2" />
      <path d="M0 0 24 16M24 0 0 16" stroke="#c8102e" strokeWidth="1.3" />
      <path d="M12 0v16M0 8h24" stroke="#fff" strokeWidth="5.4" />
      <path d="M12 0v16M0 8h24" stroke="#c8102e" strokeWidth="3.2" />
    </>
  ),
};

/** Petit drapeau d'un pays (code ISO à deux lettres). Décoratif : le nom du pays doit être écrit à côté. */
export function CountryFlag({ code, className = "" }: { code: string | null | undefined; className?: string }) {
  const flag = FLAGS[(code || "").toUpperCase()];
  if (!flag) return <Globe2 aria-hidden="true" className={`inline-block w-[1.1em] h-[1.1em] shrink-0 opacity-80 ${className}`} strokeWidth={1.5} />;
  return (
    <svg
      viewBox="0 0 24 16"
      aria-hidden="true"
      focusable="false"
      className={`inline-block h-[0.85em] w-[1.275em] shrink-0 rounded-[2px] ring-1 ring-white/25 ${className}`}
    >
      {flag}
    </svg>
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
