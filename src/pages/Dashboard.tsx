"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Trash2, Edit, Eye, User as UserIcon, Heart, TrendingUp, MessageSquare, Users, ShieldCheck, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { showSuccess, showError } from '@/utils/toast';
import { ListingForm } from '@/components/ListingForm';
import { BusinessCard } from '@/components/BusinessCard';
import { Navbar } from '@/components/Navbar';
import { SolarSystem } from '@/components/SolarSystem';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/AuthProvider';
import { useTranslation } from 'react-i18next';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { Sparkles, Target, Activity } from 'lucide-react';
import { MarketPulse } from '@/components/MarketPulse';
import { LiveActivityFeed } from '@/components/LiveActivityFeed';
import { OfferComparator } from '@/components/OfferComparator';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [listingToDelete, setListingToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [listingToEdit, setListingToEdit] = useState<any>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard', user?.id, JSON.stringify(user?.user_metadata)],
    queryFn: async () => {
      if (!user) throw new Error("Not logged in");

      const [
        { data: listings },
        { data: favs },
        { count: profileViewsCount },
        { data: profile },
        { count: messagesCount },
        { count: connectionsCount },
        { data: suggested }
      ] = await Promise.all([
        supabase.from('listings').select('*, listing_views(count)').eq('owner_id', user.id).order('created_at', { ascending: false }),
        supabase.from('favorites').select('*, listings(*, listing_views(count))').eq('user_id', user.id),
        supabase.from('profile_views').select('id', { count: 'exact' }).eq('profile_id', user.id),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('messages').select('id', { count: 'exact' }).eq('receiver_id', user.id),
        supabase.from('connections').select('id', { count: 'exact' }).or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`).eq('status', 'accepted'),
        supabase.from('listings').select('*, listing_views(count)').neq('owner_id', user.id).order('created_at', { ascending: false }).limit(10)
      ]);

      const myListings = (listings || []).map(l => ({ ...l, view_count: l.listing_views?.[0]?.count || 0 }));
      const myFavorites = (favs || []).map(f => f.listings ? { ...f.listings, view_count: f.listings.listing_views?.[0]?.count || 0 } : null).filter(Boolean);
      const allSuggested = (suggested || []).map(l => ({ ...l, view_count: l.listing_views?.[0]?.count || 0 }));

      return { 
        myListings, 
        myFavorites, 
        allSuggested,
        profileViews: profileViewsCount || 0,
        profile,
        messagesCount: messagesCount || 0,
        connectionsCount: connectionsCount || 0
      };
    },
    enabled: !!user?.id,
  });

  const handleDelete = async () => {
    if (!listingToDelete) return;
    setIsDeleting(true);
    const { error } = await supabase.from('listings').delete().eq('id', listingToDelete.id);
    if (error) {
      showError(t('dash.delete_error'));
    } else {
      await queryClient.invalidateQueries({ queryKey: ['dashboard', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['listings'] });
      showSuccess(t('dash.delete_success'));
    }
    setIsDeleting(false);
    setListingToDelete(null);
  };

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-[#2b2a2f] flex flex-col text-white font-sans selection:bg-primary/30">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[60vw] h-[40vh] bg-primary/10 blur-[100px] rounded-full" />
        </div>
        <SolarSystem />
        <Navbar />
        <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-6 sm:px-8 pt-[20vh] pb-20">
          <Skeleton className="h-10 w-[350px] mb-12 bg-white/5" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-[380px] rounded-[2rem] bg-white/5" />)}
          </div>
        </main>
      </div>
    );
  }

  const { myListings, myFavorites, allSuggested, profileViews, profile, messagesCount, connectionsCount } = data;

  // Prioritize SQL columns over legacy metadata
  const targetSectors = (profile?.target_sectors || user?.user_metadata?.target_sectors || "").toLowerCase();
  const targetGeo = (profile?.target_geo || user?.user_metadata?.target_geo || "").toLowerCase();
  const targetBudgetStr = (profile?.target_budget || user?.user_metadata?.target_budget || "").toLowerCase();
  
  const hasCriteria = targetSectors || targetGeo || targetBudgetStr;

  // Real matching logic based on Investment Criteria
  const calculateMatchScore = (listing: any) => {
    if (!hasCriteria) {
      const hash = listing.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      return 30 + (hash % 20);
    }

    let score = 20; // Base score
    
    const listingSector = (listing.industry || listing.sector || "").toLowerCase();
    const listingLocation = (listing.location || listing.address || "").toLowerCase();
    const listingDesc = (listing.description || "").toLowerCase();
    const listingPrice = Number(listing.price) || 0;

    // 1. Sector & Keyword Matching (Max 40 pts)
    if (targetSectors) {
      const keywords = targetSectors.split(',').map((s: string) => s.trim()).filter(Boolean);
      let sectorPoints = 0;
      keywords.forEach(word => {
        if (listingSector.includes(word)) sectorPoints += 40;
        else if (listingDesc.includes(word)) sectorPoints += 25;
      });
      score += Math.min(40, sectorPoints);
    }

    // 2. Geography Matching (Max 35 pts)
    if (targetGeo) {
      const geos = targetGeo.split(',').map((g: string) => g.trim()).filter(Boolean);
      let geoPoints = 0;
      geos.forEach(g => {
        if (listingLocation.includes(g)) geoPoints += 35;
      });
      score += Math.min(35, geoPoints);
    }

    // 3. Ultra Budget Matching (Max 40 pts)
    if (targetBudgetStr && listingPrice > 0) {
      const cleanBudget = targetBudgetStr.replace(/[^0-9km-]/g, '');
      const parts = cleanBudget.split('-');
      
      const parseVal = (p: string) => {
        let n = parseFloat(p);
        if (p.includes('k')) n *= 1000;
        else if (p.includes('m')) n *= 1000000;
        return n;
      };

      let min = 0, max = Infinity;
      if (parts.length === 2) {
        min = parseVal(parts[0]);
        max = parseVal(parts[1]);
      } else {
        max = parseVal(parts[0]);
        min = max * 0.5;
      }

      if (listingPrice >= min && listingPrice <= max) {
        score += 40; // Perfect range
      } else {
        const diffMin = Math.abs(listingPrice - min) / min;
        const diffMax = Math.abs(listingPrice - max) / max;
        const closestDiff = Math.min(diffMin, diffMax);
        if (closestDiff < 0.3) score += 20; // 30% margin is now accepted
      }
    }

    // 4. Trust Bonus
    if (listing.profiles?.kyc_status === 'verified') score += 5;

    const hash = listing.id.charCodeAt(listing.id.length - 1) % 5;
    score += hash;

    return Math.min(99, Math.round(score));
  };

  const suggestedDeals = allSuggested
    .map(deal => ({ ...deal, matchScore: calculateMatchScore(deal) }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-[#2b2a2f] flex flex-col text-white font-sans selection:bg-primary/30">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[60vw] h-[40vh] bg-primary/10 blur-[100px] rounded-full" />
      </div>
      <SolarSystem />
      <Navbar />

      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-6 sm:px-8 pt-[15vh] sm:pt-[20vh] pb-20">
        
        <motion.div 
          animate={{ y: [0, -15, 0], rotate: [0, -2, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[12vh] right-[-2%] md:top-[14vh] md:right-[22%] lg:right-[26%] w-[200px] md:w-[320px] z-0 pointer-events-none opacity-100"
        >
          <img src="/astronaut-star.png" alt="Astronaut Star" className="w-full h-auto drop-shadow-2xl" />
        </motion.div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12 border-b border-white/5 pb-8">
          <div>
            <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-3 text-white">
              {t('dash.title')}
            </h1>
            <p className="text-white/50 font-light max-w-2xl leading-relaxed text-sm sm:text-base">
              {t('dash.subtitle')}
            </p>
          </div>
          <Button onClick={() => { setListingToEdit(null); setIsEditFormOpen(true); }} className="rounded-full h-12 px-8 bg-white text-black hover:bg-white/90 font-medium w-fit shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all hover:scale-105">
            <Store className="w-4 h-4 mr-2" /> {t('dash.list_company')}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Vues Annonces */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 flex flex-col items-start relative overflow-hidden group hover:bg-white/[0.04] transition-all duration-500">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
              <Eye className="w-6 h-6 text-primary" />
            </div>
            <p className="text-4xl font-light text-white mb-2 tracking-tight">{myListings.reduce((acc, l) => acc + l.view_count, 0)}</p>
            <span className="text-[10px] uppercase tracking-widest text-white/50 font-medium mb-2">{t('dash.global_impact')}</span>
            <p className="text-xs text-white/30 font-light leading-relaxed">
              {t('dash.global_impact_desc')}
            </p>
          </div>

          {/* Vues Profil */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 flex flex-col items-start relative overflow-hidden group hover:bg-white/[0.04] transition-all duration-500">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20">
              <UserIcon className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-4xl font-light text-white mb-2 tracking-tight">{profileViews}</p>
            <span className="text-[10px] uppercase tracking-widest text-white/50 font-medium mb-2">{t('dash.profile_visits')}</span>
            <p className="text-xs text-white/30 font-light leading-relaxed">
              {t('dash.profile_visits_desc')}
            </p>
          </div>

          {/* Messages */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 flex flex-col items-start relative overflow-hidden group hover:bg-white/[0.04] transition-all duration-500 cursor-pointer" onClick={() => navigate('/messages')} role="button">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 group-hover:border-white/30 transition-colors">
              <MessageSquare className="w-6 h-6 text-white/80" />
            </div>
            <p className="text-4xl font-light text-white mb-2 tracking-tight">{messagesCount}</p>
            <span className="text-[10px] uppercase tracking-widest text-white/50 font-medium mb-2">{t('dash.negotiations')}</span>
            <p className="text-xs text-white/30 font-light leading-relaxed">
              {t('dash.negotiations_desc')}
            </p>
          </div>

          {/* Réseau / CRM */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 flex flex-col items-start relative overflow-hidden group hover:bg-white/[0.04] transition-all duration-500 cursor-pointer" onClick={() => navigate('/profile', { state: { activeTab: 'relations' } })} role="button">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center mb-6 border border-primary/20 group-hover:border-primary/40 transition-colors">
              <Users className="w-6 h-6 text-primary/80" />
            </div>
            <p className="text-4xl font-light text-white mb-2 tracking-tight">{connectionsCount}</p>
            <span className="text-[10px] uppercase tracking-widest text-white/50 font-medium mb-2">{t('dash.network')}</span>
            <p className="text-xs text-white/30 font-light leading-relaxed">
              {t('dash.network_desc')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {/* Action: KYC */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-white/[0.03] transition-colors duration-500">
            <div className="flex items-start sm:items-center gap-5">
              <div className="w-14 h-14 shrink-0 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <ShieldCheck className="w-7 h-7 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-white text-lg font-medium mb-1 flex items-center gap-3">
                  Trust & Safety <VerifiedBadge kycStatus={profile?.kyc_status} size="sm" />
                </p>
                <p className="text-sm text-white/40 leading-relaxed max-w-sm">
                  {profile?.kyc_status === 'verified' 
                    ? t('dash.kyc_verified_desc') 
                    : t('dash.kyc_unverified_desc')}
                </p>
              </div>
            </div>
            {profile?.kyc_status !== 'verified' && (
              <Button onClick={() => navigate('/profile')} variant="outline" className="shrink-0 rounded-full bg-white/5 border-white/10 hover:bg-white/10 h-12 px-8 text-sm font-medium">{t('dash.start_verification')}</Button>
            )}
          </div>

          {/* Action: Plan */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-white/[0.03] transition-colors duration-500">
            <div className="flex items-start sm:items-center gap-5">
              <div className="w-14 h-14 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <Crown className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-white text-lg font-medium mb-1">
                  Licence d'Accès
                </p>
                <p className="text-sm text-white/40 leading-relaxed max-w-sm">
                  {profile?.plan_type === 'premium' 
                    ? 'Vous bénéficiez d\'une exposition maximale, d\'une assistance prioritaire et de l\'absence de limitations.' 
                    : 'Passez au niveau supérieur. Obtenez une visibilité globale prioritaire et un accès sans limite aux données.'}
                </p>
              </div>
            </div>
            {profile?.plan_type !== 'premium' && (
              <Button onClick={() => navigate('/payment')} className="shrink-0 rounded-full bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] h-12 px-8 text-sm font-medium">Débloquer Premium</Button>
            )}
          </div>
        </div>

        {/* COCKPIT: Market Intelligence + Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
          <div className="lg:col-span-2">
            <MarketPulse listings={allSuggested} />
          </div>
          <div className="lg:col-span-1">
            <LiveActivityFeed />
          </div>
        </div>

        {/* Offer Comparators for seller's listings */}
        {myListings.length > 0 && (
          <div className="space-y-4 mb-16">
            {myListings.map(listing => (
              <OfferComparator key={listing.id} listingId={listing.id} listingPrice={listing.price} sellerId={user?.id || ''} />
            ))}
          </div>
        )}

        {/* KILLER FEATURE: AI Deal Radar */}
        {suggestedDeals.length > 0 && (
          <div className="mb-20">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center border border-primary/30 relative">
                <Sparkles className="w-6 h-6 text-primary" />
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-light text-white flex items-center gap-3">
                  GlobalTrade AI <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-widest">Radar</span>
                </h2>
                <p className="text-sm text-white/50 font-light mt-1">
                  {hasCriteria 
                    ? `${t('dash.radar_based_on')}${[targetSectors, targetGeo].filter(Boolean).join(' • ') || t('dash.active_search')}`
                    : t('dash.radar_configure')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suggestedDeals.map((deal) => {
                return (
                  <div key={deal.id} className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-blue-500 rounded-[2.5rem] blur opacity-10 group-hover:opacity-30 transition duration-1000 group-hover:duration-200" />
                    <div className="relative">
                      {/* Badge Match Score */}
                      <div className="absolute -top-3 -right-2 z-20 bg-[#2b2a2f] border border-primary/30 text-white px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.3)] flex items-center gap-2 transform group-hover:scale-105 transition-transform duration-300">
                        <Activity className="w-3 h-3 text-primary animate-pulse" />
                        <span className="text-sm font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">{deal.matchScore}% {t('dash.match')}</span>
                      </div>
                      <BusinessCard
                        listing={deal}
                        onClick={() => navigate('/app', { state: { focusId: deal.id } })}
                        variant="dashboard"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-24">
          <section>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-light flex items-center gap-3 text-white">
                {t('dash.my_sales')}
              </h2>
            </div>
            
            {myListings.length === 0 ? (
              <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-16 text-center max-w-3xl mx-auto flex flex-col items-center hover:bg-white/[0.04] transition-colors duration-500">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                  <Store className="w-6 h-6 text-white/40" />
                </div>
                <h3 className="text-2xl font-light mb-3 text-white">{t('dash.no_sales_title')}</h3>
                <p className="text-white/40 font-light mb-8 max-w-md leading-relaxed text-sm">
                  {t('dash.no_sales_desc')}
                </p>
                <Button onClick={() => { setListingToEdit(null); setIsEditFormOpen(true); }} className="rounded-full bg-primary hover:bg-primary/90 text-white px-8 h-12 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                  {t('dash.create_first')}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myListings.map(listing => (
                  <BusinessCard key={listing.id} listing={listing} onClick={() => navigate('/app', { state: { focusId: listing.id } })}
                    actions={
                      <div className="flex gap-1">
                        <button className="p-2 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-colors" onClick={(e) => { e.stopPropagation(); setListingToEdit(listing); setIsEditFormOpen(true); }} title={t('dash.edit')}><Edit className="w-4 h-4" /></button>
                        <button className="p-2 rounded-full text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors" onClick={(e) => { e.stopPropagation(); setListingToDelete(listing); }} title={t('dash.remove')}><Trash2 className="w-4 h-4" /></button>
                      </div>
                    }
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between border-t border-white/5 pt-16 mb-8 mt-16">
              <h2 className="text-2xl font-light flex items-center gap-3 text-white">
                 {t('dash.watchlist')}
              </h2>
            </div>
            
            {myFavorites.length === 0 ? (
              <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-16 text-center max-w-3xl mx-auto flex flex-col items-center hover:bg-white/[0.04] transition-colors duration-500">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                  <Heart className="w-6 h-6 text-white/40" />
                </div>
                <h3 className="text-2xl font-light mb-3 text-white">{t('dash.no_favs_title')}</h3>
                <p className="text-white/40 font-light mb-8 max-w-md leading-relaxed text-sm">
                  {t('dash.no_favs_desc')}
                </p>
                <Button variant="outline" onClick={() => navigate('/marketplace')} className="rounded-full border-white/10 bg-transparent hover:bg-white/5 text-white px-8 h-12">
                  {t('dash.explore')}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myFavorites.map(listing => (
                  <BusinessCard 
                    key={listing.id} 
                    listing={listing} 
                    onClick={() => navigate('/app', { state: { focusId: listing.id } })}
                    onFavoriteToggle={(id, isFav) => {
                      if (!isFav) {
                        queryClient.setQueryData(['dashboard', user?.id], (old: any) => {
                          if (!old) return old;
                          return { ...old, myFavorites: old.myFavorites.filter((f: any) => f.id !== id) };
                        });
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <AnimatePresence>
        {listingToDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#2b2a2f]/80 backdrop-blur-md" onClick={() => setListingToDelete(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-[#2b2a2f] border border-white/10 rounded-[2rem] p-10 max-w-md w-full text-center shadow-2xl">
              <h3 className="text-2xl font-light mb-3 text-white">{t('dash.modal_delete_title')}</h3>
              <p className="text-white/50 mb-8 font-light text-sm">
                {t('dash.modal_delete_desc', { name: listingToDelete.name })}
              </p>
              <div className="flex flex-col gap-3">
                <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="w-full rounded-full h-12">{t('dash.confirm_delete')}</Button>
                <Button variant="ghost" onClick={() => setListingToDelete(null)} className="w-full rounded-full h-12">{t('dash.cancel')}</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ListingForm isOpen={isEditFormOpen} onClose={() => setIsEditFormOpen(false)} onSuccess={() => { refetch(); queryClient.invalidateQueries({ queryKey: ['listings'] }); }} listingToEdit={listingToEdit} />
    </div>
  );
}