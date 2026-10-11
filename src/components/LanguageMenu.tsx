"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Loader2 } from "lucide-react";
import { LANGUAGES, type LanguageCode } from "@/locales";
import { setLanguage } from "@/i18n";
import flagFr from "@/assets/flags/fr.svg";
import flagGb from "@/assets/flags/gb.svg";
import flagEs from "@/assets/flags/es.svg";
import flagIt from "@/assets/flags/it.svg";
import flagPt from "@/assets/flags/pt.svg";
import flagDe from "@/assets/flags/de.svg";

// Les vrais drapeaux (jeu libre « flag-icons »), embarqués avec le site : ils
// s'affichent partout, sans dépendre d'un fichier servi à part.
const FLAGS: Record<string, string> = { fr: flagFr, en: flagGb, es: flagEs, it: flagIt, pt: flagPt, de: flagDe };

/** Drapeau rond d'une langue. */
export function LanguageFlag({ code, size = 24 }: { code: string; size?: number }) {
  const lang = (code || "fr").slice(0, 2);
  return (
    <img
      src={FLAGS[lang] ?? FLAGS.fr} alt="" width={size} height={size} draggable={false}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block", flexShrink: 0, boxShadow: "0 0 0 1px rgba(255,255,255,0.25)" }}
    />
  );
}

/**
 * Le choix de la langue : un bouton avec le drapeau courant, qui ouvre la liste
 * des langues du site. Remplace l'ancien bouton qui alternait français/anglais.
 */
export function LanguageMenu({ className = "", flagSize = 24, placement = "bottom" }: {
  className?: string;
  flagSize?: number;
  /** où s'ouvre la liste par rapport au bouton */
  placement?: "bottom" | "top";
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const current = (i18n.language || "fr").slice(0, 2);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const choose = async (code: LanguageCode) => {
    if (code === current) { setOpen(false); return; }
    setLoading(code);
    try { await setLanguage(code); } finally { setLoading(null); setOpen(false); }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={t("lang.switch", "Changer de langue") as string}
        aria-label={t("lang.switch", "Changer de langue") as string}
        className={className || "w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/70"}
      >
        <LanguageFlag code={current} size={flagSize} />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={t("lang.switch", "Changer de langue") as string}
          className={`absolute right-0 ${placement === "top" ? "bottom-full mb-2" : "top-full mt-2"} z-[300] w-48 p-1.5 rounded-2xl`}
          style={{ background: "#211f25", border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 20px 50px rgba(0,0,0,0.55)" }}
        >
          {LANGUAGES.map((l) => (
            <li key={l.code} role="option" aria-selected={l.code === current}>
              <button
                type="button"
                onClick={() => choose(l.code)}
                className="w-full flex items-center gap-3 px-3 min-h-[44px] rounded-xl text-sm text-left transition-colors hover:bg-white/10 outline-none focus-visible:bg-white/10"
                style={{ color: "#ffffff", background: l.code === current ? "rgba(120,114,251,0.18)" : undefined }}
              >
                <LanguageFlag code={l.code} size={20} />
                <span className="flex-1">{l.label}</span>
                {loading === l.code ? <Loader2 className="w-4 h-4 animate-spin" /> : l.code === current ? <Check className="w-4 h-4" style={{ color: "#a5b4fc" }} /> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
