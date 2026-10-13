import type { ReactNode } from "react";

/**
 * Titre des pages de l'application (tableau de bord, marketplace, prospection…).
 *
 * Un seul modèle pour toutes : un début en blanc (`lead`, facultatif) et un mot
 * ou groupe de mots en violet (`accent`, obligatoire). Un titre d'un seul mot
 * s'écrit donc entièrement en violet : aucun titre ne peut rester tout blanc.
 *
 * Le bloc qui contient le titre et son sous-titre porte la classe `page-head`
 * (voir globals.css) : sur téléphone, elle l'aligne avec le contenu des cartes.
 */
export function PageTitle({ lead, accent, className = "" }: { lead?: ReactNode; accent: ReactNode; className?: string }) {
  return (
    <h1 className={`text-3xl md:text-4xl font-light tracking-tight text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.55)] ${className}`}>
      {lead ? <>{lead} </> : null}
      <span className="text-primary font-medium">{accent}</span>
    </h1>
  );
}
