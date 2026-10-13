"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { industryOptions } from '@/lib/industries';
import { ZoomHint } from '@/components/ZoomHint';
import { MapSearch } from '@/components/MapSearch';
import { supabase } from '@/integrations/supabase/client';
import type { Listing } from '@/types/domain';
import { WorldGlobe, ListingNode, FAVORITE_COLOR } from '@/components/Globe';
import { BusinessModal } from '@/components/BusinessModal';
import { ListingForm } from '@/components/ListingForm';
import { ChatPanel } from '@/components/ChatPanel';
import { SidebarMessaging } from '@/components/SidebarMessaging';
import { Plus, CaretLeft, ChatTeardrop, Storefront, House, User as UserIcon, Gear, Check, CaretDown, Sun, Moon, Translate, Heart } from 'phosphor-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useLocation, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';
import { useListings } from '@/hooks/use-listings';
import { useQueryClient } from '@tanstack/react-query';
import { useUnreadMessages } from '@/hooks/use-unread-messages';
import { NotificationsMenu } from '@/components/NotificationsMenu';
import { useTheme } from 'next-themes';
import { useAuth } from '@/components/AuthProvider';
import { usePlan, checkPublicationQuota } from '@/services/planService';
import { UpgradeModal } from '@/components/UpgradeModal';
import { useTranslation } from 'react-i18next';
import { showError } from '@/utils/toast';
import { initNativeFeel } from '@/utils/nativeFeel';
import { LanguageFlag } from '@/components/LanguageMenu';
import { LANGUAGES } from '@/locales';
import { setLanguage } from '@/i18n';

// Injection du style natif global
initNativeFeel();

export default function AppMap() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const navFocusId = location.state?.focusId;
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { plan } = usePlan(user?.id);
  const { t, i18n } = useTranslation();

  const { data: rawListings = [], refetch, isFetched } = useListings();
  const listings = rawListings as ListingNode[];

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [listingToEdit, setListingToEdit] = useState<any>(null);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  // Cible vers laquelle le globe vole (navigation OU nouvelle cession créée).
  const [focusListingId, setFocusListingId] = useState<string | undefined>(navFocusId);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatListing, setChatListing] = useState<any>(null);
  const [selectedNeed, setSelectedNeed] = useState<any>(null);
  const [isSidebarMessagingOpen, setIsSidebarMessagingOpen] = useState(false);

  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [industrySearch, setIndustrySearch] = useState('');
  const [celebrateUnlock, setCelebrateUnlock] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Fiche à ouvrir dès que son annonce est présente dans la liste. Mémorisée
  // AVANT de nettoyer l'URL / l'état de navigation : un rafraîchissement de la
  // liste entre-temps ne fait plus perdre la demande.
  const pendingOpen = useRef<{ id: string; celebrate: boolean } | null>(null);
  const [openRequest, setOpenRequest] = useState(0);
  // Minuteries de la séquence « nouvelle cession » (vol du globe puis fiche).
  const flightTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => { flightTimers.current.forEach(clearTimeout); }, []);

  // Retour de paiement Stripe : /app?focus=<id>&celebrate=1 → rouvre la fiche
  // débloquée et déclenche l'animation de cadenas. `?listing=<id>` est un alias
  // de `focus` (liens directs vers une annonce).
  useEffect(() => {
    const focus = searchParams.get('focus') || searchParams.get('listing');
    if (!focus) return;
    pendingOpen.current = { id: focus, celebrate: searchParams.get('celebrate') === '1' };
    setFocusListingId(focus);
    setOpenRequest((n) => n + 1);
    const rest = new URLSearchParams(searchParams);
    ['focus', 'listing', 'celebrate', 'session_id', 'success'].forEach((k) => rest.delete(k));
    setSearchParams(rest, { replace: true, state: location.state });
  }, [searchParams]);

  // Navigation interne (`navigate('/app', { state: { focusId } })`) : l'état est
  // consommé UNE fois puis vidé dans React Router — sinon `navFocusId` persiste
  // et la fiche se rouvre à chaque rafraîchissement des annonces.
  useEffect(() => {
    if (!navFocusId) return;
    pendingOpen.current = { id: navFocusId, celebrate: false };
    setFocusListingId(navFocusId);
    setOpenRequest((n) => n + 1);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [navFocusId]);

  // Ouvre la fiche demandée dès que l'annonce est dans la liste.
  useEffect(() => {
    const pending = pendingOpen.current;
    if (!pending) return;
    const listing = listings.find((l) => l.id === pending.id);
    if (!listing) {
      // Les annonces sont chargées et celle du lien n'y est pas : elle a été
      // retirée ou mise en pause. (Après un paiement, on attend : elle arrive.)
      if (isFetched && !pending.celebrate) {
        pendingOpen.current = null;
        navigate('/annonce-introuvable', { replace: true });
      }
      return;
    }
    pendingOpen.current = null;
    setSelectedListing(listing);
    if (pending.celebrate) {
      setCelebrateUnlock(true);
      // Le déblocage vient d'être écrit côté serveur : on rafraîchit le feed
      // pour récupérer les financiers désormais visibles (l'effet de
      // synchronisation ci-dessous met alors la fiche ouverte à jour → le
      // simulateur LBO se déverrouille sans refresh manuel).
      refetch();
    }
  }, [listings, openRequest, isFetched]);

  // Garde la fiche ouverte synchronisée avec le feed : quand les données
  // rafraîchissent (ex. financiers qui apparaissent après un déblocage), la
  // fiche affichée reçoit l'objet à jour au lieu d'un snapshot périmé.
  useEffect(() => {
    setSelectedListing((cur: any) => {
      if (!cur) return cur;
      const fresh = listings.find(l => l.id === cur.id);
      return fresh || cur;
    });
  }, [listings]);

  const hasUnread = useUnreadMessages(user?.id);
  const isOverlayOpen = !!selectedListing || isFormOpen || isChatOpen || isSidebarMessagingOpen;

  const handleSelectListing = async (id: string) => {
    const listing = listings.find(l => l.id === id);
    if (listing) setSelectedListing(listing);
  };

  const [upgrade, setUpgrade] = useState<{ open: boolean; msg?: string }>({ open: false });
  const handleNewCessionClick = async () => {
    if (!user) return navigate('/login');
    const q = await checkPublicationQuota(user.id);
    if (!q.allowed) {
      setUpgrade({ open: true, msg: `Vous avez atteint votre limite de ${q.limit} annonce${q.limit > 1 ? 's' : ''} active${q.limit > 1 ? 's' : ''}. Passez en Business pour publier sans limite.` });
      return;
    }
    setListingToEdit(null);
    setIsFormOpen(true);
  };

  const handleFormSuccess = async () => {
    const prevIds = new Set(listings.map((l: Listing) => l.id));
    const { data } = await refetch();
    const list = (data as any[]) || [];

    // Édition : on rouvre simplement la fiche mise à jour.
    if (listingToEdit) {
      const updatedListing = list.find((l: Listing) => l.id === listingToEdit.id);
      if (updatedListing) setSelectedListing(updatedListing);
      return;
    }

    // Nouvelle cession : on identifie celle qui vient d'apparaître…
    const created =
      list.find((l: Listing) => !prevIds.has(l.id) && l.owner_id === user?.id) ||
      [...list]
        .filter((l: Listing) => l.owner_id === user?.id)
        .sort((a: Listing, b: Listing) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (created) {
      // On retire le filtre secteur actif : sinon la nouvelle cession peut être
      // exclue de displayListings et le globe ne saurait pas voler dessus.
      setSelectedIndustries([]);
      // …on fait voler le globe dessus, puis on ouvre sa fiche une fois arrivé.
      setSelectedListing(null);
      setFocusListingId(undefined);
      flightTimers.current.forEach(clearTimeout);
      flightTimers.current = [
        setTimeout(() => setFocusListingId(created.id), 50),
        setTimeout(() => setSelectedListing(created), 1600),
      ];
    }
  };

  // Favoris du membre : leurs points sont roses sur la carte. Relus à la
  // fermeture d'une fiche, où le cœur a pu être coché ou décoché.
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const hasOpenListing = !!selectedListing;
  useEffect(() => {
    if (!user?.id) { setFavoriteIds(new Set()); return; }
    if (hasOpenListing) return;
    let cancelled = false;
    supabase.from('favorites').select('listing_id').eq('user_id', user.id).then(({ data }) => {
      if (cancelled) return;
      const next = new Set((data || []).map((f) => String(f.listing_id)));
      // même contenu : on garde le même objet, la carte ne se recalcule pas pour rien
      setFavoriteIds((prev) => (prev.size === next.size && [...next].every((id) => prev.has(id)) ? prev : next));
    });
    return () => { cancelled = true; };
  }, [user?.id, hasOpenListing]);
  const favoritesOnMap = useMemo(() => listings.some((l) => favoriteIds.has(l.id)), [listings, favoriteIds]);

  // Recherche par nom : la carte vole jusqu'à l'entreprise, puis ouvre sa fiche.
  const handleSearchPick = (picked: ListingNode) => {
    const id = picked.listingId || picked.id;
    // un filtre de secteur actif pourrait la masquer
    if (selectedIndustries.length > 0 && !selectedIndustries.includes(picked.industry)) setSelectedIndustries([]);
    setSelectedListing(null);
    setFocusListingId(undefined);
    flightTimers.current.forEach(clearTimeout);
    flightTimers.current = [setTimeout(() => setFocusListingId(id), 50)];
    const full = listings.find(l => l.id === id);
    if (full) flightTimers.current.push(setTimeout(() => setSelectedListing(full), 1600));
  };

  const handleToggleIndustry = (ind: string) => {
    setSelectedIndustries(prev => 
      prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]
    );
  };

  const handleClearIndustries = () => {
    setSelectedIndustries([]);
  };
  
  // La liste des six langues se déplie dans le menu, comme dans la barre du site.
  const [langOpen, setLangOpen] = useState(false);

  const handlePremiumClick = () => {
    if (!user) {
      showError(t('premium.login_required', 'Connexion requise.'));
      navigate('/login', { state: { from: location.pathname } });
    } else {
      navigate('/payment');
    }
  };

  // La même liste de secteurs que partout sur le site, filtrable par mot
  // (elle compte plusieurs centaines d'entrées).
  const industrySearchWords = industrySearch.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(Boolean);
  const availableIndustries = industryOptions(t, i18n.language).filter(o => {
    const label = o.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return industrySearchWords.every(w => label.includes(w));
  });
  
  const displayListings = selectedIndustries.length === 0 
    ? listings 
    : listings.filter(l => selectedIndustries.includes(l.industry));

  const menuItemClass = "rounded-xl px-4 py-3 cursor-pointer flex items-center transition-all text-sm font-light text-white/80 hover:text-white focus:text-white focus:bg-white/10 hover:bg-white/10 data-[highlighted]:bg-white/10 outline-none";

  const renderLogoMenuContent = () => (
    <>
      <DropdownMenuItem onClick={() => navigate('/')} className={menuItemClass}>
        <House className="mr-3 h-4 w-4" /> {t('nav.home', 'Accueil')}
      </DropdownMenuItem>
      <DropdownMenuSeparator className="bg-white/20 my-1" />
      {user ? (
        <>
          <DropdownMenuItem onClick={() => navigate('/profile')} className={menuItemClass}>
            <UserIcon className="mr-3 h-4 w-4" /> {t('nav.profile', 'Mon Profil')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/settings')} className={menuItemClass}>
            <Gear className="mr-3 h-4 w-4" /> {t('nav.settings', 'Paramètres')}
          </DropdownMenuItem>
        </>
      ) : (
        <DropdownMenuItem onClick={() => navigate('/login')} className={menuItemClass}>
          <UserIcon className="mr-3 h-4 w-4" /> {t('nav.login', 'Connexion')}
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator className="bg-white/20 my-1" />
      
      <DropdownMenuItem
        onSelect={(e) => { e.preventDefault(); setLangOpen((v) => !v); }}
        aria-expanded={langOpen}
        className={`${menuItemClass} justify-between`}
      >
        <div className="flex items-center">
          <Translate className="mr-3 h-4 w-4 text-blue-400" />
          {t('lang.switch', 'Langue')}
        </div>
        <span className="flex items-center gap-2">
          <LanguageFlag code={i18n.language} size={20} />
          <span aria-hidden="true" className={`text-white/50 text-xs transition-transform ${langOpen ? 'rotate-180' : ''}`}>▾</span>
        </span>
      </DropdownMenuItem>
      {langOpen && (
        <div className="mx-2 mb-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {LANGUAGES.map((l) => (
            <DropdownMenuItem
              key={l.code}
              lang={l.code}
              onSelect={(e) => { e.preventDefault(); void setLanguage(l.code); }}
              className="rounded-lg px-3 py-2.5 cursor-pointer flex items-center gap-3 text-sm font-light text-white/80 focus:text-white focus:bg-white/10 data-[highlighted]:bg-white/10 outline-none"
            >
              <LanguageFlag code={l.code} size={20} />
              <span className="flex-1">{l.label}</span>
              {(i18n.language || 'fr').slice(0, 2) === l.code && <span aria-hidden="true" style={{ color: '#a5b4fc' }}>✓</span>}
            </DropdownMenuItem>
          ))}
        </div>
      )}

      <DropdownMenuItem onClick={(e) => { e.preventDefault(); setTheme(theme === 'dark' ? 'light' : 'dark'); }} className={menuItemClass}>
        {theme === 'dark' ? <Sun className="mr-3 h-4 w-4 text-yellow-400" /> : <Moon className="mr-3 h-4 w-4 text-slate-300" />}
        {theme === 'dark' ? t('theme.light', 'Mode Clair') : t('theme.dark', 'Mode Sombre')}
      </DropdownMenuItem>
    </>
  );

  return (
    <div className="full-screen-page relative w-full h-screen overflow-hidden bg-background text-foreground transition-colors duration-500 text-white">
      <AnimatePresence>
        {!isOverlayOpen && (
          <div className="fixed top-[calc(env(safe-area-inset-top,0px)+1.5rem)] left-0 w-full z-[100] pointer-events-none h-16">
            
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute left-2 sm:left-6 top-0 flex items-center gap-1.5 sm:gap-3 pointer-events-auto">
              <Link to="/marketplace">
                <button className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full shadow-2xl border border-white/40 dark:border-white/20 liquid-glass transition-all hover:scale-105 hover:border-white/60 bg-black/40 dark:bg-black/30 text-white" title={t('nav.market', 'Marketplace')}>
                  <Storefront className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </button>
              </Link>
              <button onClick={() => navigate(-1)} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full shadow-2xl border border-white/40 dark:border-white/20 liquid-glass transition-all hover:scale-105 hover:border-white/60 text-white/90 hover:text-white bg-black/40 dark:bg-black/30" title={t('back', 'Retour')}>
                <CaretLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>

              <div className="hidden sm:block pointer-events-auto ml-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="outline-none flex items-center justify-center">
                      <img src="/logo.png" alt="Globly" className="h-16 object-contain drop-shadow-[0_2px_5px_rgba(0,0,0,0.4)] dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-transform hover:scale-105" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 p-1.5 liquid-glass-heavy bg-black/60 backdrop-blur-xl border border-white/20 rounded-[1.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.6)] text-white z-[150] overflow-hidden" align="start" sideOffset={8}>
                    {renderLogoMenuContent()}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute right-2 sm:right-6 top-0 flex items-center gap-1.5 sm:gap-4 pointer-events-auto">
              {plan === 'free' && (
                <button
                  onClick={handlePremiumClick}
                  className="flex h-10 sm:h-12 px-3 sm:px-6 rounded-full liquid-glass bg-primary/80 dark:bg-primary/20 border-primary/40 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] dark:drop-shadow-none hover:bg-primary/90 dark:hover:bg-primary/30 hover:border-primary/60 transition-all duration-500 text-[9px] sm:text-xs font-medium tracking-wide uppercase items-center"
                >
                  {/* Libellé court sur mobile (aucun breakpoint `xs` dans tailwind.config.ts) */}
                  {isMobile
                    ? <span>{t('nav.upgrade_short', 'Formules')}</span>
                    : <span>{t('nav.upgrade', 'Voir les formules')}</span>}
                </button>
              )}
              
              {user && (
                <>
                  <NotificationsMenu user={user} />
                  <button onClick={() => setIsSidebarMessagingOpen(true)} className="relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-white/40 dark:border-white/20 liquid-glass bg-black/40 dark:bg-black/30 text-white/90 hover:text-white hover:border-white/60 transition-all outline-none group cursor-pointer">
                    <ChatTeardrop className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform duration-300 drop-shadow-md dark:drop-shadow-none" />
                    {hasUnread && (
                      <span className="absolute top-2 right-2 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)] border border-[#2b2a2f]" />
                    )}
                  </button>
                </>
              )}
              <div className="sm:hidden block ml-0.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="outline-none flex items-center justify-center">
                      <img src="/logo.png" alt="Globly" className="h-10 sm:h-14 object-contain drop-shadow-[0_2px_5px_rgba(0,0,0,0.4)] dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-transform hover:scale-105" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 p-1.5 liquid-glass-heavy bg-black/60 backdrop-blur-xl border border-white/20 rounded-[1.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.6)] text-white z-[150] overflow-hidden" align="end" sideOffset={8}>
                    {renderLogoMenuContent()}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0">
        <WorldGlobe 
          listings={displayListings as any} 
          favoriteIds={favoriteIds}
          onSelectListing={handleSelectListing} 
          focusListingId={focusListingId}
          currentUserId={user?.id}
        />
      </div>

      <ZoomHint hidden={isOverlayOpen} />

      {/* Téléphone : recherche et secteurs côte à côte. Au-delà : l'une au-dessus de l'autre. */}
      <div className="absolute top-[calc(env(safe-area-inset-top,0px)+6rem)] left-6 right-6 sm:right-auto z-50 flex flex-row sm:flex-col gap-2 sm:gap-3 pointer-events-none">
        <div className="pointer-events-auto min-w-0 flex-1 sm:flex-none">
          <MapSearch listings={listings} onPick={handleSearchPick} />
        </div>
        <div className="pointer-events-auto shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-[160px] sm:w-48 liquid-glass bg-black/40 dark:bg-black/30 backdrop-blur-md border border-white/40 dark:border-white/20 rounded-xl text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] dark:drop-shadow-none font-light h-10 transition-colors shadow-none text-xs flex justify-between items-center px-4 hover:text-white hover:bg-black/60 hover:border-white/60 outline-none focus:ring-0">
                <span className="truncate">
                  {selectedIndustries.length === 0 ? t('smart.all_sectors', 'Tous les secteurs') : t('filters.selections', { count: selectedIndustries.length, defaultValue: `${selectedIndustries.length} sélection(s)` })}
                </span>
                <CaretDown className="w-4 h-4 opacity-80 ml-2 shrink-0 text-white" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[200px] sm:w-48 liquid-glass-heavy bg-black/60 backdrop-blur-xl border border-white/20 text-white rounded-xl z-[100] max-h-[40vh] overflow-y-auto custom-scrollbar">
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleClearIndustries(); }} className="cursor-pointer hover:bg-white/10 focus:bg-white/10 data-[highlighted]:bg-white/10 flex items-center gap-2 text-xs text-white outline-none transition-colors">
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${selectedIndustries.length === 0 ? 'bg-primary border-primary' : 'border-white/40'}`}>
                  {selectedIndustries.length === 0 && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                {t('smart.all_sectors', 'Tous les secteurs')}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/20" />
              <div className="px-2 pb-2 sticky top-0 z-10">
                <input
                  type="search"
                  value={industrySearch}
                  onChange={e => setIndustrySearch(e.target.value)}
                  // le menu intercepte les touches pour sa navigation au clavier
                  onKeyDown={e => e.stopPropagation()}
                  placeholder={t('filters.search_sector', 'Chercher un secteur…') as string}
                  aria-label={t('filters.search_sector', 'Chercher un secteur…') as string}
                  className="w-full h-9 px-3 rounded-lg bg-black/60 border border-white/20 text-xs text-white placeholder:text-white/45 outline-none focus:border-primary/70 [&::-webkit-search-cancel-button]:hidden"
                />
              </div>
              {availableIndustries.length === 0 && (
                <p className="px-3 py-3 text-xs text-white/50 font-light">{t('filters.no_results', 'Aucun résultat.')}</p>
              )}
              {availableIndustries.map(({ value: ind, label: indLabel }) => {
                const isSelected = selectedIndustries.includes(ind);
                return (
                  <DropdownMenuItem 
                    key={ind} 
                    onSelect={(e) => {
                      e.preventDefault();
                      handleToggleIndustry(ind);
                    }} 
                    className="cursor-pointer hover:bg-white/10 focus:bg-white/10 data-[highlighted]:bg-white/10 flex items-center gap-2 text-xs text-white outline-none transition-colors"
                  >
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-white/40'}`}>
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className="truncate">{indLabel}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+2rem)] left-4 sm:left-8 z-10 pointer-events-auto">
        <button 
          onClick={handleNewCessionClick} 
          className="w-14 h-14 flex items-center justify-center text-white transition-all duration-300 group relative liquid-glass bg-black/40 dark:bg-black/30 rounded-full border border-white/40 dark:border-white/20 hover:border-white/60 hover:scale-105 shadow-xl"
        >
          <div className="absolute inset-0 bg-primary/40 dark:bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          <Plus className="w-8 h-8 relative z-10 text-white drop-shadow-lg dark:drop-shadow-none" strokeWidth={1.5} />
        </button>
      </div>

      {/* Légende discrète, seulement si au moins un favori est sur la carte.
          Un appui ouvre la rubrique « Mes favoris » du tableau de bord. */}
      {favoritesOnMap && !isOverlayOpen && (
        <Link
          to="/dashboard"
          state={{ tab: 'favorites' }}
          className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+3.1rem)] left-[5.25rem] sm:left-[6.5rem] z-10 pointer-events-auto select-none flex items-center gap-1.5 -m-3 p-3 text-[11px] font-light text-white/75 hover:text-white active:text-white transition-colors drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]"
        >
          <Heart weight="fill" className="w-3 h-3" style={{ color: FAVORITE_COLOR }} />
          {t('globe.legend_favorites', 'Mes favoris')}
        </Link>
      )}

      <SidebarMessaging isOpen={isSidebarMessagingOpen} onClose={() => setIsSidebarMessagingOpen(false)} user={user} />

      <UpgradeModal isOpen={upgrade.open} onClose={() => setUpgrade({ open: false })}
        title="Limite d'annonces atteinte" message={upgrade.msg} />

      <ListingForm
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSuccess={handleFormSuccess} 
        listingToEdit={listingToEdit} 
      />
      
      <BusinessModal
        listing={selectedListing}
        user={user}
        celebrate={celebrateUnlock}
        onClose={() => { setSelectedListing(null); setCelebrateUnlock(false); }}
        onContact={(l, need) => { 
          setChatListing(l); 
          setSelectedNeed(need || null);
          setIsChatOpen(true); 
        }} 
        onEdit={(l) => { setSelectedListing(null); setListingToEdit(l); setIsFormOpen(true); }} 
      />
      
      <ChatPanel 
        key={chatListing?.id}
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        listing={chatListing} 
        user={user} 
        initialNeed={selectedNeed}
      />
    </div>
  );
}