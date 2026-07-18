"use client";

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { SolarSystem } from '@/components/SolarSystem';
import { SmartMatchForm, MatchCriteria } from '@/components/SmartMatchForm';
import { scoreListing, ProfileCriteria } from '@/lib/matching';
import { matchRegion } from '@/lib/geoRegions';
import { ListingForm } from '@/components/ListingForm';
import { Navbar } from '@/components/Navbar';
import { BusinessCard } from '@/components/BusinessCard';
import { AdvancedFilters, FilterState } from '@/components/AdvancedFilters';
import { HelpBanner } from '@/components/HelpBanner';
import { Store, Filter, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useListings } from '@/hooks/use-listings';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TRUSTED_MIN_AVG, TRUSTED_MIN_COUNT } from '@/components/RatingStars';
import { SearchAdsBoard } from '@/components/SearchAdsBoard';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/components/AuthProvider';
import { isBoosted } from '@/services/boostService';

const DEFAULT_FILTERS: FilterState = {
  industries: [],
  regions: [],
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

  const [mode, setMode] = useState<'listings' | 'search_ads'>('listings');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [matchCriteria, setMatchCriteria] = useState<MatchCriteria | null>(null);

  const navigate = useNavigate();

  // Critères d'investissement du profil (renseignés à l'onboarding / Réglages).
  const profileCriteria = useMemo<ProfileCriteria>(() => ({
    target_sectors: (user?.user_metadata as any)?.target_sectors,
    target_budget: (user?.user_metadata as any)?.target_budget,
    target_geo: (user?.user_metadata as any)?.target_geo,
  }), [user]);

  const availableIndustries = useMemo(() => {
    return Array.from(new Set(listings.map(l => l.industry))).sort();
  }, [listings]);

  // Vendeurs les mieux notés : leurs annonces sont mises en avant gratuitement
  const { data: trustedOwners } = useQuery({
    queryKey: ['trusted-owners'],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_ratings_summary')
        .select('user_id, avg_score, rating_count')
        .gte('avg_score', TRUSTED_MIN_AVG)
        .gte('rating_count', TRUSTED_MIN_COUNT);
      return new Set((data || []).map((r: any) => r.user_id));
    },
    staleTime: 1000 * 60 * 5,
  });

  const displayedListings = useMemo(() => {
    let result = listings.map(l => ({ ...l, _trusted: trustedOwners?.has(l.owner_id) || false }));

    // Filtres manuels (panneau « Ajuster les filtres ») — multi-sélection combinable
    if (filters.industries.length) result = result.filter(l => filters.industries.includes(l.industry));
    if (filters.regions.length) result = result.filter(l => matchRegion(l.address, filters.regions));
    if (filters.priceMin) result = result.filter(l => Number(l.price) >= Number(filters.priceMin));
    if (filters.priceMax) result = result.filter(l => Number(l.price) <= Number(filters.priceMax));
    if (filters.revenueMin) result = result.filter(l => Number(l.revenue_n1) >= Number(filters.revenueMin));
    if (filters.ebitdaMin) result = result.filter(l => Number(l.ebitda) >= Number(filters.ebitdaMin));

    // Recherche intelligente -> filtre dur (secteurs/régions/budget) puis tri par pertinence
    if (matchCriteria) {
      if (matchCriteria.industries.length) result = result.filter(l => matchCriteria.industries.includes(l.industry));
      if (matchCriteria.regions.length) result = result.filter(l => matchRegion(l.address, matchCriteria.regions));
      result = result.filter(l => {
        const p = Number(l.price) || 0;
        return p === 0 || (p >= matchCriteria.budgetMin && p <= matchCriteria.budgetMax);
      });
      return result
        .map(l => ({ ...l, _matchScore: scoreListing(l, matchCriteria, profileCriteria).score }))
        .sort((a, b) =>
          (Number(isBoosted(b)) - Number(isBoosted(a)))
          || (Number(b._trusted) - Number(a._trusted))
          || (b._matchScore || 0) - (a._matchScore || 0));
    }

    // Sinon, tri classique
    if (filters.sortBy === 'recent') result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    else if (filters.sortBy === 'price_asc') result.sort((a, b) => a.price - b.price);
    else if (filters.sortBy === 'price_desc') result.sort((a, b) => b.price - a.price);
    else if (filters.sortBy === 'views') result.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    else if (filters.sortBy === 'roi') result.sort((a, b) => {
      const roiA = a.price > 0 ? (a.ebitda / a.price) : 0;
      const roiB = b.price > 0 ? (b.ebitda / b.price) : 0;
      return roiB - roiA;
    });

    // Annonces mises en avant (10 €) puis mieux notés en tête, quel que soit le tri
    result.sort((a, b) =>
      (Number(isBoosted(b)) - Number(isBoosted(a)))
      || (Number(b._trusted) - Number(a._trusted)));

    return result;
  }, [listings, filters, matchCriteria, profileCriteria, trustedOwners]);

  const handleSmartMatch = (criteria: MatchCriteria) => {
    setMatchCriteria(criteria);
    document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
    setIsMatching(true);
    // Courte transition (le calcul est réel et instantané, c'est juste l'animation).
    setTimeout(() => setIsMatching(false), 600);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.industries.length) count++;
    if (filters.regions.length) count++;
    if (filters.priceMin || filters.priceMax) count++;
    if (filters.revenueMin) count++;
    if (filters.ebitdaMin) count++;
    return count;
  };

  return (
    <div className="min-h-screen bg-transparent text-white selection:bg-primary/30 relative flex flex-col">
      <SolarSystem />
      <Navbar />

      <main className="relative z-10 pt-[15vh] pb-[10vh] px-[6vw] max-w-[1400px] mx-auto w-full">
        <motion.div
          animate={{ y: [0, -18, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[10%] right-[-9%] md:top-[8%] md:right-[-5%] w-[180px] md:w-[320px] z-0 pointer-events-none opacity-80 hidden lg:block"
        >
          <img src="/astronaut-canneapeche-star.png" alt="Astronaut Fishing for Stars" className="w-full h-auto drop-shadow-2xl" />
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8 relative z-10">
          <h1 className="text-3xl md:text-4xl font-light text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.55)] tracking-tight">
            {t('market.title1')} <span className="text-primary font-medium">{t('market.title2')}</span>
          </h1>
          <p className="text-white/50 text-sm md:text-base font-light mt-2">
            {t('market.subtitle', { defaultValue: "Trouvez l'entreprise qui vous correspond." }) as string}
          </p>
        </motion.div>

        <HelpBanner
          title={t('help.market_title', 'Comment fonctionne la marketplace ?') as string}
          desc={t('help.market_desc', '') as string}
          className="max-w-3xl mx-auto mb-8 relative z-10"
        />

        {/* Deux sens : entreprises à vendre / repreneurs en recherche */}
        <div className="relative z-10 flex justify-center mb-8">
          <div className="flex gap-1.5 p-1.5 rounded-full bg-black/20 border border-white/10">
            <button
              onClick={() => setMode('listings')}
              className={`px-5 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all outline-none ${
                mode === 'listings' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white'
              }`}
            >
              {t('market.mode_listings', 'Entreprises à vendre')}
            </button>
            <button
              onClick={() => setMode('search_ads')}
              className={`px-5 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all outline-none ${
                mode === 'search_ads' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white'
              }`}
            >
              {t('market.mode_search_ads', 'Repreneurs en recherche')}
            </button>
          </div>
        </div>

        {mode === 'search_ads' ? (
          <div className="relative z-10 max-w-4xl mx-auto">
            <SearchAdsBoard />
          </div>
        ) : (
        <>
        <div className="relative z-10 max-w-xl mx-auto mb-[10vh]">
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <SmartMatchForm onResults={handleSmartMatch} onReset={() => setMatchCriteria(null)} availableIndustries={availableIndustries} />
          </motion.div>
        </div>

        <div id="results" className="space-y-[6vh] scroll-mt-[15vh]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-[4vh] sm:gap-6 border-b border-white/20 pb-[3vh]">
            <div>
              <h2 className="text-[clamp(1.5rem,2vw,2rem)] font-light mb-[0.5vh] text-white">{t('market.portfolios')}</h2>
              <p className="text-[clamp(0.875rem,1vw,1rem)] text-white/90 font-light">
                {displayedListings.length} {t('market.found')}
              </p>
              {matchCriteria && (
                <button
                  onClick={() => setMatchCriteria(null)}
                  className="mt-2 inline-flex items-center gap-2 text-xs text-primary hover:text-white transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  {t('market.sorted_relevance', 'Trié par pertinence')} · {t('market.clear_match', 'réinitialiser')}
                </button>
              )}
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
          ) : displayedListings.length === 0 ? (
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[6vw] lg:gap-[3vw]">
              {displayedListings.map((l, i) => (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.5) }}
                >
                  <BusinessCard
                    listing={l}
                    matchScore={(l as any)._matchScore}
                    onClick={() => navigate('/app', { state: { focusId: l.id } })}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
        </>
        )}
      </main>

      {mode === 'listings' && (
        <div className="fixed bottom-[4vh] sm:bottom-8 right-[4vw] sm:right-8 z-[110]">
          <button
            onClick={() => user ? setIsFormOpen(true) : navigate('/login')}
            className="w-[14vw] sm:w-16 max-w-[64px] h-[14vw] sm:h-16 max-h-[64px] flex items-center justify-center text-white liquid-glass border border-white/30 rounded-full hover:bg-white/20 transition-all group shadow-[inset_0_4px_20px_rgba(255,255,255,0.3),_0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl hover:scale-105 active:scale-95"
          >
            <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <Plus className="w-[6vw] sm:w-8 max-w-[32px] h-[6vw] sm:h-8 max-h-[32px] relative z-10" strokeWidth={1.5} />
          </button>
        </div>
      )}

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