"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, XCircle, Info, Zap, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { localeFor } from '@/lib/markets';
import { countryLabel } from '@/lib/countries';
import { benchmarkCountry } from '@/lib/financingRules';

// Les seuils de cette analyse (prix à moins de 4 fois l'EBE, entre 4 et 7, au-delà ;
// marge de 10 % et 20 % ; loyer à 8 % et 15 % du chiffre d'affaires) sont une
// grille de lecture de Globly, tirée d'usages français. Ce ne sont ni des
// moyennes de marché ni des moyennes par métier : les textes ne le prétendent
// plus, et pour une annonce hors de France l'interface dit d'où ils viennent.

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
    management_type?: string;
    client_concentration?: string;
    digital_maturity?: string;
    market_trend?: string;
    /** code ISO du pays de l'annonce ; absent, c'est la France */
    country?: string | null;
  };
}

interface Flag {
  type: 'green' | 'red' | 'amber';
  label: string;
  detail: string;
}

export function AIInsightsPanel({ listing }: AIInsightsPanelProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const isFrench = benchmarkCountry(listing.country) === 'FR';

  const analysis = useMemo(() => {
    const flags: Flag[] = [];
    let score = 50;
    // Nombres écrits comme dans la langue du visiteur.
    const locale = localeFor(lang);
    const int = (v: number) => v.toLocaleString(locale, { maximumFractionDigits: 0 });
    const dec1 = (v: number) => v.toLocaleString(locale, { maximumFractionDigits: 1 });
    const pct = (v: number) => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(v / 100);

    // --- FINANCIAL ANALYSIS ---
    const multiple = listing.ebitda > 0 ? listing.price / listing.ebitda : 0;
    if (multiple > 0 && multiple < 4) {
      flags.push({ type: 'green', label: t('ai.price_low', 'Prix modéré par rapport au résultat'), detail: t('ai.price_low_det', "Le prix demandé représente {{multiple}} fois l'EBE, soit moins de 4 fois.", { multiple: dec1(multiple) }) });
      score += 10;
    } else if (multiple >= 4 && multiple <= 7) {
      flags.push({ type: 'amber', label: t('ai.price_mid', 'Prix intermédiaire par rapport au résultat'), detail: t('ai.price_mid_det', "Le prix demandé représente {{multiple}} fois l'EBE, soit entre 4 et 7 fois.", { multiple: dec1(multiple) }) });
      score += 3;
    } else if (multiple > 7) {
      flags.push({ type: 'red', label: t('ai.price_high', 'Prix élevé par rapport au résultat'), detail: t('ai.price_high_det', "Le prix demandé représente {{multiple}} fois l'EBE, soit plus de 7 fois. Une négociation est à envisager.", { multiple: dec1(multiple) }) });
      score -= 8;
    }

    // EBITDA margin
    if (listing.revenue_n1 > 0 && listing.ebitda > 0) {
      const margin = (listing.ebitda / listing.revenue_n1) * 100;
      if (margin > 20) {
        flags.push({ type: 'green', label: t('ai.margin_high', 'Marge opérationnelle solide'), detail: t('ai.margin_high_det', { margin: int(margin) }) });
        score += 8;
      } else if (margin > 10) {
        flags.push({ type: 'amber', label: t('ai.margin_med', 'Marge opérationnelle correcte'), detail: t('ai.margin_mid_det', "Marge d'EBE de {{margin}} : ni faible, ni élevée.", { margin: pct(margin) }) });
        score += 3;
      } else {
        flags.push({ type: 'red', label: t('ai.margin_low', 'Marge opérationnelle faible'), detail: t('ai.margin_low_det', { margin: int(margin) }) });
        score -= 8;
      }
    }

    // Revenue trend
    if (listing.revenue_n1 && listing.revenue_n2) {
      const growth = ((listing.revenue_n1 - listing.revenue_n2) / listing.revenue_n2) * 100;
      if (growth > 10) {
        flags.push({ type: 'green', label: t('ai.growth_high', 'Croissance forte'), detail: t('ai.growth_high_det', { growth: int(growth) }) });
        score += 8;
      } else if (growth > 0) {
        flags.push({ type: 'amber', label: t('ai.growth_med', 'Croissance modérée'), detail: t('ai.growth_med_det', { growth: int(growth) }) });
        score += 2;
      } else {
        flags.push({ type: 'red', label: t('ai.growth_low', 'Chiffre d\'affaires en baisse'), detail: t('ai.growth_low_det', { growth: int(growth) }) });
        score -= 10;
      }
    }

    // Rent ratio — `rent` est un loyer ANNUEL (formulaire « Loyer annuel »,
    // PDF, CompanyScore) : pas de multiplication par 12.
    if (listing.rent && listing.revenue_n1) {
      const rentRatio = (listing.rent / listing.revenue_n1) * 100;
      if (rentRatio > 15) {
        flags.push({ type: 'red', label: t('ai.rent_high', 'Charge locative élevée'), detail: t('ai.rent_high_det', { ratio: int(rentRatio) }) });
        score -= 5;
      } else if (rentRatio < 8) {
        flags.push({ type: 'green', label: t('ai.rent_low', 'Charge locative maîtrisée'), detail: t('ai.rent_low_det', { ratio: int(rentRatio) }) });
        score += 5;
      }
    }

    // Ancienneté
    if (listing.established_year) {
      const age = new Date().getFullYear() - listing.established_year;
      if (age > 10) {
        flags.push({ type: 'green', label: t('ai.age_high', 'Entreprise établie'), detail: t('ai.age_high_det', { age }) });
        score += 5;
      } else if (age < 3) {
        flags.push({ type: 'amber', label: t('ai.age_low', 'Entreprise jeune'), detail: t('ai.age_low_det', { age }) });
        score -= 3;
      }
    }

    // --- ELITE CRITERIA ---
    if (listing.management_type) {
      if (listing.management_type === 'autonomous') {
        flags.push({ type: 'green', label: t('ai.mgmt_auto', 'Équipe autonome (Scalabilité)'), detail: t('ai.mgmt_auto_det', "Le dirigeant est remplaçable facilement.") });
        score += 12;
      } else if (listing.management_type === 'dependent') {
        flags.push({ type: 'red', label: t('ai.mgmt_dep', 'Forte dépendance au dirigeant'), detail: t('ai.mgmt_dep_det', "L'intuitu personae est fort.") });
        score -= 10;
      }
    }

    if (listing.client_concentration) {
      if (listing.client_concentration === 'diversified') {
        flags.push({ type: 'green', label: t('ai.cli_div', 'Risque client dilué'), detail: t('ai.cli_div_det', "La clientèle est diversifiée.") });
        score += 10;
      } else if (listing.client_concentration === 'high') {
        flags.push({ type: 'red', label: t('ai.cli_high', 'Forte concentration client'), detail: t('ai.cli_high_det', "Le CA repose sur quelques gros comptes.") });
        score -= 12;
      }
    }

    if (listing.digital_maturity) {
      if (listing.digital_maturity === 'high') {
        flags.push({ type: 'green', label: t('ai.dig_high', 'Maturité digitale élevée'), detail: t('ai.dig_high_det', "Processus automatisés et outils modernes en place.") });
        score += 8;
      } else if (listing.digital_maturity === 'low') {
        flags.push({ type: 'amber', label: t('ai.dig_low', 'Dette technologique potentielle'), detail: t('ai.dig_low_det', "Faible digitalisation.") });
        score -= 5;
      }
    }

    if (listing.market_trend) {
      if (listing.market_trend === 'growing') {
        flags.push({ type: 'green', label: t('ai.mkt_grow', 'Marché porteur'), detail: t('ai.mkt_grow_det', "L'entreprise évolue sur un secteur en forte croissance.") });
        score += 8;
      } else if (listing.market_trend === 'declining') {
        flags.push({ type: 'red', label: t('ai.mkt_decl', 'Marché en contraction'), detail: t('ai.mkt_decl_det', "Secteur en déclin.") });
        score -= 10;
      }
    }

    score = Math.max(15, Math.min(95, score));

    const verdict = score >= 75 ? t('ai.verdict_solid', 'Opportunité très solide') : score >= 55 ? t('ai.verdict_interesting', 'Dossier intéressant') : t('ai.verdict_vigilance', 'Vigilance requise');
    const verdictColor = score >= 75 ? 'text-emerald-400' : score >= 55 ? 'text-amber-400' : 'text-red-400';

    return { flags, score, verdict, verdictColor };
  }, [listing, t, lang]);

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
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Globi, l'assistant du site : on voit tout de suite que l'analyse vient de l'IA */}
            <div className="w-11 h-11 shrink-0 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center overflow-hidden">
              <img src="/mascot/globi-ia.webp" alt="" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{t('ai.title', 'Score M&A Avancé (IA)')}</p>
              <p className="text-[10px] text-white/40 font-light">{t('ai.subtitle', 'Analyse Financière & Capital Immatériel')}</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-3xl font-light tabular-nums ${analysis.verdictColor}`}>{analysis.score}</span>
            <span className="text-sm text-white/30 font-light">/100</span>
          </div>
        </div>

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

      {greenFlags.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] uppercase tracking-widest text-emerald-300 font-semibold flex items-center gap-1.5 px-1">
            <ShieldCheck className="w-3 h-3" /> {t('ai.opportunities', 'Opportunités')} ({greenFlags.length})
          </span>
          {greenFlags.map((f, i) => (
            <div key={i} className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3.5 flex items-center gap-3">
              <FlagIcon type="green" />
              <div><p className="text-sm font-medium text-white/90">{f.label}</p><p className="text-[11px] text-white/40 font-light mt-0.5">{f.detail}</p></div>
            </div>
          ))}
        </div>
      )}

      {amberFlags.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] uppercase tracking-widest text-amber-300 font-semibold flex items-center gap-1.5 px-1">
            <Info className="w-3 h-3" /> {t('ai.points_attention', 'Points d\'attention')} ({amberFlags.length})
          </span>
          {amberFlags.map((f, i) => (
            <div key={i} className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3.5 flex items-center gap-3">
              <FlagIcon type="amber" />
              <div><p className="text-sm font-medium text-white/90">{f.label}</p><p className="text-[11px] text-white/40 font-light mt-0.5">{f.detail}</p></div>
            </div>
          ))}
        </div>
      )}

      {redFlags.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] uppercase tracking-widest text-red-300 font-semibold flex items-center gap-1.5 px-1">
            <ShieldAlert className="w-3 h-3" /> {t('ai.risks', 'Risques identifiés')} ({redFlags.length})
          </span>
          {redFlags.map((f, i) => (
            <div key={i} className="bg-red-500/5 border border-red-500/10 rounded-xl p-3.5 flex items-center gap-3">
              <FlagIcon type="red" />
              <div><p className="text-sm font-medium text-white/90">{f.label}</p><p className="text-[11px] text-white/40 font-light mt-0.5">{f.detail}</p></div>
            </div>
          ))}
        </div>
      )}

      <p className="flex items-start gap-2.5 text-sm text-white/80 leading-relaxed rounded-xl p-4 bg-white/[0.04] border border-white/10">
        <Info className="w-4 h-4 text-white/80 shrink-0 mt-0.5" />
        <span>
          {isFrench
            ? t('ai.scale_note', "Les seuils utilisés (prix rapporté à l'EBE, marge, poids du loyer) sont une grille de lecture de Globly, tirée d'usages français. Ce ne sont pas des moyennes de marché.")
            : t('ai.scale_note_other', "Pays de l'annonce : {{country}}. Les seuils utilisés (prix rapporté à l'EBE, marge, poids du loyer) sont une grille de lecture de Globly, tirée d'usages français et donnée à titre indicatif. Ils n'ont pas été vérifiés pour ce pays.", { country: countryLabel(listing.country, lang) })}
        </span>
      </p>

      <p className="text-[9px] text-white/20 font-light text-center leading-relaxed pt-2">
        {t('ai.disclaimer', 'Analyse générée automatiquement par notre algorithme IA. Ne constitue pas un conseil en investissement ou un audit certifié.')}
      </p>
    </div>
  );
}