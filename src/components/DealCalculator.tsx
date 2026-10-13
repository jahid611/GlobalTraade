"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StatusDot } from '@/components/StatusDot';
import { useTranslation } from 'react-i18next';
import { formatDate, formatMoney, localeFor } from '@/lib/markets';
import { countryLabel } from '@/lib/countries';
import { hasMarketContent, localized, useMarketContent } from '@/lib/marketContent';
import { DEFAULT_INPUTS, FR_BENCHMARKS, SIMULATION, benchmarkCountry, computeFinancing, type Light } from '@/lib/financingRules';
import { TrendingUp, Landmark, Percent, Clock, ChevronDown, ChevronUp, Info, PiggyBank, Briefcase, AlertTriangle, Handshake, Users, Gift, Gauge, ExternalLink, Building2 } from 'lucide-react';

// Le calcul et les repères (30 % d'apport, 70 % de banque, moitié de la CAF,
// 3 à 4 années de CAF) sont dans src/lib/financingRules.ts, avec leurs sources.
// Ce sont des repères FRANÇAIS : pour une annonce d'un autre pays, le simulateur
// reste utilisable mais ne les présente pas comme les usages de ce pays, et
// n'affiche pas de probabilité d'obtention.

interface DealCalculatorProps {
  /** `country` : code ISO du pays de l'annonce ; absent, c'est la France. */
  listing: { price: number; revenue_n1: number; ebitda: number; rent?: number; country?: string | null };
}

// Feu de faisabilité : couleurs seulement, les libellés sont traduits dans le composant.
const LIGHT_META: Record<Light, { color: string; bg: string }> = {
  green:  { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  orange: { color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
  red:    { color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
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
  /** la valeur écrite dans la langue du visiteur (« 30 % », « 30% ») */
  display: string;
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

function Slider({ label, icon: Icon, value, display, onChange, color, max = 100, infoId, infoTitle, infoText, showInfo, onToggleInfo }: SliderProps) {
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
        <span className="text-sm font-medium tabular-nums" style={{ color }}>{display}</span>
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
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [isOpen, setIsOpen] = useState(false);

  // Pays de l'annonce : les repères bancaires ne sont sourcés que pour la France.
  const countryCode = benchmarkCountry(listing.country);
  const isFrench = countryCode === 'FR';
  const countryName = countryLabel(isFrench ? 'FR' : listing.country, lang);
  const content = useMarketContent(countryCode);
  const contentExists = hasMarketContent(countryCode);

  // Répartition du financement (en % du prix)
  const [apportPct, setApportPct] = useState<number>(DEFAULT_INPUTS.apportPct);
  const [investisseursPct, setInvestisseursPct] = useState<number>(DEFAULT_INPUTS.investisseursPct);
  const [creditVendeurPct, setCreditVendeurPct] = useState<number>(DEFAULT_INPUTS.creditVendeurPct);
  const [aidesPct, setAidesPct] = useState<number>(DEFAULT_INPUTS.aidesPct);
  const [loanRate, setLoanRate] = useState<number>(DEFAULT_INPUTS.loanRate);
  const [loanDuration, setLoanDuration] = useState<number>(DEFAULT_INPUTS.loanDuration);
  const [showInfo, setShowInfo] = useState<string | null>(null);

  // Empêche la somme des sources (hors banque) de dépasser 100 %
  const setSource = (setter: (v: number) => void, current: number, val: number) => {
    const others = (apportPct + investisseursPct + creditVendeurPct + aidesPct) - current;
    setter(Math.min(val, 100 - others));
  };

  const calc = useMemo(() => computeFinancing({
    price: listing.price, ebitda: listing.ebitda,
    apportPct, investisseursPct, creditVendeurPct, aidesPct, loanRate, loanDuration,
  }), [apportPct, investisseursPct, creditVendeurPct, aidesPct, loanRate, loanDuration, listing.price, listing.ebitda]);

  // Nombres, montants et pourcentages écrits comme dans la langue du visiteur.
  const locale = localeFor(lang);
  const fmt = (v: number) => formatMoney(v, lang);
  const pct = (v: number, digits = 0) => new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v / 100);
  const n1 = (v: number) => v.toLocaleString(locale, { maximumFractionDigits: 1 });
  const rate = pct(loanRate, 1);
  const years = (n: number) => t('calc.years', '{{n}} ans', { n });

  const lightLabel: Record<Light, string> = {
    green: t('calc.light.green', 'Financement envisageable'),
    orange: t('calc.light.orange', 'Financement possible sous conditions'),
    red: t('calc.light.red', 'Financement difficile'),
  };
  const lm = LIGHT_META[calc.approvalLight];

  // Le quatrième curseur : en France, le prêt d'honneur ; ailleurs, les prêts aidés du pays.
  const aidesLabel = isFrench ? t('calc.aides.label', "Prêt d'honneur et aides") : t('calc.aides.label_other', 'Prêts aidés et aides publiques');

  return (
    <div className="w-full">
      <button onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen} className="w-full flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all duration-300 group">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform">
            <Landmark className="w-6 h-6 text-blue-400" />
          </div>
          <div className="text-left">
            <p className="text-base font-medium text-white">{t('calc.title', 'Simulateur de financement')}</p>
            <p className="text-xs text-white/40 font-light mt-0.5">{t('calc.subtitle', 'Montage, mensualités et repères des banques')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isOpen && isFrench && <StatusDot tone={calc.approvalLight} size="md" title={lightLabel[calc.approvalLight]} className="hidden sm:inline-block" />}
          {isOpen ? <ChevronUp className="w-5 h-5 text-white/40" /> : <ChevronDown className="w-5 h-5 text-white/40" />}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-4 bg-white/[0.02] border border-white/5 rounded-2xl p-6 md:p-8 space-y-10">

              {/* VERDICT. France : feu et estimation. Autre pays : pas de probabilité,
                  elle reposerait sur des repères qui n'ont pas été vérifiés pour ce pays. */}
              {isFrench ? (
                <div className={`rounded-2xl border p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-5 ${lm.bg}`}>
                  <div className="flex items-center gap-4 flex-1">
                    <StatusDot tone={calc.approvalLight} size="lg" />
                    <div>
                      <p className={`text-base font-medium ${lm.color}`}>{lightLabel[calc.approvalLight]}</p>
                      <p className="text-xs text-white/70 mt-1 leading-relaxed">{t('calc.verdict.basis', "Estimation indicative, calculée à partir de quatre repères courants des banques en France. Chaque banque fixe ses propres conditions : ce chiffre n'est pas la réponse d'une banque.")}</p>
                    </div>
                  </div>
                  <div className="text-center shrink-0">
                    <p className={`text-4xl font-light tabular-nums ${lm.color}`}>{pct(calc.approvalScore)}</p>
                    <p className="text-[10px] uppercase tracking-widest text-white/60 font-medium mt-1">{t('calc.verdict.score_label', "Probabilité d'obtention estimée")}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 flex items-start gap-4">
                  <Info className="w-5 h-5 text-white/80 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-base font-medium text-white">{t('calc.foreign.title', "Lecture indicative, sans probabilité d'obtention")}</p>
                    <p className="text-sm text-white/80 mt-1.5 leading-relaxed">{t('calc.foreign.text', "Pays de l'annonce : {{country}}. Les montants, les mensualités et la trésorerie se calculent de la même façon partout. En revanche, Globly n'affiche pas de probabilité d'obtention pour ce pays : elle reposerait sur des repères de banques françaises, qui n'y ont pas été vérifiés.", { country: countryName })}</p>
                  </div>
                </div>
              )}

              {calc.ebitda <= 0 && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <p className="text-sm text-red-200 font-light">
                    {t('calc.ebitda_warning', "L'EBE indiqué est nul ou négatif : l'activité ne dégage pas de quoi rembourser un emprunt. Un prêt bancaire sera très difficile à obtenir en l'état.")}
                  </p>
                </div>
              )}

              {/* SYNTHÈSE CHIFFRÉE */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <Stat label={t('calc.stat.apport', 'Apport repère')} value={fmt(calc.recommendedApport)} tone={TONES.apport}
                  hint={isFrench
                    ? t('calc.stat.apport_hint', 'environ {{pct}} du prix, pour rester dans les repères courants', { pct: pct(calc.recommendedApportPct) })
                    : t('calc.stat.apport_hint_other', 'environ {{pct}} du prix, selon des repères français donnés à titre indicatif', { pct: pct(calc.recommendedApportPct) })} />
                <Stat label={t('calc.stat.loan', 'Montant à emprunter')} value={fmt(calc.bankLoan)} tone={TONES.banque}
                  hint={t('calc.stat.loan_hint', '{{pct}} du prix, sur {{n}} ans', { pct: pct(calc.bankPct), n: loanDuration })} />
                <Stat label={t('calc.stat.monthly', 'Mensualité estimée')} value={fmt(calc.monthlyPayment)} tone={TONES.banque}
                  hint={t('calc.stat.monthly_hint', 'sur {{months}} mois, au taux de {{rate}}', { months: loanDuration * 12, rate })} />
                <Stat label={t('calc.stat.cost', 'Coût total du crédit')} value={fmt(calc.totalCreditCost)} tone={TONES.banque}
                  hint={t('calc.stat.cost_hint', 'intérêts cumulés')} />
                <Stat label={t('calc.stat.capacity', "Capacité d'emprunt")} value={fmt(calc.borrowingCapacity)} tone={TONES.banque}
                  hint={isFrench
                    ? t('calc.stat.capacity_hint', "prêt maximal pour que les remboursements ne dépassent pas la moitié de ce que l'entreprise dégage")
                    : t('calc.stat.capacity_hint_other', "prêt maximal pour que les remboursements ne dépassent pas la moitié de ce que l'entreprise dégage (repère français, indicatif)")} />
                <Stat label={t('calc.stat.cash', 'Reste de trésorerie par an')} value={`${calc.cashAfterRepayment > 0 ? '+' : ''}${fmt(calc.cashAfterRepayment)}`}
                  hint={t('calc.stat.cash_hint', 'après les remboursements')} tone={calc.cashAfterRepayment >= 0 ? TONES.positif : TONES.negatif} />
              </div>

              {/* RÉPARTITION DU FINANCEMENT */}
              <div>
                <div className="flex justify-between text-xs font-medium text-white/40 mb-2 uppercase tracking-widest">
                  <span>{t('calc.split.title', 'Répartition du financement')}</span>
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
                  {[
                    { color: SOURCE_COLORS.apport, text: t('calc.legend.apport', 'Apport ({{amount}})', { amount: fmt(calc.apport) }) },
                    { color: SOURCE_COLORS.investisseurs, text: t('calc.legend.investisseurs', 'Investisseurs ({{amount}})', { amount: fmt(calc.investisseurs) }) },
                    { color: SOURCE_COLORS.creditVendeur, text: t('calc.legend.credit_vendeur', 'Crédit vendeur ({{amount}})', { amount: fmt(calc.creditVendeur) }) },
                    { color: SOURCE_COLORS.aides, text: isFrench
                      ? t('calc.legend.aides', "Prêt d'honneur et aides ({{amount}})", { amount: fmt(calc.aides) })
                      : t('calc.legend.aides_other', 'Prêts aidés et aides ({{amount}})', { amount: fmt(calc.aides) }) },
                    { color: SOURCE_COLORS.banque, text: t('calc.legend.banque', 'Banque ({{amount}})', { amount: fmt(calc.bankLoan) }) },
                  ].map((item) => (
                    <span key={item.color} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} /><span className="text-white/80">{item.text}</span></span>
                  ))}
                </div>
              </div>

              {/* CURSEURS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <Slider showInfo={showInfo} onToggleInfo={setShowInfo} label={t('calc.apport.label', 'Apport personnel')} icon={PiggyBank} value={apportPct} display={pct(apportPct)} color={SOURCE_COLORS.apport}
                  onChange={(v: number) => setSource(setApportPct, apportPct, v)}
                  infoId="apport" infoTitle={t('calc.apport.info_title', "Pourquoi l'apport compte")}
                  infoText={isFrench
                    ? t('calc.apport.info', "Une banque finance rarement tout le prix. En France, il est généralement demandé d'apporter au moins {{min}} du financement, le prêt pouvant couvrir jusqu'à {{max}} du prix. C'est un repère courant, pas une règle : chaque banque fixe sa propre part, selon le dossier et le repreneur.", { min: pct(FR_BENCHMARKS.minOwnFundsPct), max: pct(FR_BENCHMARKS.maxBankPct) })
                    : t('calc.apport.info_other', "Une banque finance rarement tout le prix : votre apport montre votre engagement et réduit son risque. La part attendue dépend du pays et de la banque. À titre d'indication seulement, le repère français est d'au moins {{min}}.", { min: pct(FR_BENCHMARKS.minOwnFundsPct) })} />
                <Slider showInfo={showInfo} onToggleInfo={setShowInfo} label={t('calc.investisseurs.label', 'Investisseurs')} icon={Users} value={investisseursPct} display={pct(investisseursPct)} color={SOURCE_COLORS.investisseurs}
                  onChange={(v: number) => setSource(setInvestisseursPct, investisseursPct, v)}
                  infoId="inv" infoTitle={t('calc.investisseurs.info_title', 'Investisseurs et associés')}
                  infoText={t('calc.investisseurs.info', "De l'argent apporté par d'autres personnes : associés, proches, investisseurs. Il renforce l'apport et ne se rembourse pas, mais ces personnes deviennent propriétaires d'une part de l'entreprise.")} />
                <Slider showInfo={showInfo} onToggleInfo={setShowInfo} label={t('calc.credit_vendeur.label', 'Crédit vendeur')} icon={Handshake} value={creditVendeurPct} display={pct(creditVendeurPct)} color={SOURCE_COLORS.creditVendeur} max={FR_BENCHMARKS.sellerCreditMaxPct}
                  onChange={(v: number) => setSource(setCreditVendeurPct, creditVendeurPct, v)}
                  infoId="cv" infoTitle={t('calc.credit_vendeur.info_title', "Qu'est-ce que le crédit vendeur ?")}
                  infoText={isFrench
                    ? t('calc.credit_vendeur.info', "Le vendeur accepte d'être payé en plusieurs fois pour une partie du prix. En France, il porte généralement sur {{low}} à {{high}} du prix ({{max}} au plus) et se rembourse sur 1 à 3 ans. Il montre que le vendeur a confiance dans l'avenir de l'entreprise. Le simulateur le compte sans intérêt, sur {{n}} ans.", { low: pct(FR_BENCHMARKS.sellerCreditTypicalPct[0]), high: pct(FR_BENCHMARKS.sellerCreditTypicalPct[1]), max: pct(FR_BENCHMARKS.sellerCreditMaxPct), n: SIMULATION.sellerCreditYears })
                    : t('calc.credit_vendeur.info_other', "Le vendeur accepte d'être payé en plusieurs fois pour une partie du prix. Sa part et sa durée se négocient et dépendent des usages du pays. Le simulateur le compte sans intérêt, sur {{n}} ans.", { n: SIMULATION.sellerCreditYears })} />
                <Slider showInfo={showInfo} onToggleInfo={setShowInfo} label={aidesLabel} icon={Gift} value={aidesPct} display={pct(aidesPct)} color={SOURCE_COLORS.aides} max={40}
                  onChange={(v: number) => setSource(setAidesPct, aidesPct, v)}
                  infoId="aides"
                  infoTitle={isFrench ? t('calc.aides.info_title', "Un prêt d'honneur se rembourse") : t('calc.aides.info_title_other', 'Prêts aidés : de l\'argent à rembourser')}
                  infoText={isFrench
                    ? t('calc.aides.info', "Un prêt d'honneur (Initiative France, Réseau Entreprendre) est sans intérêt et sans garantie, mais il se rembourse, sur 1 à 7 ans. Il renforce votre apport. Par prudence, le simulateur compte tout ce montant comme un prêt à taux zéro remboursé sur {{n}} ans. Une garantie Bpifrance n'apporte pas d'argent : elle couvre la banque, ne l'ajoutez pas ici.", { n: SIMULATION.honourLoanYears })
                    : t('calc.aides.info_other', "Selon le pays, des organismes publics proposent des prêts aidés, des garanties ou des aides : voyez la liste plus bas. Par prudence, le simulateur compte ce montant comme un prêt à taux zéro remboursé sur {{n}} ans. Une garantie n'apporte pas d'argent : elle couvre la banque, ne l'ajoutez pas ici.", { n: SIMULATION.honourLoanYears })} />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-white/60 font-medium flex items-center gap-1.5"><Percent className="w-3.5 h-3.5" /> {t('calc.rate.label', "Taux d'emprunt")}</span>
                    <span className="text-sm font-medium tabular-nums" style={{ color: SOURCE_COLORS.banque }}>{rate}</span>
                  </div>
                  <input type="range" min={1} max={10} step={0.1} value={loanRate} onChange={(e) => setLoanRate(Number(e.target.value))}
                    aria-label={t('calc.rate.label', "Taux d'emprunt")}
                    className={RANGE_CLASS} style={rangeStyle(SOURCE_COLORS.banque, loanRate, 1, 10)} />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-white/60 font-medium flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {t('calc.duration.label', 'Durée du prêt')}</span>
                    <span className="text-sm font-medium tabular-nums" style={{ color: SOURCE_COLORS.banque }}>{years(loanDuration)}</span>
                  </div>
                  <div className="flex gap-2" role="group" aria-label={t('calc.duration.label', 'Durée du prêt')}>
                    {[5, 7, 10, 12, 15].map(y => (
                      <button key={y} onClick={() => setLoanDuration(y)} aria-pressed={loanDuration === y}
                        className={`flex-1 h-9 rounded-lg text-xs font-medium transition-all border ${loanDuration === y ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'bg-white/5 border-white/10 text-white/50 hover:text-white'}`}>
                        {years(y)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* REPÈRES BANCAIRES */}
              <div className="pt-8 border-t border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <Briefcase className="w-5 h-5 text-white/80 shrink-0" />
                  <h3 className="text-lg font-medium text-white">
                    {isFrench
                      ? t('calc.ratios.title', 'Quatre repères courants des banques')
                      : t('calc.ratios.title_other', 'Quatre repères généraux, à discuter avec une banque du pays')}
                  </h3>
                </div>
                <p className="text-sm text-white/80 leading-relaxed mb-6">
                  {isFrench
                    ? t('calc.ratios.intro', "Ce sont des repères habituels en France, tirés de Service Public Entreprendre et de Bpifrance Création. Ce ne sont pas des règles : chaque banque décide selon le dossier et le repreneur.")
                    : t('calc.ratios.intro_other', "Ces repères viennent de sources françaises et sont donnés à titre indicatif. Globly n'a pas vérifié les usages des banques pour ce pays ({{country}}) : prenez-les comme une base de discussion, pas comme une règle.", { country: countryName })}
                </p>
                {/* Chaque repère est dit en clair : ce que ça veut dire pour ce rachat, puis
                    le repère. Le nom technique reste en petit, pour qui le cherche. */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(() => {
                    const share = calc.repaymentShare;
                    const debtYears = calc.debtYears;
                    const noCash = t('calc.ratio.no_cash', "L'EBE est nul ou négatif : l'activité ne dégage pas de quoi rembourser.");
                    const cards = [
                      {
                        key: 'own',
                        title: t('calc.ratio.own.title', '1. Ce que vous apportez'), tech: t('calc.ratio.own.tech', 'Apport rapporté au prix'),
                        tone: calc.lights.ownFunds,
                        value: pct(calc.ownFundsPct),
                        plain: isFrench
                          ? t('calc.ratio.own.plain', "Votre apport, vos investisseurs et les prêts d'honneur ou aides couvrent {{pct}} du prix.", { pct: pct(calc.ownFundsPct) })
                          : t('calc.ratio.own.plain_other', 'Votre apport, vos investisseurs et les prêts aidés couvrent {{pct}} du prix.', { pct: pct(calc.ownFundsPct) }),
                        rule: isFrench
                          ? t('calc.ratio.own.rule', 'Repère courant : au moins {{min}} du financement.', { min: pct(FR_BENCHMARKS.minOwnFundsPct) })
                          : t('calc.ratio.own.rule_other', "Repère français, à titre indicatif : au moins {{min}} du financement.", { min: pct(FR_BENCHMARKS.minOwnFundsPct) }),
                      },
                      {
                        key: 'bank',
                        title: t('calc.ratio.bank.title', '2. La part de la banque'), tech: t('calc.ratio.bank.tech', 'Prêt bancaire rapporté au prix'),
                        tone: calc.lights.bank,
                        value: pct(calc.bankPct),
                        plain: t('calc.ratio.bank.plain', 'La banque financerait {{pct}} du prix.', { pct: pct(calc.bankPct) }),
                        rule: isFrench
                          ? t('calc.ratio.bank.rule', "Repère courant : un prêt bancaire couvre jusqu'à {{max}} du prix.", { max: pct(FR_BENCHMARKS.maxBankPct) })
                          : t('calc.ratio.bank.rule_other', "Repère français, à titre indicatif : jusqu'à {{max}} du prix.", { max: pct(FR_BENCHMARKS.maxBankPct) }),
                      },
                      {
                        key: 'repayment',
                        title: t('calc.ratio.repayment.title', '3. Le poids des remboursements'), tech: t('calc.ratio.repayment.tech', "Remboursements de l'année rapportés à la capacité d'autofinancement (CAF)"),
                        tone: calc.lights.repayment,
                        value: share === null ? t('calc.ratio.repayment.none', 'Rien à rembourser') : share === Infinity ? t('calc.ratio.impossible', 'Impossible') : pct(share * 100),
                        plain: share === null
                          ? t('calc.ratio.repayment.plain_none', 'Ce montage ne comporte aucun remboursement.')
                          : share === Infinity
                            ? noCash
                            : share <= 1
                              ? t('calc.ratio.repayment.plain', "Chaque année, les remboursements prennent {{pct}} de l'argent que l'entreprise dégage.", { pct: pct(share * 100) })
                              : t('calc.ratio.repayment.plain_short', "Les remboursements dépassent ce que l'entreprise dégage : il manque {{amount}} par an.", { amount: fmt(-calc.cashAfterRepayment) }),
                        rule: isFrench
                          ? t('calc.ratio.repayment.rule', 'Repère courant : pas plus de la moitié.')
                          : t('calc.ratio.repayment.rule_other', 'Repère français, à titre indicatif : pas plus de la moitié.'),
                      },
                      {
                        key: 'years',
                        title: t('calc.ratio.years.title', '4. Le temps pour rembourser'), tech: t('calc.ratio.years.tech', "Dette totale rapportée à la capacité d'autofinancement (CAF)"),
                        tone: calc.lights.debtYears,
                        value: debtYears === null ? t('calc.ratio.years.none', 'Aucune dette') : debtYears === Infinity ? t('calc.ratio.impossible', 'Impossible') : t('calc.years', '{{n}} ans', { n: n1(debtYears) }),
                        plain: debtYears === null
                          ? t('calc.ratio.years.plain_none', "Ce montage ne comporte aucune dette.")
                          : debtYears === Infinity
                            ? noCash
                            : t('calc.ratio.years.plain', "Il faudrait {{n}} années de l'argent dégagé par l'entreprise pour rembourser toute la dette.", { n: n1(debtYears) }),
                        rule: isFrench
                          ? t('calc.ratio.years.rule', 'Repère courant : {{low}} années, {{high}} au plus.', { low: FR_BENCHMARKS.debtYearsOfCaf[0], high: FR_BENCHMARKS.debtYearsOfCaf[1] })
                          : t('calc.ratio.years.rule_other', 'Repère français, à titre indicatif : {{low}} années, {{high}} au plus.', { low: FR_BENCHMARKS.debtYearsOfCaf[0], high: FR_BENCHMARKS.debtYearsOfCaf[1] }),
                      },
                    ];
                    // Le mot du voyant dit de quel côté du repère on se trouve.
                    const inRange = t('calc.ratio.verdict.in', 'Dans le repère');
                    const below = t('calc.ratio.verdict.below', 'Sous le repère');
                    const above = t('calc.ratio.verdict.above', 'Au-dessus du repère');
                    const edge = t('calc.ratio.verdict.edge', 'À la limite');
                    const far = t('calc.ratio.verdict.far', 'Loin du repère');
                    const verdict: Record<string, Record<Light, string>> = {
                      own: { green: inRange, orange: below, red: far },
                      bank: { green: inRange, orange: above, red: far },
                      repayment: { green: inRange, orange: above, red: far },
                      years: { green: inRange, orange: edge, red: above },
                    };
                    return cards.map((c) => (
                      <div key={c.key} className="p-5 rounded-2xl border bg-white/[0.04] border-white/10">
                        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 mb-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white">{c.title}</p>
                            <p className="text-[11px] text-white/50 mt-0.5">{c.tech}</p>
                          </div>
                          <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-white/90 rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-1">
                            <StatusDot tone={c.tone} size="sm" /> {verdict[c.key][c.tone]}
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

              {/* TRÉSORERIE APRÈS LE RACHAT */}
              <div className="pt-8 border-t border-white/10">
                <h3 className="text-sm uppercase tracking-widest text-white/60 font-medium flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-primary" /> {t('calc.cash.title', 'Trésorerie après le rachat (années 1 à 3)')}
                </h3>
                <div className="bg-black/20 rounded-2xl p-5 border border-white/5">
                  <div className="flex justify-between gap-4 text-sm text-white/70 py-2 border-b border-white/5">
                    <span>{t('calc.cash.ebitda', "EBE de l'entreprise")}</span><span className="font-medium text-white tabular-nums">{fmt(calc.ebitda)}</span>
                  </div>
                  <div className="flex justify-between gap-4 text-sm text-white/70 py-2 border-b border-white/5">
                    <span>{t('calc.cash.caf', "Capacité d'autofinancement estimée ({{pct}} de l'EBE)", { pct: pct(SIMULATION.cafShareOfEbe * 100) })}</span><span className="font-medium text-blue-400 tabular-nums">{fmt(calc.caf)}</span>
                  </div>
                  <div className="flex justify-between gap-4 text-sm text-white/70 py-2 border-b border-white/5">
                    <span>{t('calc.cash.bank', 'Annuité du prêt bancaire (taux de {{rate}})', { rate })}</span><span className="font-medium text-red-400 tabular-nums">{fmt(-calc.annualBankPayment)}</span>
                  </div>
                  {calc.creditVendeur > 0 && (
                    <div className="flex justify-between gap-4 text-sm text-white/70 py-2 border-b border-white/5">
                      <span>{t('calc.cash.seller', 'Remboursement du crédit vendeur (sur {{n}} ans)', { n: SIMULATION.sellerCreditYears })}</span><span className="font-medium text-red-400 tabular-nums">{fmt(-calc.annualSellerCreditPayment)}</span>
                    </div>
                  )}
                  {calc.aides > 0 && (
                    <div className="flex justify-between gap-4 text-sm text-white/70 py-2 border-b border-white/5">
                      <span>{isFrench
                        ? t('calc.cash.honour', "Remboursement du prêt d'honneur et des aides (sur {{n}} ans)", { n: SIMULATION.honourLoanYears })
                        : t('calc.cash.honour_other', 'Remboursement des prêts aidés (sur {{n}} ans)', { n: SIMULATION.honourLoanYears })}</span><span className="font-medium text-red-400 tabular-nums">{fmt(-calc.annualHonourLoanPayment)}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-4 text-base py-3 mt-2 font-medium">
                    <span className="text-white flex items-center gap-2"><Gauge className="w-4 h-4 text-white/50" /> {t('calc.stat.cash', 'Reste de trésorerie par an')}</span>
                    <span className={`tabular-nums ${calc.cashAfterRepayment > 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                      {calc.cashAfterRepayment > 0 ? '+' : ''}{fmt(calc.cashAfterRepayment)}
                    </span>
                  </div>
                  {calc.cashAfterRepayment <= 0 && (
                    <p className="text-xs text-red-400 mt-2 font-light text-center">
                      {t('calc.cash.shortfall', "L'entreprise ne dégage pas assez pour rembourser la dette simulée. Augmentez l'apport ou allongez la durée du prêt.")}
                    </p>
                  )}
                </div>
              </div>

              {/* QUI PEUT AIDER : les organismes publics du pays de l'annonce, tirés de
                  src/lib/marketContent (sources officielles, date de vérification). */}
              {(content || !contentExists) && (
                <div className="pt-8 border-t border-white/10">
                  <div className="flex items-center gap-3 mb-2">
                    <Building2 className="w-5 h-5 text-white/80 shrink-0" />
                    <h3 className="text-lg font-medium text-white">{t('calc.help.title', 'Qui peut aider à financer cette reprise')}</h3>
                  </div>
                  {content ? (
                    <>
                      <p className="text-sm text-white/80 leading-relaxed mb-5">
                        {t('calc.help.intro', "Organismes publics ou reconnus du pays de l'annonce ({{country}}). Une garantie couvre la banque et un prêt se rembourse : aucun de ces dispositifs n'est de l'argent donné.", { country: countryName })}
                      </p>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {content.financing.map((scheme) => (
                          <li key={scheme.name} className="p-5 rounded-2xl border bg-white/[0.04] border-white/10 flex flex-col">
                            <p className="text-sm font-medium text-white">{scheme.name}</p>
                            <p className="text-sm text-white/80 leading-relaxed mt-1.5 flex-1">{localized(scheme.what, lang)}</p>
                            <a href={scheme.url} target="_blank" rel="noopener noreferrer"
                              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-white underline underline-offset-4 decoration-white/40 hover:decoration-white self-start">
                              {t('calc.help.link', 'Voir le site officiel')} <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                              <span className="sr-only">{scheme.name}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                      {content.bankingNote && (
                        <div className="mt-4 p-5 rounded-2xl border bg-white/[0.04] border-white/10">
                          <p className="text-sm font-medium text-white">{t('calc.help.banking_title', 'Ce que les banques attendent en général')}</p>
                          <p className="text-sm text-white/80 leading-relaxed mt-1.5">{localized(content.bankingNote, lang)}</p>
                        </div>
                      )}
                      <p className="text-xs text-white/60 leading-relaxed mt-4">
                        {t('calc.help.checked', 'Informations vérifiées le {{date}} à partir de sources officielles. Les conditions changent : confirmez-les auprès de chaque organisme.', { date: formatDate(content.checkedOn, lang) })}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-white/80 leading-relaxed">
                      {t('calc.help.none', "Globly n'a pas encore de fiche sur les aides au financement de ce pays ({{country}}). Renseignez-vous auprès d'une banque ou d'une chambre de commerce du pays.", { country: countryName })}
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-white/60 text-center leading-relaxed max-w-2xl mx-auto">
                {t('calc.footnote', "Estimations simplifiées, à but pédagogique. La capacité d'autofinancement est estimée à {{pct}} de l'EBE (impôt et investissements courants lissés). Ces calculs ne remplacent ni l'avis d'un expert-comptable ni la décision d'une banque.", { pct: pct(SIMULATION.cafShareOfEbe * 100) })}
              </p>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
