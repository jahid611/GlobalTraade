"use client";

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calculator, TrendingUp, DollarSign, Percent, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface DealCalculatorProps {
  listing: { price: number; revenue_n1: number; ebitda: number; rent?: number; };
}

interface SliderProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  icon: React.ElementType;
}

interface ResProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

export function DealCalculator({ listing }: DealCalculatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [apport, setApport] = useState(Math.round(listing.price * 0.3));
  const [loanRate, setLoanRate] = useState(4.5);
  const [loanDuration, setLoanDuration] = useState(7);
  const [growthRate, setGrowthRate] = useState(3);
  const loanAmount = listing.price - apport;

  const calc = useMemo(() => {
    const mr = loanRate / 100 / 12;
    const tm = loanDuration * 12;
    const mp = mr > 0 ? (loanAmount * mr * Math.pow(1 + mr, tm)) / (Math.pow(1 + mr, tm) - 1) : loanAmount / tm;
    const ap = mp * 12;
    const ti = (mp * tm) - loanAmount;
    const acf = listing.ebitda - ap - (listing.rent || 0);
    const pb = acf > 0 ? apport / acf : Infinity;

    let totalCF = 0;
    const cfs = [-apport];
    for (let y = 1; y <= loanDuration; y++) {
      const pe = listing.ebitda * Math.pow(1 + growthRate / 100, y);
      const ycf = y < loanDuration ? pe - ap - (listing.rent || 0) : pe - ap - (listing.rent || 0) + listing.price * 0.8;
      totalCF += pe - ap - (listing.rent || 0);
      cfs.push(ycf);
    }
    const roi = apport > 0 ? ((totalCF - apport) / apport) * 100 : 0;

    let irr = 0.1;
    for (let i = 0; i < 100; i++) {
      let npv = 0, dnpv = 0;
      for (let j = 0; j < cfs.length; j++) {
        npv += cfs[j] / Math.pow(1 + irr, j);
        dnpv -= j * cfs[j] / Math.pow(1 + irr, j + 1);
      }
      if (Math.abs(dnpv) < 1e-10) break;
      const ni = irr - npv / dnpv;
      if (Math.abs(ni - irr) < 0.0001) break;
      irr = ni;
    }

    return { mp, ap, ti, acf, pb, roi, irr: irr * 100, mult: listing.ebitda > 0 ? listing.price / listing.ebitda : 0 };
  }, [apport, loanRate, loanDuration, growthRate, listing]);

  const fmt = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

  const Slider = ({ label, value, onChange, min, max, step, unit, icon: Icon }: SliderProps) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium flex items-center gap-1.5"><Icon className="w-3 h-3" /> {label}</span>
        <span className="text-sm font-medium text-white tabular-nums">{unit === '€' ? fmt(value) : `${value}${unit}`}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10 accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-primary/30 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/20" />
    </div>
  );

  const Res = ({ label, value, sub, color = 'text-white' }: ResProps) => (
    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-col">
      <span className="text-[9px] uppercase tracking-widest text-white/40 font-medium mb-2">{label}</span>
      <span className={`text-xl font-light tabular-nums ${color}`}>{value}</span>
      {sub && <span className="text-[10px] text-white/30 mt-1">{sub}</span>}
    </div>
  );

  return (
    <div className="w-full">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all duration-300 group">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-105 transition-transform"><Calculator className="w-5 h-5 text-primary" /></div>
          <div className="text-left"><p className="text-sm font-medium text-white">Simulateur ROI</p><p className="text-[11px] text-white/40 font-light">TRI, Payback, Cash-flow prévisionnel</p></div>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
      </button>
      {isOpen && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 space-y-6 bg-white/[0.02] border border-white/5 rounded-2xl p-6">
          <div className="space-y-5">
            <Slider label="Apport personnel" value={apport} onChange={setApport} min={0} max={listing.price} step={Math.max(1000, Math.round(listing.price / 100))} unit="€" icon={DollarSign} />
            <Slider label="Taux d'emprunt" value={loanRate} onChange={setLoanRate} min={0.5} max={12} step={0.1} unit="%" icon={Percent} />
            <Slider label="Durée (années)" value={loanDuration} onChange={setLoanDuration} min={1} max={15} step={1} unit=" ans" icon={Clock} />
            <Slider label="Croissance annuelle" value={growthRate} onChange={setGrowthRate} min={-5} max={20} step={0.5} unit="%" icon={TrendingUp} />
          </div>
          <div className="flex items-center justify-between text-xs text-white/40 font-light border-t border-white/5 pt-4">
            <span>Emprunt : {fmt(loanAmount)}</span><span>Mensualité : {fmt(calc.mp)}</span><span>Intérêts : {fmt(calc.ti)}</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Res label="TRI (IRR)" value={isFinite(calc.irr) && !isNaN(calc.irr) ? `${calc.irr.toFixed(1)}%` : 'N/A'} sub="Rendement Interne" color={calc.irr > 15 ? 'text-emerald-400' : calc.irr > 8 ? 'text-blue-400' : 'text-white/60'} />
            <Res label="Payback" value={isFinite(calc.pb) ? `${calc.pb.toFixed(1)} ans` : '∞'} sub="Retour sur invest." color={calc.pb < 5 ? 'text-emerald-400' : calc.pb < 8 ? 'text-blue-400' : 'text-white/60'} />
            <Res label="Cash-flow / an" value={fmt(calc.acf)} sub="Après remboursement" color={calc.acf > 0 ? 'text-emerald-400' : 'text-red-400'} />
            <Res label="Multiple" value={`${calc.mult.toFixed(1)}x`} sub="Prix / EBITDA" color={calc.mult < 5 ? 'text-emerald-400' : calc.mult < 8 ? 'text-blue-400' : 'text-white/60'} />
          </div>
          <div className={`rounded-2xl p-4 text-center border ${calc.roi > 50 ? 'bg-emerald-500/10 border-emerald-500/20' : calc.roi > 0 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
            <span className="text-[10px] uppercase tracking-widest text-white/50 font-medium">ROI sur {loanDuration} ans</span>
            <p className={`text-3xl font-light mt-1 ${calc.roi > 50 ? 'text-emerald-400' : calc.roi > 0 ? 'text-blue-400' : 'text-red-400'}`}>{calc.roi > 0 ? '+' : ''}{calc.roi.toFixed(0)}%</p>
          </div>
          <p className="text-[10px] text-white/30 font-light text-center leading-relaxed">Simulation indicative. Consultez un expert-comptable pour une analyse complète.</p>
        </motion.div>
      )}
    </div>
  );
}
