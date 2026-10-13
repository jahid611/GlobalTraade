"use client";

import React, { useMemo, useState } from 'react';
import { Gauge, TrendingUp, TrendingDown, Wallet, Landmark, Coins, Globe, HeartHandshake, Users, Cpu, ShieldAlert, Sparkles, Info } from 'lucide-react';
import type { Listing } from '@/types/domain';
import { StatusDot, type StatusTone } from '@/components/StatusDot';

// Note de qualité de l'entreprise sur 100, répartie en 10 critères notés
// sur 10, à la manière d'une évaluation d'investisseur / repreneur.
// Calculée à partir des données de l'annonce (financier + qualitatif).
// Débloquée avec l'accès complet (5 € ou formule Pro/Business).

type Crit = { key: string; label: string; score: number; Icon: React.ElementType; note: string };

const clamp10 = (v: number) => Math.max(0, Math.min(10, Math.round(v)));

function cagr(older?: number, newer?: number): number | null {
  if (!older || !newer || older <= 0 || newer <= 0) return null;
  return newer / older - 1;
}

export function computeCompanyScore(listing: Listing): { total: number; crits: Crit[] } {
  const rev1 = Number(listing.revenue_n1) || 0;
  const rev2 = Number(listing.revenue_n2) || 0;
  const rev3 = Number(listing.revenue_n3) || 0;
  const ebitda = Number(listing.ebitda) || 0;
  const price = Number(listing.price) || 0;
  const rent = Number(listing.rent) || 0;
  const employees = Number(listing.employees) || 0;
  const margin = rev1 > 0 ? ebitda / rev1 : 0;
  const fcf = ebitda * 0.7;

  // Croissance annuelle moyenne du CA (sur la profondeur disponible)
  const growth = cagr(rev3 || rev2, rev1);

  // 1. Rentabilité — marge d'EBE
  const rentabilite = clamp10(margin <= 0 ? (ebitda < 0 ? 0 : 1) : margin * 45); // 22% -> ~10

  // 2. Croissance du CA
  const croissance = growth === null ? 5 : clamp10(5 + growth * 40); // +12.5%/an -> 10 ; -12.5% -> 0

  // 3. Niveau d'endettement — proxy : poids du loyer dans le CA + valorisation
  //    (pas de bilan disponible ; un loyer faible et un prix cohérent = sain)
  const rentBurden = rev1 > 0 ? rent / rev1 : 0.1;
  const multiple = ebitda > 0 ? price / ebitda : 99;
  let endettement = 10;
  if (rentBurden > 0.15) endettement -= 4; else if (rentBurden > 0.08) endettement -= 2;
  if (multiple > 8) endettement -= 4; else if (multiple > 6) endettement -= 2;
  const endettementScore = clamp10(endettement);

  // 4. Trésorerie — capacité de génération de cash (FCF vs CA)
  const tresorerie = clamp10(rev1 > 0 ? (fcf / rev1) * 55 : (fcf > 0 ? 5 : 1));

  // 5. Potentiel du marché
  const marketMap: Record<string, number> = { growing: 10, stable: 6, declining: 3 };
  const potentiel = marketMap[listing.market_trend] ?? 5;

  // 6. Fidélisation clients — proxy : maturité digitale (CRM) + clientèle diversifiée
  const digMap: Record<string, number> = { high: 9, medium: 6, low: 3 };
  const cliFidMap: Record<string, number> = { diversified: 9, medium: 6, high: 4 };
  const fidelisation = clamp10(((digMap[listing.digital_maturity] ?? 5) + (cliFidMap[listing.client_concentration] ?? 5)) / 2);

  // 7. Dépendance clients / fournisseurs (note haute = faible dépendance)
  const depMap: Record<string, number> = { diversified: 10, medium: 6, high: 2 };
  const dependance = depMap[listing.client_concentration] ?? 5;

  // 8. Productivité — EBE par salarié
  const ebePerHead = employees > 0 ? ebitda / employees : (ebitda > 0 ? 40000 : 0);
  const productivite = clamp10(ebePerHead / 6000); // 60 k€/salarié -> 10

  // 9. Niveau de risque (note haute = faible risque) — management + clients + marché + rentabilité
  const mgmtMap: Record<string, number> = { autonomous: 10, family: 6, dependent: 3 };
  let risque = ((mgmtMap[listing.management_type] ?? 5) + (depMap[listing.client_concentration] ?? 5) + (marketMap[listing.market_trend] ?? 5)) / 3;
  if (margin <= 0) risque -= 2;
  const risqueScore = clamp10(risque);

  // 10. Attractivité investisseurs — croissance + marge + marché + cohérence du prix
  const priceCoherent = ebitda > 0 && multiple >= 2 && multiple <= 8;
  const attractivite = clamp10(
    (croissance * 0.35) + (rentabilite * 0.35) + (potentiel * 0.2) + (priceCoherent ? 2 : 0)
  );

  const crits: Crit[] = [
    { key: 'rentabilite', label: 'Rentabilité', score: rentabilite, Icon: Coins, note: `Marge d'EBE ${rev1 > 0 ? Math.round(margin * 100) : 0} %` },
    { key: 'croissance', label: 'Croissance du CA', score: croissance, Icon: growth !== null && growth < 0 ? TrendingDown : TrendingUp, note: growth === null ? 'Historique incomplet' : `${growth >= 0 ? '+' : ''}${Math.round(growth * 100)} % / an` },
    { key: 'endettement', label: "Niveau d'endettement", score: endettementScore, Icon: Landmark, note: ebitda > 0 ? `Valorisation ${multiple.toFixed(1)}x EBE` : 'Estimé' },
    { key: 'tresorerie', label: 'Trésorerie', score: tresorerie, Icon: Wallet, note: 'Cash-flow disponible estimé' },
    { key: 'potentiel', label: 'Potentiel du marché', score: potentiel, Icon: Globe, note: { growing: 'Marché porteur', stable: 'Marché mature', declining: 'Marché en contraction' }[listing.market_trend as string] || 'Non renseigné' },
    { key: 'fidelisation', label: 'Fidélisation clients', score: fidelisation, Icon: HeartHandshake, note: 'Récurrence & outils clients' },
    { key: 'dependance', label: 'Dépendance clients/fournisseurs', score: dependance, Icon: Users, note: { diversified: 'Clientèle diversifiée', medium: 'Dépendance modérée', high: 'Forte dépendance' }[listing.client_concentration as string] || 'Non renseigné' },
    { key: 'productivite', label: 'Productivité', score: productivite, Icon: Cpu, note: employees > 0 ? `${Math.round(ebePerHead / 1000)} k€ EBE / salarié` : 'Effectif non renseigné' },
    { key: 'risque', label: 'Niveau de risque', score: risqueScore, Icon: ShieldAlert, note: { autonomous: 'Équipe autonome', family: 'Entreprise familiale', dependent: 'Dépendance au dirigeant' }[listing.management_type as string] || 'Estimé' },
    { key: 'attractivite', label: 'Attractivité investisseurs', score: attractivite, Icon: Sparkles, note: priceCoherent ? 'Prix cohérent' : 'Profil à négocier' },
  ];

  const total = crits.reduce((a, c) => a + c.score, 0); // /100
  return { total, crits };
}

// ── Explications des critères ───────────────────────────────────────────────
// Pour chaque critère : ce qu'il mesure, puis ce que la note obtenue implique
// (bonne : 7 et plus, moyenne : 4 à 6, faible : moins de 4). Affiché au survol
// sur ordinateur, au toucher sur téléphone.
type Explain = { what: string; high: string; mid: string; low: string };
const EXPLAIN: Record<string, Explain> = {
  rentabilite: {
    what: "La part du chiffre d'affaires qui reste une fois les charges d'exploitation payées (marge d'EBE). C'est ce que l'activité dégage réellement pour rembourser un emprunt et rémunérer le repreneur.",
    high: "La marge est confortable : l'entreprise dégage de quoi rembourser un prêt et encaisser un imprévu.",
    mid: "La marge est correcte mais sans grande réserve : une hausse des charges ou une baisse d'activité se ressentira vite.",
    low: "La marge est faible ou nulle : l'activité dégage peu de quoi rembourser un emprunt. À comprendre avant d'aller plus loin (charges, prix de vente, saisonnalité).",
  },
  croissance: {
    what: "L'évolution moyenne du chiffre d'affaires par an, sur les exercices communiqués dans l'annonce.",
    high: "Le chiffre d'affaires progresse nettement : l'activité est sur une bonne dynamique, ce qui rassure un banquier.",
    mid: "Le chiffre d'affaires est globalement stable : pas de signal d'alerte, mais la croissance sera à aller chercher.",
    low: "Le chiffre d'affaires recule : il faut en comprendre la cause (marché, concurrence, départ d'un client) avant de s'engager.",
  },
  endettement: {
    what: "Les annonces ne contiennent pas le bilan : cette note est une estimation, fondée sur le poids du loyer dans le chiffre d'affaires et sur le prix demandé rapporté à l'EBE.",
    high: "Loyer léger et prix cohérent avec ce que l'entreprise dégage : la reprise laisse de la marge pour rembourser.",
    mid: "Le loyer ou le prix demandé pèse déjà sensiblement : le remboursement sera plus tendu. À vérifier avec le bilan réel.",
    low: "Loyer lourd ou prix élevé par rapport à l'EBE : le financement sera difficile sans apport important ou sans négocier le prix.",
  },
  tresorerie: {
    what: "La capacité de l'entreprise à générer de l'argent disponible, estimée à partir de l'EBE (environ 70 %, une fois l'impôt et les investissements courants déduits) rapporté au chiffre d'affaires. Ce n'est pas le solde du compte en banque.",
    high: "L'activité génère beaucoup de liquidités : de quoi rembourser et investir.",
    mid: "L'activité génère des liquidités correctes : suffisant en rythme normal, juste en cas de coup dur.",
    low: "L'activité génère peu de liquidités : risque de tension de trésorerie, prévoyez une réserve au démarrage.",
  },
  potentiel: {
    what: "La tendance du marché sur lequel l'entreprise travaille, telle que le vendeur l'a déclarée.",
    high: "Marché porteur : la demande progresse, ce qui facilite le développement.",
    mid: "Marché mature, ou tendance non renseignée : la croissance viendra surtout de parts prises aux concurrents.",
    low: "Marché en contraction : il faudra se différencier ou se diversifier pour maintenir l'activité.",
  },
  fidelisation: {
    what: "Une estimation de la capacité à faire revenir les clients, à partir de deux informations de l'annonce : les outils numériques en place (fichier clients, site, réservation…) et la diversité de la clientèle.",
    high: "Clientèle récurrente et bien outillée : le chiffre d'affaires sera plus prévisible après la reprise.",
    mid: "Fidélisation moyenne : des outils ou une clientèle à consolider pour sécuriser les revenus.",
    low: "Peu d'outils et clientèle concentrée : les revenus reposent sur peu de chose, à renforcer rapidement.",
  },
  dependance: {
    what: "La part de l'activité qui repose sur quelques clients (ou fournisseurs). Plus la note est haute, moins l'entreprise est dépendante.",
    high: "Clientèle diversifiée : la perte d'un client ne met pas l'activité en danger.",
    mid: "Dépendance modérée, ou non renseignée : quelques clients comptent beaucoup, à identifier.",
    low: "Forte dépendance : le départ d'un seul client peut faire chuter l'activité. Vérifiez les contrats et leur durée.",
  },
  productivite: {
    what: "L'EBE dégagé par salarié : ce que chaque poste rapporte en moyenne.",
    high: "Équipe très productive : la structure est légère par rapport à ce qu'elle dégage.",
    mid: "Productivité dans la moyenne : cohérente, avec une marge d'amélioration.",
    low: "Faible résultat par salarié : la masse salariale est lourde par rapport à l'activité.",
  },
  risque: {
    what: "Une synthèse de ce qui peut fragiliser la reprise : dépendance au dirigeant, concentration des clients, tendance du marché et rentabilité. Plus la note est haute, plus le risque est faible.",
    high: "Risque limité : l'entreprise peut fonctionner sans son dirigeant actuel et repose sur des bases diversifiées.",
    mid: "Risque modéré : un ou deux points fragiles, à couvrir dans la négociation (accompagnement du cédant, garanties).",
    low: "Risque élevé : l'activité tient à peu de chose (dirigeant, client, marché). Prévoyez une période d'accompagnement et des garanties.",
  },
  attractivite: {
    what: "Une vue d'ensemble, comme la regarderait un investisseur : croissance, rentabilité, marché et cohérence du prix demandé (entre 2 et 8 fois l'EBE).",
    high: "Dossier attractif : il intéressera facilement banques et repreneurs, d'autres acheteurs peuvent se positionner.",
    mid: "Dossier correct : finançable, avec des points à argumenter ou à négocier.",
    low: "Dossier difficile à défendre en l'état : le prix ou les résultats sont à revoir.",
  },
};

/** Ce que la note obtenue implique, en tenant compte des cas où l'information manque. */
function implication(c: Crit): { tone: StatusTone; text: string } {
  const tone: StatusTone = c.score >= 7 ? 'green' : c.score >= 4 ? 'orange' : 'red';
  if (c.key === 'croissance' && c.note === 'Historique incomplet') {
    return { tone, text: "L'annonce ne donne pas assez d'exercices pour mesurer la croissance : la note est neutre (5/10) et ne dit rien de la tendance réelle. Demandez les bilans au vendeur." };
  }
  if (c.key === 'productivite' && c.note === 'Effectif non renseigné') {
    return { tone, text: "L'effectif n'est pas renseigné dans l'annonce : la note est indicative. Demandez le nombre de salariés au vendeur." };
  }
  const e = EXPLAIN[c.key];
  return { tone, text: c.score >= 7 ? e.high : c.score >= 4 ? e.mid : e.low };
}

function CritExplanation({ crit }: { crit: Crit }) {
  const e = EXPLAIN[crit.key];
  const imp = implication(crit);
  return (
    <>
      <p className="text-[10px] uppercase tracking-widest text-white/45 font-medium mb-1">Ce que ça mesure</p>
      <p className="text-xs text-white/80 font-light leading-relaxed">{e.what}</p>
      <p className="text-[10px] uppercase tracking-widest text-white/45 font-medium mt-3 mb-1">Ce que {crit.score}/10 implique</p>
      <p className="flex items-start gap-2 text-xs text-white/80 font-light leading-relaxed">
        <StatusDot tone={imp.tone} className="mt-[5px]" />
        <span>{imp.text}</span>
      </p>
    </>
  );
}

// Même code que le voyant : vert = bon (7 et plus), orange = moyen (4 à 6), rouge = faible.
const barColor = (s: number) => s >= 7 ? '#34d399' : s >= 4 ? '#f59e0b' : '#f87171';

export function CompanyScore({ listing }: { listing: Listing }) {
  const { total, crits } = useMemo(() => computeCompanyScore(listing), [listing]);

  const light: { tone: StatusTone; label: string; color: string } =
    total >= 70 ? { tone: 'green', label: 'Entreprise solide et attractive', color: 'text-emerald-400' }
    : total >= 45 ? { tone: 'orange', label: 'Profil intéressant, points de vigilance', color: 'text-amber-400' }
    : { tone: 'red', label: 'Reprise à sécuriser', color: 'text-red-400' };

  // Explication d'un critère : au survol avec une souris, au toucher sinon.
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [canHover] = useState(() => typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches);

  const forts = crits.filter(c => c.score >= 8).sort((a, b) => b.score - a.score).slice(0, 3);
  const faibles = crits.filter(c => c.score <= 4).sort((a, b) => a.score - b.score).slice(0, 3);

  return (
    <div className="liquid-glass contrast-day border-white/10 rounded-[2rem] p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-8">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center border border-primary/25 shrink-0">
            <Gauge className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-lg font-light text-white leading-tight">Note de l'entreprise</p>
            <p className="flex items-center gap-2 mt-1 text-xs font-light text-white/60 leading-snug">
              <StatusDot tone={light.tone} size="md" />
              {light.label}
            </p>
          </div>
        </div>
        <div className="flex items-end gap-1.5 sm:justify-end">
          <span className={`text-5xl font-light tracking-tight tabular-nums ${light.color}`}>{total}</span>
          <span className="text-white/40 text-xl font-light mb-1">/100</span>
        </div>
      </div>

      <div className="space-y-3">
        {crits.map(c => {
          const open = openKey === c.key;
          return (
            <div
              key={c.key}
              className="relative"
              onMouseEnter={() => { if (canHover) setOpenKey(c.key); }}
              onMouseLeave={() => { if (canHover) setOpenKey(null); }}
            >
              <button
                type="button"
                onClick={() => { if (!canHover) setOpenKey(open ? null : c.key); }}
                onFocus={() => { if (canHover) setOpenKey(c.key); }}
                onBlur={() => { if (canHover) setOpenKey(null); }}
                aria-expanded={open}
                className={`w-full flex items-center gap-3 text-left rounded-lg -mx-2 px-2 py-1 outline-none transition-colors ${open ? 'bg-white/[0.05]' : ''} ${canHover ? 'cursor-help' : ''}`}
                style={{ width: 'calc(100% + 1rem)' }}
              >
                <c.Icon className="w-4 h-4 text-white/40 shrink-0" />
                <div className="w-40 sm:w-52 shrink-0">
                  <p className="text-sm font-light text-white/85 leading-tight truncate flex items-center gap-1.5">
                    <span className="truncate">{c.label}</span>
                    <Info className="w-3 h-3 text-white/30 shrink-0" />
                  </p>
                  <p className="text-[10px] text-white/35 font-light truncate">{c.note}</p>
                </div>
                <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${c.score * 10}%`, background: barColor(c.score) }} />
                </div>
                <span className="text-sm font-light text-white/80 tabular-nums w-10 text-right shrink-0">{c.score}/10</span>
              </button>

              {open && (canHover ? (
                // souris : fiche flottante sous la ligne, sans décaler les autres
                <div
                  className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl p-4 pointer-events-none"
                  style={{ background: 'rgba(28,27,33,0.98)', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 18px 50px rgba(0,0,0,0.55)' }}
                  role="tooltip"
                >
                  <CritExplanation crit={c} />
                </div>
              ) : (
                // tactile : l'explication se déplie sous la ligne
                <div className="mt-2 mb-1 rounded-xl p-3.5 bg-white/[0.04] border border-white/10">
                  <CritExplanation crit={c} />
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {(forts.length > 0 || faibles.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/10">
          {forts.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-medium mb-2">Points forts</p>
              <ul className="space-y-1.5">
                {forts.map(c => (
                  <li key={c.key} className="text-sm text-white/70 font-light flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" /> {c.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {faibles.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-amber-400 font-medium mb-2">Axes d'amélioration</p>
              <ul className="space-y-1.5">
                {faibles.map(c => (
                  <li key={c.key} className="text-sm text-white/70 font-light flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" /> {c.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-white/30 font-light text-center leading-relaxed mt-6">
        * Note indicative calculée à partir des données de l'annonce. Elle ne remplace pas un audit d'acquisition.
      </p>
    </div>
  );
}
