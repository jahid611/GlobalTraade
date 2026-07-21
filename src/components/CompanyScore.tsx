"use client";

import React, { useMemo } from 'react';
import { Gauge, TrendingUp, TrendingDown, Wallet, Landmark, Coins, Globe, HeartHandshake, Users, Cpu, ShieldAlert, Sparkles } from 'lucide-react';

// Note de qualité de l'entreprise sur 100, répartie en 10 critères notés
// sur 10, à la manière d'une évaluation d'investisseur / repreneur.
// Calculée à partir des données de l'annonce (financier + qualitatif).
// Débloquée avec l'accès complet (5 € ou formule Pro/Business).

type Crit = { key: string; label: string; score: number; Icon: any; note: string };

const clamp10 = (v: number) => Math.max(0, Math.min(10, Math.round(v)));

function cagr(older?: number, newer?: number): number | null {
  if (!older || !newer || older <= 0 || newer <= 0) return null;
  return newer / older - 1;
}

export function computeCompanyScore(listing: any): { total: number; crits: Crit[] } {
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

const barColor = (s: number) => s >= 7 ? '#34d399' : s >= 4 ? '#a855f7' : '#f87171';

export function CompanyScore({ listing }: { listing: any }) {
  const { total, crits } = useMemo(() => computeCompanyScore(listing), [listing]);

  const light = total >= 70 ? { emoji: '🟢', label: 'Entreprise solide et attractive', color: 'text-emerald-400' }
    : total >= 45 ? { emoji: '🟠', label: 'Profil intéressant, points de vigilance', color: 'text-amber-400' }
    : { emoji: '🔴', label: 'Reprise à sécuriser', color: 'text-red-400' };

  const forts = crits.filter(c => c.score >= 8).sort((a, b) => b.score - a.score).slice(0, 3);
  const faibles = crits.filter(c => c.score <= 4).sort((a, b) => a.score - b.score).slice(0, 3);

  return (
    <div className="liquid-glass border-white/10 rounded-[2rem] p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-8">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center border border-primary/25 shrink-0">
            <Gauge className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-lg font-light text-white leading-tight">Note de l'entreprise</p>
            <p className={`text-xs font-light mt-0.5 ${light.color}`}>{light.emoji} {light.label}</p>
          </div>
        </div>
        <div className="flex items-end gap-1.5 sm:justify-end">
          <span className={`text-5xl font-light tracking-tight tabular-nums ${light.color}`}>{total}</span>
          <span className="text-white/40 text-xl font-light mb-1">/100</span>
        </div>
      </div>

      <div className="space-y-3">
        {crits.map(c => (
          <div key={c.key} className="flex items-center gap-3">
            <c.Icon className="w-4 h-4 text-white/40 shrink-0" />
            <div className="w-40 sm:w-52 shrink-0">
              <p className="text-sm font-light text-white/85 leading-tight truncate">{c.label}</p>
              <p className="text-[10px] text-white/35 font-light truncate">{c.note}</p>
            </div>
            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${c.score * 10}%`, background: barColor(c.score) }} />
            </div>
            <span className="text-sm font-light text-white/80 tabular-nums w-10 text-right shrink-0">{c.score}/10</span>
          </div>
        ))}
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
