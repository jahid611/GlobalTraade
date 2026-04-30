"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, XCircle, Info, Zap, Sparkles } from 'lucide-react';

interface AIInsightsPanelProps {
  listing: {
    name: string;
    price: number;
    revenue_n1: number;
    revenue_n2?: number;
    revenue_n3?: number;
    ebitda: number;
    employees?: number;
    established_year?: number;
    rent?: number;
    industry?: string;
    description?: string;
    location?: string;
    // Nouveaux champs Elite
    management_type?: string;
    client_concentration?: string;
    digital_maturity?: string;
    market_trend?: string;
  };
}

interface Flag {
  type: 'green' | 'red' | 'amber';
  label: string;
  detail: string;
}

export function AIInsightsPanel({ listing }: AIInsightsPanelProps) {
  const analysis = useMemo(() => {
    const flags: Flag[] = [];
    let score = 50; // Neutral baseline

    // --- FINANCIAL ANALYSIS ---
    const multiple = listing.ebitda > 0 ? listing.price / listing.ebitda : 0;
    if (multiple > 0 && multiple < 4) {
      flags.push({ type: 'green', label: 'Valorisation attractive', detail: `Multiple EV/EBITDA de ${multiple.toFixed(1)}x — sous la moyenne sectorielle.` });
      score += 10;
    } else if (multiple >= 4 && multiple <= 7) {
      flags.push({ type: 'amber', label: 'Valorisation dans la norme', detail: `Multiple EV/EBITDA de ${multiple.toFixed(1)}x — dans la moyenne du marché.` });
      score += 3;
    } else if (multiple > 7) {
      flags.push({ type: 'red', label: 'Valorisation élevée', detail: `Multiple EV/EBITDA de ${multiple.toFixed(1)}x — au-dessus de la moyenne. Négociation recommandée.` });
      score -= 8;
    }

    // EBITDA margin
    if (listing.revenue_n1 > 0 && listing.ebitda > 0) {
      const margin = (listing.ebitda / listing.revenue_n1) * 100;
      if (margin > 20) {
        flags.push({ type: 'green', label: 'Marge opérationnelle solide', detail: `Marge EBITDA de ${margin.toFixed(0)}% — rentabilité élevée.` });
        score += 8;
      } else if (margin > 10) {
        flags.push({ type: 'amber', label: 'Marge opérationnelle correcte', detail: `Marge EBITDA de ${margin.toFixed(0)}% — performance standard.` });
        score += 3;
      } else {
        flags.push({ type: 'red', label: 'Marge opérationnelle faible', detail: `Marge EBITDA de ${margin.toFixed(0)}% — risque de trésorerie.` });
        score -= 8;
      }
    }

    // Revenue trend
    if (listing.revenue_n1 && listing.revenue_n2) {
      const growth = ((listing.revenue_n1 - listing.revenue_n2) / listing.revenue_n2) * 100;
      if (growth > 10) {
        flags.push({ type: 'green', label: 'Croissance forte', detail: `+${growth.toFixed(0)}% de CA entre N-2 et N-1. Dynamique positive.` });
        score += 8;
      } else if (growth > 0) {
        flags.push({ type: 'amber', label: 'Croissance modérée', detail: `+${growth.toFixed(0)}% de CA. Stable mais pas explosif.` });
        score += 2;
      } else {
        flags.push({ type: 'red', label: 'Chiffre d\'affaires en baisse', detail: `${growth.toFixed(0)}% de CA entre N-2 et N-1. Analyse des causes nécessaire.` });
        score -= 10;
      }
    }

    // Rent ratio
    if (listing.rent && listing.revenue_n1) {
      const rentRatio = (listing.rent * 12 / listing.revenue_n1) * 100;
      if (rentRatio > 15) {
        flags.push({ type: 'red', label: 'Charge locative élevée', detail: `Le loyer représente ${rentRatio.toFixed(0)}% du CA annuel. Risque structurel.` });
        score -= 5;
      } else if (rentRatio < 8) {
        flags.push({ type: 'green', label: 'Charge locative maîtrisée', detail: `Le loyer ne représente que ${rentRatio.toFixed(0)}% du CA. Bon levier.` });
        score += 5;
      }
    }

    // Ancienneté
    if (listing.established_year) {
      const age = new Date().getFullYear() - listing.established_year;
      if (age > 10) {
        flags.push({ type: 'green', label: 'Entreprise établie', detail: `${age} ans d'existence. Base client et processus éprouvés.` });
        score += 5;
      } else if (age < 3) {
        flags.push({ type: 'amber', label: 'Entreprise jeune', detail: `Seulement ${age} ans d'existence. Modèle à valider.` });
        score -= 3;
      }
    }

    // --- ELITE CRITERIA (Capital Immatériel) ---
    if (listing.management_type) {
      if (listing.management_type === 'autonomous') {
        flags.push({ type: 'green', label: 'Équipe autonome (Scalabilité)', detail: "Le dirigeant est remplaçable facilement, réduisant le risque de transmission." });
        score += 12;
      } else if (listing.management_type === 'dependent') {
        flags.push({ type: 'red', label: 'Forte dépendance au dirigeant', detail: "L'intuitu personae est fort. Période d'accompagnement post-cession indispensable." });
        score -= 10;
      }
    }

    if (listing.client_concentration) {
      if (listing.client_concentration === 'diversified') {
        flags.push({ type: 'green', label: 'Risque client dilué', detail: "La clientèle est diversifiée, assurant une forte résilience du chiffre d'affaires." });
        score += 10;
      } else if (listing.client_concentration === 'high') {
        flags.push({ type: 'red', label: 'Forte concentration client', detail: "Le CA repose sur quelques gros comptes. Risque élevé en cas de perte d'un client." });
        score -= 12;
      }
    }

    if (listing.digital_maturity) {
      if (listing.digital_maturity === 'high') {
        flags.push({ type: 'green', label: 'Maturité digitale élevée', detail: "Processus automatisés et outils modernes en place (CRM, ERP, e-commerce)." });
        score += 8;
      } else if (listing.digital_maturity === 'low') {
        flags.push({ type: 'amber', label: 'Dette technologique potentielle', detail: "Faible digitalisation. Nécessitera des investissements de modernisation." });
        score -= 5;
      }
    }

    if (listing.market_trend) {
      if (listing.market_trend === 'growing') {
        flags.push({ type: 'green', label: 'Marché porteur', detail: "L'entreprise évolue sur un secteur en forte croissance." });
        score += 8;
      } else if (listing.market_trend === 'declining') {
        flags.push({ type: 'red', label: 'Marché en contraction', detail: "Le secteur est en déclin. Profil de repreneur type \"retournement\" recommandé." });
        score -= 10;
      }
    }

    // Clamp score
    score = Math.max(15, Math.min(95, score));

    const verdict = score >= 75 ? 'Opportunité très solide' : score >= 55 ? 'Dossier intéressant' : 'Vigilance requise';
    const verdictColor = score >= 75 ? 'text-emerald-400' : score >= 55 ? 'text-amber-400' : 'text-red-400';

    return { flags, score, verdict, verdictColor };
  }, [listing]);

  const greenFlags = analysis.flags.filter(f => f.type === 'green');
  const redFlags = analysis.flags.filter(f => f.type === 'red');
  const amberFlags = analysis.flags.filter(f => f.type === 'amber');

  const FlagIcon = ({ type }: { type: string }) => {
    if (type === 'green') return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
    if (type === 'red') return <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
    return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
  };

  return (
    <div className="space-y-4">
      {/* Score Header */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-purple-500/20">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Score M&A Avancé (IA)</p>
              <p className="text-[10px] text-white/40 font-light">Analyse Financière & Capital Immatériel</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-3xl font-light tabular-nums ${analysis.verdictColor}`}>{analysis.score}</span>
            <span className="text-sm text-white/30 font-light">/100</span>
          </div>
        </div>

        {/* Score bar */}
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${analysis.score}%` }}
            transition={{ duration: 1, ease: "easeOut" as const }}
            className={`h-full rounded-full ${analysis.score >= 75 ? 'bg-emerald-400' : analysis.score >= 55 ? 'bg-amber-400' : 'bg-red-400'}`}
          />
        </div>
        <p className={`text-xs font-medium ${analysis.verdictColor}`}>{analysis.verdict}</p>
      </div>

      {/* Flags */}
      {greenFlags.length > 0 && (
        <div className="space-y-2">
          <span className="text-[9px] uppercase tracking-widest text-emerald-400/60 font-medium flex items-center gap-1.5 px-1">
            <ShieldCheck className="w-3 h-3" /> Opportunités ({greenFlags.length})
          </span>
          {greenFlags.map((f, i) => (
            <div key={i} className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3.5 flex items-start gap-3">
              <FlagIcon type="green" />
              <div><p className="text-sm font-medium text-white/90">{f.label}</p><p className="text-[11px] text-white/40 font-light mt-0.5">{f.detail}</p></div>
            </div>
          ))}
        </div>
      )}

      {amberFlags.length > 0 && (
        <div className="space-y-2">
          <span className="text-[9px] uppercase tracking-widest text-amber-400/60 font-medium flex items-center gap-1.5 px-1">
            <Info className="w-3 h-3" /> Points d'attention ({amberFlags.length})
          </span>
          {amberFlags.map((f, i) => (
            <div key={i} className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3.5 flex items-start gap-3">
              <FlagIcon type="amber" />
              <div><p className="text-sm font-medium text-white/90">{f.label}</p><p className="text-[11px] text-white/40 font-light mt-0.5">{f.detail}</p></div>
            </div>
          ))}
        </div>
      )}

      {redFlags.length > 0 && (
        <div className="space-y-2">
          <span className="text-[9px] uppercase tracking-widest text-red-400/60 font-medium flex items-center gap-1.5 px-1">
            <ShieldAlert className="w-3 h-3" /> Risques identifiés ({redFlags.length})
          </span>
          {redFlags.map((f, i) => (
            <div key={i} className="bg-red-500/5 border border-red-500/10 rounded-xl p-3.5 flex items-start gap-3">
              <FlagIcon type="red" />
              <div><p className="text-sm font-medium text-white/90">{f.label}</p><p className="text-[11px] text-white/40 font-light mt-0.5">{f.detail}</p></div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[9px] text-white/20 font-light text-center leading-relaxed pt-2">
        Analyse générée automatiquement par notre algorithme IA. Ne constitue pas un conseil en investissement ou un audit certifié.
      </p>
    </div>
  );
}