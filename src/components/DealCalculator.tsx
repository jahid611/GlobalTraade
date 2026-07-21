"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Landmark, Percent, Clock, ChevronDown, ChevronUp, Info, PiggyBank, Briefcase, AlertTriangle, Handshake, Users, Gift, Gauge } from 'lucide-react';

interface DealCalculatorProps {
  listing: { price: number; revenue_n1: number; ebitda: number; rent?: number; };
}

// Feu de faisabilité (proche de la lecture d'un comité de crédit bancaire)
type Light = 'green' | 'orange' | 'red';
const LIGHT_META: Record<Light, { emoji: string; label: string; color: string; bg: string }> = {
  green:  { emoji: '🟢', label: 'Financement facilement envisageable', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  orange: { emoji: '🟠', label: 'Financement possible sous conditions',  color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
  red:    { emoji: '🔴', label: 'Financement difficile',                 color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
};

export function DealCalculator({ listing }: DealCalculatorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Répartition du financement (en % du prix)
  const [apportPct, setApportPct] = useState(20);
  const [investisseursPct, setInvestisseursPct] = useState(0);
  const [creditVendeurPct, setCreditVendeurPct] = useState(10);
  const [aidesPct, setAidesPct] = useState(0);
  const [loanRate, setLoanRate] = useState(5.0);
  const [loanDuration, setLoanDuration] = useState(7);
  const [showInfo, setShowInfo] = useState<string | null>(null);

  // Empêche la somme des sources (hors banque) de dépasser 100 %
  const setSource = (setter: (v: number) => void, current: number, val: number) => {
    const others = (apportPct + investisseursPct + creditVendeurPct + aidesPct) - current;
    setter(Math.min(val, 100 - others));
  };

  const calc = useMemo(() => {
    const price = listing.price || 0;
    const ebitda = listing.ebitda || 0;
    const revenue = listing.revenue_n1 || 0;

    const apport = (price * apportPct) / 100;
    const investisseurs = (price * investisseursPct) / 100;
    const creditVendeur = (price * creditVendeurPct) / 100;
    const aides = (price * aidesPct) / 100;
    const bankLoan = Math.max(0, price - apport - investisseurs - creditVendeur - aides);
    const bankPct = price > 0 ? (bankLoan / price) * 100 : 0;

    // Fonds propres = apport personnel + investisseurs (les aides ne sont pas remboursables)
    const equity = apport + investisseurs;

    // Emprunt bancaire — annuités constantes
    const r = loanRate / 100 / 12;
    const n = loanDuration * 12;
    const monthlyPayment = bankLoan > 0 ? (r > 0
      ? (bankLoan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
      : bankLoan / n) : 0;
    const annualBankPayment = monthlyPayment * 12;
    const totalCreditCost = monthlyPayment * n - bankLoan; // coût total du crédit (intérêts)

    // Crédit vendeur — remboursé sur 3 ans, sans intérêt (simplification)
    const cvDuration = 3;
    const annualCVPayment = creditVendeur > 0 ? creditVendeur / cvDuration : 0;

    const totalAnnualDebtService = annualBankPayment + annualCVPayment;

    // Flux de trésorerie disponible (proxy : 70 % de l'EBE après IS, BFR, Capex)
    const fcf = ebitda * 0.70;

    // Capacité d'emprunt estimée : dette max telle que DSCR = 1.2 sur la durée
    const maxAnnualService = fcf / 1.2;
    const maxMonthly = maxAnnualService / 12;
    const borrowingCapacity = maxMonthly > 0 && r > 0
      ? maxMonthly * (1 - Math.pow(1 + r, -n)) / r
      : maxMonthly * n;

    // Apport personnel recommandé : le max entre 20 % du prix et ce qu'il faut
    // pour ramener l'emprunt bancaire à la capacité d'emprunt (DSCR = 1.2).
    const recommendedApport = Math.max(price * 0.20, price - borrowingCapacity - creditVendeur - aides - investisseurs);
    const recommendedApportPct = price > 0 ? Math.min(100, Math.max(0, (recommendedApport / price) * 100)) : 0;

    // Ratios bancaires
    const totalDebt = bankLoan + creditVendeur;
    const levier = ebitda > 0 ? totalDebt / ebitda : Infinity;
    const dscr = totalAnnualDebtService > 0 ? fcf / totalAnnualDebtService : (fcf > 0 ? Infinity : 0);
    const gearing = equity > 0 ? totalDebt / equity : Infinity;
    const isApportOk = apportPct >= 20;
    const isLevierOk = levier <= 3.5;
    const isDscrOk = dscr >= 1.2;
    const isGearingOk = gearing <= 3.0;

    // Probabilité d'obtention du financement (modèle pondéré, style scoring bancaire)
    let proba = 100;
    if (ebitda <= 0) proba -= 65;
    if (apportPct < 10) proba -= 30; else if (apportPct < 20) proba -= 15;
    if (dscr < 1) proba -= 40; else if (dscr < 1.2) proba -= 18; else if (dscr >= 1.6) proba += 4;
    if (levier > 4) proba -= 28; else if (levier > 3.5) proba -= 14; else if (levier <= 2.5) proba += 4;
    if (gearing > 3.5) proba -= 12; else if (gearing > 3) proba -= 6;
    if (creditVendeur > 0) proba += 5; // signal positif pour la banque
    proba = Math.max(3, Math.min(98, Math.round(proba)));

    const light: Light = proba >= 70 ? 'green' : proba >= 40 ? 'orange' : 'red';

    return {
      price, ebitda, revenue, fcf,
      apport, investisseurs, creditVendeur, aides, bankLoan, bankPct, equity,
      monthlyPayment, annualBankPayment, annualCVPayment, totalAnnualDebtService, totalCreditCost,
      borrowingCapacity, recommendedApport, recommendedApportPct,
      cashflowPostDette: fcf - totalAnnualDebtService,
      proba, light,
      ratios: {
        levier: levier === Infinity ? 'N/A' : levier.toFixed(1) + 'x',
        dscr: dscr === Infinity ? 'N/A' : dscr.toFixed(1) + 'x',
        gearing: gearing === Infinity ? 'N/A' : gearing.toFixed(1) + 'x',
        isApportOk, isLevierOk, isDscrOk, isGearingOk,
      },
    };
  }, [apportPct, investisseursPct, creditVendeurPct, aidesPct, loanRate, loanDuration, listing]);

  const fmt = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

  const InfoBlock = ({ id, title, text }: { id: string; title: string; text: string }) => (
    <AnimatePresence>
      {showInfo === id && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
          <div className="mt-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-100 text-xs font-light leading-relaxed">
            <strong className="font-medium text-blue-300 block mb-1">{title}</strong>
            {text}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const Stat = ({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: string }) => (
    <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
      <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium mb-1.5">{label}</p>
      <p className={`text-xl font-light ${accent || 'text-white'} tabular-nums`}>{value}</p>
      {hint && <p className="text-[11px] text-white/35 font-light mt-1 leading-snug">{hint}</p>}
    </div>
  );

  const Slider = ({ label, icon: Icon, value, onChange, color, max = 100, infoId, infoTitle, infoText }: any) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => infoId && setShowInfo(showInfo === infoId ? null : infoId)} className="text-[10px] uppercase tracking-widest text-white/60 font-medium flex items-center gap-1.5 hover:text-white transition-colors">
          <Icon className="w-3.5 h-3.5" /> {label} {infoId && <Info className="w-3 h-3" />}
        </button>
        <span className="text-sm font-medium tabular-nums" style={{ color }}>{value}%</span>
      </div>
      <input type="range" min={0} max={max} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full"
        style={{ accentColor: color }} />
      {infoId && <InfoBlock id={infoId} title={infoTitle} text={infoText} />}
    </div>
  );

  const lm = LIGHT_META[calc.light];

  return (
    <div className="w-full">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all duration-300 group">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform">
            <Landmark className="w-6 h-6 text-blue-400" />
          </div>
          <div className="text-left">
            <p className="text-base font-medium text-white">Simulateur de financement</p>
            <p className="text-xs text-white/40 font-light mt-0.5">Faisabilité bancaire, mensualités et probabilité d'obtention</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isOpen && <span className="hidden sm:inline text-lg" title={lm.label}>{lm.emoji}</span>}
          {isOpen ? <ChevronUp className="w-5 h-5 text-white/40" /> : <ChevronDown className="w-5 h-5 text-white/40" />}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-4 bg-white/[0.02] border border-white/5 rounded-2xl p-6 md:p-8 space-y-10">

              {/* VERDICT — feu + probabilité */}
              <div className={`rounded-2xl border p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-5 ${lm.bg}`}>
                <div className="flex items-center gap-4 flex-1">
                  <span className="text-4xl leading-none">{lm.emoji}</span>
                  <div>
                    <p className={`text-base font-medium ${lm.color}`}>{lm.label}</p>
                    <p className="text-xs text-white/50 font-light mt-0.5">Estimation fondée sur l'apport, le DSCR, le levier et la structure du montage.</p>
                  </div>
                </div>
                <div className="text-center shrink-0">
                  <p className={`text-4xl font-light tabular-nums ${lm.color}`}>{calc.proba}%</p>
                  <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium mt-1">Probabilité d'obtention</p>
                </div>
              </div>

              {listing.ebitda <= 0 && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-200 font-light">
                    L'EBITDA (EBE) renseigné est négatif ou nul. Un financement bancaire classique (LBO) sera très difficile à obtenir sans restructuration.
                  </p>
                </div>
              )}

              {/* SYNTHÈSE CHIFFRÉE */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <Stat label="Apport recommandé" value={fmt(calc.recommendedApport)} hint={`≈ ${Math.round(calc.recommendedApportPct)} % du prix`} accent="text-primary" />
                <Stat label="Montant à emprunter" value={fmt(calc.bankLoan)} hint={`${Math.round(calc.bankPct)} % du prix, ${loanDuration} ans`} accent="text-blue-400" />
                <Stat label="Mensualité estimée" value={fmt(calc.monthlyPayment)} hint={`sur ${loanDuration * 12} mois à ${loanRate.toFixed(1)} %`} />
                <Stat label="Coût total du crédit" value={fmt(calc.totalCreditCost)} hint="intérêts cumulés" accent="text-amber-400" />
                <Stat label="Capacité d'emprunt" value={fmt(calc.borrowingCapacity)} hint="max. selon la trésorerie (DSCR 1.2)" accent="text-blue-400" />
                <Stat label="Reste de trésorerie / an" value={`${calc.cashflowPostDette >= 0 ? '+' : ''}${fmt(calc.cashflowPostDette)}`} hint="après remboursement de la dette" accent={calc.cashflowPostDette >= 0 ? 'text-emerald-400' : 'text-red-400'} />
              </div>

              {/* RÉPARTITION DU FINANCEMENT */}
              <div>
                <div className="flex justify-between text-xs font-medium text-white/40 mb-2 uppercase tracking-widest">
                  <span>Répartition du financement</span>
                  <span>{fmt(calc.price)}</span>
                </div>
                <div className="h-4 w-full rounded-full flex overflow-hidden border border-white/10">
                  <div className="h-full bg-primary transition-all" style={{ width: `${apportPct}%` }} />
                  <div className="h-full bg-fuchsia-400 transition-all" style={{ width: `${investisseursPct}%` }} />
                  <div className="h-full bg-amber-400 transition-all" style={{ width: `${creditVendeurPct}%` }} />
                  <div className="h-full bg-emerald-400 transition-all" style={{ width: `${aidesPct}%` }} />
                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${calc.bankPct}%` }} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-xs font-light">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /><span className="text-white/80">Apport ({fmt(calc.apport)})</span></span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-fuchsia-400" /><span className="text-white/80">Investisseurs ({fmt(calc.investisseurs)})</span></span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-white/80">Crédit vendeur ({fmt(calc.creditVendeur)})</span></span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /><span className="text-white/80">Aides ({fmt(calc.aides)})</span></span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-white/80">Banque ({fmt(calc.bankLoan)})</span></span>
                </div>
              </div>

              {/* CURSEURS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <Slider label="Apport personnel" icon={PiggyBank} value={apportPct} color="#a855f7"
                  onChange={(v: number) => setSource(setApportPct, apportPct, v)}
                  infoId="apport" infoTitle="Pourquoi l'apport est crucial ?"
                  infoText="Les banques financent rarement 100 % d'un rachat. Un apport de 20 % à 30 % prouve l'engagement du repreneur (skin in the game) et réduit le risque." />
                <Slider label="Investisseurs" icon={Users} value={investisseursPct} color="#e879f9"
                  onChange={(v: number) => setSource(setInvestisseursPct, investisseursPct, v)}
                  infoId="inv" infoTitle="Investisseurs / co-repreneurs"
                  infoText="Des fonds propres apportés par des tiers (business angels, fonds, associés) renforcent la structure et rassurent la banque, au prix d'un partage du capital." />
                <Slider label="Crédit vendeur" icon={Handshake} value={creditVendeurPct} color="#fbbf24" max={50}
                  onChange={(v: number) => setSource(setCreditVendeurPct, creditVendeurPct, v)}
                  infoId="cv" infoTitle="Qu'est-ce que le crédit vendeur ?"
                  infoText="Un prêt accordé par le vendeur (souvent 10-20 % du prix, sur 3 ans). Signal très positif : il prouve la confiance du cédant dans la pérennité de l'entreprise." />
                <Slider label="Aides / subventions" icon={Gift} value={aidesPct} color="#34d399" max={40}
                  onChange={(v: number) => setSource(setAidesPct, aidesPct, v)}
                  infoId="aides" infoTitle="Aides et subventions"
                  infoText="Prêts d'honneur (Initiative France, Réseau Entreprendre), garanties Bpifrance, aides régionales : des fonds non dilutifs qui allègent l'emprunt bancaire." />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-white/60 font-medium flex items-center gap-1.5"><Percent className="w-3.5 h-3.5" /> Taux d'emprunt</span>
                    <span className="text-sm font-medium text-blue-400 tabular-nums">{loanRate.toFixed(1)}%</span>
                  </div>
                  <input type="range" min={1} max={10} step={0.1} value={loanRate} onChange={(e) => setLoanRate(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10 accent-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-white/60 font-medium flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Durée du prêt</span>
                    <span className="text-sm font-medium text-blue-400 tabular-nums">{loanDuration} ans</span>
                  </div>
                  <div className="flex gap-2">
                    {[5, 7, 10, 12, 15].map(y => (
                      <button key={y} onClick={() => setLoanDuration(y)}
                        className={`flex-1 h-9 rounded-lg text-xs font-medium transition-all border ${loanDuration === y ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'bg-white/5 border-white/10 text-white/50 hover:text-white'}`}>
                        {y} ans
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* RATIOS BANCAIRES */}
              <div className="pt-8 border-t border-white/10">
                <div className="flex items-center gap-3 mb-6">
                  <Briefcase className="w-5 h-5 text-white/80" />
                  <h3 className="text-lg font-medium text-white">Les 4 ratios que regarde la banque</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-5 rounded-2xl border ${calc.ratios.isApportOk ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold">1. Poids de l'apport</span>
                      <span className={`text-xl font-light ${calc.ratios.isApportOk ? 'text-emerald-400' : 'text-red-400'}`}>{apportPct}%</span>
                    </div>
                    <p className="text-xs text-white/60 font-light mt-2">Minimum <strong className="text-white/80 font-medium">20 %</strong> d'apport personnel attendu pour valider l'engagement du repreneur.</p>
                  </div>
                  <div className={`p-5 rounded-2xl border ${calc.ratios.isDscrOk ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold">2. Couverture de la dette (DSCR)</span>
                      <span className={`text-xl font-light ${calc.ratios.isDscrOk ? 'text-emerald-400' : 'text-amber-400'}`}>{calc.ratios.dscr}</span>
                    </div>
                    <p className="text-xs text-white/60 font-light mt-2">La trésorerie doit couvrir au moins <strong className="text-white/80 font-medium">1.2x</strong> les annuités pour absorber les imprévus.</p>
                  </div>
                  <div className={`p-5 rounded-2xl border ${calc.ratios.isLevierOk ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold">3. Levier financier</span>
                      <span className={`text-xl font-light ${calc.ratios.isLevierOk ? 'text-emerald-400' : 'text-red-400'}`}>{calc.ratios.levier}</span>
                    </div>
                    <p className="text-xs text-white/60 font-light mt-2">La dette totale ne doit pas dépasser <strong className="text-white/80 font-medium">3.5x l'EBITDA</strong>.</p>
                  </div>
                  <div className={`p-5 rounded-2xl border ${calc.ratios.isGearingOk ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold">4. Gearing (dette / fonds propres)</span>
                      <span className={`text-xl font-light ${calc.ratios.isGearingOk ? 'text-emerald-400' : 'text-red-400'}`}>{calc.ratios.gearing}</span>
                    </div>
                    <p className="text-xs text-white/60 font-light mt-2">La dette ne devrait pas excéder <strong className="text-white/80 font-medium">3x les fonds propres</strong> (apport + investisseurs).</p>
                  </div>
                </div>
              </div>

              {/* TRÉSORERIE POST-RACHAT */}
              <div className="pt-8 border-t border-white/10">
                <h3 className="text-sm uppercase tracking-widest text-white/60 font-medium flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-primary" /> Trésorerie post-rachat (années 1 à 3)
                </h3>
                <div className="bg-black/20 rounded-2xl p-5 border border-white/5">
                  <div className="flex justify-between text-sm text-white/70 py-2 border-b border-white/5">
                    <span>EBITDA (EBE) cible</span><span className="font-medium text-white">{fmt(calc.ebitda)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-white/70 py-2 border-b border-white/5">
                    <span>Flux de trésorerie estimé (après IS, BFR)</span><span className="font-medium text-blue-400">{fmt(calc.fcf)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-white/70 py-2 border-b border-white/5">
                    <span>− Annuité bancaire ({loanRate.toFixed(1)} %)</span><span className="font-medium text-red-400">−{fmt(calc.annualBankPayment)}</span>
                  </div>
                  {calc.creditVendeur > 0 && (
                    <div className="flex justify-between text-sm text-white/70 py-2 border-b border-white/5">
                      <span>− Remboursement crédit vendeur (sur 3 ans)</span><span className="font-medium text-red-400">−{fmt(calc.annualCVPayment)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base py-3 mt-2 font-medium">
                    <span className="text-white flex items-center gap-2"><Gauge className="w-4 h-4 text-white/50" /> Reste de trésorerie / an</span>
                    <span className={calc.cashflowPostDette > 0 ? 'text-emerald-400' : 'text-red-500'}>
                      {calc.cashflowPostDette > 0 ? '+' : ''}{fmt(calc.cashflowPostDette)}
                    </span>
                  </div>
                  {calc.cashflowPostDette <= 0 && (
                    <p className="text-xs text-red-400 mt-2 font-light text-center">
                      L'entreprise ne génère pas assez de liquidités pour rembourser la dette simulée. Augmentez l'apport ou allongez la durée.
                    </p>
                  )}
                </div>
              </div>

              <p className="text-[10px] text-white/30 font-light text-center leading-relaxed max-w-2xl mx-auto">
                * Estimations simplifiées à but pédagogique (IS, BFR et Capex lissés à 30 % de l'EBE). Elles ne remplacent ni l'audit d'un expert-comptable ni l'accord d'un comité de crédit bancaire.
              </p>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
