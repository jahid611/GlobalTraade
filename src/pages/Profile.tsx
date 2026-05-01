"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Share, Eye, Heart, Edit, Trash2, Mail, Phone, UserPlus, UserCheck, UserMinus, Clock, Check, X as XIcon, Users, BadgeCheck, Upload, Loader2, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { SolarSystem } from '@/components/SolarSystem';
import { ChatPanel } from '@/components/ChatPanel';
import { BusinessCard } from '@/components/BusinessCard';
import { ListingForm } from '@/components/ListingForm';
import { showSuccess, showError } from '@/utils/toast';
import { Navbar } from '@/components/Navbar';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/AuthProvider';
import { useTranslation } from 'react-i18next';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { initNativeFeel } from '@/utils/nativeFeel';

initNativeFeel();

export default function Profile() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const targetId = routeId || currentUser?.id;
  const isOwnProfile = !routeId || routeId === currentUser?.id;

  const [activeTab, setActiveTab] = useState<'listings' | 'favorites' | 'relations'>('listings');

  useEffect(() => {
    if (location.state && (location.state as { activeTab?: 'listings' | 'favorites' | 'relations' }).activeTab) {
      setActiveTab((location.state as { activeTab: 'listings' | 'favorites' | 'relations' }).activeTab);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatListing, setChatListing] = useState<Record<string, any> | null>(null);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [listingToEdit, setListingToEdit] = useState<Record<string, any> | null>(null);
  const [listingToDelete, setListingToDelete] = useState<Record<string, any> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [kycUploading, setKycUploading] = useState(false);

  useEffect(() => {
    if (currentUser && targetId && targetId !== currentUser.id) {
      const registerView = async () => {
        const { error } = await supabase.from('profile_views').insert([{ profile_id: targetId, viewer_id: currentUser.id }]);
        if (!error) {
          queryClient.invalidateQueries({ queryKey: ['profile', targetId] });
        }
      };
      registerView();
    }
  }, [targetId, currentUser]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['profile', targetId, currentUser?.id],
    queryFn: async () => {
      if (!targetId) throw new Error("No target ID");

      const [ { data: profileData }, { data: listingsData }, { data: favs }, { count: profileViewsCount } ] = await Promise.all([
        supabase.from('safe_profiles').select('*').eq('id', targetId).single(),
        supabase.from('listings').select('*, listing_views(count)').eq('owner_id', targetId).order('created_at', { ascending: false }),
        isOwnProfile ? supabase.from('favorites').select('*, listings(*, listing_views(count))').eq('user_id', targetId) : Promise.resolve({ data: null }),
        supabase.from('profile_views').select('id', { count: 'exact' }).eq('profile_id', targetId)
      ]);

      const targetUser = profileData ? {
        id: targetId,
        kyc_status: profileData.kyc_status || 'none',
        user_metadata: { ...profileData }
      } : null;

      const listings = (listingsData || []).map(l => ({ ...l, view_count: l.listing_views?.[0]?.count || 0 }));
      const myFavorites = (favs || []).map(f => f.listings ? { ...f.listings, view_count: f.listings.listing_views?.[0]?.count || 0 } : null).filter(Boolean);

      let connectionsList: Record<string, any>[] = [];
      const { data: acceptedConns } = await supabase
        .from('connections')
        .select('requester_id, recipient_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${targetId},recipient_id.eq.${targetId}`);

      if (acceptedConns && acceptedConns.length > 0) {
        const relationIds = acceptedConns.map(c => c.requester_id === targetId ? c.recipient_id : c.requester_id);
        if (relationIds.length > 0) {
          const { data: profiles } = await supabase.from('safe_profiles').select('*').in('id', relationIds);
          connectionsList = profiles || [];
        }
      }

      let pendingRequests: Record<string, any>[] = [];
      if (isOwnProfile) {
        const { data: pending } = await supabase.from('connections').select('id, requester_id, status').eq('recipient_id', targetId).eq('status', 'pending');
        if (pending && pending.length > 0) {
          const reqIds = pending.map(p => p.requester_id);
          const { data: reqProfiles } = await supabase.from('safe_profiles').select('*').in('id', reqIds);
          pendingRequests = pending.map(p => ({
            ...p,
            profile: reqProfiles?.find(rp => rp.id === p.requester_id)
          }));
        }
      }

      let connectionStatus = 'none';
      let connectionId = null;

      if (!isOwnProfile && currentUser?.id) {
        const { data: conn } = await supabase
          .from('connections')
          .select('*')
          .or(`and(requester_id.eq.${currentUser.id},recipient_id.eq.${targetId}),and(requester_id.eq.${targetId},recipient_id.eq.${currentUser.id})`)
          .maybeSingle();

        if (conn) {
          connectionId = conn.id;
          if (conn.status === 'accepted') connectionStatus = 'connected';
          else if (conn.requester_id === currentUser.id) connectionStatus = 'pending_sent';
          else connectionStatus = 'pending_received';
        }
      }

      return { targetUser, listings, myFavorites, connectionsList, pendingRequests, connectionStatus, connectionId, profileViewsCount };
    },
    enabled: !!targetId
  });

  const handleConnect = async () => {
    if (!currentUser) return navigate('/login');
    if (!data?.targetUser) return;
    const { error } = await supabase.from('connections').insert({ requester_id: currentUser.id, recipient_id: data.targetUser.id });
    if (!error) {
      showSuccess(t('profile.req_sent'));
      refetch();
    }
  };

  const handleAccept = async (connId: string | null) => {
    if (!connId) return;
    const { error } = await supabase.from('connections').update({ status: 'accepted' }).eq('id', connId);
    if (!error) {
      showSuccess(t('profile.req_accepted'));
      refetch();
    }
  };

  const handleDeclineOrRemove = async (isDecline = false, connId: string | null) => {
    if (!connId) return;
    const { error } = await supabase.from('connections').delete().eq('id', connId);
    if (!error) {
      showSuccess(isDecline ? t('profile.req_declined') : t('profile.rel_removed'));
      refetch();
    }
  };

  const handleContact = () => {
    if (!currentUser) return navigate('/login');
    if (data?.listings && data.listings.length > 0) { 
      setChatListing(data.listings[0]); 
      setIsChatOpen(true); 
    }
    else showSuccess(t('profile.no_listing'));
  };

  const handleDelete = async () => {
    if (!listingToDelete) return;
    setIsDeleting(true);
    const { error } = await supabase.from('listings').delete().eq('id', listingToDelete.id);
    if (error) {
      showError(t('profile.error_generic', "Une erreur est survenue."));
    } else { 
      await queryClient.invalidateQueries({ queryKey: ['profile', targetId] });
      await queryClient.invalidateQueries({ queryKey: ['listings'] });
      showSuccess(t('profile.deleted')); 
    }
    setIsDeleting(false);
    setListingToDelete(null);
  };

  const handlePremiumClick = () => {
    if (!currentUser) {
      showError(t('premium.login_required'));
      navigate('/login', { state: { from: location.pathname } });
    } else {
      navigate('/payment');
    }
  };

  if (isLoading || !data?.targetUser) {
    return (
      <div className="min-h-screen bg-transparent dark:bg-[#2b2a2f] flex flex-col text-white font-sans selection:bg-primary/30">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>
        <SolarSystem />
        <Navbar />
        <main className="relative z-10 pt-[20vh] pb-20 max-w-6xl mx-auto px-[6vw] sm:px-8 w-full flex-1">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-[8vh]">
            <Skeleton className="w-28 h-28 rounded-full bg-white/10 shrink-0" />
            <div className="flex-1 w-full space-y-6">
              <Skeleton className="h-12 w-[350px] bg-white/10" />
              <div className="flex justify-center md:justify-start gap-6">
                <Skeleton className="h-8 w-[100px] bg-white/5" />
                <Skeleton className="h-8 w-[100px] bg-white/5" />
                <Skeleton className="h-8 w-[100px] bg-white/5" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-[380px] rounded-[2rem] bg-white/5" />)}
          </div>
        </main>
      </div>
    );
  }

  const { targetUser, listings, myFavorites, connectionsList, pendingRequests, connectionStatus, connectionId, profileViewsCount } = data;
  const metadata = targetUser.user_metadata || {};
  const fullName = metadata.full_name || t('profile.member');
  const displayedItems = activeTab === 'listings' ? listings : myFavorites;
  const listingViewsCount = listings.reduce((acc, l) => acc + (l.view_count || 0), 0);

  return (
    <div className="min-h-screen bg-transparent dark:bg-[#2b2a2f] text-white transition-colors duration-500 selection:bg-primary/30">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>
      <SolarSystem />
      <Navbar />

      <main className="relative z-10 pt-[15vh] sm:pt-[20vh] pb-20 max-w-6xl mx-auto px-[6vw] sm:px-8 w-full">
        
        <motion.div 
          animate={{ y: [0, -10, 0], rotate: [0, 3, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[12vh] right-[-10vw] md:top-[16vh] md:right-[-5%] w-[200px] md:w-[380px] z-0 pointer-events-none opacity-100"
        >
          <img src="/saturn.png" alt="Saturn" className="w-full h-auto drop-shadow-2xl" />
        </motion.div>
        
        <div className="flex flex-col md:flex-row items-center md:items-start gap-[4vh] sm:gap-8 mb-[8vh] relative z-10 border-b border-white/20 dark:border-white/5 pb-[4vh]">
          <Avatar className="w-[25vw] h-[25vw] sm:w-28 sm:h-28 max-w-[120px] max-h-[120px] border-2 border-white/40 dark:border-white/10 shrink-0 shadow-xl">
            <AvatarImage src={metadata.avatar_url} className="object-cover" />
            <AvatarFallback className="liquid-glass bg-white/20 dark:bg-white/10 text-white text-[clamp(2rem,3vw,3rem)] font-light">{fullName.charAt(0)}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 text-center md:text-left w-full">
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 justify-between mb-4">
              <h1 className="text-[clamp(2.5rem,4vw,4rem)] font-light leading-[1.1] tracking-tighter truncate text-white flex items-center justify-center md:justify-start gap-3">
                {fullName}
                <VerifiedBadge kycStatus={targetUser.kyc_status} size="lg" />
              </h1>
              
              <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
                {isOwnProfile && (
                  <button 
                    onClick={handlePremiumClick}
                    className="px-6 h-[10vw] sm:h-12 max-h-[48px] rounded-full liquid-glass bg-primary/20 border-primary/40 text-white hover:bg-primary/30 hover:border-primary/60 transition-all duration-500 text-[clamp(10px,1vw,12px)] font-medium tracking-wide uppercase outline-none"
                  >
                    {t('nav.premium')}
                  </button>
                )}

                <button onClick={() => { navigator.clipboard.writeText(window.location.href); showSuccess(t('profile.copied')); }} className="w-[10vw] h-[10vw] sm:w-12 sm:h-12 max-w-[48px] max-h-[48px] rounded-full liquid-glass border border-white/30 dark:border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors outline-none" title="Partager le profil">
                  <Share className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                
                {!isOwnProfile && (
                  <>
                    {connectionStatus === 'none' && (
                      <Button onClick={handleConnect} variant="outline" className="rounded-full h-[10vw] sm:h-12 max-h-[48px] px-6 border-white/30 dark:border-white/10 liquid-glass bg-transparent text-white hover:bg-white/20 transition-all outline-none font-medium text-[clamp(10px,1vw,12px)] uppercase tracking-widest">
                        <UserPlus className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">{t('profile.connect')}</span>
                      </Button>
                    )}
                    {connectionStatus === 'pending_sent' && (
                      <Button onClick={() => handleDeclineOrRemove(false, connectionId)} variant="outline" className="rounded-full h-[10vw] sm:h-12 max-h-[48px] px-6 border-white/30 dark:border-white/10 liquid-glass bg-transparent text-white hover:bg-red-500/20 hover:text-white hover:border-red-500/50 transition-all group outline-none font-medium text-[clamp(10px,1vw,12px)] uppercase tracking-widest">
                        <Clock className="w-4 h-4 sm:mr-2 group-hover:hidden" />
                        <XIcon className="w-4 h-4 sm:mr-2 hidden group-hover:block" />
                        <span className="hidden sm:inline group-hover:hidden">{t('profile.pending')}</span>
                        <span className="hidden sm:group-hover:inline">{t('profile.cancel')}</span>
                      </Button>
                    )}
                    {connectionStatus === 'pending_received' && (
                      <div className="flex gap-2">
                        <Button onClick={() => handleAccept(connectionId)} className="rounded-full h-[10vw] sm:h-12 max-h-[48px] px-6 bg-primary text-white hover:bg-primary/90 transition-all border-none outline-none font-medium text-[clamp(10px,1vw,12px)] uppercase tracking-widest shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                          <Check className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">{t('profile.accept')}</span>
                        </Button>
                        <Button onClick={() => handleDeclineOrRemove(true, connectionId)} variant="outline" className="w-[10vw] h-[10vw] sm:w-12 sm:h-12 max-w-[48px] max-h-[48px] rounded-full p-0 border-white/30 dark:border-white/10 liquid-glass bg-transparent text-white hover:bg-red-500/20 hover:text-white hover:border-red-500/50 transition-all outline-none">
                          <XIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>
                      </div>
                    )}
                    {connectionStatus === 'connected' && (
                      <Button onClick={() => handleDeclineOrRemove(false, connectionId)} variant="outline" className="rounded-full h-[10vw] sm:h-12 max-h-[48px] px-6 border-primary/50 liquid-glass bg-primary/10 text-white hover:bg-red-500/20 hover:text-white hover:border-red-500/50 transition-all group outline-none font-medium text-[clamp(10px,1vw,12px)] uppercase tracking-widest">
                        <UserCheck className="w-4 h-4 sm:mr-2 group-hover:hidden" />
                        <UserMinus className="w-4 h-4 sm:mr-2 hidden group-hover:block" />
                        <span className="hidden sm:inline group-hover:hidden">{t('profile.connected')}</span>
                        <span className="hidden sm:group-hover:inline">{t('profile.remove')}</span>
                      </Button>
                    )}
                    
                    <Button onClick={handleContact} className="rounded-full h-[10vw] sm:h-12 max-h-[48px] px-8 bg-white text-black hover:bg-white/90 border-none outline-none font-medium text-[clamp(10px,1vw,12px)] uppercase tracking-widest shadow-[0_0_30px_rgba(255,255,255,0.2)]">{t('profile.contact')}</Button>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-[4vw] sm:gap-8 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-[clamp(1.5rem,2vw,2rem)] font-light text-white">{listings.length}</span>
                <span className="text-[10px] uppercase tracking-widest font-medium text-white dark:text-white/60">{t('profile.listings')}</span>
              </div>
              <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setActiveTab('relations')}>
                <span className="text-[clamp(1.5rem,2vw,2rem)] font-light text-white group-hover:text-primary transition-colors">{connectionsList.length}</span>
                <span className="text-[10px] uppercase tracking-widest font-medium text-white dark:text-white/60 group-hover:text-white transition-colors flex items-center gap-1.5"><Users className="w-3 h-3"/> {t('profile.relations')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[clamp(1.5rem,2vw,2rem)] font-light text-white">{listingViewsCount}</span>
                <span className="text-[10px] uppercase tracking-widest font-medium text-white dark:text-white/60 flex items-center gap-1.5"><Store className="w-3 h-3"/> Vues (Annonces)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[clamp(1.5rem,2vw,2rem)] font-light text-white">{profileViewsCount || 0}</span>
                <span className="text-[10px] uppercase tracking-widest font-medium text-white dark:text-white/60 flex items-center gap-1.5"><Eye className="w-3 h-3"/> Vues (Profil)</span>
              </div>
            </div>

            {metadata.bio && <p className="text-[clamp(0.875rem,1vw,1rem)] font-light text-white dark:text-white/80 leading-relaxed max-w-2xl mb-6 mx-auto md:mx-0">{metadata.bio}</p>}

            {(metadata.show_email && metadata.contact_email) || (metadata.show_phone && metadata.phone) ? (
              <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
                {metadata.show_email && metadata.contact_email && (
                  <a href={`mailto:${metadata.contact_email}`} className="flex items-center gap-2 px-5 py-2.5 rounded-full liquid-glass border-white/30 dark:border-white/10 hover:bg-white/20 dark:hover:bg-white/10 text-xs font-light text-white transition-all w-fit group">
                    <Mail className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" /> {metadata.contact_email}
                  </a>
                )}
                {metadata.show_phone && metadata.phone && (
                  <a href={`tel:${metadata.phone}`} className="flex items-center gap-2 px-5 py-2.5 rounded-full liquid-glass border-white/30 dark:border-white/10 hover:bg-white/20 dark:hover:bg-white/10 text-xs font-light text-white transition-all w-fit group">
                    <Phone className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" /> {metadata.phone}
                  </a>
                )}
              </div>
            ) : null}

          </div>
        </div>

        {/* KYC Section — Own Profile Only */}
        {isOwnProfile && (
          <div className="mb-[8vh] relative z-10">
            {(!targetUser.kyc_status || targetUser.kyc_status === 'none') && (
              <div className="liquid-glass rounded-[2rem] p-6 sm:p-8 border border-white/30 dark:border-white/10 flex flex-col sm:flex-row items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/20 dark:bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/40 dark:border-blue-500/20">
                  <BadgeCheck className="w-7 h-7 text-blue-400" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-[clamp(1.1rem,1.5vw,1.25rem)] font-light text-white mb-1">{t('kyc.request_title')}</h3>
                  <p className="text-[clamp(0.875rem,1vw,1rem)] text-white dark:text-white/60 font-light leading-relaxed">{t('kyc.request_desc')}</p>
                </div>
                <label className="shrink-0 cursor-pointer w-full sm:w-auto">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !currentUser) return;
                      setKycUploading(true);
                      try {
                        const ext = file.name.split('.').pop();
                        const path = `kyc/${currentUser.id}/document.${ext}`;
                        await supabase.storage.from('documents').upload(path, file, { upsert: true });
                        await supabase.from('profiles').update({ kyc_status: 'pending' }).eq('id', currentUser.id);
                        showSuccess(t('kyc.submitted_success'));
                        refetch();
                      } catch (err) {
                        showError(t('kyc.upload_error', 'Erreur lors de l\'upload.'));
                      }
                      setKycUploading(false);
                    }}
                  />
                  <span className="flex items-center justify-center gap-2 px-8 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-[clamp(10px,1vw,12px)] uppercase tracking-widest font-medium transition-all cursor-pointer outline-none shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                    {kycUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {t('kyc.request_btn')}
                  </span>
                </label>
              </div>
            )}
            {targetUser.kyc_status === 'pending' && (
              <div className="liquid-glass rounded-[2rem] p-6 border border-amber-500/40 dark:border-amber-500/20 flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 dark:bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/40 dark:border-amber-500/20">
                  <Clock className="w-6 h-6 text-amber-400" />
                </div>
                <p className="text-[clamp(0.875rem,1vw,1rem)] text-amber-100 font-light">{t('kyc.pending_msg')}</p>
              </div>
            )}
            {targetUser.kyc_status === 'verified' && (
              <div className="liquid-glass rounded-[2rem] p-6 border border-blue-500/40 dark:border-blue-500/20 flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 dark:bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/40 dark:border-blue-500/20">
                  <BadgeCheck className="w-6 h-6 text-blue-400" />
                </div>
                <p className="text-[clamp(0.875rem,1vw,1rem)] text-white font-light">{t('kyc.verified_msg')}</p>
              </div>
            )}
            {targetUser.kyc_status === 'rejected' && (
              <div className="liquid-glass rounded-[2rem] p-6 border border-red-500/40 dark:border-red-500/20 flex flex-col sm:flex-row items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-red-500/20 dark:bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/40 dark:border-red-500/20">
                  <XIcon className="w-7 h-7 text-red-400" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-[clamp(0.875rem,1vw,1rem)] text-white font-light">{t('kyc.rejected_msg')}</p>
                </div>
                <label className="shrink-0 cursor-pointer w-full sm:w-auto">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !currentUser) return;
                      setKycUploading(true);
                      try {
                        const ext = file.name.split('.').pop();
                        const path = `kyc/${currentUser.id}/document.${ext}`;
                        await supabase.storage.from('documents').upload(path, file, { upsert: true });
                        await supabase.from('profiles').update({ kyc_status: 'pending' }).eq('id', currentUser.id);
                        showSuccess(t('kyc.submitted_success'));
                        refetch();
                      } catch (err) {
                        showError(t('kyc.upload_error', 'Erreur lors de l\'upload.'));
                      }
                      setKycUploading(false);
                    }}
                  />
                  <span className="flex items-center justify-center gap-2 px-8 h-12 rounded-full liquid-glass border-white/30 dark:border-white/10 bg-transparent hover:bg-white/20 dark:hover:bg-white/10 text-white text-[clamp(10px,1vw,12px)] uppercase tracking-widest font-medium transition-all cursor-pointer outline-none">
                    {kycUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {t('kyc.request_btn')}
                  </span>
                </label>
              </div>
            )}
          </div>
        )}

        <div className="border-b border-white/20 dark:border-white/10 flex flex-wrap gap-6 sm:gap-8 mb-[6vh] overflow-x-auto custom-scrollbar relative z-10">
          <button onClick={() => setActiveTab('listings')} className={`pb-4 text-[clamp(0.875rem,1vw,1rem)] font-medium tracking-wide transition-colors relative whitespace-nowrap outline-none ${activeTab === 'listings' ? 'text-white' : 'text-white/60 hover:text-white'}`}>
            {t('profile.tab_listings')}
            {activeTab === 'listings' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary shadow-[0_0_10px_rgba(168,85,247,0.8)]" />}
          </button>
          <button onClick={() => setActiveTab('relations')} className={`pb-4 text-[clamp(0.875rem,1vw,1rem)] font-medium tracking-wide transition-colors relative whitespace-nowrap outline-none ${activeTab === 'relations' ? 'text-white' : 'text-white/60 hover:text-white'}`}>
            {t('profile.tab_relations')} {pendingRequests.length > 0 && <span className="ml-2 bg-primary text-white text-[10px] px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]">{pendingRequests.length}</span>}
            {activeTab === 'relations' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary shadow-[0_0_10px_rgba(168,85,247,0.8)]" />}
          </button>
          {isOwnProfile && (
            <button onClick={() => setActiveTab('favorites')} className={`pb-4 text-[clamp(0.875rem,1vw,1rem)] font-medium tracking-wide transition-colors relative whitespace-nowrap outline-none ${activeTab === 'favorites' ? 'text-white' : 'text-white/60 hover:text-white'}`}>
              {t('profile.tab_favorites')}
              {activeTab === 'favorites' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary shadow-[0_0_10px_rgba(168,85,247,0.8)]" />}
            </button>
          )}
        </div>

        <div className="relative z-10">
        {activeTab === 'relations' ? (
          <div className="space-y-[8vh]">
            
            {isOwnProfile && pendingRequests.length > 0 && (
              <section>
                <h3 className="text-sm uppercase tracking-widest text-primary font-medium mb-6 flex items-center gap-2"><Clock className="w-5 h-5"/> {t('profile.pending_req')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingRequests.map(req => (
                    <div key={req.id} className="liquid-glass dark:bg-white/[0.02] border-primary/40 dark:border-primary/20 rounded-full p-2 pr-6 flex items-center gap-4 hover:border-primary/60 dark:hover:bg-white/[0.04] transition-all cursor-pointer group shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                      <Avatar className="w-12 h-12 border border-white/20 dark:border-white/10 bg-white/10 shrink-0" onClick={() => navigate(`/profile/${req.profile?.id}`)}>
                        <AvatarImage src={req.profile?.avatar_url} className="object-cover" />
                        <AvatarFallback className="bg-transparent text-white/80 font-light">{req.profile?.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0" onClick={() => navigate(`/profile/${req.profile?.id}`)}>
                        <h4 className="text-sm font-medium truncate text-white group-hover:text-primary transition-colors">{req.profile?.full_name}</h4>
                        <p className="text-[10px] text-white/60 truncate mt-0.5">{req.profile?.bio || t('profile.wants_to_join')}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleAccept(req.id)} className="w-8 h-8 rounded-full bg-primary/20 text-primary hover:bg-primary hover:text-white flex items-center justify-center transition-all shadow-sm">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeclineOrRemove(true, req.id)} className="w-8 h-8 rounded-full bg-white/10 text-white/80 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-all shadow-sm">
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              {isOwnProfile && pendingRequests.length > 0 && (
                <h3 className="text-sm uppercase tracking-widest text-white font-medium mb-6 flex items-center gap-2"><Users className="w-5 h-5"/> {t('profile.network')}</h3>
              )}
              {connectionsList.length === 0 ? (
                <div className="py-20 text-center liquid-glass dark:bg-white/[0.02] border-white/30 dark:border-white/5 rounded-[2rem]">
                  <Users className="w-12 h-12 text-white/40 mx-auto mb-4" />
                  <p className="font-light text-white dark:text-white/60 text-[clamp(1rem,1.1vw,1.125rem)]">{t('profile.no_relations')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {connectionsList.map(profile => (
                    <div key={profile.id} onClick={() => navigate(`/profile/${profile.id}`)} className="liquid-glass dark:bg-white/[0.02] border-white/30 dark:border-white/5 rounded-full p-2 pr-6 flex items-center gap-4 hover:border-white/60 dark:hover:bg-white/[0.04] transition-all cursor-pointer group">
                      <Avatar className="w-12 h-12 border border-white/20 dark:border-white/10 group-hover:scale-105 transition-transform bg-white/10 shrink-0">
                        <AvatarImage src={profile.avatar_url} className="object-cover" />
                        <AvatarFallback className="bg-transparent text-white/80 font-light">{profile.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate text-white group-hover:text-primary transition-colors">{profile.full_name}</h4>
                        <p className="text-[10px] text-white/60 truncate mt-0.5">{profile.bio || t('profile.member')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[6vw] lg:gap-[3vw]">
            {displayedItems.length === 0 ? (
              <div className="col-span-full py-20 text-center liquid-glass dark:bg-white/[0.02] border-white/30 dark:border-white/5 rounded-[2rem]">
                <p className="font-light text-white dark:text-white/60 text-[clamp(1rem,1.1vw,1.125rem)]">{t('profile.nothing_to_show')}</p>
              </div>
            ) : (
              displayedItems.map((item) => (
                <BusinessCard 
                  key={item.id} 
                  listing={item} 
                  onClick={() => navigate('/app', { state: { focusId: item.id } })}
                  onFavoriteToggle={(id, isFav) => {
                    if (!isFav && activeTab === 'favorites') {
                      queryClient.setQueryData(['profile', targetId, currentUser?.id], (old: { myFavorites?: { id: string }[] } | undefined) => {
                        if (!old) return old;
                        return { ...old, myFavorites: (old.myFavorites || []).filter((f: { id: string }) => f.id !== id) };
                      });
                    }
                  }}
                  actions={isOwnProfile && activeTab === 'listings' ? (
                    <div className="flex gap-1">
                      <button className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/20 dark:hover:bg-white/10 transition-colors outline-none" onClick={(e) => { e.stopPropagation(); setListingToEdit(item); setIsEditFormOpen(true); }}><Edit className="w-5 h-5" /></button>
                      <button className="p-2 rounded-full text-white/60 hover:text-red-400 hover:bg-red-500/20 dark:hover:bg-red-500/10 transition-colors outline-none" onClick={(e) => { e.stopPropagation(); setListingToDelete(item); }}><Trash2 className="w-5 h-5" /></button>
                    </div>
                  ) : undefined}
                />
              ))
            )}
          </div>
        )}
        </div>
      </main>

      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} listing={chatListing} user={currentUser} />
      <ListingForm isOpen={isEditFormOpen} onClose={() => setIsEditFormOpen(false)} onSuccess={() => refetch()} listingToEdit={listingToEdit} />

      <AnimatePresence>
        {listingToDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#2b2a2f]/80 backdrop-blur-md" onClick={() => setListingToDelete(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative liquid-glass border border-white/30 dark:border-white/10 rounded-[2rem] p-10 max-w-md w-full text-center shadow-2xl">
              <h3 className="text-2xl font-light mb-3 text-white">{t('profile.del_title')}</h3>
              <div className="flex justify-center gap-4 mt-8">
                <Button variant="ghost" onClick={() => setListingToDelete(null)} className="w-fit px-8 rounded-full h-12 text-white hover:text-white hover:bg-white/20 dark:hover:bg-white/10 outline-none font-medium">{t('profile.del_cancel')}</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="w-fit px-8 rounded-full h-12 outline-none font-medium">{t('profile.del_confirm')}</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}