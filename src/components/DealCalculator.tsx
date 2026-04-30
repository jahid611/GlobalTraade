"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, TrendingUp, Landmark, Percent, Clock, ChevronDown, ChevronUp, Info, Scale, PiggyBank, Briefcase, AlertTriangle, Handshake } from 'lucide-react';

interface DealCalculatorProps {
  listing: { price: number; revenue_n1: number; ebitda: number; rent?: number; };
}

export function DealCalculator({ listing }: DealCalculatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // States (Percentages for intuitive sliding)
  const [apportPct, setApportPct] = useState(25);
  const [creditVendeurPct, setCreditVendeurPct] = useState(10);
  const [loanRate, setLoanRate] = useState(5.0);
  const [loanDuration, setLoanDuration] = useState(7);
  const [showInfo, setShowInfo] = useState<string | null>(null); // To toggle educational tooltips

  const calc = useMemo(() => {
    const price = listing.price || 0;
    const ebitda = listing.ebitda || 0;
    
    // Amounts
    const apport = (price * apportPct) / 100;
    const creditVendeur = (price * creditVendeurPct) / 100;
    const bankLoan = Math.max(0, price - apport - creditVendeur);
    
    // Bank Loan Amortization (Annuités constantes)
    const monthlyRate = loanRate / 100 / 12;
    const totalMonths = loanDuration * 12;
    const monthlyPayment = monthlyRate > 0 && bankLoan > 0 
      ? (bankLoan * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1) 
      : bankLoan / totalMonths;
    const annualBankPayment = monthlyPayment * 12;
    const totalInterest = (monthlyPayment * totalMonths) - bankLoan;

    // Seller Note Amortization (Usually 3 to 5 years, often 0% interest for simplicity here)
    const cvDuration = 3; 
    const annualCVPayment = creditVendeur > 0 ? creditVendeur / cvDuration : 0;

    // Total Debt Service (First 3 years are the hardest due to Seller Note)
    const totalAnnualDebtService = annualBankPayment + annualCVPayment;

    // Approximated Free Cash Flow (FCF) available for debt service
    // Simplification: EBE - IS (Approx 25% on EBE) - Capex/BFR (Assume 5%). => Let's use 70% of EBITDA as proxy for FCF.
    const fcf = ebitda * 0.70;
    
    // Ratios Bancaires (Bpifrance / Standards LBO)
    
    // 1. Poids de l'Apport (Target: > 20%)
    const isApportOk = apportPct >= 20;

    // 2. Levier: Dette Totale / EBE (Target: < 3.5x)
    const totalDebt = bankLoan + creditVendeur;
    const levier = ebitda > 0 ? totalDebt / ebitda : Infinity;
    const isLevierOk = levier <= 3.5;

    // 3. DSCR: FCF / Service de la Dette (Target: > 1.2x)
    const dscr = totalAnnualDebtService > 0 ? fcf / totalAnnualDebtService : Infinity;
    const isDscrOk = dscr >= 1.2;

    // 4. Gearing: Dette Nette / Capitaux Propres (Target: < 3x)
    const gearing = apport > 0 ? totalDebt / apport : Infinity;
    const isGearingOk = gearing <= 3.0;

    return {
      price, ebitda, fcf,
      apport, creditVendeur, bankLoan,
      annualBankPayment, annualCVPayment, totalAnnualDebtService, totalInterest,
      ratios: {
        levier: levier === Infinity ? 'N/A' : levier.toFixed(1) + 'x',
        dscr: dscr === Infinity ? 'N/A' : dscr.toFixed(1) + 'x',
        gearing: gearing === Infinity ? 'N/A' : gearing.toFixed(1) + 'x',
        isApportOk, isLevierOk, isDscrOk, isGearingOk
      },
      cashflowPostDette: fcf - totalAnnualDebtService
    };
  }, [apportPct, creditVendeurPct, loanRate, loanDuration, listing]);

  const fmt = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

  const InfoBlock = ({ id, title, text }: { id: string, title: string, text: string }) => (
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

  return (
    <div className="w-full">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all duration-300 group">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform">
            <Landmark className="w-6 h-6 text-blue-400" />
          </div>
          <div className="text-left">
            <p className="text-base font-medium text-white">Simulateur de Financement LBO</p>
            <p className="text-xs text-white/40 font-light mt-0.5">Testez la faisabilité bancaire de cette acquisition</p>
          </div>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-white/40" /> : <ChevronDown className="w-5 h-5 text-white/40" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-4 bg-white/[0.02] border border-white/5 rounded-2xl p-6 md:p-8 space-y-10">
              
              {/* HEADER EDUCACIONAL */}
              <div className="border-b border-white/10 pb-6">
                <h3 className="text-lg font-medium text-white mb-2">Structurez votre offre de reprise</h3>
                <p className="text-sm text-white/60 font-light leading-relaxed">
                  Le succès d'une reprise (LBO) repose sur un équilibre parfait entre votre apport, l'emprunt bancaire, et la rentabilité de l'entreprise cible. Utilisez les curseurs ci-dessous pour trouver le montage idéal.
                </p>
              </div>

              {listing.ebitda <= 0 && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-200 font-light">
                    L'EBITDA (EBE) renseigné est négatif ou nul. Un financement bancaire classique (LBO) sera extrêmement complexe à obtenir sans une restructuration profonde.
                  </p>
                </div>
              )}

              {/* STACK FINANCIER VISUEL */}
              <div>
                <div className="flex justify-between text-xs font-medium text-white/40 mb-2 uppercase tracking-widest">
                  <span>Plan de financement</span>
                  <span>{fmt(calc.price)}</span>
                </div>
                <div className="h-4 w-full rounded-full flex overflow-hidden border border-white/10">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${apportPct}%` }} title={`Apport: ${apportPct}%`} />
                  <div className="h-full bg-amber-400 transition-all duration-300" style={{ width: `${creditVendeurPct}%` }} title={`Crédit Vendeur: ${creditVendeurPct}%`} />
                  <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${100 - apportPct - creditVendeurPct}%` }} title={`Banque: ${100 - apportPct - creditVendeurPct}%`} />
                </div>
                <div className="flex flex-wrap gap-4 mt-3 text-xs font-light">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary" /> <span className="text-white/80">Apport ({fmt(calc.apport)})</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-400" /> <span className="text-white/80">Crédit Vendeur ({fmt(calc.creditVendeur)})</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /> <span className="text-white/80">Banque ({fmt(calc.bankLoan)})</span></div>
                </div>
              </div>

              {/* CONTROLS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  {/* Curseur Apport */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <button onClick={() => setShowInfo(showInfo === 'apport' ? null : 'apport')} className="text-[10px] uppercase tracking-widest text-white/60 font-medium flex items-center gap-1.5 hover:text-white transition-colors">
                        <PiggyBank className="w-3.5 h-3.5" /> Apport Personnel <Info className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-medium text-primary tabular-nums">{apportPct}%</span>
                    </div>
                    <input type="range" min={0} max={100} step={1} value={apportPct} onChange={(e) => {
                      const val = Number(e.target.value);
                      setApportPct(val);
                      if (val + creditVendeurPct > 100) setCreditVendeurPct(100 - val);
                    }}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10 accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary" />
                    <InfoBlock id="apport" title="Pourquoi l'apport est crucial ?" text="Les banques financent rarement 100% d'un rachat. Elles exigent généralement un apport minimum de 20% à 30% du prix de cession pour s'assurer de l'engagement (Skin in the game) du repreneur et réduire leur risque." />
                  </div>

                  {/* Curseur Crédit Vendeur */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <button onClick={() => setShowInfo(showInfo === 'cv' ? null : 'cv')} className="text-[10px] uppercase tracking-widest text-white/60 font-medium flex items-center gap-1.5 hover:text-white transition-colors">
                        <Handshake className="w-3.5 h-3.5" /> Crédit Vendeur <Info className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-medium text-amber-400 tabular-nums">{creditVendeurPct}%</span>
                    </div>
                    <input type="range" min={0} max={50} step={1} value={creditVendeurPct} onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val + apportPct <= 100) setCreditVendeurPct(val);
                    }}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10 accent-amber-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400" />
                    <InfoBlock id="cv" title="Qu'est-ce que le Crédit Vendeur ?" text="C'est un prêt accordé directement par le vendeur (souvent 10% à 20% du prix, sur 3 ans). C'est un signal extrêmement positif pour la banque, car il prouve que le cédant a confiance en la pérennité de son entreprise après son départ." />
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Curseur Taux */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase tracking-widest text-white/60 font-medium flex items-center gap-1.5"><Percent className="w-3.5 h-3.5" /> Taux d'emprunt</span>
                      <span className="text-sm font-medium text-blue-400 tabular-nums">{loanRate.toFixed(1)}%</span>
                    </div>
                    <input type="range" min={1} max={10} step={0.1} value={loanRate} onChange={(e) => setLoanRate(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10 accent-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500" />
                  </div>

                  {/* Curseur Durée */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase tracking-widest text-white/60 font-medium flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Durée (Banque)</span>
                      <span className="text-sm font-medium text-blue-400 tabular-nums">{loanDuration} ans</span>
                    </div>
                    <input type="range" min={3} max={10} step={1} value={loanDuration} onChange={(e) => setLoanDuration(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10 accent-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500" />
                  </div>
                </div>
              </div>

              {/* RATIOS BANCAIRES */}
              <div className="pt-8 border-t border-white/10">
                <div className="flex items-center gap-3 mb-6">
                  <Briefcase className="w-5 h-5 text-white/80" />
                  <h3 className="text-lg font-medium text-white">Analyse des 4 Ratios Bancaires</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Ratio 1 : APPORT */}
                  <div className={`p-5 rounded-2xl border ${calc.ratios.isApportOk ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold">1. Poids de l'Apport</span>
                      <span className={`text-xl font-light ${calc.ratios.isApportOk ? 'text-emerald-400' : 'text-red-400'}`}>{apportPct}%</span>
                    </div>
                    <p className="text-xs text-white/60 font-light mt-2">
                      La banque demande un <strong className="text-white/80 font-medium">minimum de 20%</strong> d'apport pour valider l'engagement financier du repreneur.
                    </p>
                  </div>

                  {/* Ratio 2 : DSCR */}
                  <div className={`p-5 rounded-2xl border ${calc.ratios.isDscrOk ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold">2. Couverture Dette (DSCR)</span>
                      <span className={`text-xl font-light ${calc.ratios.isDscrOk ? 'text-emerald-400' : 'text-amber-400'}`}>{calc.ratios.dscr}</span>
                    </div>
                    <p className="text-xs text-white/60 font-light mt-2">
                      Le Cash-Flow généré doit représenter au moins <strong className="text-white/80 font-medium">1.2x</strong> le montant des annuités pour absorber les imprévus.
                    </p>
                  </div>

                  {/* Ratio 3 : LEVIER */}
                  <div className={`p-5 rounded-2xl border ${calc.ratios.isLevierOk ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold">3. Levier Financier</span>
                      <span className={`text-xl font-light ${calc.ratios.isLevierOk ? 'text-emerald-400' : 'text-red-400'}`}>{calc.ratios.levier}</span>
                    </div>
                    <p className="text-xs text-white/60 font-light mt-2">
                      La dette totale ne doit pas dépasser <strong className="text-white/80 font-medium">3.5x l'EBITDA</strong>. Au-delà, le rachat est considéré comme trop endetté.
                    </p>
                  </div>

                  {/* Ratio 4 : GEARING */}
                  <div className={`p-5 rounded-2xl border ${calc.ratios.isGearingOk ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold">4. Gearing (Risque)</span>
                      <span className={`text-xl font-light ${calc.ratios.isGearingOk ? 'text-emerald-400' : 'text-red-400'}`}>{calc.ratios.gearing}</span>
                    </div>
                    <p className="text-xs text-white/60 font-light mt-2">
                      Mesure la dépendance bancaire. La dette totale ne devrait pas excéder <strong className="text-white/80 font-medium">3x vos capitaux propres</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* CASH FLOW PROJECTION */}
              <div className="pt-8 border-t border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm uppercase tracking-widest text-white/60 font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" /> Trésorerie Post-Rachat (Années 1 à 3)
                  </h3>
                </div>
                
                <div className="bg-black/20 rounded-2xl p-5 border border-white/5">
                  <div className="flex justify-between text-sm text-white/70 py-2 border-b border-white/5">
                    <span>EBITDA (EBE) Cible</span>
                    <span className="font-medium text-white">{fmt(calc.ebitda)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-white/70 py-2 border-b border-white/5">
                    <span>Flux Trésorerie Estimé (Après IS, BFR)</span>
                    <span className="font-medium text-blue-400">{fmt(calc.fcf)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-white/70 py-2 border-b border-white/5">
                    <span>- Annuité Bancaire ({loanRate}%)</span>
                    <span className="font-medium text-red-400">-{fmt(calc.annualBankPayment)}</span>
                  </div>
                  {calc.creditVendeur > 0 && (
                    <div className="flex justify-between text-sm text-white/70 py-2 border-b border-white/5">
                      <span>- Remboursement Crédit Vendeur (sur 3 ans)</span>
                      <span className="font-medium text-red-400">-{fmt(calc.annualCVPayment)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base py-3 mt-2 font-medium">
                    <span className="text-white">Marge de Sécurité Nette / An</span>
                    <span className={calc.cashflowPostDette > 0 ? 'text-emerald-400' : 'text-red-500'}>
                      {calc.cashflowPostDette > 0 ? '+' : ''}{fmt(calc.cashflowPostDette)}
                    </span>
                  </div>
                  {calc.cashflowPostDette <= 0 && (
                    <p className="text-xs text-red-400 mt-2 font-light text-center">
                      Attention : L'entreprise ne génère pas assez de liquidités pour rembourser la dette simulée. Augmentez l'apport ou allongez la durée.
                    </p>
                  )}
                </div>
              </div>

              <p className="text-[10px] text-white/30 font-light text-center leading-relaxed max-w-2xl mx-auto">
                * Ces calculs sont des estimations simplifiées à but pédagogique (les impôts, BFR et Capex sont lissés à 30% de l'EBE). Ils ne remplacent pas l'audit d'un expert-comptable ni l'accord final d'un comité de crédit bancaire.
              </p>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}