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
      // Clean up state so refresh doesn't force it again
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
      showError("Erreur");
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
      <div className="min-h-screen bg-transparent text-white transition-colors duration-500">
        <SolarSystem />
        <Navbar />
        <main className="relative z-10 pt-[20vh] pb-20 max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-16">
            <Skeleton className="w-28 h-28 rounded-full bg-white/10 shrink-0" />
            <div className="flex-1 w-full space-y-6">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <Skeleton className="h-10 w-[250px] bg-white/10" />
                <div className="flex justify-center md:justify-end gap-3">
                  <Skeleton className="h-10 w-10 rounded-full bg-white/10" />
                  <Skeleton className="h-10 w-[120px] rounded-full bg-white/10" />
                </div>
              </div>
              <div className="flex justify-center md:justify-start gap-6">
                <Skeleton className="h-8 w-[80px] bg-white/5" />
                <Skeleton className="h-8 w-[80px] bg-white/5" />
                <Skeleton className="h-8 w-[80px] bg-white/5" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-4 w-full max-w-xl bg-white/5" />
                <Skeleton className="h-4 w-3/4 max-w-lg bg-white/5" />
              </div>
            </div>
          </div>
          
          <div className="flex gap-8 mb-10 border-b border-white/10 pb-4">
            <Skeleton className="h-6 w-[100px] bg-white/10" />
            <Skeleton className="h-6 w-[100px] bg-white/5" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[1, 2].map(i => <Skeleton key={i} className="h-[380px] rounded-3xl bg-white/5" />)}
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
    <div className="min-h-screen bg-transparent text-white transition-colors duration-500">
      <SolarSystem />
      <Navbar />

      <main className="relative z-10 pt-[20vh] pb-20 max-w-5xl mx-auto px-6">
        
        {/* Saturn — top-right decorative, far from content */}
        <div className="fixed top-[8%] right-[-5%] w-[380px] z-0 pointer-events-none hidden xl:block">
          <img src="/saturn.png" alt="Saturn" className="w-full h-auto" />
        </div>
        
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-16">
          <Avatar className="w-28 h-28 border border-white/10 shrink-0">
            <AvatarImage src={metadata.avatar_url} className="object-cover" />
            <AvatarFallback className="bg-white/10 text-white/50 text-3xl font-light">{fullName.charAt(0)}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 text-center md:text-left w-full">
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 justify-between mb-4">
              <h1 className="text-3xl sm:text-4xl font-light leading-none truncate text-white flex items-center gap-2">
                {fullName}
                <VerifiedBadge kycStatus={targetUser.kyc_status} size="lg" />
              </h1>
              
              <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
                {isOwnProfile && (
                  <button 
                    onClick={handlePremiumClick}
                    className="px-6 h-10 rounded-full liquid-glass bg-primary/20 border-primary/40 text-white hover:bg-primary/30 hover:border-primary/60 transition-all duration-500 text-xs font-medium tracking-wide uppercase"
                  >
                    {t('nav.premium')}
                  </button>
                )}

                <button onClick={() => { navigator.clipboard.writeText(window.location.href); showSuccess(t('profile.copied')); }} className="p-2 text-white/60 hover:text-white transition-colors" title="Partager le profil">
                  <Share className="w-5 h-5" />
                </button>
                
                {!isOwnProfile && (
                  <>
                    {connectionStatus === 'none' && (
                      <Button onClick={handleConnect} variant="outline" className="rounded-full h-10 px-4 border-white/10 bg-transparent text-white hover:bg-white/10 transition-all">
                        <UserPlus className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">{t('profile.connect')}</span>
                      </Button>
                    )}
                    {connectionStatus === 'pending_sent' && (
                      <Button onClick={() => handleDeclineOrRemove(false, connectionId)} variant="outline" className="rounded-full h-10 px-4 border-white/10 bg-transparent text-white/60 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all group">
                        <Clock className="w-4 h-4 sm:mr-2 group-hover:hidden" />
                        <XIcon className="w-4 h-4 sm:mr-2 hidden group-hover:block" />
                        <span className="hidden sm:inline group-hover:hidden">{t('profile.pending')}</span>
                        <span className="hidden sm:group-hover:inline">{t('profile.cancel')}</span>
                      </Button>
                    )}
                    {connectionStatus === 'pending_received' && (
                      <div className="flex gap-2">
                        <Button onClick={() => handleAccept(connectionId)} className="rounded-full h-10 px-4 bg-primary text-white hover:bg-primary/90 transition-all border-none">
                          <Check className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">{t('profile.accept')}</span>
                        </Button>
                        <Button onClick={() => handleDeclineOrRemove(true, connectionId)} variant="outline" className="rounded-full h-10 px-4 border-white/10 bg-transparent text-white hover:bg-red-500/10 hover:text-red-400 transition-all">
                          <XIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    {connectionStatus === 'connected' && (
                      <Button onClick={() => handleDeclineOrRemove(false, connectionId)} variant="outline" className="rounded-full h-10 px-4 border-primary/50 bg-transparent text-primary hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all group">
                        <UserCheck className="w-4 h-4 sm:mr-2 group-hover:hidden" />
                        <UserMinus className="w-4 h-4 sm:mr-2 hidden group-hover:block" />
                        <span className="hidden sm:inline group-hover:hidden">{t('profile.connected')}</span>
                        <span className="hidden sm:group-hover:inline">{t('profile.remove')}</span>
                      </Button>
                    )}
                    
                    <Button onClick={handleContact} className="rounded-full h-10 px-6 font-medium text-sm bg-white text-black hover:bg-white/90 border-none">{t('profile.contact')}</Button>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 sm:gap-8 text-white/60 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-light text-white">{listings.length}</span>
                <span className="text-[10px] uppercase tracking-widest font-medium">{t('profile.listings')}</span>
              </div>
              <div className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors" onClick={() => setActiveTab('relations')}>
                <span className="text-2xl font-light text-white">{connectionsList.length}</span>
                <span className="text-[10px] uppercase tracking-widest font-medium flex items-center gap-1.5"><Users className="w-3 h-3"/> {t('profile.relations')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-light text-white">{listingViewsCount}</span>
                <span className="text-[10px] uppercase tracking-widest font-medium flex items-center gap-1.5"><Store className="w-3 h-3"/> Vues (Annonces)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-light text-white">{profileViewsCount || 0}</span>
                <span className="text-[10px] uppercase tracking-widest font-medium flex items-center gap-1.5"><Eye className="w-3 h-3"/> Vues (Profil)</span>
              </div>
            </div>

            {metadata.bio && <p className="text-sm font-light text-white/60 leading-relaxed max-w-2xl mb-4">{metadata.bio}</p>}

            {(metadata.show_email && metadata.contact_email) || (metadata.show_phone && metadata.phone) ? (
              <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
                {metadata.show_email && metadata.contact_email && (
                  <a href={`mailto:${metadata.contact_email}`} className="flex items-center gap-2 px-4 py-2 rounded-full liquid-glass bg-white/5 border-white/10 hover:bg-white/10 text-xs font-light text-white transition-all w-fit group !shadow-none">
                    <Mail className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" /> {metadata.contact_email}
                  </a>
                )}
                {metadata.show_phone && metadata.phone && (
                  <a href={`tel:${metadata.phone}`} className="flex items-center gap-2 px-4 py-2 rounded-full liquid-glass bg-white/5 border-white/10 hover:bg-white/10 text-xs font-light text-white transition-all w-fit group !shadow-none">
                    <Phone className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" /> {metadata.phone}
                  </a>
                )}
              </div>
            ) : null}

          </div>
        </div>

        {/* KYC Section — Own Profile Only */}
        {isOwnProfile && (
          <div className="mb-10">
            {(!targetUser.kyc_status || targetUser.kyc_status === 'none') && (
              <div className="liquid-glass rounded-2xl p-6 border border-white/10 flex flex-col sm:flex-row items-center gap-6 !shadow-none">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <BadgeCheck className="w-7 h-7 text-blue-500" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-sm font-medium text-white mb-1">{t('kyc.request_title')}</h3>
                  <p className="text-xs text-white/50 font-light leading-relaxed">{t('kyc.request_desc')}</p>
                </div>
                <label className="shrink-0 cursor-pointer">
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
                        showError('Upload error');
                      }
                      setKycUploading(false);
                    }}
                  />
                  <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-all cursor-pointer">
                    {kycUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {t('kyc.request_btn')}
                  </span>
                </label>
              </div>
            )}
            {targetUser.kyc_status === 'pending' && (
              <div className="liquid-glass rounded-2xl p-5 border border-amber-500/20 flex items-center gap-4 !shadow-none">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <p className="text-xs text-amber-300/80 font-light">{t('kyc.pending_msg')}</p>
              </div>
            )}
            {targetUser.kyc_status === 'verified' && (
              <div className="liquid-glass rounded-2xl p-5 border border-blue-500/20 flex items-center gap-4 !shadow-none">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <BadgeCheck className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-xs text-blue-300/80 font-light">{t('kyc.verified_msg')}</p>
              </div>
            )}
            {targetUser.kyc_status === 'rejected' && (
              <div className="liquid-glass rounded-2xl p-5 border border-red-500/20 flex items-center gap-4 !shadow-none">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                  <XIcon className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-red-300/80 font-light">{t('kyc.rejected_msg')}</p>
                </div>
                <label className="shrink-0 cursor-pointer">
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
                        showError('Upload error');
                      }
                      setKycUploading(false);
                    }}
                  />
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium transition-all cursor-pointer">
                    {kycUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {t('kyc.request_btn')}
                  </span>
                </label>
              </div>
            )}
          </div>
        )}

        <div className="border-b border-white/10 flex flex-wrap gap-6 sm:gap-8 mb-10 overflow-x-auto custom-scrollbar">
          <button onClick={() => setActiveTab('listings')} className={`pb-4 text-sm font-medium tracking-wide transition-colors relative whitespace-nowrap ${activeTab === 'listings' ? 'text-white' : 'text-white/60 hover:text-white/80'}`}>
            {t('profile.tab_listings')}
            {activeTab === 'listings' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-px bg-white" />}
          </button>
          <button onClick={() => setActiveTab('relations')} className={`pb-4 text-sm font-medium tracking-wide transition-colors relative whitespace-nowrap ${activeTab === 'relations' ? 'text-white' : 'text-white/60 hover:text-white/80'}`}>
            {t('profile.tab_relations')} {pendingRequests.length > 0 && <span className="ml-1 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingRequests.length}</span>}
            {activeTab === 'relations' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-px bg-white" />}
          </button>
          {isOwnProfile && (
            <button onClick={() => setActiveTab('favorites')} className={`pb-4 text-sm font-medium tracking-wide transition-colors relative whitespace-nowrap ${activeTab === 'favorites' ? 'text-white' : 'text-white/60 hover:text-white/80'}`}>
              {t('profile.tab_favorites')}
              {activeTab === 'favorites' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-px bg-white" />}
            </button>
          )}
        </div>

        {activeTab === 'relations' ? (
          <div className="space-y-12">
            
            {isOwnProfile && pendingRequests.length > 0 && (
              <section>
                <h3 className="text-sm uppercase tracking-widest text-primary font-medium mb-6 flex items-center gap-2"><Clock className="w-4 h-4"/> {t('profile.pending_req')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingRequests.map(req => (
                    <div key={req.id} className="liquid-glass bg-white/5 rounded-full p-2 pr-6 flex items-center gap-4 hover:bg-white/10 transition-all border-primary/20 !shadow-none">
                      <Avatar className="w-10 h-10 border border-white/10 cursor-pointer bg-white/10" onClick={() => navigate(`/profile/${req.profile?.id}`)}>
                        <AvatarImage src={req.profile?.avatar_url} />
                        <AvatarFallback className="bg-transparent text-white/50">{req.profile?.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/profile/${req.profile?.id}`)}>
                        <h4 className="font-medium truncate text-white">{req.profile?.full_name}</h4>
                        <p className="text-xs text-white/60 truncate">{req.profile?.bio || t('profile.wants_to_join')}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleAccept(req.id)} className="w-8 h-8 rounded-full bg-primary/20 text-primary hover:bg-primary hover:text-white flex items-center justify-center transition-all">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeclineOrRemove(true, req.id)} className="w-8 h-8 rounded-full bg-white/10 text-white/60 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-all">
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
                <h3 className="text-sm uppercase tracking-widest text-white/60 font-medium mb-6 flex items-center gap-2"><Users className="w-4 h-4"/> {t('profile.network')}</h3>
              )}
              {connectionsList.length === 0 ? (
                <div className="py-20 text-center border border-white/10 rounded-3xl bg-white/5">
                  <Users className="w-12 h-12 text-white/30 mx-auto mb-4" />
                  <p className="font-light text-white/60 text-lg">{t('profile.no_relations')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {connectionsList.map(profile => (
                    <div key={profile.id} onClick={() => navigate(`/profile/${profile.id}`)} className="liquid-glass bg-white/5 rounded-full p-2 pr-6 flex items-center gap-4 hover:bg-white/10 hover:border-white/30 transition-all cursor-pointer group !shadow-none">
                      <Avatar className="w-10 h-10 border border-white/10 group-hover:scale-105 transition-transform bg-white/10">
                        <AvatarImage src={profile.avatar_url} />
                        <AvatarFallback className="bg-transparent text-white/50">{profile.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate text-white group-hover:text-primary transition-colors">{profile.full_name}</h4>
                        <p className="text-xs text-white/60 truncate mt-0.5">{profile.bio || t('profile.member')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {displayedItems.length === 0 ? (
              <div className="col-span-full py-20 text-center">
                <p className="font-light text-white/60 text-lg">{t('profile.nothing_to_show')}</p>
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
                      <button className="p-2 text-white/60 hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); setListingToEdit(item); setIsEditFormOpen(true); }}><Edit className="w-4 h-4" /></button>
                      <button className="p-2 text-white/60 hover:text-red-400 transition-colors" onClick={(e) => { e.stopPropagation(); setListingToDelete(item); }}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ) : undefined}
                />
              ))
            )}
          </div>
        )}

      </main>

      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} listing={chatListing} user={currentUser} />
      <ListingForm isOpen={isEditFormOpen} onClose={() => setIsEditFormOpen(false)} onSuccess={() => refetch()} listingToEdit={listingToEdit} />

      <AnimatePresence>
        {listingToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setListingToDelete(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative liquid-glass rounded-3xl p-10 max-w-md w-full text-center border-none bg-[#2b2a2f] !shadow-none">
              <h3 className="text-2xl font-light mb-3 text-white">{t('profile.del_title')}</h3>
              <div className="flex justify-center gap-4 mt-8">
                <Button variant="ghost" onClick={() => setListingToDelete(null)} className="w-fit px-8 rounded-full h-12 text-white/60 hover:text-white hover:bg-white/10">{t('profile.del_cancel')}</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="w-fit px-8 rounded-full h-12 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all border-none">{t('profile.del_confirm')}</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}