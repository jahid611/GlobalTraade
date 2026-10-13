"use client";

import React, { useState } from 'react';
import { PageTitle } from '@/components/PageTitle';
import type { Listing } from '@/types/domain';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Storefront, Trash, PencilSimple, Eye, User as UserIcon, Heart, TrendUp, ChatTeardrop, Users, ShieldCheck, Crown, Sparkle, Target, Activity, ClockCounterClockwise, Pause, CheckCircle, DownloadSimple, RocketLaunch, WarningCircle, ArrowRight } from 'phosphor-react';
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
import { MarketPulse } from '@/components/MarketPulse';
import { HelpBanner } from '@/components/HelpBanner';
import { LiveActivityFeed } from '@/components/LiveActivityFeed';
import { OfferComparator } from '@/components/OfferComparator';
import { SellabilityScore } from '@/components/SellabilityScore';
import { ViewersPanel } from '@/components/ViewersPanel';
import { generatePremiumPresentation } from '@/utils/premiumPresentation';
import { normalizePlan, BOOST_PRICE } from '@/services/planService';
import { isBoosted } from '@/services/boostService';
import { initNativeFeel } from '@/utils/nativeFeel';
import { scoreListing } from '@/lib/matching';
import type { MatchCriteria } from '@/components/SmartMatchForm';
import { rangeBounds } from '@/lib/rangeBounds';
import { INDUSTRIES } from '@/lib/industries';
import { FR_REGIONS, regionLabel } from '@/lib/geoRegions';
import { DashboardHero, type DashStat } from '@/components/dashboard/DashboardHero';
import { DashboardTodo, type TodoItem } from '@/components/dashboard/DashboardTodo';
import { DashboardTabs, type DashTab, type DashTabDef } from '@/components/dashboard/DashboardTabs';
import { MyListingCard } from '@/components/dashboard/MyListingCard';
import { PanelHeader, SubTitle, EmptyState, ShowAllGrid, DASH_GRID, primaryBtn, outlineBtn } from '@/components/dashboard/DashboardBits';

initNativeFeel();

// Valeurs encadrées des critères du profil (Réglages > critères) : secteurs =
// libellés de INDUSTRIES, zones = clés de FR_REGIONS, séparés par des virgules.
const INDUSTRY_SET = new Set<string>(INDUSTRIES);
const REGION_KEY_SET = new Set<string>(FR_REGIONS.map((r) => r.key));
const listVal = (v: unknown): string[] =>
  (typeof v === 'string' ? v.split(',') : []).map((x) => x.trim()).filter(Boolean);

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();

  const [listingToDelete, setListingToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [listingToEdit, setListingToEdit] = useState<any>(null);
  // Rubrique choisie par l'utilisateur (null = celle proposée par défaut).
  const [tab, setTab] = useState<DashTab | null>(null);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['dashboard', user?.id, JSON.stringify(user?.user_metadata)],
    queryFn: async () => {
      if (!user) throw new Error("Not logged in");

      const [
        { data: listings, error: listingsError },
        { data: favs },
        { count: profileViewsCount },
        { data: profile },
        { data: conversationRows },
        { count: connectionsCount },
        { data: suggested }
      ] = await Promise.all([
        // Lectures d'annonces via la vue masquante (colonnes sensibles bridées côté serveur)
        supabase.from('listings_secure').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
        supabase.from('favorites').select('listing_id').eq('user_id', user.id),
        supabase.from('profile_views').select('id', { count: 'exact', head: true }).eq('profile_id', user.id),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        // « Discussions en cours » = nombre de CONVERSATIONS, pas de messages reçus :
        // on ne lit que les colonnes qui identifient une conversation.
        supabase.from('messages').select('sender_id, receiver_id, listing_id, project_id')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false }).limit(1000),
        supabase.from('connections').select('id', { count: 'exact', head: true }).or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`).eq('status', 'accepted'),
        supabase.from('listings_secure').select('*').neq('owner_id', user.id).order('created_at', { ascending: false }).limit(10)
      ]);

      // Supabase ne lève pas : sans ce contrôle, une panne afficherait un
      // tableau de bord vide (« 0 annonce ») au lieu d'un état d'erreur.
      if (listingsError) throw listingsError;

      // Même identifiant de conversation que la messagerie : (annonce ou projet) + interlocuteur.
      const conversationIds = new Set(
        (conversationRows || []).map((m: { sender_id: string; receiver_id: string; listing_id: string | null; project_id: string | null }) => {
          const other = m.sender_id === user.id ? m.receiver_id : m.sender_id;
          return m.project_id ? `project_${m.project_id}_${other}` : `${m.listing_id}_${other}`;
        })
      );

      const myListings = (listings || []).map(l => ({ ...l, view_count: l.view_count || 0 }));
      // Les annonces favorites sont récupérées via la vue masquante à partir de leurs ids
      const favIds = (favs || []).map((f: { listing_id: string }) => f.listing_id).filter(Boolean);
      const { data: favListings } = favIds.length
        ? await supabase.from('listings_secure').select('*').in('id', favIds)
        : { data: [] as any[] };
      const myFavorites = (favListings || []).map((l: Listing) => ({ ...l, view_count: l.view_count || 0 }));
      const allSuggested = (suggested || []).map(l => ({ ...l, view_count: l.view_count || 0 }));

      return { 
        myListings, 
        myFavorites, 
        allSuggested,
        profileViews: profileViewsCount || 0,
        profile,
        conversationsCount: conversationIds.size,
        connectionsCount: connectionsCount || 0
      };
    },
    enabled: !!user?.id,
  });

  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleConfirmActive = async (listing: Listing) => {
    setConfirmingId(listing.id);
    const { error } = await supabase.rpc('confirm_listing_active', { p_listing_id: listing.id });
    if (error) {
      showError(t('lifecycle.confirm_error', 'Impossible de confirmer. Réessayez.'));
    } else {
      showSuccess(t('lifecycle.confirmed_toast', 'Annonce confirmée. Elle reste en ligne.'));
      await queryClient.invalidateQueries({ queryKey: ['dashboard', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['listings'] });
    }
    setConfirmingId(null);
  };

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

  // La requête a échoué et rien n'est en cache : état d'erreur avec « Réessayer »
  // (et non un squelette qui ne se termine jamais).
  if (isError && !data) {
    return (
      <div className="min-h-screen bg-transparent dark:bg-[#2b2a2f] flex flex-col text-white font-sans selection:bg-primary/30">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[60vw] h-[40vh] bg-primary/10 blur-[100px] rounded-full" />
        </div>
        <SolarSystem />
        <Navbar />
        <main className="relative z-10 flex-1 w-full max-w-xl mx-auto px-[6vw] pt-[25vh] pb-20 text-center">
          <div role="alert" className="liquid-glass dark:bg-white/[0.02] border border-white/30 dark:border-white/10 rounded-[2rem] p-10 sm:p-14 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-white/10 dark:bg-white/5 flex items-center justify-center mb-6 border border-white/20 dark:border-white/10">
              <WarningCircle className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-light mb-3 text-white">{t('dash.load_error_title', 'Tableau de bord indisponible')}</h1>
            <p className="text-white dark:text-white/60 font-light mb-8 leading-relaxed text-base">
              {t('dash.load_error_desc', "Vos données n'ont pas pu être chargées. Vérifiez votre connexion puis réessayez.")}
            </p>
            <Button onClick={() => refetch()} disabled={isFetching} className="rounded-full bg-primary hover:bg-primary/90 text-white px-8 h-12 outline-none text-sm font-semibold border-none [text-shadow:none]">
              {isFetching ? t('dash.retrying', 'Nouvelle tentative…') : t('common.retry', 'Réessayer')}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-transparent dark:bg-[#2b2a2f] flex flex-col text-white font-sans selection:bg-primary/30">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[60vw] h-[40vh] bg-primary/10 blur-[100px] rounded-full" />
        </div>
        <SolarSystem />
        <Navbar />
        <main className="relative z-10 flex-1 w-full px-4 sm:px-6 lg:px-10 2xl:px-14 pt-[calc(var(--nav-clearance)+2.5rem)] pb-24">
          <Skeleton className="h-10 w-full max-w-[350px] mb-6 bg-white/5 dark:bg-white/10" />
          <Skeleton className="h-[260px] rounded-[2rem] mb-10 bg-white/5 dark:bg-white/10" />
          <div className={DASH_GRID}>
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[380px] rounded-[2rem] bg-white/5 dark:bg-white/10" />)}
          </div>
        </main>
      </div>
    );
  }

  const { myListings, myFavorites, allSuggested, profileViews, profile, conversationsCount, connectionsCount } = data;

  // Critères d'investissement du profil → critères du moteur de matching réel
  // (`scoreListing`, le même que la Marketplace). Seules les valeurs encadrées
  // comptent : un ancien texte libre n'est pas interprété au hasard.
  const criteriaSectors = listVal(profile?.target_sectors || user?.user_metadata?.target_sectors).filter((v) => INDUSTRY_SET.has(v));
  const criteriaRegions = listVal(profile?.target_geo || user?.user_metadata?.target_geo).filter((v) => REGION_KEY_SET.has(v));
  const targetBudgetLabel: string = profile?.target_budget || user?.user_metadata?.target_budget || "";
  const budgetBounds = rangeBounds(targetBudgetLabel);

  const hasCriteria = criteriaSectors.length > 0 || criteriaRegions.length > 0 || !!budgetBounds;

  const matchCriteria: MatchCriteria = {
    industries: criteriaSectors,
    regions: criteriaRegions,
    budgetMin: budgetBounds?.min ?? 0,
    budgetMax: budgetBounds?.max ?? 0, // 0 = pas de plafond pour le moteur
  };

  // Sans critères : aucune note (un pourcentage serait inventé) — on montre les
  // dernières annonces et on invite à renseigner ses critères.
  const suggestedDeals: (Listing & { matchScore: number | null })[] = hasCriteria
    ? allSuggested
        .map((deal: Listing) => ({ ...deal, matchScore: scoreListing(deal, matchCriteria).score as number | null }))
        .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
        .slice(0, 3)
    : allSuggested.slice(0, 3).map((deal: Listing) => ({ ...deal, matchScore: null }));

  // Rappel lisible des critères utilisés (libellés traduits, pas les valeurs brutes).
  const criteriaSummary = [
    ...criteriaSectors.map((v) => t(`industry.${v}`, { defaultValue: v }) as string),
    ...criteriaRegions.map((k) => regionLabel(k)),
    ...(budgetBounds ? [targetBudgetLabel] : []),
  ].join(' • ');

  const listingsToConfirm = myListings.filter((l: Listing) => l.status === 'pending_renewal');
  const pausedListings = myListings.filter((l: Listing) => l.status === 'inactive');
  const deletionDate = (l: Listing) => {
    if (!l.inactive_since) return '';
    const d = new Date(l.inactive_since);
    d.setDate(d.getDate() + 30);
    return d.toLocaleDateString();
  };

  const isPremium = normalizePlan(profile?.plan_type) !== 'free';
  const isVerified = profile?.kyc_status === 'verified';
  const openCreate = () => { setListingToEdit(null); setIsEditFormOpen(true); };
  const openListing = (id: string) => navigate('/app', { state: { focusId: id } });
  const firstName = String(profile?.full_name || user?.user_metadata?.full_name || '').trim().split(/\s+/)[0] || '';

  // « Où j'en suis » : les quatre chiffres du bandeau.
  const stats: DashStat[] = [
    {
      key: 'listing_views', Icon: Eye,
      value: myListings.reduce((acc, l) => acc + l.view_count, 0),
      label: t('dash.global_impact'), desc: t('dash.global_impact_desc'),
    },
    {
      key: 'profile_views', Icon: UserIcon,
      value: profileViews,
      label: t('dash.profile_visits'), desc: t('dash.profile_visits_desc'),
    },
    {
      key: 'conversations', Icon: ChatTeardrop,
      value: conversationsCount,
      label: t('dash.negotiations'), desc: t('dash.negotiations_desc'),
      onClick: () => navigate('/messages'),
      linkLabel: t('dashboard.open_messages', 'Ouvrir mes messages'),
    },
    {
      key: 'network', Icon: Users,
      value: connectionsCount,
      label: t('dash.network'), desc: t('dash.network_desc'),
      onClick: () => navigate('/profile', { state: { activeTab: 'relations' } }),
      linkLabel: t('dashboard.open_network', 'Voir mes contacts'),
    },
  ];

  // « Que dois-je faire maintenant » : d'abord les annonces qui attendent une
  // réponse, puis la vérification d'identité et la formule.
  const todoItems: TodoItem[] = [
    ...listingsToConfirm.map((listing: Listing): TodoItem => ({
      key: `confirm_${listing.id}`,
      Icon: ClockCounterClockwise,
      urgent: true,
      title: t('lifecycle.confirm_title', { name: listing.name, defaultValue: '« {{name}} » est-elle toujours en vente ?' }),
      desc: t('lifecycle.confirm_desc', 'Un clic suffit. C\'est gratuit.'),
      primary: {
        label: t('lifecycle.confirm_yes', 'Oui, toujours en vente'),
        onClick: () => handleConfirmActive(listing),
        disabled: confirmingId === listing.id,
        Icon: CheckCircle,
      },
      secondary: { label: t('lifecycle.delete', 'Supprimer'), onClick: () => setListingToDelete(listing), danger: true },
    })),
    ...pausedListings.map((listing: Listing): TodoItem => ({
      key: `paused_${listing.id}`,
      Icon: Pause,
      urgent: true,
      title: t('lifecycle.paused_title', { name: listing.name, defaultValue: '« {{name}} » est en pause' }),
      desc: t('lifecycle.paused_desc', { date: deletionDate(listing), defaultValue: 'Réactivez-la gratuitement. Sans action, elle sera supprimée le {{date}}.' }),
      primary: {
        label: t('lifecycle.reactivate', 'Réactiver'),
        onClick: () => handleConfirmActive(listing),
        disabled: confirmingId === listing.id,
      },
      secondary: { label: t('lifecycle.delete', 'Supprimer'), onClick: () => setListingToDelete(listing), danger: true },
    })),
    {
      key: 'kyc',
      Icon: ShieldCheck,
      done: isVerified,
      title: (
        <>
          {isVerified ? t('dashboard.kyc_done_title', 'Votre identité est vérifiée') : t('dash.trust_safety')}
          <VerifiedBadge kycStatus={profile?.kyc_status} size="sm" />
        </>
      ),
      desc: isVerified ? t('dash.kyc_verified_desc') : t('dash.kyc_unverified_desc'),
      primary: isVerified ? undefined : { label: t('dash.start_verification'), onClick: () => navigate('/profile') },
    },
    {
      key: 'plan',
      Icon: Crown,
      done: isPremium,
      title: `${t('dash.license_access')} : ${t(`dashboard.plan_${normalizePlan(profile?.plan_type)}`, { defaultValue: normalizePlan(profile?.plan_type) === 'free' ? 'Gratuite' : normalizePlan(profile?.plan_type) === 'pro' ? 'Pro' : 'Business' })}`,
      desc: isPremium ? t('dash.premium_active_desc') : t('dash.premium_inactive_desc'),
      primary: isPremium ? undefined : { label: t('dash.unlock_premium'), onClick: () => navigate('/payment') },
    },
  ];

  // Rubrique ouverte à l'arrivée : mes annonces, ou mes favoris quand on n'a
  // rien à vendre mais des annonces mises de côté.
  const defaultTab: DashTab = myListings.length === 0 && myFavorites.length > 0 ? 'favorites' : 'listings';
  const activeTab: DashTab = tab ?? defaultTab;
  const tabs: DashTabDef[] = [
    { id: 'listings', label: t('dashboard.tab_listings', 'Mes annonces'), Icon: Storefront, count: myListings.length },
    { id: 'favorites', label: t('dashboard.tab_favorites', 'Mes favoris'), Icon: Heart, count: myFavorites.length },
    { id: 'suggestions', label: t('dashboard.tab_suggestions', 'Suggestions pour vous'), Icon: Sparkle, count: suggestedDeals.length },
    { id: 'activity', label: t('dashboard.tab_activity', 'Activité et marché'), Icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-transparent dark:bg-[#2b2a2f] flex flex-col text-white font-sans selection:bg-primary/30">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[60vw] h-[40vh] bg-primary/10 blur-[100px] rounded-full" />
      </div>
      <SolarSystem />
      <Navbar />

      {/* Pleine largeur, comme la marketplace. */}
      <main className="relative z-10 flex-1 w-full px-4 sm:px-6 lg:px-10 2xl:px-14 pt-[calc(var(--nav-clearance)+2.5rem)] pb-24">

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="page-head mb-6">
          <PageTitle lead={t('dash.cockpit_title1')} accent={t('dash.cockpit_title2')} />
          <p className="text-white/60 font-light text-sm md:text-base mt-2">
            {t('dash.subtitle')}
          </p>
        </motion.div>

        {/* 1. Où j'en suis */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-10">
          <DashboardHero name={firstName} stats={stats} onSell={openCreate} />
        </motion.div>

        {/* 2. Que dois-je faire maintenant */}
        <div className="mb-6">
          <DashboardTodo items={todoItems} />
        </div>

        <HelpBanner
          title={t('help.dash_title', 'Comment fonctionne votre tableau de bord ?') as string}
          desc={t('help.dash_desc', '') as string}
          className="mb-10"
        />

        {/* 3. Le détail : une rubrique à la fois */}
        <div className="mb-8">
          <DashboardTabs tabs={tabs} tab={activeTab} onChange={setTab} />
        </div>

        <div id="dash-panel" role="tabpanel" aria-labelledby={`dash-tab-${activeTab}`}>
          {activeTab === 'listings' && (
            <div className="space-y-12">
              <section>
                <PanelHeader
                  title={t('dashboard.listings_title', 'Mes annonces')}
                  desc={t('dashboard.listings_desc', 'Les entreprises que vous avez mises en vente. Sous chaque annonce : son état et les boutons pour la modifier.')}
                  action={myListings.length > 0 ? (
                    <button onClick={openCreate} className={`${outlineBtn} w-full sm:w-auto`}>
                      <Storefront size={18} /> {t('dashboard.add_listing', 'Ajouter une annonce')}
                    </button>
                  ) : undefined}
                />

                {myListings.length === 0 ? (
                  <EmptyState
                    Icon={Storefront}
                    title={t('dash.no_sales_title')}
                    desc={t('dashboard.no_listings_desc', "Vous n'avez pas encore mis d'entreprise en vente. Créez votre annonce : c'est guidé, étape par étape.")}
                    action={
                      <button onClick={openCreate} className={primaryBtn}>
                        <Storefront size={18} weight="fill" /> {t('dash.create_first')}
                      </button>
                    }
                  />
                ) : (
                  <ShowAllGrid
                    items={myListings as Listing[]}
                    getKey={(l) => l.id}
                    showAllLabel={t('dashboard.show_all_listings', { count: myListings.length, defaultValue: 'Voir toutes mes annonces ({{count}})' })}
                    showLessLabel={t('dashboard.show_less', 'Afficher moins')}
                    renderItem={(listing) => (
                      <MyListingCard
                        listing={listing}
                        onOpen={() => openListing(listing.id)}
                        onEdit={() => { setListingToEdit(listing); setIsEditFormOpen(true); }}
                        onDelete={() => setListingToDelete(listing)}
                        onBoost={isBoosted(listing) ? undefined : () => navigate(`/payment?boost=listing:${listing.id}&name=${encodeURIComponent(listing.name || '')}`)}
                        onDownloadPdf={isPremium ? async () => { await generatePremiumPresentation(listing, t, i18n.language?.startsWith('en') ? 'en' : 'fr'); } : undefined}
                      />
                    )}
                  />
                )}
              </section>

              {/* Comparateur d'offres : n'apparaît que s'il y a des offres à comparer */}
              {myListings.length > 0 && (
                <section className="[&:has(>[data-slot]:empty)]:hidden">
                  <SubTitle
                    title={t('dashboard.offers_title', 'Les offres reçues')}
                    desc={t('dashboard.offers_desc', 'Quand plusieurs acheteurs vous font une offre pour la même annonce, elles sont comparées ici.')}
                  />
                  <div data-slot className="space-y-6 [&_.text-\[9px\]]:!text-xs [&_.text-\[10px\]]:!text-xs [&_.text-xs]:!text-[13px]">
                    {myListings.map(listing => (
                      <OfferComparator key={listing.id} listingId={listing.id} listingPrice={listing.price} sellerId={user?.id || ''} />
                    ))}
                  </div>
                </section>
              )}

              {/* Score de cession + Qui s'intéresse à vous (premium vendeur) */}
              {myListings.length > 0 && (
                <section>
                  <SubTitle
                    title={t('dashboard.sell_better_title', 'Pour mieux vendre')}
                    desc={t('dashboard.sell_better_desc', "Le score de cession note votre annonce sur 100 : plus elle est complète, plus elle inspire confiance. À côté, les personnes qui s'intéressent à vous.")}
                  />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 [&_button]:min-h-[44px] [&_.text-\[9px\]]:!text-xs [&_.text-\[10px\]]:!text-xs [&_.text-xs]:!text-[13px]">
                    <SellabilityScore listing={myListings[0]} isPremium={isPremium} />
                    <ViewersPanel userId={user?.id || ''} listingIds={myListings.map((l: Listing) => l.id)} isPremium={isPremium} />
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === 'favorites' && (
            <section>
              <PanelHeader
                title={t('dashboard.favorites_title', 'Mes favoris')}
                desc={t('dashboard.favorites_desc', "Les annonces que vous avez mises de côté avec le cœur. Cliquez de nouveau sur le cœur pour en retirer une.")}
              />
              {myFavorites.length === 0 ? (
                <EmptyState
                  Icon={Heart}
                  title={t('dashboard.no_favs_title', 'Aucun favori pour le moment')}
                  desc={t('dashboard.no_favs_desc', "Quand une annonce vous plaît, cliquez sur le cœur : vous la retrouverez ici.")}
                  action={
                    <button onClick={() => navigate('/marketplace')} className={primaryBtn}>
                      {t('dashboard.browse_market', 'Voir les annonces')} <ArrowRight size={16} weight="bold" />
                    </button>
                  }
                />
              ) : (
                <ShowAllGrid
                  items={myFavorites as Listing[]}
                  getKey={(l) => l.id}
                  showAllLabel={t('dashboard.show_all_favorites', { count: myFavorites.length, defaultValue: 'Voir tous mes favoris ({{count}})' })}
                  showLessLabel={t('dashboard.show_less', 'Afficher moins')}
                  renderItem={(listing) => (
                    <BusinessCard
                      listing={listing}
                      onClick={() => openListing(listing.id)}
                      onFavoriteToggle={(id, isFav) => {
                        if (!isFav) {
                          // La clé réelle est ['dashboard', id, métadonnées] : on cible par préfixe.
                          queryClient.setQueriesData({ queryKey: ['dashboard', user?.id] }, (old: any) => {
                            if (!old) return old;
                            return { ...old, myFavorites: old.myFavorites.filter((f: Listing) => f.id !== id) };
                          });
                        }
                      }}
                    />
                  )}
                />
              )}
            </section>
          )}

          {activeTab === 'suggestions' && (
            <section>
              <PanelHeader
                title={t('dashboard.suggestions_title', 'Suggestions pour vous')}
                desc={hasCriteria
                  ? `${t('dash.radar_based_on')}${criteriaSummary || t('dash.active_search')}`
                  : t('dashboard.suggestions_no_criteria', "Voici les dernières annonces publiées. Dites-nous ce que vous cherchez (métier, région, budget) : nous vous montrerons d'abord celles qui vous correspondent.")}
                action={
                  <button onClick={() => navigate('/settings#criteres')} className={`${hasCriteria ? outlineBtn : primaryBtn} w-full sm:w-auto`}>
                    <Target size={18} /> {hasCriteria
                      ? t('dash.edit_criteria', { defaultValue: 'Modifier mes critères' })
                      : t('dash.set_criteria', { defaultValue: 'Renseigner mes critères' })}
                  </button>
                }
              />
              {hasCriteria && suggestedDeals.length > 0 && (
                <p className="text-[13px] text-white/60 font-light -mt-2 mb-5 max-w-3xl leading-relaxed">
                  {t('dashboard.match_help', 'Le pourcentage affiché sur chaque annonce indique à quel point elle correspond à vos critères : plus il est élevé, mieux c\'est.')}
                </p>
              )}

              {suggestedDeals.length === 0 ? (
                <EmptyState
                  Icon={Sparkle}
                  title={t('dashboard.no_suggestions_title', 'Aucune suggestion pour le moment')}
                  desc={t('dashboard.no_suggestions_desc', "Aucune annonce à vous proposer aujourd'hui. Vous pouvez parcourir toutes les annonces du site.")}
                  action={
                    <button onClick={() => navigate('/marketplace')} className={primaryBtn}>
                      {t('dashboard.browse_market', 'Voir les annonces')} <ArrowRight size={16} weight="bold" />
                    </button>
                  }
                />
              ) : (
                <div className={DASH_GRID}>
                  {suggestedDeals.map((deal) => (
                    // Note de correspondance — uniquement si elle est calculée à partir de vrais critères
                    <BusinessCard
                      key={deal.id}
                      listing={deal}
                      onClick={() => openListing(deal.id)}
                      variant="dashboard"
                      matchScore={deal.matchScore ?? undefined}
                    />
                  ))}
                  <button
                    onClick={() => navigate('/marketplace')}
                    className="group flex flex-col items-center justify-center text-center gap-4 min-h-[12rem] rounded-3xl border border-dashed border-white/25 bg-black/20 hover:bg-white/[0.06] hover:border-white/40 p-6 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  >
                    <span className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center">
                      <Storefront size={28} className="text-[#a5b4fc]" />
                    </span>
                    <span className="text-lg font-medium text-white leading-tight">{t('dashboard.see_market_title', 'Voir toutes les annonces')}</span>
                    <span className="text-sm text-white/65 font-light leading-relaxed max-w-[16rem]">{t('dashboard.see_market_desc', 'Parcourez toutes les entreprises à vendre et filtrez-les à votre façon.')}</span>
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#a5b4fc] group-hover:text-white transition-colors">
                      {t('dashboard.see_market_cta', 'Ouvrir le marché')} <ArrowRight size={16} weight="bold" className="transition-transform group-hover:translate-x-1" />
                    </span>
                  </button>
                </div>
              )}
            </section>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-12">
              {/* Activité récente : n'apparaît que s'il y a quelque chose à montrer */}
              <section className="[&:has(>[data-slot]:empty)]:hidden">
                <SubTitle
                  title={t('dashboard.activity_title', 'Ce qui s\'est passé récemment')}
                  desc={t('dashboard.activity_desc', 'Les derniers messages reçus, les offres et les personnes qui ont mis vos annonces en favori.')}
                />
                {/* Composants partagés : on agrandit ici leurs petits textes, sans les modifier. */}
                <div data-slot className="[&_.text-\[9px\]]:!text-xs [&_.text-\[10px\]]:!text-xs [&_.text-xs]:!text-[13px]"><LiveActivityFeed /></div>
              </section>

              <section>
                <SubTitle
                  title={t('dashboard.market_title', 'Les chiffres du marché')}
                  desc={t('dashboard.market_desc', 'Un aperçu des dernières annonces publiées : nombre, prix moyen et métiers les plus représentés.')}
                />
                {allSuggested.length === 0 ? (
                  <EmptyState
                    Icon={Activity}
                    title={t('dashboard.no_market_title', 'Rien à afficher pour le moment')}
                    desc={t('dashboard.no_market_desc', "Il n'y a pas encore assez d'annonces pour dresser un aperçu du marché.")}
                    action={
                      <button onClick={() => navigate('/marketplace')} className={primaryBtn}>
                        {t('dashboard.browse_market', 'Voir les annonces')} <ArrowRight size={16} weight="bold" />
                      </button>
                    }
                  />
                ) : (
                  <div className="[&_.text-\[9px\]]:!text-xs [&_.text-\[10px\]]:!text-xs [&_.text-xs]:!text-[13px]"><MarketPulse listings={allSuggested} /></div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {listingToDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#2b2a2f]/80 backdrop-blur-md" onClick={() => setListingToDelete(null)} />
            <motion.div role="dialog" aria-modal="true" initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative liquid-glass border border-white/30 dark:border-white/10 rounded-[2rem] p-8 sm:p-10 max-w-md w-full text-center shadow-2xl">
              <h3 className="text-2xl font-light mb-3 text-white">{t('dash.modal_delete_title')}</h3>
              <p className="text-white dark:text-white/70 mb-8 font-light text-base leading-relaxed">
                {t('dash.modal_delete_desc', { name: listingToDelete.name })}
              </p>
              <div className="flex flex-col gap-3">
                <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="w-full rounded-full h-12 outline-none font-medium text-white hover:brightness-110 [text-shadow:none]" style={{ background: '#dc2626' }}>{t('dash.confirm_delete')}</Button>
                <Button variant="ghost" onClick={() => setListingToDelete(null)} className="w-full rounded-full h-12 outline-none font-medium text-white hover:bg-white/20 [text-shadow:none]">{t('dash.cancel')}</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ListingForm isOpen={isEditFormOpen} onClose={() => setIsEditFormOpen(false)} onSuccess={() => { refetch(); queryClient.invalidateQueries({ queryKey: ['listings'] }); }} listingToEdit={listingToEdit} />
    </div>
  );
}
