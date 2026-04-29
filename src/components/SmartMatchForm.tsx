"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2, ChevronDown, Check, AlertCircle, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { INDUSTRIES } from '@/lib/industries';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useTranslation } from 'react-i18next';

export interface MatchCriteria {
  industry: string;
  region: string;
  dealType: string;
  budgetRange: string;
  budget: number;
}

interface SmartMatchFormProps {
  onResults: (criteria: MatchCriteria) => void;
  availableIndustries?: string[];
}

const REGIONS = ["All Countries", "France - Paris Area", "France - South", "France - West", "International"];
const DEAL_TYPES = ["Majority Acquisition (> 50%)", "Minority Acquisition (< 50%)", "Business Assets / Goodwill"];
const BUDGETS = [
  { label: "< 500 k€", value: 500000 },
  { label: "500 k€ - 1 M€", value: 1000000 },
  { label: "1 M€ - 3 M€", value: 3000000 },
  { label: "3 M€ - 10 M€", value: 10000000 },
  { label: "> 10 M€", value: 0 },
];

export function SmartMatchForm({ onResults, availableIndustries }: SmartMatchFormProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [restrictIndustries, setRestrictIndustries] = useState(false);
  const [criteria, setCriteria] = useState({ 
    industry: "", 
    region: "",
    dealType: "",
    budgetRange: "",
    budget: 0 
  });
  const [isIndustryOpen, setIsIndustryOpen] = useState(false);

  const displayedIndustries = (restrictIndustries && availableIndustries) ? availableIndustries : INDUSTRIES;

  const handleIndustrySelect = (ind: string) => {
    if (ind === 'All sectors') {
      handleSelect('industry', ind);
      setIsIndustryOpen(false);
      return;
    }

    if (availableIndustries && !availableIndustries.includes(ind)) {
      setError(t('smart.error_no_industry'));
      setRestrictIndustries(true);
      setCriteria(prev => ({ ...prev, industry: "" }));
      setIsIndustryOpen(false);
    } else {
      handleSelect('industry', ind);
      setIsIndustryOpen(false);
    }
  };

  const handleNext = (field: keyof typeof criteria) => {
    if (!criteria[field]) {
      setError(t('smart.error_empty'));
      return;
    }
    setError("");
    setStep(s => s + 1);
  };

  const handleSubmit = () => {
    if (!criteria.budgetRange) return;
    setError("");
    setLoading(true);
    
    const finalCriteria = {
      ...criteria,
      industry: criteria.industry === 'All sectors' ? "" : criteria.industry
    };

    setTimeout(() => { 
      onResults(finalCriteria); 
      setLoading(false); 
    }, 1200); 
  };

  const handleSelect = (field: keyof MatchCriteria, value: string | number) => {
    setCriteria(prev => ({ ...prev, [field]: value }));
    setError(""); 
  };

  const inputClass = "w-full bg-transparent border-b border-white/30 pb-2 pt-1 text-base sm:text-lg font-light text-white focus:outline-none focus:border-primary transition-colors placeholder:text-white/60 rounded-none px-0 cursor-pointer";
  const labelClass = "text-[clamp(8px,0.8vw,10px)] font-black uppercase tracking-[0.2em] text-white/90 mb-[2vh] block";

  const OptionButton = ({ selected, onClick, children }: { selected: boolean, onClick: () => void, children: React.ReactNode }) => (
    <button 
      onClick={onClick}
      className={`w-full text-left px-5 py-4 rounded-2xl border transition-all duration-300 font-light text-[clamp(0.875rem,1vw,1rem)] flex items-center justify-between group
        ${selected 
          ? 'bg-primary/30 border-primary text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]' 
          : 'liquid-glass border-white/20 text-white/90 hover:text-white hover:border-white/50 hover:bg-white/10'}`}
    >
      {children}
      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors shrink-0 ml-4
        ${selected ? 'border-primary bg-primary' : 'border-white/40 group-hover:border-white/70'}`}>
        {selected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
      </div>
    </button>
  );

  return (
    <div className="border-l border-white/20 pl-[6vw] md:pl-[3vw] py-[2vh] min-h-[400px] flex flex-col justify-center">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="s0" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-[4vh]">
            <div>
              <h3 className="text-[clamp(1.5rem,2vw,2rem)] font-light text-white mb-[1vh]">{t('smart.title1')} <span className="text-primary font-medium">{t('smart.title2')}</span></h3>
              <p className="text-white/80 text-[clamp(0.875rem,1vw,1rem)] font-light">{t('smart.step1_desc')}</p>
            </div>
            
            <div className="space-y-[4vh]">
              <div>
                <label className={labelClass}>{t('smart.q1')}</label>
                <Popover open={isIndustryOpen} onOpenChange={setIsIndustryOpen}>
                  <PopoverTrigger asChild>
                    <div className={`${inputClass} flex justify-between items-center`} onClick={() => setError("")}>
                      <span className={criteria.industry ? 'text-white' : 'text-white/60'}>
                        {criteria.industry ? t(`industry.${criteria.industry}`, { defaultValue: criteria.industry }) : "..."}
                      </span>
                      <ChevronDown className="w-5 h-5 opacity-80 text-white" />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-[80vw] sm:w-[300px] p-0 liquid-glass-heavy border border-white/20 rounded-[1.5rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]" align="start">
                    <Command className="bg-transparent text-white">
                      <CommandInput className="border-none bg-transparent h-10 px-4 font-light text-sm text-white" />
                      <CommandList className="max-h-[35vh] custom-scrollbar p-1">
                        <CommandGroup>
                          <CommandItem 
                            onSelect={() => handleIndustrySelect('All sectors')} 
                            className="cursor-pointer text-white data-[selected=true]:bg-white/20 data-[selected=true]:text-white rounded-xl text-sm font-light py-2.5 px-4"
                          >
                            {t('smart.all_sectors')}
                            {criteria.industry === 'All sectors' && <Check className="w-4 h-4 text-primary ml-auto" />}
                          </CommandItem>
                          {displayedIndustries.map((ind) => (
                            <CommandItem 
                              key={ind} 
                              value={ind} 
                              onSelect={() => handleIndustrySelect(ind)} 
                              className="cursor-pointer text-white data-[selected=true]:bg-white/20 data-[selected=true]:text-white rounded-xl text-sm font-light py-2.5 px-4"
                            >
                              {t(`industry.${ind}`, { defaultValue: ind })}
                              {criteria.industry === ind && <Check className="w-4 h-4 text-primary ml-auto" />}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-red-400 text-[13px] flex items-center gap-2 mt-3">
                      <AlertCircle className="w-4 h-4 shrink-0" /> <span className="leading-tight">{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Button onClick={() => handleNext('industry')} className="w-fit rounded-full h-[12vw] sm:h-12 px-[6vw] sm:px-8 glass-button text-white font-medium text-sm">
                {t('smart.next')} <ArrowRight className="w-4 h-4 ml-2"/>
              </Button>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-[4vh]">
            <div>
              <div className="flex items-center gap-3 mb-[1vh]">
                <button onClick={() => {setStep(0); setError("");}} className="w-8 h-8 flex items-center justify-center rounded-full liquid-glass border border-white/20">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h3 className="text-[clamp(1.5rem,2vw,2rem)] text-white font-light">{t('smart.step2_title')} <span className="text-primary font-medium">{t('smart.step2_title2')}</span></h3>
              </div>
              <p className="text-white/80 text-[clamp(0.875rem,1vw,1rem)] font-light ml-11">{t('smart.step2_desc')}</p>
            </div>
            
            <div>
              <label className={labelClass}>{t('smart.q2')}</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {REGIONS.map(region => (
                  <OptionButton key={region} selected={criteria.region === region} onClick={() => handleSelect('region', region)}>
                    {region}
                  </OptionButton>
                ))}
              </div>
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-red-400 text-[13px] flex items-center gap-2 mt-4 ml-11">
                    <AlertCircle className="w-4 h-4 shrink-0" /> <span className="leading-tight">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button onClick={() => handleNext('region')} className="w-fit ml-11 rounded-full h-[12vw] sm:h-12 px-[6vw] sm:px-8 glass-button text-white font-medium text-sm">
              {t('smart.next')} <ArrowRight className="w-4 h-4 ml-2"/>
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-[4vh]">
             <div>
              <div className="flex items-center gap-3 mb-[1vh]">
                <button onClick={() => {setStep(1); setError("");}} className="w-8 h-8 flex items-center justify-center rounded-full liquid-glass border border-white/20">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h3 className="text-[clamp(1.5rem,2vw,2rem)] text-white font-light">{t('smart.step3_title')} <span className="text-primary font-medium">{t('smart.step3_title2')}</span></h3>
              </div>
              <p className="text-white/80 text-[clamp(0.875rem,1vw,1rem)] font-light ml-11">{t('smart.step3_desc')}</p>
            </div>
            
            <div>
              <label className={labelClass}>{t('smart.q3')}</label>
              <div className="flex flex-col gap-3 mt-4">
                {DEAL_TYPES.map(type => (
                  <OptionButton key={type} selected={criteria.dealType === type} onClick={() => handleSelect('dealType', type)}>
                    {type}
                  </OptionButton>
                ))}
              </div>
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-red-400 text-[13px] flex items-center gap-2 mt-4 ml-11">
                    <AlertCircle className="w-4 h-4 shrink-0" /> <span className="leading-tight">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button onClick={() => handleNext('dealType')} className="w-fit ml-11 rounded-full h-[12vw] sm:h-12 px-[6vw] sm:px-8 glass-button text-white font-medium text-sm">
              {t('smart.next')} <ArrowRight className="w-4 h-4 ml-2"/>
            </Button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-[4vh]">
            <div>
              <div className="flex items-center gap-3 mb-[1vh]">
                <button onClick={() => {setStep(2); setError("");}} className="w-8 h-8 flex items-center justify-center rounded-full liquid-glass border border-white/20">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h3 className="text-[clamp(1.5rem,2vw,2rem)] text-white font-light">{t('smart.step4_title')} <span className="text-primary font-medium">{t('smart.step4_title2')}</span></h3>
              </div>
              <p className="text-white/80 text-[clamp(0.875rem,1vw,1rem)] font-light ml-11">{t('smart.step4_desc')}</p>
            </div>
            
            <div>
              <label className={labelClass}>{t('smart.q4')}</label>
              <div className="flex flex-col gap-3 mt-4">
                {BUDGETS.map(b => (
                  <OptionButton 
                    key={b.label} 
                    selected={criteria.budgetRange === b.label} 
                    onClick={() => { setCriteria(prev => ({ ...prev, budgetRange: b.label, budget: b.value })); setError(""); }}
                  >
                    {b.label}
                  </OptionButton>
                ))}
              </div>
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-red-400 text-[13px] flex items-center gap-2 mt-4 ml-11">
                    <AlertCircle className="w-4 h-4 shrink-0" /> <span className="leading-tight">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button onClick={handleSubmit} disabled={loading} className="w-fit ml-11 rounded-full h-[12vw] sm:h-12 px-[6vw] sm:px-8 glass-button text-white font-medium text-sm">
              {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2"/> : null}
              {loading ? "..." : t('smart.analyze')}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}