"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChatsCircle, CaretDown, CheckCircle } from "@/components/icons/ph";

/**
 * Rappel des points sur lesquels acheteur et vendeur doivent se mettre d'accord
 * PAR LA MESSAGERIE avant de s'engager.
 *
 * Une annonce Globly donne un prix et une présentation ; elle ne dit pas tout
 * (quelle part de l'entreprise est cédée, ce que le prix comprend, quand…).
 * Plutôt qu'un critère de recherche qui ne correspondrait à rien dans les
 * annonces, ces points sont rappelés là où la discussion se joue : sur la fiche
 * avant de contacter, dans la conversation, au moment de faire une offre.
 *
 * Un seul composant, pour que la liste soit la même partout.
 */
export const AGREEMENT_POINTS: { key: string; fr: string }[] = [
  { key: "agree.p_share", fr: "La part cédée : 100 % de l'entreprise, ou seulement une partie (laquelle ?)" },
  { key: "agree.p_scope", fr: "Ce que le prix comprend : stock, matériel, véhicules, bail ou murs, site et clientèle" },
  { key: "agree.p_price", fr: "Le prix et la façon de payer : comptant, emprunt, paiement en plusieurs fois" },
  { key: "agree.p_staff", fr: "Les salariés et les contrats repris (fournisseurs, bail, assurances)" },
  { key: "agree.p_timing", fr: "Le calendrier : date de reprise et étapes d'ici là" },
  { key: "agree.p_handover", fr: "L'accompagnement du vendeur après la vente, et sa durée" },
];

export function AgreementReminder({
  variant = "card", defaultOpen = false, className = "",
}: {
  /**
   * « card » : encart complet, liste visible (fiche d'annonce, formulaire d'offre).
   * « banner » : une ligne repliable (haut d'une conversation).
   */
  variant?: "card" | "banner";
  defaultOpen?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(variant === "card" ? true : defaultOpen);

  const list = (
    <ul className={variant === "card" ? "grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5" : "space-y-2"}>
      {AGREEMENT_POINTS.map((p) => (
        <li key={p.key} className="flex items-start gap-2.5 text-[13px] leading-snug text-white/80 font-light">
          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" weight="fill" style={{ color: "#a5b4fc" }} />
          <span>{t(p.key, p.fr)}</span>
        </li>
      ))}
    </ul>
  );

  if (variant === "banner") {
    return (
      <div className={`rounded-2xl border border-white/10 bg-white/[0.04] ${className}`}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="w-full flex items-center gap-2.5 px-4 min-h-[44px] py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/70 rounded-2xl"
        >
          <ChatsCircle className="w-4 h-4 shrink-0" weight="fill" style={{ color: "#a5b4fc" }} />
          <span className="flex-1 text-[13px] text-white/85">
            {t("agree.banner", "Mettez-vous d'accord ici, par écrit, sur tous les points de la vente")}
          </span>
          <CaretDown className={`w-4 h-4 shrink-0 text-white/50 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="px-4 pb-4 pt-1">
            {list}
            <p className="text-xs text-white/50 font-light mt-3 leading-relaxed">
              {t("agree.why", "L'annonce ne dit pas tout. Ce qui est écrit dans la messagerie reste, et sert de base à la lettre d'intention.")}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-primary/30 bg-primary/[0.08] p-5 text-left ${className}`}>
      <div className="flex items-center gap-2.5 mb-3">
        <ChatsCircle className="w-5 h-5 shrink-0" weight="fill" style={{ color: "#a5b4fc" }} />
        <h4 className="text-sm font-medium text-white">
          {t("agree.title", "À convenir ensemble, par la messagerie")}
        </h4>
      </div>
      <p className="text-[13px] text-white/65 font-light leading-relaxed mb-3">
        {t("agree.intro", "L'annonce donne un prix et une présentation, pas tous les détails. Avant de vous engager, mettez-vous d'accord par écrit avec votre interlocuteur sur :")}
      </p>
      {list}
    </div>
  );
}
