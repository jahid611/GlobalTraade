"use client";

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { SolarSystem } from '@/components/SolarSystem';
import { SmartMatchForm, MatchCriteria } from '@/components/SmartMatchForm';
import { ListingForm } from '@/components/ListingForm';
import { Navbar } from '@/components/Navbar';
import { BusinessCard } from '@/components/BusinessCard';
import { AdvancedFilters, FilterState } from '@/components/AdvancedFilters';
import { Store, Filter, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useListings } from '@/hooks/use-listings';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/components/AuthProvider';

const DEFAULT_FILTERS: FilterState = {
  industry: "",
  region: "",
  priceMin: "",
  priceMax: "",
  revenueMin: "",
  ebitdaMin: "",
  sortBy: "recent"
};

const SkeletonCard = () => (
  <div className="liquid-glass rounded-[2rem] p-6 border border-white/5 relative overflow-hidden h-[320px]">
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    <div className="flex gap-4 items-center mb-6">
      <div className="w-12 h-12 rounded-xl bg-white/5" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-white/10 rounded w-3/4" />
        <div className="h-3 bg-white/5 rounded w-1/2" />
      </div>
    </div>
    <div className="space-y-4">
      <div className="h-8 bg-white/5 rounded w-1/3" />
      <div className="flex gap-2">
        <div className="h-6 bg-white/5 rounded-full w-20" />
        <div className="h-6 bg-white/5 rounded-full w-24" />
      </div>
    </div>
    <div className="absolute bottom-6 left-6 right-6 border-t border-white/5 pt-4 flex justify-between">
      <div className="h-4 bg-white/5 rounded w-16" />
      <div className="h-4 bg-white/5 rounded w-16" />
    </div>
  </div>
);

export default function Marketplace() {
  const queryClient = useQueryClient();
  const { data: listings = [] } = useListings();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  
  const navigate = useNavigate();

  const availableIndustries = useMemo(() => {
    return Array.from(new Set(listings.map(l => l.industry))).sort();
  }, [listings]);

  const filteredListings = useMemo(() => {
    let result = [...listings];

    if (filters.region && filters.region !== "All Countries") {
      result = result.filter(l => l.address && l.address.toLowerCase().includes(filters.region.split(' ')[0].toLowerCase()));
    }

    if (filters.industry) result = result.filter(l => l.industry === filters.industry);
    if (filters.priceMin) result = result.filter(l => l.price >= Number(filters.priceMin));
    if (filters.priceMax) result = result.filter(l => l.price <= Number(filters.priceMax));
    if (filters.revenueMin) result = result.filter(l => l.revenue_n1 >= Number(filters.revenueMin));
    if (filters.ebitdaMin) result = result.filter(l => l.ebitda >= Number(filters.ebitdaMin));

    if (filters.sortBy === 'recent') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (filters.sortBy === 'price_asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (filters.sortBy === 'price_desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (filters.sortBy === 'views') {
      result.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    } else if (filters.sortBy === 'roi') {
      result.sort((a, b) => {
        const roiA = a.price > 0 ? (a.ebitda / a.price) : 0;
        const roiB = b.price > 0 ? (b.ebitda / b.price) : 0;
        return roiB - roiA;
      });
    }

    return result;
  }, [listings, filters]);

  const handleSmartMatch = (criteria: MatchCriteria) => {
    document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
    setIsMatching(true);
    
    setTimeout(() => {
      setFilters(prev => ({
        ...prev,
        industry: criteria.industry || "",
        region: criteria.region || "",
        priceMax: criteria.budget > 0 ? criteria.budget.toString() : "",
        sortBy: criteria.budget > 0 ? 'roi' : prev.sortBy
      }));
      setIsMatching(false);
    }, 1500);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.industry) count++;
    if (filters.region && filters.region !== "All Countries") count++;
    if (filters.priceMin || filters.priceMax) count++;
    if (filters.revenueMin) count++;
    if (filters.ebitdaMin) count++;
    return count;
  };

  return (
    <div className="min-h-screen bg-transparent text-white selection:bg-primary/30 relative flex flex-col">
      <SolarSystem />
      <Navbar />

      <main className="relative z-10 pt-[20vh] pb-[10vh] px-[6vw] max-w-[1400px] mx-auto w-full">
        <div className="absolute top-[10%] right-[5%] w-[450px] z-0 pointer-events-none hidden lg:block">
          <img src="/astronaut-canneapeche-star.png" alt="Astronaut Fishing for Stars" className="w-full h-auto" />
        </div>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-[8vw] lg:gap-[4vw] items-center mb-[12vh]">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-[4vh]">
            <h1 className="text-[clamp(2.5rem,5vw,5rem)] font-light leading-[1.1] tracking-tighter text-white">
              {t('market.title1')} <br /> 
              <span className="text-primary font-medium">{t('market.title2')}</span>
            </h1>
            <p className="text-[clamp(1rem,1.1vw,1.125rem)] text-white/90 font-light max-w-lg leading-relaxed mt-[2vh]">
              {t('market.desc')}
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <SmartMatchForm onResults={handleSmartMatch} availableIndustries={availableIndustries} />
          </motion.div>
        </div>

        <div id="results" className="space-y-[6vh] scroll-mt-[15vh]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-[4vh] sm:gap-6 border-b border-white/20 pb-[3vh]">
            <div>
              <h2 className="text-[clamp(1.5rem,2vw,2rem)] font-light mb-[0.5vh] text-white">{t('market.portfolios')}</h2>
              <p className="text-[clamp(0.875rem,1vw,1rem)] text-white/90 font-light">
                {filteredListings.length} {t('market.found')}
              </p>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => setIsFilterPanelOpen(true)}
              className="text-white font-medium text-[clamp(10px,1vw,12px)] uppercase tracking-widest relative bg-white/10 border border-white/20 rounded-full px-[4vw] sm:px-6 h-[10vw] sm:h-12 hover:bg-white/20 transition-all shadow-md"
            >
              <Filter className="w-4 h-4 mr-2"/> {t('market.adjust_filters')}
              {getActiveFilterCount() > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.5)] border border-white/20">
                  {getActiveFilterCount()}
                </span>
              )}
            </Button>
          </div>

          {isMatching ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-[4vh]">
               <div className="flex items-center justify-center py-[2vh] gap-4">
                 <Loader2 className="w-8 h-8 text-primary animate-spin" />
                 <p className="text-white/60 font-medium tracking-widest uppercase text-sm">{t('smart.analyzing') || 'Analyse algorithmique en cours...'}</p>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[6vw] lg:gap-[3vw]">
                 {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
               </div>
            </motion.div>
          ) : filteredListings.length === 0 ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-[15vh] text-center flex flex-col items-center bg-black/20 border border-white/20 border-dashed rounded-[2rem] backdrop-blur-md">
              <Store className="w-[10vw] sm:w-12 h-[10vw] sm:h-12 text-white/50 mx-auto mb-[3vh]" strokeWidth={1} />
              <h3 className="text-xl font-medium text-white mb-2">{t('market.no_match_title')}</h3>
              <p className="text-white/80 font-light text-[clamp(0.875rem,1vw,1rem)] max-w-md mx-auto mb-6 leading-relaxed">
                {t('market.no_match_desc')}
              </p>
              <Button variant="outline" onClick={() => setFilters(DEFAULT_FILTERS)} className="text-white bg-transparent border-white/30 hover:bg-white/10 rounded-full font-medium h-12 px-8 transition-all">
                {t('market.reset_filters')}
              </Button>
            </motion.div>
          ) : (
            <motion.div 
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.1 } }
              }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[6vw] lg:gap-[3vw]"
            >
              {filteredListings.map((l) => (
                <motion.div key={l.id} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 }}}>
                  <BusinessCard 
                    listing={l} 
                    onClick={() => navigate('/app', { state: { focusId: l.id } })} 
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </main>

      <div className="fixed bottom-[4vh] sm:bottom-8 right-[4vw] sm:right-8 z-[110]">
        <button 
          onClick={() => user ? setIsFormOpen(true) : navigate('/login')} 
          className="w-[14vw] sm:w-16 max-w-[64px] h-[14vw] sm:h-16 max-h-[64px] flex items-center justify-center text-white liquid-glass border border-white/30 rounded-full hover:bg-white/20 transition-all group shadow-[inset_0_4px_20px_rgba(255,255,255,0.3),_0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl hover:scale-105 active:scale-95"
        >
          <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          <Plus className="w-[6vw] sm:w-8 max-w-[32px] h-[6vw] sm:h-8 max-h-[32px] relative z-10" strokeWidth={1.5} />
        </button>
      </div>

      <AdvancedFilters 
        isOpen={isFilterPanelOpen} 
        onClose={() => setIsFilterPanelOpen(false)} 
        filters={filters}
        setFilters={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      <ListingForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['listings'] })} 
      />
    </div>
  );
}