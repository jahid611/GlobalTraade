"use client";

import React, { useMemo, useState } from 'react';
import { Gauge, TrendingUp, TrendingDown, Wallet, Landmark, Coins, Globe, HeartHandshake, Users, Cpu, ShieldAlert, Sparkles, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { Listing } from '@/types/domain';
import { StatusDot, type StatusTone } from '@/components/StatusDot';
import { formatMoney, localeFor } from '@/lib/markets';
import { countryLabel } from '@/lib/countries';
import { benchmarkCountry } from '@/lib/financingRules';

// Note de qualité de l'entreprise sur 100, répartie en 10 critères notés
// sur 10, à la manière d'une évaluation d'investisseur / repreneur.
// Calculée à partir des données de l'annonce (financier + qualitatif).
// Débloquée avec l'accès complet (5 € ou formule Pro/Business).
//
// Les seuils (prix entre 2 et 8 fois l'EBE, poids du loyer, marge) sont des
// repères de lecture tirés d'usages FRANÇAIS. Le calcul est le même pour tous les
// pays, mais pour une annonce hors de France l'interface le dit : ces repères
// n'ont pas été vérifiés pour le pays.

/** La petite ligne sous le nom d'un critère : un code, et la valeur qui va avec. Le texte est écrit par le composant, dans la langue du visiteur. */
type CritNote =
  | { code: 'margin' | 'growth' | 'multiple' | 'per_head'; value: number }
  | { code: 'no_history' | 'estimated' | 'cash' | 'recurrence' | 'no_headcount' | 'not_given' | 'price_ok' | 'price_negotiate'
      | 'market_growing' | 'market_stable' | 'market_declining'
      | 'clients_diversified' | 'clients_medium' | 'clients_high'
      | 'team_autonomous' | 'team_family' | 'team_dependent' };
export type CritKey = 'rentabilite' | 'croissance' | 'endettement' | 'tresorerie' | 'potentiel' | 'fidelisation' | 'dependance' | 'productivite' | 'risque' | 'attractivite';
type Crit = { key: CritKey; score: number; Icon: React.ElementType; note: CritNote };

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

  const marketNote = ({ growing: 'market_growing', stable: 'market_stable', declining: 'market_declining' } as const)[listing.market_trend as 'growing' | 'stable' | 'declining'];
  const clientsNote = ({ diversified: 'clients_diversified', medium: 'clients_medium', high: 'clients_high' } as const)[listing.client_concentration as 'diversified' | 'medium' | 'high'];
  const teamNote = ({ autonomous: 'team_autonomous', family: 'team_family', dependent: 'team_dependent' } as const)[listing.management_type as 'autonomous' | 'family' | 'dependent'];

  const crits: Crit[] = [
    { key: 'rentabilite', score: rentabilite, Icon: Coins, note: { code: 'margin', value: rev1 > 0 ? margin : 0 } },
    { key: 'croissance', score: croissance, Icon: growth !== null && growth < 0 ? TrendingDown : TrendingUp, note: growth === null ? { code: 'no_history' } : { code: 'growth', value: growth } },
    { key: 'endettement', score: endettementScore, Icon: Landmark, note: ebitda > 0 ? { code: 'multiple', value: multiple } : { code: 'estimated' } },
    { key: 'tresorerie', score: tresorerie, Icon: Wallet, note: { code: 'cash' } },
    { key: 'potentiel', score: potentiel, Icon: Globe, note: { code: marketNote ?? 'not_given' } },
    { key: 'fidelisation', score: fidelisation, Icon: HeartHandshake, note: { code: 'recurrence' } },
    { key: 'dependance', score: dependance, Icon: Users, note: { code: clientsNote ?? 'not_given' } },
    { key: 'productivite', score: productivite, Icon: Cpu, note: employees > 0 ? { code: 'per_head', value: ebePerHead } : { code: 'no_headcount' } },
    { key: 'risque', score: risqueScore, Icon: ShieldAlert, note: { code: teamNote ?? 'estimated' } },
    { key: 'attractivite', score: attractivite, Icon: Sparkles, note: { code: priceCoherent ? 'price_ok' : 'price_negotiate' } },
  ];

  const total = crits.reduce((a, c) => a + c.score, 0); // /100
  return { total, crits };
}

// ── Textes ──────────────────────────────────────────────────────────────────
// Tous les textes passent par t('clé', 'texte français par défaut').

function critLabels(t: TFunction): Record<CritKey, string> {
  return {
    rentabilite: t('score.crit.rentabilite', 'Rentabilité'),
    croissance: t('score.crit.croissance', 'Croissance du CA'),
    endettement: t('score.crit.endettement', "Niveau d'endettement"),
    tresorerie: t('score.crit.tresorerie', 'Trésorerie'),
    potentiel: t('score.crit.potentiel', 'Potentiel du marché'),
    fidelisation: t('score.crit.fidelisation', 'Fidélisation clients'),
    dependance: t('score.crit.dependance', 'Dépendance clients/fournisseurs'),
    productivite: t('score.crit.productivite', 'Productivité'),
    risque: t('score.crit.risque', 'Niveau de risque'),
    attractivite: t('score.crit.attractivite', 'Attractivité investisseurs'),
  };
}

/** La petite ligne sous le nom du critère, avec les nombres écrits dans la langue du visiteur. */
function noteText(t: TFunction, lang: string, note: CritNote): string {
  const locale = localeFor(lang);
  switch (note.code) {
    case 'margin': return t('score.note.margin', "Marge d'EBE : {{pct}}", { pct: new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(note.value) });
    case 'growth': return t('score.note.growth', '{{pct}} par an', { pct: new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0, signDisplay: 'exceptZero' }).format(note.value) });
    case 'multiple': return t('score.note.multiple', "Prix : {{n}} fois l'EBE", { n: note.value.toLocaleString(locale, { maximumFractionDigits: 1 }) });
    case 'per_head': return t('score.note.per_head', "{{amount}} d'EBE par salarié", { amount: formatMoney(Math.round(note.value / 1000) * 1000, lang) });
    case 'no_history': return t('score.note.no_history', 'Historique incomplet');
    case 'estimated': return t('score.note.estimated', 'Estimé');
    case 'cash': return t('score.note.cash', 'Argent disponible estimé');
    case 'recurrence': return t('score.note.recurrence', 'Clients réguliers et outils');
    case 'no_headcount': return t('score.note.no_headcount', 'Effectif non renseigné');
    case 'not_given': return t('score.note.not_given', 'Non renseigné');
    case 'price_ok': return t('score.note.price_ok', 'Prix cohérent');
    case 'price_negotiate': return t('score.note.price_negotiate', 'Prix à discuter');
    case 'market_growing': return t('score.note.market_growing', 'Marché porteur');
    case 'market_stable': return t('score.note.market_stable', 'Marché mature');
    case 'market_declining': return t('score.note.market_declining', 'Marché en contraction');
    case 'clients_diversified': return t('score.note.clients_diversified', 'Clientèle diversifiée');
    case 'clients_medium': return t('score.note.clients_medium', 'Dépendance modérée');
    case 'clients_high': return t('score.note.clients_high', 'Forte dépendance');
    case 'team_autonomous': return t('score.note.team_autonomous', 'Équipe autonome');
    case 'team_family': return t('score.note.team_family', 'Entreprise familiale');
    case 'team_dependent': return t('score.note.team_dependent', 'Dépendance au dirigeant');
  }
}

// Pour chaque critère : ce qu'il mesure, puis ce que la note obtenue implique
// (bonne : 7 et plus, moyenne : 4 à 6, faible : moins de 4). Affiché au survol
// sur ordinateur, au toucher sur téléphone.
type Explain = { what: string; high: string; mid: string; low: string };

function explanations(t: TFunction, isFrench: boolean): Record<CritKey, Explain> {
  return {
    rentabilite: {
      what: t('score.explain.rentabilite.what', "La part du chiffre d'affaires qui reste une fois les charges d'exploitation payées (marge d'EBE). C'est ce que l'activité dégage réellement pour rembourser un emprunt et rémunérer le repreneur."),
      high: t('score.explain.rentabilite.high', "La marge est confortable : l'entreprise dégage de quoi rembourser un prêt et encaisser un imprévu."),
      mid: t('score.explain.rentabilite.mid', "La marge est correcte mais sans grande réserve : une hausse des charges ou une baisse d'activité se ressentira vite."),
      low: t('score.explain.rentabilite.low', "La marge est faible ou nulle : l'activité dégage peu de quoi rembourser un emprunt. À comprendre avant d'aller plus loin (charges, prix de vente, saisonnalité)."),
    },
    croissance: {
      what: t('score.explain.croissance.what', "L'évolution moyenne du chiffre d'affaires par an, sur les exercices communiqués dans l'annonce."),
      high: t('score.explain.croissance.high', "Le chiffre d'affaires progresse nettement : l'activité est sur une bonne dynamique, ce qui rassure un banquier."),
      mid: t('score.explain.croissance.mid', "Le chiffre d'affaires est globalement stable : pas de signal d'alerte, mais la croissance sera à aller chercher."),
      low: t('score.explain.croissance.low', "Le chiffre d'affaires recule : il faut en comprendre la cause (marché, concurrence, départ d'un client) avant de s'engager."),
    },
    endettement: {
      what: t('score.explain.endettement.what', "Les annonces ne contiennent pas le bilan : cette note est une estimation, fondée sur le poids du loyer dans le chiffre d'affaires et sur le prix demandé rapporté à l'EBE."),
      high: t('score.explain.endettement.high', "Loyer léger et prix cohérent avec ce que l'entreprise dégage : la reprise laisse de la marge pour rembourser."),
      mid: t('score.explain.endettement.mid', "Le loyer ou le prix demandé pèse déjà sensiblement : le remboursement sera plus tendu. À vérifier avec le bilan réel."),
      low: t('score.explain.endettement.low', "Loyer lourd ou prix élevé par rapport à l'EBE : le financement sera difficile sans apport important ou sans négocier le prix."),
    },
    tresorerie: {
      what: t('score.explain.tresorerie.what', "La capacité de l'entreprise à générer de l'argent disponible, estimée à partir de l'EBE (environ 70 %, une fois l'impôt et les investissements courants déduits) rapporté au chiffre d'affaires. Ce n'est pas le solde du compte en banque."),
      high: t('score.explain.tresorerie.high', "L'activité génère beaucoup de liquidités : de quoi rembourser et investir."),
      mid: t('score.explain.tresorerie.mid', "L'activité génère des liquidités correctes : suffisant en rythme normal, juste en cas de coup dur."),
      low: t('score.explain.tresorerie.low', "L'activité génère peu de liquidités : risque de tension de trésorerie, prévoyez une réserve au démarrage."),
    },
    potentiel: {
      what: t('score.explain.potentiel.what', "La tendance du marché sur lequel l'entreprise travaille, telle que le vendeur l'a déclarée."),
      high: t('score.explain.potentiel.high', "Marché porteur : la demande progresse, ce qui facilite le développement."),
      mid: t('score.explain.potentiel.mid', "Marché mature, ou tendance non renseignée : la croissance viendra surtout de parts prises aux concurrents."),
      low: t('score.explain.potentiel.low', "Marché en contraction : il faudra se différencier ou se diversifier pour maintenir l'activité."),
    },
    fidelisation: {
      what: t('score.explain.fidelisation.what', "Une estimation de la capacité à faire revenir les clients, à partir de deux informations de l'annonce : les outils numériques en place (fichier clients, site, réservation) et la diversité de la clientèle."),
      high: t('score.explain.fidelisation.high', "Clientèle régulière et bien outillée : le chiffre d'affaires sera plus prévisible après la reprise."),
      mid: t('score.explain.fidelisation.mid', "Fidélisation moyenne : des outils ou une clientèle à consolider pour sécuriser les revenus."),
      low: t('score.explain.fidelisation.low', "Peu d'outils et clientèle concentrée : les revenus reposent sur peu de chose, à renforcer rapidement."),
    },
    dependance: {
      what: t('score.explain.dependance.what', "La part de l'activité qui repose sur quelques clients (ou fournisseurs). Plus la note est haute, moins l'entreprise est dépendante."),
      high: t('score.explain.dependance.high', "Clientèle diversifiée : la perte d'un client ne met pas l'activité en danger."),
      mid: t('score.explain.dependance.mid', "Dépendance modérée, ou non renseignée : quelques clients comptent beaucoup, à identifier."),
      low: t('score.explain.dependance.low', "Forte dépendance : le départ d'un seul client peut faire chuter l'activité. Vérifiez les contrats et leur durée."),
    },
    productivite: {
      what: t('score.explain.productivite.what', "L'EBE dégagé par salarié : ce que chaque poste rapporte en moyenne."),
      high: t('score.explain.productivite.high', "Équipe très productive : la structure est légère par rapport à ce qu'elle dégage."),
      mid: t('score.explain.productivite.mid', "Productivité correcte, avec une marge d'amélioration."),
      low: t('score.explain.productivite.low', "Faible résultat par salarié : la masse salariale est lourde par rapport à l'activité."),
    },
    risque: {
      what: t('score.explain.risque.what', "Une synthèse de ce qui peut fragiliser la reprise : dépendance au dirigeant, concentration des clients, tendance du marché et rentabilité. Plus la note est haute, plus le risque est faible."),
      high: t('score.explain.risque.high', "Risque limité : l'entreprise peut fonctionner sans son dirigeant actuel et repose sur des bases diversifiées."),
      mid: t('score.explain.risque.mid', "Risque modéré : un ou deux points fragiles, à couvrir dans la négociation (accompagnement du cédant, garanties)."),
      low: t('score.explain.risque.low', "Risque élevé : l'activité tient à peu de chose (dirigeant, client, marché). Prévoyez une période d'accompagnement et des garanties."),
    },
    attractivite: {
      // « Entre 2 et 8 fois l'EBE » : fourchette large des repères d'usage français
      // (src/lib/valuation.ts). Hors de France, on le dit.
      what: isFrench
        ? t('score.explain.attractivite.what', "Une vue d'ensemble, comme la regarderait un investisseur : croissance, rentabilité, marché et cohérence du prix demandé. Le prix est jugé cohérent entre 2 et 8 fois l'EBE, une fourchette large tirée des repères d'usage en France : ce n'est pas une règle.")
        : t('score.explain.attractivite.what_other', "Une vue d'ensemble, comme la regarderait un investisseur : croissance, rentabilité, marché et cohérence du prix demandé. Le prix est jugé cohérent entre 2 et 8 fois l'EBE : c'est un repère tiré d'usages français, donné à titre indicatif, qui n'a pas été vérifié pour le pays de cette annonce."),
      high: t('score.explain.attractivite.high', "Dossier attractif : il intéressera facilement banques et repreneurs, d'autres acheteurs peuvent se positionner."),
      mid: t('score.explain.attractivite.mid', "Dossier correct : finançable, avec des points à argumenter ou à négocier."),
      low: t('score.explain.attractivite.low', "Dossier difficile à défendre en l'état : le prix ou les résultats sont à revoir."),
    },
  };
}

/** Ce que la note obtenue implique, en tenant compte des cas où l'information manque. */
function implication(c: Crit, e: Explain, t: TFunction): { tone: StatusTone; text: string } {
  const tone: StatusTone = c.score >= 7 ? 'green' : c.score >= 4 ? 'orange' : 'red';
  if (c.key === 'croissance' && c.note.code === 'no_history') {
    return { tone, text: t('score.implication.no_history', "L'annonce ne donne pas assez d'exercices pour mesurer la croissance : la note est neutre (5 sur 10) et ne dit rien de la tendance réelle. Demandez les bilans au vendeur.") };
  }
  if (c.key === 'productivite' && c.note.code === 'no_headcount') {
    return { tone, text: t('score.implication.no_headcount', "L'effectif n'est pas renseigné dans l'annonce : la note est indicative. Demandez le nombre de salariés au vendeur.") };
  }
  return { tone, text: c.score >= 7 ? e.high : c.score >= 4 ? e.mid : e.low };
}

function CritExplanation({ crit, explain, t }: { crit: Crit; explain: Explain; t: TFunction }) {
  const imp = implication(crit, explain, t);
  return (
    <>
      <p className="text-[10px] uppercase tracking-widest text-white/45 font-medium mb-1">{t('score.explain.measures', 'Ce que ça mesure')}</p>
      <p className="text-xs text-white/80 font-light leading-relaxed">{explain.what}</p>
      <p className="text-[10px] uppercase tracking-widest text-white/45 font-medium mt-3 mb-1">{t('score.explain.implies', 'Ce que {{n}} sur 10 implique', { n: crit.score })}</p>
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
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { total, crits } = useMemo(() => computeCompanyScore(listing), [listing]);
  const isFrench = benchmarkCountry(listing.country) === 'FR';
  const labels = critLabels(t);
  const explain = explanations(t, isFrench);

  const light: { tone: StatusTone; label: string; color: string } =
    total >= 70 ? { tone: 'green', label: t('score.verdict.green', 'Entreprise solide et attractive'), color: 'text-emerald-400' }
    : total >= 45 ? { tone: 'orange', label: t('score.verdict.orange', 'Profil intéressant, points de vigilance'), color: 'text-amber-400' }
    : { tone: 'red', label: t('score.verdict.red', 'Reprise à sécuriser'), color: 'text-red-400' };
  const outOf10 = (score: number) => t('score.out_of_10', '{{n}}/10', { n: score });

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
            <p className="text-lg font-light text-white leading-tight">{t('score.title', "Note de l'entreprise")}</p>
            <p className="flex items-center gap-2 mt-1 text-xs font-light text-white/60 leading-snug">
              <StatusDot tone={light.tone} size="md" />
              {light.label}
            </p>
          </div>
        </div>
        <div className="flex items-end gap-1.5 sm:justify-end">
          <span className={`text-5xl font-light tracking-tight tabular-nums ${light.color}`}>{total}</span>
          <span className="text-white/40 text-xl font-light mb-1">{t('score.out_of_100', '/100')}</span>
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
                    <span className="truncate">{labels[c.key]}</span>
                    <Info className="w-3 h-3 text-white/30 shrink-0" />
                  </p>
                  <p className="text-[10px] text-white/35 font-light truncate">{noteText(t, lang, c.note)}</p>
                </div>
                <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${c.score * 10}%`, background: barColor(c.score) }} />
                </div>
                <span className="text-sm font-light text-white/80 tabular-nums w-10 text-right shrink-0">{outOf10(c.score)}</span>
              </button>

              {open && (canHover ? (
                // souris : fiche flottante sous la ligne, sans décaler les autres
                <div
                  className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl p-4 pointer-events-none"
                  style={{ background: 'rgba(28,27,33,0.98)', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 18px 50px rgba(0,0,0,0.55)' }}
                  role="tooltip"
                >
                  <CritExplanation crit={c} explain={explain[c.key]} t={t} />
                </div>
              ) : (
                // tactile : l'explication se déplie sous la ligne
                <div className="mt-2 mb-1 rounded-xl p-3.5 bg-white/[0.04] border border-white/10">
                  <CritExplanation crit={c} explain={explain[c.key]} t={t} />
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
              <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-medium mb-2">{t('score.strengths', 'Points forts')}</p>
              <ul className="space-y-1.5">
                {forts.map(c => (
                  <li key={c.key} className="text-sm text-white/70 font-light flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" /> {labels[c.key]}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {faibles.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-amber-400 font-medium mb-2">{t('score.weaknesses', "Axes d'amélioration")}</p>
              <ul className="space-y-1.5">
                {faibles.map(c => (
                  <li key={c.key} className="text-sm text-white/70 font-light flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" /> {labels[c.key]}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!isFrench && (
        <p className="flex items-start gap-2.5 text-sm text-white/80 leading-relaxed mt-6 rounded-xl p-4 bg-white/[0.04] border border-white/10">
          <Info className="w-4 h-4 text-white/80 shrink-0 mt-0.5" />
          <span>{t('score.foreign_note', "Pays de l'annonce : {{country}}. Les seuils de cette note (prix rapporté à l'EBE, poids du loyer, marge) sont des repères tirés d'usages français, donnés à titre indicatif. Globly ne les a pas vérifiés pour ce pays.", { country: countryLabel(listing.country, lang) })}</span>
        </p>
      )}

      <p className="text-xs text-white/60 text-center leading-relaxed mt-6">
        {t('score.footnote', "Note indicative, calculée à partir des données de l'annonce. Elle ne remplace pas un audit avant achat.")}
      </p>
    </div>
  );
}
