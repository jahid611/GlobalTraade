"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, SlidersHorizontal, RotateCcw, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { INDUSTRIES } from '@/lib/industries';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useTranslation } from 'react-i18next';

export interface FilterState {
  industry: string;
  region: string;
  priceMin: string;
  priceMax: string;
  revenueMin: string;
  ebitdaMin: string;
  sortBy: 'recent' | 'price_asc' | 'price_desc' | 'roi' | 'views';
}

interface AdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  onReset: () => void;
}

const formatFilterNumber = (val: string) => {
  if (!val) return '';
  const isNegative = val.startsWith('-');
  const digits = val.replace(/\D/g, '');
  if (!digits) return isNegative ? '-' : '';
  const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return isNegative ? '-' + formatted : formatted;
};

const parseFilterNumber = (val: string) => {
  return val.replace(/[^\d-]/g, '');
};

export function AdvancedFilters({ isOpen, onClose, filters, setFilters, onReset }: AdvancedFiltersProps) {
  useScrollLock(isOpen);
  const { t } = useTranslation();
  const [isIndustryOpen, setIsIndustryOpen] = useState(false);
  const [isRegionOpen, setIsRegionOpen] = useState(false);

  // Les régions françaises classiques ne se traduisent généralement pas, sauf International
  const REGIONS = [
    "Île-de-France", 
    "Auvergne-Rhône-Alpes", 
    "PACA", 
    "Nouvelle-Aquitaine", 
    t('filters.international', 'International')
  ];

  const handleChange = (key: keyof FilterState, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const inputClass = "w-full bg-white/30 dark:bg-black/20 border border-white/50 dark:border-white/10 text-[clamp(1rem,1.1vw,1.1rem)] font-light text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-white/50 dark:focus:ring-white/20 transition-all placeholder:text-slate-500 dark:placeholder:text-white/40 rounded-xl px-4 py-3 backdrop-blur-md shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)] dark:shadow-none";
  const labelClass = "text-[clamp(10px,0.85vw,12px)] font-semibold uppercase tracking-[0.15em] text-slate-600 dark:text-white/60 mb-[1.5vh] block mt-[3vh]";

  const sortOptions = [
    { id: 'recent', label: t('filters.sort.recent', 'Plus récentes') },
    { id: 'roi', label: t('filters.sort.roi', 'Meilleure rentabilité') },
    { id: 'views', label: t('filters.sort.views', 'Plus vues') },
    { id: 'price_asc', label: t('filters.sort.price_asc', 'Prix croissant') },
    { id: 'price_desc', label: t('filters.sort.price_desc', 'Prix décroissant') },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-slate-900/20 dark:bg-black/40 backdrop-blur-[8px] z-[200]" 
            onClick={onClose} 
          />
          <motion.div
            initial={{ x: '100%' }} 
            animate={{ x: 0 }} 
            exit={{ x: '100%' }} 
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed top-0 right-0 h-full w-[100vw] sm:w-[450px] bg-white/40 dark:bg-[#2b2a2f]/40 backdrop-blur-[40px] border-l border-white/50 dark:border-white/10 sm:rounded-l-[2.5rem] z-[210] flex flex-col overflow-hidden shadow-[-20px_0_60px_rgba(0,0,0,0.1)] dark:shadow-[-20px_0_60px_rgba(0,0,0,0.5)] transition-colors duration-500"
          >
            <div className="h-[12vh] min-h-[80px] px-[6vw] sm:px-8 border-b border-white/40 dark:border-white/10 flex items-center justify-between shrink-0 bg-transparent">
              <div className="flex items-center gap-[2vw] sm:gap-3">
                <SlidersHorizontal className="w-[5vw] sm:w-5 max-w-[20px] h-[5vw] sm:h-5 max-h-[20px] text-slate-800 dark:text-white" />
                <h3 className="text-[clamp(1.25rem,1.5vw,1.5rem)] font-light text-slate-900 dark:text-white">
                  {t('filters.title', 'Filtres intelligents')}
                </h3>
              </div>
              <button onClick={onClose} className="p-2 -mr-2 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors bg-white/20 dark:bg-white/5 rounded-full hover:bg-white/40 dark:hover:bg-white/10 backdrop-blur-md">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-[6vw] sm:px-8 py-[4vh] custom-scrollbar">
              
              {/* Tri */}
              <div className="mb-[5vh]">
                <label className={labelClass}>{t('filters.sortBy', 'Trier par')}</label>
                <div className="flex flex-wrap gap-[2vw] sm:gap-2">
                  {sortOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => handleChange('sortBy', opt.id as any)}
                      className={`px-[3.5vw] sm:px-4 py-[1.5vh] sm:py-2.5 rounded-full text-[clamp(11px,1vw,13px)] transition-all ${
                        filters.sortBy === opt.id 
                          ? 'bg-slate-900/80 dark:bg-white/20 text-white border border-transparent dark:border-white/20 shadow-md backdrop-blur-xl font-medium' 
                          : 'bg-white/30 dark:bg-white/5 border border-white/50 dark:border-white/10 text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10 backdrop-blur-md'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Secteur */}
              <div>
                <label className={labelClass}>{t('filters.industry', "Secteur d'activité")}</label>
                <Popover open={isIndustryOpen} onOpenChange={setIsIndustryOpen}>
                  <PopoverTrigger asChild>
                    <div className={`${inputClass} flex justify-between items-center cursor-pointer hover:bg-white/50 dark:hover:bg-black/30`}>
                      <span className={filters.industry ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-white/40'}>
                        {filters.industry ? t(`industry.${filters.industry}`, { defaultValue: filters.industry }) : t('filters.all_sectors', 'Tous les secteurs')}
                      </span>
                      <ChevronDown className="w-5 h-5 opacity-40 text-slate-900 dark:text-white" />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-[88vw] sm:w-[386px] p-0 bg-white/60 dark:bg-[#2b2a2f]/60 backdrop-blur-[40px] border border-white/50 dark:border-white/10 rounded-[1.5rem] overflow-hidden shadow-2xl z-[300]" align="start" sideOffset={8}>
                    <Command className="bg-transparent text-slate-900 dark:text-white">
                      <CommandInput placeholder={t('filters.search', "Rechercher...")} className="border-none bg-transparent h-12 px-4 font-light text-[clamp(0.875rem,1vw,1rem)] placeholder:text-slate-500 dark:placeholder:text-white/40" />
                      <CommandList className="max-h-[40vh] custom-scrollbar p-1">
                        <CommandEmpty className="py-4 text-center text-sm text-slate-600 dark:text-white/50 font-light">{t('filters.no_results', 'Aucun résultat.')}</CommandEmpty>
                        <CommandGroup>
                          <CommandItem onSelect={() => { handleChange('industry', ""); setIsIndustryOpen(false); }} className="cursor-pointer hover:bg-white/50 dark:hover:bg-white/10 rounded-xl text-sm font-light py-3 px-4 transition-colors text-slate-800 dark:text-white/80 data-[selected=true]:bg-white/60 dark:data-[selected=true]:bg-white/10">
                            {t('filters.all_sectors', 'Tous les secteurs')}
                            {filters.industry === "" && <Check className="w-4 h-4 text-slate-900 dark:text-white ml-auto" />}
                          </CommandItem>
                          {INDUSTRIES.map((ind) => (
                            <CommandItem key={ind} value={ind} onSelect={() => { handleChange('industry', ind); setIsIndustryOpen(false); }} className="cursor-pointer hover:bg-white/50 dark:hover:bg-white/10 rounded-xl text-sm font-light py-3 px-4 transition-colors text-slate-800 dark:text-white/80 data-[selected=true]:bg-white/60 dark:data-[selected=true]:bg-white/10">
                              {t(`industry.${ind}`, { defaultValue: ind })}
                              {filters.industry === ind && <Check className="w-4 h-4 text-slate-900 dark:text-white ml-auto" />}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Région */}
              <div className="mt-[2vh]">
                <label className={labelClass}>{t('filters.region', 'Zone Géographique')}</label>
                <Popover open={isRegionOpen} onOpenChange={setIsRegionOpen}>
                  <PopoverTrigger asChild>
                    <div className={`${inputClass} flex justify-between items-center cursor-pointer hover:bg-white/50 dark:hover:bg-black/30`}>
                      <span className={filters.region ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-white/40'}>
                        {filters.region || t('filters.all_france', 'France entière')}
                      </span>
                      <ChevronDown className="w-5 h-5 opacity-40 text-slate-900 dark:text-white" />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-[88vw] sm:w-[386px] p-0 bg-white/60 dark:bg-[#2b2a2f]/60 backdrop-blur-[40px] border border-white/50 dark:border-white/10 rounded-[1.5rem] overflow-hidden shadow-2xl z-[300]" align="start" sideOffset={8}>
                    <Command className="bg-transparent text-slate-900 dark:text-white">
                      <CommandList className="max-h-[40vh] custom-scrollbar p-1">
                        <CommandGroup>
                          <CommandItem onSelect={() => { handleChange('region', ""); setIsRegionOpen(false); }} className="cursor-pointer hover:bg-white/50 dark:hover:bg-white/10 rounded-xl text-sm font-light py-3 px-4 transition-colors text-slate-800 dark:text-white/80 data-[selected=true]:bg-white/60 dark:data-[selected=true]:bg-white/10">
                            {t('filters.all_france', 'France entière')}
                            {filters.region === "" && <Check className="w-4 h-4 text-slate-900 dark:text-white ml-auto" />}
                          </CommandItem>
                          {REGIONS.map((reg) => (
                            <CommandItem key={reg} value={reg} onSelect={() => { handleChange('region', reg); setIsRegionOpen(false); }} className="cursor-pointer hover:bg-white/50 dark:hover:bg-white/10 rounded-xl text-sm font-light py-3 px-4 transition-colors text-slate-800 dark:text-white/80 data-[selected=true]:bg-white/60 dark:data-[selected=true]:bg-white/10">
                              {reg}
                              {filters.region === reg && <Check className="w-4 h-4 text-slate-900 dark:text-white ml-auto" />}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Prix */}
              <div className="mt-[2vh]">
                <label className={labelClass}>{t('filters.price', 'Prix de cession (€)')}</label>
                <div className="flex items-center gap-[4vw] sm:gap-4">
                  <input 
                    type="text" 
                    placeholder={t('filters.min', 'Min')}
                    value={formatFilterNumber(filters.priceMin)} 
                    onChange={(e) => handleChange('priceMin', parseFilterNumber(e.target.value))} 
                    className={inputClass} 
                  />
                  <span className="text-slate-400 dark:text-white/40 font-light">-</span>
                  <input 
                    type="text" 
                    placeholder={t('filters.max', 'Max')} 
                    value={formatFilterNumber(filters.priceMax)} 
                    onChange={(e) => handleChange('priceMax', parseFilterNumber(e.target.value))} 
                    className={inputClass} 
                  />
                </div>
              </div>

              {/* CA & EBE */}
              <div className="mt-[2vh]">
                <label className={labelClass}>{t('filters.performance', 'Performances financières (€)')}</label>
                <div className="flex items-center gap-[4vw] sm:gap-4">
                  <div className="flex-1">
                    <input 
                      type="text" 
                      placeholder={t('filters.revenue', 'CA Min')}
                      value={formatFilterNumber(filters.revenueMin)} 
                      onChange={(e) => handleChange('revenueMin', parseFilterNumber(e.target.value))} 
                      className={inputClass} 
                    />
                  </div>
                  <div className="flex-1">
                    <input 
                      type="text" 
                      placeholder={t('filters.ebitda', 'EBE Min')}
                      value={formatFilterNumber(filters.ebitdaMin)} 
                      onChange={(e) => handleChange('ebitdaMin', parseFilterNumber(e.target.value))} 
                      className={inputClass} 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-[6vw] sm:p-8 border-t border-white/40 dark:border-white/10 shrink-0 flex justify-center gap-[3vw] sm:gap-4 bg-transparent">
              <Button 
                variant="ghost" 
                onClick={onReset} 
                className="w-14 h-14 rounded-full bg-white/30 dark:bg-white/5 border border-white/50 dark:border-white/10 text-slate-700 dark:text-white/60 hover:text-slate-900 dark:hover:text-white shrink-0 p-0 hover:bg-white/60 dark:hover:bg-white/10 transition-all backdrop-blur-xl shadow-none focus:ring-0"
                title={t('filters.reset', 'Réinitialiser')}
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
              <Button 
                onClick={onClose} 
                className="w-fit px-8 h-14 bg-slate-900/80 dark:bg-white/10 text-white rounded-full text-[clamp(14px,1vw,16px)] shadow-none hover:bg-slate-900 dark:hover:bg-white/20 border border-transparent dark:border-white/20 backdrop-blur-xl transition-all font-medium focus:ring-0"
              >
                {t('filters.submit', 'Voir les résultats')}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}