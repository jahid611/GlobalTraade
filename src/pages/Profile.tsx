"use client";

import { CountryFlag } from '@/components/CountryFlag';
import React, { useEffect, useMemo, useState } from 'react';
import { countryLabel } from '@/lib/countries';
import type { Listing } from '@/types/domain';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Share, Eye, Heart, Edit, Trash2, Mail, Phone, UserPlus, UserCheck, UserMinus, Clock, Check, X as XIcon, Users, IdCardCheck, Upload, Loader2, Store, Star as StarIcon, UserX, MessageCircle, Settings as SettingsIcon } from '@/components/icons';
import { ROLE_FUNCTION_LABELS } from '@/lib/ranges';
import { usePlan, normalizePlan, isPaidPlan } from '@/services/planService';
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
import { RefusalReason } from '@/components/MemberNotices';
import { useTranslation } from 'react-i18next';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { RatingBadge, RateUserModal } from '@/components/RatingStars';
import { ReviewsModal } from '@/components/ReviewsModal';
import { BuyerBadges } from '@/components/BuyerBadges';
import { initNativeFeel } from '@/utils/nativeFeel';
import { SURFACE, ShowAllButton, COLOR_INFO, COLOR_WARN, COLOR_BAD } from '@/components/settings/ui';
import { BuyerProjectCard } from '@/components/profile/BuyerProjectCard';
import { ProjectFitCard, type FitCardListing } from '@/components/profile/ProjectFitCard';
import { parseBuyerProject, isEmptyProject } from '@/lib/buyerProject';

initNativeFeel();

// Justificatif d'identité (KYC) : formats acceptés → extension normalisée en
// minuscules (l'admin n'ouvre que jpg/jpeg/png/pdf/webp), 10 Mo maximum.
const KYC_EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};
const KYC_KNOWN_EXTS = ['jpg', 'jpeg', 'png', 'pdf', 'webp'];
const KYC_MAX_BYTES = 10 * 1024 * 1024;

// Profils déjà comptés comme « vus » pendant cette session de navigation
// (clé visiteur:profil) : une vue par profil consulté, pas une par montage.
const countedProfileViews = new Set<string>();

// Pleine largeur, comme la marketplace.
const PAGE_SHELL = "relative z-10 pt-[calc(var(--nav-clearance)+2.5rem)] pb-24 px-4 sm:px-6 lg:px-10 2xl:px-14 w-full";
// Chaque liste montre quelques éléments, puis « Voir tout (N) ».
const LIST_LIMIT = 6;

/** Valeur enregistrée du type de compte → clé de son libellé traduit. Une valeur inconnue n'est pas affichée. */
const ACCOUNT_TYPE_KEYS: Record<string, string> = {
  repreneur: 'onb.type_buyer', cedant: 'onb.type_seller', investisseur: 'onb.type_investor', conseil: 'onb.type_advisor',
};

export default function Profile() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser, loading: authLoading } = useAuth();
  const { plan: myPlan } = usePlan(currentUser?.id);
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();

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
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  // Listes dépliées par « Voir tout »
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});
  const toggleAll = (key: string) => setShowAll((s) => ({ ...s, [key]: !s[key] }));

  // Vue de profil : une seule fois par profil consulté, jamais sur le sien.
  // (Dépend de l'id, pas de la référence de `currentUser` qui change souvent.)
  const viewerId = currentUser?.id;
  useEffect(() => {
    if (!viewerId || !targetId || targetId === viewerId) return;
    const viewKey = `${viewerId}:${targetId}`;
    if (countedProfileViews.has(viewKey)) return;
    countedProfileViews.add(viewKey);
    const registerView = async () => {
      const { error } = await supabase.from('profile_views').insert([{ profile_id: targetId, viewer_id: viewerId }]);
      if (error) countedProfileViews.delete(viewKey);
      else queryClient.invalidateQueries({ queryKey: ['profile', targetId] });
    };
    registerView();
  }, [targetId, viewerId]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['profile', targetId, currentUser?.id],
    queryFn: async () => {
      if (!targetId) throw new Error("No target ID");

      const [ { data: profileData }, { data: listingsData }, { data: favs } ] = await Promise.all([
        supabase.from('safe_profiles').select('*').eq('id', targetId).single(),
        // Vue masquante : les financiers d'autrui restent bridés côté serveur
        supabase.from('listings_secure').select('*').eq('owner_id', targetId).order('created_at', { ascending: false }),
        isOwnProfile ? supabase.from('favorites').select('listing_id').eq('user_id', targetId) : Promise.resolve({ data: null })
      ]);
      // Compteur agrégé exposé par safe_profiles (les lignes profile_views ne
      // sont plus lisibles publiquement — le nombre, jamais qui)
      const profileViewsCount = profileData?.profile_views_count || 0;

      const targetUser = profileData ? {
        id: targetId,
        kyc_status: profileData.kyc_status || 'none',
        user_metadata: { ...profileData }
      } : null;

      const listings = (listingsData || []).map(l => ({ ...l, view_count: l.view_count || 0 }));
      const favIds = (favs || []).map((f: { listing_id: string }) => f.listing_id).filter(Boolean);
      const { data: favListings } = favIds.length
        ? await supabase.from('listings_secure').select('*').in('id', favIds)
        : { data: [] as any[] };
      const myFavorites = (favListings || []).map((l: Listing) => ({ ...l, view_count: l.view_count || 0 }));

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
        // Deux lignes peuvent exister (une demande dans chaque sens) : pas de
        // `maybeSingle` qui échouerait — on en lit quelques-unes et on garde
        // la relation acceptée en priorité.
        const { data: conns } = await supabase
          .from('connections')
          .select('*')
          .or(`and(requester_id.eq.${currentUser.id},recipient_id.eq.${targetId}),and(requester_id.eq.${targetId},recipient_id.eq.${currentUser.id})`)
          .limit(2);
        const conn = (conns || []).find((c) => c.status === 'accepted') || (conns || [])[0];

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

  // Projet de reprise du membre affiché, lu par le modèle commun (anciennes
  // saisies libres comprises) à partir de ce que la vue publique expose déjà.
  const buyerProject = useMemo(() => parseBuyerProject(data?.targetUser?.user_metadata), [data?.targetUser]);

  // Un vendeur qui regarde un repreneur : ses propres annonces, pour dire en
  // quoi le projet leur correspond. Rien de plus n'est lu sur le membre affiché.
  const { data: viewerListings = [] } = useQuery<FitCardListing[]>({
    queryKey: ['profile-fit-listings', currentUser?.id],
    queryFn: async () => {
      const { data: mine } = await supabase.from('listings_secure')
        .select('id, name, industry, address, price')
        .eq('owner_id', currentUser!.id)
        .order('created_at', { ascending: false });
      return (mine || []) as FitCardListing[];
    },
    enabled: !!currentUser?.id && !isOwnProfile && !isEmptyProject(buyerProject),
  });

  const connectionError = () => showError(t('profile.connection_error', "L'action n'a pas pu être enregistrée. Réessayez."));

  const handleConnect = async () => {
    if (!currentUser) return navigate('/login', { state: { from: location } });
    if (!data?.targetUser) return;
    const { error } = await supabase.from('connections').insert({ requester_id: currentUser.id, recipient_id: data.targetUser.id });
    if (error) { connectionError(); return; }
    showSuccess(t('profile.req_sent'));
    refetch();
  };

  const handleAccept = async (connId: string | null) => {
    if (!connId) return;
    // `.select('id')` : la RLS peut ne modifier aucune ligne sans renvoyer d'erreur.
    const { data: updated, error } = await supabase.from('connections').update({ status: 'accepted' }).eq('id', connId).select('id');
    if (error || !updated?.length) { connectionError(); refetch(); return; }
    showSuccess(t('profile.req_accepted'));
    refetch();
  };

  const handleDeclineOrRemove = async (isDecline = false, connId: string | null) => {
    if (!connId) return;
    const { data: removed, error } = await supabase.from('connections').delete().eq('id', connId).select('id');
    if (error || !removed?.length) { connectionError(); refetch(); return; }
    showSuccess(isDecline ? t('profile.req_declined') : t('profile.rel_removed'));
    refetch();
  };

  const handleContact = () => {
    if (!currentUser) return navigate('/login', { state: { from: location } });
    if (data?.listings && data.listings.length > 0) {
      setChatListing(data.listings[0]);
      setIsChatOpen(true);
    }
    // Refus (aucune annonce à laquelle rattacher la conversation) : pas un succès.
    else showError(t('profile.no_listing'));
  };

  // Envoi du justificatif d'identité (KYC) — utilisé par les deux encarts
  // (première demande et nouvelle demande après un refus).
  const handleKycUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = ''; // permet de re-sélectionner le même fichier
    if (!file || !currentUser || kycUploading) return;

    const ext = KYC_EXT_BY_TYPE[file.type];
    if (!ext) {
      showError(t('kyc.bad_type', 'Format non accepté. Envoyez une image (JPG, PNG, WebP) ou un PDF.'));
      return;
    }
    if (file.size > KYC_MAX_BYTES) {
      showError(t('kyc.too_large', 'Fichier trop volumineux (10 Mo maximum).'));
      return;
    }

    setKycUploading(true);
    try {
      const dir = `kyc/${currentUser.id}`;
      // `upload` ne lève pas : il renvoie `{ error }`.
      const { error: uploadError } = await supabase.storage.from('documents')
        .upload(`${dir}/document.${ext}`, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      // Anciens justificatifs d'une autre extension : supprimés pour que l'admin
      // ouvre bien le dernier document envoyé (échec non bloquant).
      const stale = KYC_KNOWN_EXTS.filter((x) => x !== ext).map((x) => `${dir}/document.${x}`);
      await supabase.storage.from('documents').remove(stale).catch(() => undefined);

      // Le statut ne passe à « en attente » qu'APRÈS un envoi réussi, et on
      // vérifie la valeur réellement enregistrée (un déclencheur peut la refuser).
      const { data: updated, error: statusError } = await supabase.from('profiles')
        .update({ kyc_status: 'pending' }).eq('id', currentUser.id).select('kyc_status');
      if (statusError) throw statusError;
      if (updated?.[0]?.kyc_status !== 'pending') throw new Error('kyc_status unchanged');

      showSuccess(t('kyc.submitted_success'));
      refetch();
    } catch {
      showError(t('kyc.upload_error', 'Erreur lors de l\'upload.'));
    } finally {
      setKycUploading(false);
    }
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

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-transparent dark:bg-[#2b2a2f] flex flex-col text-white font-sans selection:bg-primary/30 overflow-x-hidden">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>
        <SolarSystem />
        <Navbar />
        <main className={`${PAGE_SHELL} flex-1`}>
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-[8vh]">
            <Skeleton className="w-28 h-28 rounded-full bg-white/10 shrink-0" />
            <div className="flex-1 w-full space-y-6">
              <Skeleton className="h-12 w-[350px] max-w-full bg-white/10" />
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

  // Profil inexistant (ou illisible) : un écran clair, pas un squelette sans fin.
  if (!data?.targetUser) {
    return (
      <div className="min-h-screen bg-transparent dark:bg-[#2b2a2f] flex flex-col text-white font-sans selection:bg-primary/30 overflow-x-hidden">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>
        <SolarSystem />
        <Navbar />
        <main className="relative z-10 pt-[25vh] pb-20 max-w-xl mx-auto px-[6vw] sm:px-8 w-full flex-1 text-center">
          <div className="liquid-glass dark:bg-white/[0.02] border border-white/30 dark:border-white/10 rounded-[2rem] p-10 sm:p-14">
            <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-6">
              <UserX className="w-8 h-8 text-white/70" />
            </div>
            <h1 className="text-3xl font-light mb-3 text-white">
              {isError ? t('profile.load_error_title', 'Profil indisponible') : t('profile.not_found_title', 'Profil introuvable')}
            </h1>
            <p className="text-white/60 font-light text-sm leading-relaxed mb-8">
              {isError
                ? t('profile.load_error_desc', "Ce profil n'a pas pu être chargé. Vérifiez votre connexion puis réessayez.")
                : t('profile.not_found_desc', "Ce profil n'existe pas ou n'est plus disponible.")}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {isError && (
                <Button onClick={() => refetch()} className="rounded-full h-12 px-8 bg-primary hover:bg-primary/90 text-white font-medium outline-none">
                  {t('common.retry', 'Réessayer')}
                </Button>
              )}
              <Button onClick={() => navigate('/marketplace')} variant="outline" className="rounded-full h-12 px-8 border-white/30 dark:border-white/10 liquid-glass bg-transparent text-white hover:bg-white/20 outline-none font-medium">
                {t('profile.back_marketplace', 'Retour à la marketplace')}
              </Button>
            </div>
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

  const seeAll = (n: number) => t('acc.see_all', { defaultValue: 'Voir tout ({{n}})', n: n }) as string;
  const seeLess = t('acc.see_less', 'Voir moins') as string;
  const shownItems = showAll[activeTab] ? displayedItems : displayedItems.slice(0, LIST_LIMIT);
  const shownRelations = showAll.relations ? connectionsList : connectionsList.slice(0, LIST_LIMIT);
  const shownPending = showAll.pending ? pendingRequests : pendingRequests.slice(0, LIST_LIMIT);

  const openTab = (tab: 'listings' | 'favorites' | 'relations') => {
    setActiveTab(tab);
    document.getElementById('profil-listes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Identité professionnelle — collectée à l'inscription, affichée en une
  // ligne : qui c'est, pour quelle société, depuis où.
  // Une seule ligne de texte, sans redite : le type de compte n'est pas répété quand la
  // pastille du repreneur le dit déjà (« Repreneur individuel »), et le pays est un drapeau
  // à côté du nom plutôt qu'une pastille de plus.
  const buyerBadgeShown = !!metadata.buyer_type;
  const identityBits = [
    !buyerBadgeShown && ACCOUNT_TYPE_KEYS[metadata.account_type] && (t(ACCOUNT_TYPE_KEYS[metadata.account_type]) as string),
    metadata.role_function && (t(`onb.role_${metadata.role_function}`, ROLE_FUNCTION_LABELS[metadata.role_function] || metadata.role_function) as string),
    metadata.company_name && [metadata.company_name, metadata.legal_form].filter(Boolean).join(' · '),
  ].filter(Boolean) as string[];
  const countryName = countryLabel(metadata.country, i18n.language);

  // Coordonnées publiques : uniquement si le membre est en formule payante
  const showContact = isPaidPlan(normalizePlan(metadata.plan_type)) &&
    ((metadata.show_email && metadata.contact_email) || (metadata.show_phone && metadata.phone));

  const actionBtn = "inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-full text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50";
  const ghostBtn = `${actionBtn} bg-white/[0.06] hover:bg-white/[0.12] border border-white/20 text-white`;
  const statusPill = "inline-flex items-center gap-2 min-h-[48px] px-4 rounded-full text-sm text-white/85 bg-white/[0.04] border border-white/10";

  const stats = [
    { icon: Store, value: listings.length, label: t('profile.listings'), onClick: () => openTab('listings') },
    { icon: Users, value: connectionsList.length, label: t('profile.relations'), onClick: () => openTab('relations') },
    { icon: Eye, value: listingViewsCount, label: t('acc.stat_listing_views', 'Vues des annonces') },
    { icon: Eye, value: profileViewsCount || 0, label: t('acc.stat_profile_views', 'Vues du profil') },
  ];

  const tabs = [
    { id: 'listings' as const, label: isOwnProfile ? t('acc.tab_my_listings', 'Mes annonces') : t('profile.listings'), count: listings.length },
    { id: 'relations' as const, label: isOwnProfile ? t('acc.tab_my_relations', 'Mes relations') : t('profile.relations'), count: connectionsList.length, alert: pendingRequests.length },
    ...(isOwnProfile ? [{ id: 'favorites' as const, label: t('acc.tab_my_favorites', 'Mes favoris'), count: myFavorites.length }] : []),
  ];

  // Partager : la feuille de partage de l'appareil (Messages, Mail, WhatsApp, AirDrop…).
  // Là où elle n'existe pas (certains navigateurs d'ordinateur), on copie le lien.
  const handleShare = async () => {
    // toujours l'adresse du profil affiché : « /profile » seul renverrait chacun vers le sien
    const url = `${window.location.origin}/profile/${targetUser.id}`;
    const name = fullName;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: name, text: t('profile.share_text', { name, defaultValue: 'Le profil de {{name}} sur Globly' }) as string, url });
      } catch (err) {
        // fermeture de la feuille sans rien envoyer : ce n'est pas une erreur
        if ((err as DOMException)?.name !== 'AbortError') showError(t('profile.share_error', "Le partage n'a pas pu s'ouvrir. Réessayez."));
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showSuccess(t('profile.copied'));
    } catch {
      showError(t('profile.share_error', "Le partage n'a pas pu s'ouvrir. Réessayez."));
    }
  };

  const kycUploadButton = (primary: boolean) => (
    <label className="shrink-0 cursor-pointer w-full sm:w-auto">
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        disabled={kycUploading}
        onChange={handleKycUpload}
      />
      <span
        className={`${actionBtn} w-full cursor-pointer text-white ${primary ? '' : 'bg-white/[0.06] hover:bg-white/[0.12] border border-white/20'}`}
        style={primary ? { background: '#3b82f6', boxShadow: '0 0 20px rgba(59,130,246,0.4)' } : undefined}
      >
        {kycUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {t('kyc.request_btn')}
      </span>
    </label>
  );

  const kycBlock = (tone: { rgb: string; text: string }, Icon: React.ElementType, body: React.ReactNode, action?: React.ReactNode) => (
    <section className={`${SURFACE} p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5`} style={{ borderColor: `rgba(${tone.rgb},0.35)` }}>
      <span className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border" style={{ background: `rgba(${tone.rgb},0.15)`, borderColor: `rgba(${tone.rgb},0.35)`, color: tone.text }}>
        <Icon className="w-6 h-6" />
      </span>
      <div className="flex-1 min-w-0">{body}</div>
      {action}
    </section>
  );

  const emptyState = (Icon: React.ElementType, title: string, desc?: string, action?: { label: string; onClick: () => void }) => (
    <div className="py-12 px-5 text-center rounded-2xl bg-white/[0.03] border border-dashed border-white/15">
      <Icon className="w-11 h-11 text-white/35 mx-auto mb-4" />
      <p className="text-lg text-white font-light">{title}</p>
      {desc && <p className="text-sm text-white/60 font-light mt-2 max-w-xl mx-auto leading-relaxed">{desc}</p>}
      {action && (
        <button type="button" onClick={action.onClick} className={`${actionBtn} mt-5 bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_rgba(89,85,232,0.45)]`}>
          {action.label}
        </button>
      )}
    </div>
  );

  const personRow = "flex items-center gap-4 min-h-[72px] rounded-2xl bg-white/[0.04] border border-white/10 p-3 pr-4 transition-colors";

  return (
    <div className="min-h-screen bg-transparent dark:bg-[#2b2a2f] text-white transition-colors duration-500 selection:bg-primary/30 overflow-x-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>
      <SolarSystem />
      <Navbar />

      <main className={`${PAGE_SHELL} space-y-6`}>

        {/* ── En-tête : qui est ce membre, en un coup d'œil ── */}
        <section className={`${SURFACE} relative overflow-hidden p-5 sm:p-8`}>
          {/* Saturne reste en fond, derrière le contenu : elle ne recouvre jamais le texte. */}
          <motion.div
            aria-hidden="true"
            animate={{ y: [0, -10, 0], rotate: [0, 3, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-8 -right-10 w-[150px] sm:w-[220px] xl:w-[300px] z-0 pointer-events-none opacity-10"
          >
            <img src="/saturn.png" alt="" className="w-full h-auto" />
          </motion.div>

          <div className="relative z-10 flex flex-col md:flex-row gap-5 md:gap-7">
            <Avatar className="w-24 h-24 sm:w-28 sm:h-28 border-2 border-white/40 dark:border-white/10 shrink-0 shadow-xl">
              <AvatarImage src={metadata.avatar_url} className="object-cover" />
              <AvatarFallback className="liquid-glass bg-white/20 dark:bg-white/10 text-white text-4xl font-light">{fullName.charAt(0)}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                <div className="min-w-0">
                  <h1 className="text-3xl md:text-4xl font-light leading-tight tracking-tight text-white flex flex-wrap items-center gap-x-3 gap-y-1 break-words [overflow-wrap:anywhere]">
                    {fullName}
                    {countryName && (
                      <span title={countryName} className="inline-flex text-[0.62em]">
                        <CountryFlag code={metadata.country} />
                        <span className="sr-only">{countryName}</span>
                      </span>
                    )}
                    <VerifiedBadge kycStatus={targetUser.kyc_status} size="lg" />
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 mt-2.5">
                    {/* La note ouvre la liste des avis (et, sur son propre profil, permet d'y répondre) */}
                    <RatingBadge userId={targetId} onOpen={() => setIsReviewsOpen(true)} />
                    <BuyerBadges userId={targetId} />
                  </div>
                  {identityBits.length > 0 && (
                    <p className="mt-3 text-[0.95rem] text-white/85 break-words [overflow-wrap:anywhere]">{identityBits.join(' · ')}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 xl:justify-end xl:max-w-[52%] shrink-0">
                  {!isOwnProfile && (
                    <>
                      <button onClick={handleContact} className={`${actionBtn} px-7 bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_rgba(89,85,232,0.55)]`}>
                        <MessageCircle className="w-4 h-4 shrink-0" /> {t('profile.contact')}
                      </button>
                      {connectionStatus === 'none' && (
                        <button onClick={handleConnect} className={ghostBtn}>
                          <UserPlus className="w-4 h-4 shrink-0" /> {t('profile.connect')}
                        </button>
                      )}
                      {connectionStatus === 'pending_sent' && (
                        <>
                          <span className={statusPill}><Clock className="w-4 h-4 shrink-0" /> {t('profile.pending')}</span>
                          <button onClick={() => handleDeclineOrRemove(false, connectionId)} className={ghostBtn}>
                            <XIcon className="w-4 h-4 shrink-0" /> {t('acc.cancel_request', 'Annuler ma demande')}
                          </button>
                        </>
                      )}
                      {connectionStatus === 'pending_received' && (
                        <>
                          <button onClick={() => handleAccept(connectionId)} className={`${actionBtn} bg-primary hover:bg-primary/90 text-white`}>
                            <Check className="w-4 h-4 shrink-0" /> {t('acc.accept_request', 'Accepter sa demande')}
                          </button>
                          <button onClick={() => handleDeclineOrRemove(true, connectionId)} className={ghostBtn}>
                            <XIcon className="w-4 h-4 shrink-0" /> {t('profile.decline')}
                          </button>
                        </>
                      )}
                      {connectionStatus === 'connected' && (
                        <>
                          <span className={statusPill} style={{ borderColor: 'rgba(89,85,232,0.6)' }}><UserCheck className="w-4 h-4 shrink-0" /> {t('profile.connected')}</span>
                          <button onClick={() => handleDeclineOrRemove(false, connectionId)} className={ghostBtn}>
                            <UserMinus className="w-4 h-4 shrink-0" /> {t('acc.remove_relation', 'Retirer de mes relations')}
                          </button>
                        </>
                      )}
                      <button onClick={() => setIsRatingOpen(true)} className={ghostBtn}>
                        <StarIcon className="w-4 h-4 shrink-0" /> {t('rating.rate', 'Noter')}
                      </button>
                    </>
                  )}

                  {/* Téléphone : un simple lien (sans fond ni contour), pour ne pas concurrencer le reste de l'en-tête */}
                  {isOwnProfile && (
                    <button onClick={() => navigate('/settings')} className={`${ghostBtn} max-sm:bg-transparent max-sm:border-transparent max-sm:px-2 max-sm:font-normal max-sm:text-white/85 max-sm:active:bg-white/[0.08]`}>
                      <SettingsIcon className="w-4 h-4 shrink-0" /> {t('acc.edit_profile', 'Modifier mon profil')}
                    </button>
                  )}

                  {/* Téléphone : l'icône seule, sans fond ni contour, comme « Modifier mon profil » (le mot reste lu par les lecteurs d'écran) */}
                  <button onClick={handleShare} className={`${ghostBtn} max-sm:w-12 max-sm:px-0 max-sm:shrink-0 max-sm:bg-transparent max-sm:border-transparent max-sm:text-white/70 max-sm:active:bg-white/[0.08]`}>
                    <Share className="w-4 h-4 shrink-0" /> <span className="max-sm:sr-only">{t('acc.share', 'Partager')}</span>
                  </button>

                  {isOwnProfile && myPlan === 'free' && (
                    <button onClick={handlePremiumClick} className={`${actionBtn} max-sm:hidden bg-primary/25 hover:bg-primary/40 border border-primary/50 text-white`}>
                      {t('nav.premium')}
                    </button>
                  )}
                </div>
              </div>

              {metadata.bio && <p className="text-base font-light text-white/85 leading-relaxed max-w-3xl mt-5 whitespace-pre-line break-words">{metadata.bio}</p>}

              {showContact ? (
                <div className="flex flex-wrap gap-3 mt-5">
                  {metadata.show_email && metadata.contact_email && (
                    <a href={`mailto:${metadata.contact_email}`} className={`${ghostBtn} font-light break-all`}>
                      <Mail className="w-4 h-4 text-primary shrink-0" /> {metadata.contact_email}
                    </a>
                  )}
                  {metadata.show_phone && metadata.phone && (
                    <a href={`tel:${metadata.phone}`} className={`${ghostBtn} font-light`}>
                      <Phone className="w-4 h-4 shrink-0" style={{ color: COLOR_INFO.text }} /> {metadata.phone}
                    </a>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {/* Les chiffres du profil */}
          <dl className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 sm:mt-7">
            {stats.map((s, i) => {
              const body = (
                <>
                  <dd className="text-3xl font-light text-white leading-none">{s.value}</dd>
                  <dt className="flex items-center gap-1.5 text-[13px] sm:text-sm text-white/80 sm:text-white/65 mt-2 whitespace-nowrap max-sm:tracking-tight"><s.icon className="w-4 h-4 shrink-0 max-sm:hidden" /> {s.label}</dt>
                </>
              );
              const cls = "flex flex-col text-left rounded-2xl bg-white/[0.04] border border-white/10 px-3 sm:px-4 py-3.5 min-h-[84px] min-w-0";
              return s.onClick
                ? <button key={i} type="button" onClick={s.onClick} className={`${cls} hover:bg-white/[0.08] hover:border-white/25 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50`}>{body}</button>
                : <div key={i} className={cls}>{body}</div>;
            })}
          </dl>
        </section>

        {/* ── Projet de reprise — ce que ce repreneur cherche (utile aux vendeurs) ── */}
        <BuyerProjectCard
          project={buyerProject}
          isOwn={isOwnProfile}
          onEdit={() => navigate('/settings#criteres')}
          onSearch={() => navigate('/marketplace?projet=1')}
        />

        {/* ── Pour un vendeur : ce projet face à ses propres annonces ── */}
        {!isOwnProfile && !isEmptyProject(buyerProject) && viewerListings.length > 0 && (
          <ProjectFitCard project={buyerProject} listings={viewerListings} />
        )}

        {/* ── Vérification d'identité — sur son propre profil uniquement ── */}
        {isOwnProfile && (
          <>
            {(!targetUser.kyc_status || targetUser.kyc_status === 'none') && kycBlock(COLOR_INFO, IdCardCheck, (
              <>
                <h2 className="text-xl font-medium text-white leading-tight">{t('kyc.request_title')}</h2>
                <p className="text-sm sm:text-[0.95rem] text-white/65 font-light leading-relaxed mt-1.5">{t('kyc.request_desc')}</p>
                <p className="text-sm text-white/50 font-light leading-relaxed mt-1.5">{t('acc.kyc_formats', "Envoyez une photo ou un PDF de votre pièce d'identité (10 Mo maximum).")}</p>
              </>
            ), kycUploadButton(true))}
            {targetUser.kyc_status === 'pending' && kycBlock(COLOR_WARN, Clock, (
              <p className="text-base font-light" style={{ color: '#fde68a' }}>{t('kyc.pending_msg')}</p>
            ))}
            {targetUser.kyc_status === 'verified' && kycBlock(COLOR_INFO, IdCardCheck, (
              <p className="text-base text-white font-light">{t('kyc.verified_msg')}</p>
            ))}
            {targetUser.kyc_status === 'rejected' && kycBlock(COLOR_BAD, XIcon, (
              <>
                <p className="text-base text-white font-light">{t('kyc.rejected_msg')}</p>
                <RefusalReason kind="kyc_rejected" />
              </>
            ), kycUploadButton(false))}
          </>
        )}

        {/* ── Annonces, relations, favoris ── */}
        <section id="profil-listes" className={`${SURFACE} p-5 sm:p-8 scroll-mt-[calc(var(--nav-clearance)+1.5rem)]`}>
          <div role="tablist" aria-label={t('acc.tabs_label', 'Contenu du profil') as string} className="flex flex-wrap gap-2 p-1.5 rounded-3xl sm:rounded-full bg-black/30 border border-white/10 w-full sm:w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-full text-sm sm:text-[0.95rem] font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                  activeTab === tab.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/65 hover:text-white'
                }`}
              >
                {tab.label} <span className={activeTab === tab.id ? 'text-white/80' : 'text-white/45'}>({tab.count})</span>
                {!!tab.alert && <span className="text-[13px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#ffffff", color: "#2b2a2f" }} title={t('profile.pending_req') as string}>{tab.alert}</span>}
              </button>
            ))}
          </div>

          <div className="mt-6">
          {activeTab === 'relations' ? (
            <div className="space-y-8">

              {isOwnProfile && pendingRequests.length > 0 && (
                <div>
                  <h2 className="text-lg font-medium text-white flex items-center gap-2"><Clock className="w-5 h-5 text-[#a5b4fc]" /> {t('profile.pending_req')} ({pendingRequests.length})</h2>
                  <p className="text-sm text-white/60 font-light mt-1 mb-4">{t('acc.pending_desc', 'Ces membres souhaitent entrer en relation avec vous. Acceptez ou refusez chaque demande.')}</p>
                  <ul className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {shownPending.map(req => (
                      <li key={req.id} className={`${personRow} flex-wrap sm:flex-nowrap`} style={{ borderColor: 'rgba(89,85,232,0.5)' }}>
                        <button type="button" onClick={() => navigate(`/profile/${req.profile?.id}`)} className="flex items-center gap-4 flex-1 min-w-0 text-left outline-none group">
                          <Avatar className="w-12 h-12 border border-white/20 dark:border-white/10 bg-white/10 shrink-0">
                            <AvatarImage src={req.profile?.avatar_url} className="object-cover" />
                            <AvatarFallback className="bg-transparent text-white/80 font-light">{req.profile?.full_name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="min-w-0">
                            <span className="block text-base font-medium truncate text-white group-hover:text-[#a5b4fc] transition-colors">{req.profile?.full_name}</span>
                            <span className="block text-sm text-white/60 truncate mt-0.5">{req.profile?.bio || t('profile.wants_to_join')}</span>
                          </span>
                        </button>
                        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                          <button onClick={() => handleAccept(req.id)} className={`${actionBtn} !min-h-[44px] flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-white`}>
                            <Check className="w-4 h-4 shrink-0" /> {t('profile.accept')}
                          </button>
                          <button onClick={() => handleDeclineOrRemove(true, req.id)} className={`${ghostBtn} !min-h-[44px] flex-1 sm:flex-none`}>
                            <XIcon className="w-4 h-4 shrink-0" /> {t('profile.decline')}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {pendingRequests.length > LIST_LIMIT && (
                    <ShowAllButton expanded={!!showAll.pending} onToggle={() => toggleAll('pending')} moreLabel={seeAll(pendingRequests.length)} lessLabel={seeLess} />
                  )}
                </div>
              )}

              <div>
                <h2 className="text-lg font-medium text-white flex items-center gap-2"><Users className="w-5 h-5 text-[#a5b4fc]" /> {isOwnProfile ? t('profile.network') : t('profile.relations')} ({connectionsList.length})</h2>
                <p className="text-sm text-white/60 font-light mt-1 mb-4">
                  {isOwnProfile
                    ? t('acc.relations_desc_own', 'Les membres avec qui vous êtes en relation. Cliquez sur un nom pour voir son profil.')
                    : t('acc.relations_desc', 'Les membres en relation avec ce profil.')}
                </p>
                {connectionsList.length === 0 ? (
                  emptyState(
                    Users,
                    t('profile.no_relations'),
                    isOwnProfile ? t('acc.relations_empty_hint', { defaultValue: "Pour ajouter une relation, ouvrez le profil d'un membre puis cliquez sur « {{button}} ».", button: t('profile.connect') }) as string : undefined,
                  )
                ) : (
                  <>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                      {shownRelations.map(profile => (
                        <li key={profile.id}>
                          <button type="button" onClick={() => navigate(`/profile/${profile.id}`)} className={`${personRow} w-full text-left hover:bg-white/[0.08] hover:border-white/25 outline-none focus-visible:ring-2 focus-visible:ring-white/50 group`}>
                            <Avatar className="w-12 h-12 border border-white/20 dark:border-white/10 bg-white/10 shrink-0">
                              <AvatarImage src={profile.avatar_url} className="object-cover" />
                              <AvatarFallback className="bg-transparent text-white/80 font-light">{profile.full_name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="flex-1 min-w-0">
                              <span className="block text-base font-medium truncate text-white group-hover:text-[#a5b4fc] transition-colors">{profile.full_name}</span>
                              <span className="block text-sm text-white/60 truncate mt-0.5">{profile.bio || t('profile.member')}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    {connectionsList.length > LIST_LIMIT && (
                      <ShowAllButton expanded={!!showAll.relations} onToggle={() => toggleAll('relations')} moreLabel={seeAll(connectionsList.length)} lessLabel={seeLess} />
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-medium text-white flex flex-wrap items-center gap-2">
                {activeTab === 'listings' ? <Store className="w-5 h-5 text-[#a5b4fc]" /> : <Heart className="w-5 h-5 text-pink-400" />}
                {activeTab === 'listings'
                  ? (isOwnProfile ? t('acc.tab_my_listings', 'Mes annonces') : t('acc.listings_of', { defaultValue: 'Les annonces de {{name}}', name: fullName }))
                  : t('acc.tab_my_favorites', 'Mes favoris')} ({displayedItems.length})
              </h2>
              <p className="text-sm text-white/60 font-light mt-1 mb-4">
                {activeTab === 'favorites'
                  ? t('acc.favorites_desc', 'Les annonces que vous avez mises de côté avec le cœur.')
                  : isOwnProfile
                    ? t('acc.listings_desc_own', 'Les entreprises que vous proposez. Le crayon modifie une annonce, la corbeille la supprime.')
                    : t('acc.listings_desc', 'Les entreprises proposées par ce membre. Cliquez sur une annonce pour la voir.')}
              </p>
              {displayedItems.length === 0 ? (
                activeTab === 'favorites'
                  ? emptyState(Heart, t('acc.favorites_empty', "Vous n'avez pas encore de favori."), t('acc.favorites_empty_hint', "Sur une annonce, cliquez sur le cœur pour la retrouver ici.") as string, { label: t('acc.browse_listings', 'Parcourir les annonces'), onClick: () => navigate('/marketplace') })
                  : isOwnProfile
                    ? emptyState(Store, t('acc.listings_empty_own', "Vous n'avez pas encore d'annonce."), t('acc.listings_empty_own_hint', "Vous vendez votre entreprise ? Publiez votre annonce depuis la marketplace.") as string, { label: t('acc.go_marketplace', 'Aller à la marketplace'), onClick: () => navigate('/marketplace') })
                    : emptyState(Store, t('profile.nothing_to_show'), t('acc.listings_empty_hint', "Ce membre n'a pas d'annonce en ligne pour le moment.") as string)
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
                    {shownItems.map((item) => (
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
                          <div className="flex gap-1.5">
                            <button aria-label={t('acc.edit_listing', "Modifier l'annonce") as string} title={t('acc.edit_listing', "Modifier l'annonce") as string} className="w-11 h-11 flex items-center justify-center rounded-full bg-black/45 backdrop-blur-md border border-white/15 text-white hover:bg-black/65 transition-colors outline-none" onClick={(e) => { e.stopPropagation(); setListingToEdit(item); setIsEditFormOpen(true); }}><Edit className="w-5 h-5" /></button>
                            <button aria-label={t('acc.delete_listing', "Supprimer l'annonce") as string} title={t('acc.delete_listing', "Supprimer l'annonce") as string} className="w-11 h-11 flex items-center justify-center rounded-full bg-black/45 backdrop-blur-md border border-white/15 text-white hover:bg-black/65 transition-colors outline-none" onClick={(e) => { e.stopPropagation(); setListingToDelete(item); }}><Trash2 className="w-5 h-5" style={{ color: COLOR_BAD.text }} /></button>
                          </div>
                        ) : undefined}
                      />
                    ))}
                  </div>
                  {displayedItems.length > LIST_LIMIT && (
                    <ShowAllButton expanded={!!showAll[activeTab]} onToggle={() => toggleAll(activeTab)} moreLabel={seeAll(displayedItems.length)} lessLabel={seeLess} />
                  )}
                </>
              )}
            </div>
          )}
          </div>
        </section>
      </main>

      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} listing={chatListing} user={currentUser} />
      {!isOwnProfile && targetId && (
        <RateUserModal ratedId={targetId} ratedName={fullName} isOpen={isRatingOpen} onClose={() => setIsRatingOpen(false)} />
      )}
      {targetId && <ReviewsModal userId={targetId} userName={fullName} isOpen={isReviewsOpen} onClose={() => setIsReviewsOpen(false)} />}
      <ListingForm isOpen={isEditFormOpen} onClose={() => setIsEditFormOpen(false)} onSuccess={() => refetch()} listingToEdit={listingToEdit} />

      <AnimatePresence>
        {listingToDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#2b2a2f]/80 backdrop-blur-md" onClick={() => setListingToDelete(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} role="alertdialog" aria-modal="true" className="relative liquid-glass border border-white/30 dark:border-white/10 rounded-[2rem] p-8 sm:p-10 max-w-md w-full text-center shadow-2xl">
              <h3 className="text-2xl font-light mb-3 text-white">{t('profile.del_title')}</h3>
              {listingToDelete.name && <p className="text-base text-white/85 font-medium break-words">{listingToDelete.name}</p>}
              <p className="text-sm text-white/60 font-light mt-2 leading-relaxed">{t('acc.delete_warning', 'Cette annonce sera retirée du site. Cette action est définitive.')}</p>
              <div className="flex flex-wrap justify-center gap-3 mt-8">
                <Button variant="ghost" onClick={() => setListingToDelete(null)} className="w-fit px-8 rounded-full h-12 text-white hover:text-white hover:bg-white/20 dark:hover:bg-white/10 outline-none font-medium border border-white/20">{t('profile.del_cancel')}</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="w-fit px-8 rounded-full h-12 outline-none font-medium">{t('profile.del_confirm')}</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
