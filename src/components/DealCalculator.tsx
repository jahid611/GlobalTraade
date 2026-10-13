"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StatusDot } from '@/components/StatusDot';
import { TrendingUp, Landmark, Percent, Clock, ChevronDown, ChevronUp, Info, PiggyBank, Briefcase, AlertTriangle, Handshake, Users, Gift, Gauge } from 'lucide-react';

interface DealCalculatorProps {
  listing: { price: number; revenue_n1: number; ebitda: number; rent?: number; };
}

// Feu de faisabilité (proche de la lecture d'un comité de crédit bancaire)
type Light = 'green' | 'orange' | 'red';
const LIGHT_META: Record<Light, { label: string; color: string; bg: string }> = {
  green:  { label: 'Financement facilement envisageable', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  orange: { label: 'Financement possible sous conditions',  color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
  red:    { label: 'Financement difficile',                 color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
};

// Composants définis AU NIVEAU MODULE : déclarés dans le rendu, ils changeaient
// d'identité à chaque onChange, React les remontait et le glissement d'un
// curseur s'interrompait au premier pas.
function InfoBlock({ open, title, text }: { open: boolean; title: string; text: string }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
          <div className="mt-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-100 text-xs font-light leading-relaxed">
            <strong className="font-medium text-blue-300 block mb-1">{title}</strong>
            {text}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Une case de la synthèse. `tone` reprend le code couleur du financement : une
// pastille de la couleur de la source, et le chiffre dans sa version pastel.
function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: { dot: string; text: string } }) {
  return (
    <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
      <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium mb-1.5 flex items-center gap-1.5">
        {tone && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: tone.dot }} />}
        {label}
      </p>
      <p className="text-xl font-normal tabular-nums" style={{ color: tone?.text || '#fff' }}>{value}</p>
      {hint && <p className="text-[11px] text-white/35 font-light mt-1 leading-snug">{hint}</p>}
    </div>
  );
}

interface SliderProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  onChange: (value: number) => void;
  color: string;
  max?: number;
  infoId?: string;
  infoTitle?: string;
  infoText?: string;
  /** identifiant du bloc d'aide actuellement ouvert */
  showInfo: string | null;
  onToggleInfo: (id: string | null) => void;
}

// Code couleur du financement : une couleur par source, la même sur la barre de
// répartition, sa légende, les curseurs et leurs pourcentages.
const SOURCE_COLORS = {
  apport: '#8b85ff',        // violet : l'argent du repreneur
  investisseurs: '#fb923c', // orange
  creditVendeur: '#facc15', // jaune
  aides: '#34d399',         // vert
  banque: '#60a5fa',        // bleu : l'emprunt, son taux et sa durée
} as const;

// Les mêmes teintes en pastel, pour écrire un chiffre lisible sur fond sombre.
const TONES = {
  apport: { dot: SOURCE_COLORS.apport, text: '#d4d1ff' },
  banque: { dot: SOURCE_COLORS.banque, text: '#cfe4ff' },
  positif: { dot: '#34d399', text: '#b6f5d8' },
  negatif: { dot: '#f87171', text: '#ffc9c9' },
} as const;

// Curseur dont la piste se remplit jusqu'à la poignée, dans la couleur de la source.
const RANGE_CLASS = "w-full h-2 rounded-full appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--c)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-[14px] [&::-moz-range-thumb]:h-[14px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--c)] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white";
const rangeStyle = (color: string, value: number, min: number, max: number): React.CSSProperties => {
  const pct = max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;
  return { ['--c' as string]: color, background: `linear-gradient(to right, ${color} ${pct}%, rgba(255,255,255,0.14) ${pct}%)` };
};

function Slider({ label, icon: Icon, value, onChange, color, max = 100, infoId, infoTitle, infoText, showInfo, onToggleInfo }: SliderProps) {
  // Ordinateur : l'explication apparaît au survol du libellé (fiche flottante).
  // Téléphone : pas de survol, on touche le libellé pour la déplier dessous.
  const [canHover] = useState(() => typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches);
  const [hovered, setHovered] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="relative" onMouseEnter={() => canHover && setHovered(true)} onMouseLeave={() => setHovered(false)}>
          <button
            onClick={() => { if (!canHover && infoId) onToggleInfo(showInfo === infoId ? null : infoId); }}
            onFocus={() => canHover && setHovered(true)}
            onBlur={() => setHovered(false)}
            className={`text-[10px] uppercase tracking-widest text-white/60 font-medium flex items-center gap-1.5 hover:text-white transition-colors ${canHover && infoId ? 'cursor-help' : ''}`}
          >
            <Icon className="w-3.5 h-3.5" /> {label} {infoId && <Info className="w-3 h-3" />}
          </button>
          {canHover && hovered && infoId && (
            <div role="tooltip" className="absolute left-0 bottom-full mb-2 z-30 w-72 max-w-[80vw] rounded-xl p-3 text-xs leading-relaxed text-white/90 pointer-events-none" style={{ background: 'rgba(24,24,30,0.98)', border: '1px solid rgba(255,255,255,0.16)', boxShadow: '0 18px 50px rgba(0,0,0,0.55)' }}>
              <strong className="font-medium text-white block mb-1">{infoTitle}</strong>
              {infoText}
            </div>
          )}
        </div>
        <span className="text-sm font-medium tabular-nums" style={{ color }}>{value}%</span>
      </div>
      <input type="range" min={0} max={max} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className={RANGE_CLASS}
        style={rangeStyle(color, value, 0, max)} />
      {infoId && !canHover && <InfoBlock open={showInfo === infoId} title={infoTitle || ''} text={infoText || ''} />}
    </div>
  );
}

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
        // valeurs brutes, pour les dire en clair
        levierNum: levier, dscrNum: dscr, gearingNum: gearing,
      },
    };
  }, [apportPct, investisseursPct, creditVendeurPct, aidesPct, loanRate, loanDuration, listing]);

  const fmt = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

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
          {!isOpen && <StatusDot tone={calc.light} size="md" title={lm.label} className="hidden sm:inline-block" />}
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
                  <StatusDot tone={calc.light} size="lg" />
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
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <p className="text-sm text-red-200 font-light">
                    L'EBITDA (EBE) renseigné est négatif ou nul. Un financement bancaire classique (LBO) sera très difficile à obtenir sans restructuration.
                  </p>
                </div>
              )}

              {/* SYNTHÈSE CHIFFRÉE */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <Stat label="Apport recommandé" value={fmt(calc.recommendedApport)} hint={`≈ ${Math.round(calc.recommendedApportPct)} % du prix`} tone={TONES.apport} />
                <Stat label="Montant à emprunter" value={fmt(calc.bankLoan)} hint={`${Math.round(calc.bankPct)} % du prix, ${loanDuration} ans`} tone={TONES.banque} />
                <Stat label="Mensualité estimée" value={fmt(calc.monthlyPayment)} hint={`sur ${loanDuration * 12} mois à ${loanRate.toFixed(1)} %`} tone={TONES.banque} />
                <Stat label="Coût total du crédit" value={fmt(calc.totalCreditCost)} hint="intérêts cumulés" tone={TONES.banque} />
                <Stat label="Capacité d'emprunt" value={fmt(calc.borrowingCapacity)} hint="max. selon la trésorerie (DSCR 1.2)" tone={TONES.banque} />
                <Stat label="Reste de trésorerie / an" value={`${calc.cashflowPostDette >= 0 ? '+' : ''}${fmt(calc.cashflowPostDette)}`} hint="après remboursement de la dette" tone={calc.cashflowPostDette >= 0 ? TONES.positif : TONES.negatif} />
              </div>

              {/* RÉPARTITION DU FINANCEMENT */}
              <div>
                <div className="flex justify-between text-xs font-medium text-white/40 mb-2 uppercase tracking-widest">
                  <span>Répartition du financement</span>
                  <span>{fmt(calc.price)}</span>
                </div>
                <div className="h-4 w-full rounded-full flex overflow-hidden border border-white/10">
                  <div className="h-full transition-all" style={{ background: SOURCE_COLORS.apport, width: `${apportPct}%` }} />
                  <div className="h-full transition-all" style={{ background: SOURCE_COLORS.investisseurs, width: `${investisseursPct}%` }} />
                  <div className="h-full transition-all" style={{ background: SOURCE_COLORS.creditVendeur, width: `${creditVendeurPct}%` }} />
                  <div className="h-full transition-all" style={{ background: SOURCE_COLORS.aides, width: `${aidesPct}%` }} />
                  <div className="h-full transition-all" style={{ background: SOURCE_COLORS.banque, width: `${calc.bankPct}%` }} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-xs font-light">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: SOURCE_COLORS.apport }} /><span className="text-white/80">Apport ({fmt(calc.apport)})</span></span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: SOURCE_COLORS.investisseurs }} /><span className="text-white/80">Investisseurs ({fmt(calc.investisseurs)})</span></span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: SOURCE_COLORS.creditVendeur }} /><span className="text-white/80">Crédit vendeur ({fmt(calc.creditVendeur)})</span></span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: SOURCE_COLORS.aides }} /><span className="text-white/80">Aides ({fmt(calc.aides)})</span></span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: SOURCE_COLORS.banque }} /><span className="text-white/80">Banque ({fmt(calc.bankLoan)})</span></span>
                </div>
              </div>

              {/* CURSEURS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <Slider showInfo={showInfo} onToggleInfo={setShowInfo} label="Apport personnel" icon={PiggyBank} value={apportPct} color={SOURCE_COLORS.apport}
                  onChange={(v: number) => setSource(setApportPct, apportPct, v)}
                  infoId="apport" infoTitle="Pourquoi l'apport est crucial ?"
                  infoText="Les banques financent rarement 100 % d'un rachat. Un apport de 20 % à 30 % prouve l'engagement du repreneur (skin in the game) et réduit le risque." />
                <Slider showInfo={showInfo} onToggleInfo={setShowInfo} label="Investisseurs" icon={Users} value={investisseursPct} color={SOURCE_COLORS.investisseurs}
                  onChange={(v: number) => setSource(setInvestisseursPct, investisseursPct, v)}
                  infoId="inv" infoTitle="Investisseurs / co-repreneurs"
                  infoText="Des fonds propres apportés par des tiers (business angels, fonds, associés) renforcent la structure et rassurent la banque, au prix d'un partage du capital." />
                <Slider showInfo={showInfo} onToggleInfo={setShowInfo} label="Crédit vendeur" icon={Handshake} value={creditVendeurPct} color={SOURCE_COLORS.creditVendeur} max={50}
                  onChange={(v: number) => setSource(setCreditVendeurPct, creditVendeurPct, v)}
                  infoId="cv" infoTitle="Qu'est-ce que le crédit vendeur ?"
                  infoText="Un prêt accordé par le vendeur (souvent 10-20 % du prix, sur 3 ans). Signal très positif : il prouve la confiance du cédant dans la pérennité de l'entreprise." />
                <Slider showInfo={showInfo} onToggleInfo={setShowInfo} label="Aides / subventions" icon={Gift} value={aidesPct} color={SOURCE_COLORS.aides} max={40}
                  onChange={(v: number) => setSource(setAidesPct, aidesPct, v)}
                  infoId="aides" infoTitle="Aides et subventions"
                  infoText="Prêts d'honneur (Initiative France, Réseau Entreprendre), garanties Bpifrance, aides régionales : des fonds non dilutifs qui allègent l'emprunt bancaire." />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-white/60 font-medium flex items-center gap-1.5"><Percent className="w-3.5 h-3.5" /> Taux d'emprunt</span>
                    <span className="text-sm font-medium tabular-nums" style={{ color: SOURCE_COLORS.banque }}>{loanRate.toFixed(1)}%</span>
                  </div>
                  <input type="range" min={1} max={10} step={0.1} value={loanRate} onChange={(e) => setLoanRate(Number(e.target.value))}
                    aria-label="Taux d'emprunt"
                    className={RANGE_CLASS} style={rangeStyle(SOURCE_COLORS.banque, loanRate, 1, 10)} />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-white/60 font-medium flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Durée du prêt</span>
                    <span className="text-sm font-medium tabular-nums" style={{ color: SOURCE_COLORS.banque }}>{loanDuration} ans</span>
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
                {/* Chaque ratio est dit en clair : ce que ça veut dire pour ce rachat, puis
                    la règle de la banque. Le nom technique reste en petit, pour qui le cherche. */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(() => {
                    const n1 = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
                    const { levierNum: lev, dscrNum: dscr, gearingNum: gear } = calc.ratios;
                    const cards = [
                      {
                        title: "1. Votre apport", tech: "Poids de l'apport",
                        tone: (calc.ratios.isApportOk ? 'green' : 'red') as Light,
                        value: `${apportPct} %`,
                        plain: `Vous payez vous-même ${apportPct} % du prix.`,
                        rule: "La banque attend au moins 20 % : c'est la preuve de votre engagement.",
                      },
                      {
                        title: "2. La capacité à rembourser", tech: "Couverture de la dette (DSCR)",
                        tone: (calc.ratios.isDscrOk ? 'green' : dscr >= 1 ? 'orange' : 'red') as Light,
                        value: dscr === Infinity ? 'Rien à rembourser' : `${n1(dscr)} fois`,
                        plain: dscr === Infinity
                          ? "Ce montage ne comporte aucun remboursement."
                          : dscr >= 1
                            ? `Chaque année, l'entreprise dégage ${n1(dscr)} fois ce qu'il faut pour rembourser.`
                            : `L'entreprise ne dégage pas assez pour rembourser : elle couvre seulement ${Math.round(Math.max(0, dscr) * 100)} % des échéances.`,
                        rule: "La banque veut au moins 1,2 fois, pour garder une marge en cas d'imprévu.",
                      },
                      {
                        title: "3. Le temps pour rembourser", tech: "Levier financier (dette / EBITDA)",
                        tone: (calc.ratios.isLevierOk ? 'green' : 'red') as Light,
                        value: lev === Infinity ? 'Impossible' : `${n1(lev)} ans`,
                        plain: lev === Infinity
                          ? "Le résultat d'exploitation est nul ou négatif : l'activité ne peut pas rembourser la dette."
                          : `Il faudrait ${n1(lev)} années de résultat d'exploitation pour rembourser toute la dette.`,
                        rule: "La banque accepte 3,5 années au plus.",
                      },
                      {
                        title: "4. Emprunt comparé à votre mise", tech: "Gearing (dette / fonds propres)",
                        tone: (calc.ratios.isGearingOk ? 'green' : 'red') as Light,
                        value: gear === Infinity ? 'Tout est emprunté' : `${n1(gear)} € pour 1 €`,
                        plain: gear === Infinity
                          ? "Aucun argent n'est apporté : tout le prix est emprunté."
                          : `Pour 1 € apporté (vous et vos investisseurs), ${n1(gear)} € sont empruntés.`,
                        rule: "La banque accepte jusqu'à 3 € empruntés pour 1 € apporté.",
                      },
                    ];
                    const verdict: Record<Light, string> = { green: 'Correct', orange: 'Trop juste', red: 'Insuffisant' };
                    return cards.map((c) => (
                      <div key={c.title} className="p-5 rounded-2xl border bg-white/[0.04] border-white/10">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white">{c.title}</p>
                            <p className="text-[11px] text-white/50 mt-0.5">{c.tech}</p>
                          </div>
                          <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-white/90 rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-1">
                            <StatusDot tone={c.tone} size="sm" /> {verdict[c.tone]}
                          </span>
                        </div>
                        <p className="text-2xl font-normal text-white tabular-nums mb-2">{c.value}</p>
                        <p className="text-sm text-white/90 leading-relaxed">{c.plain}</p>
                        <p className="text-xs text-white/60 leading-relaxed mt-1.5">{c.rule}</p>
                      </div>
                    ));
                  })()}
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
