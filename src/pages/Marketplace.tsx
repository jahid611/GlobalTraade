"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { motion } from 'framer-motion';
import { SolarSystem } from '@/components/SolarSystem';
import { SmartMatchForm, MatchCriteria, BUDGET_MIN, BUDGET_MAX } from '@/components/SmartMatchForm';
import { parseBuyerProject, toMatchCriteria, hasSearchCriteria } from '@/lib/buyerProject';
import { scoreListing, ProfileCriteria } from '@/lib/matching';
import { matchGeo, regionLabel, withCountries } from '@/lib/geoRegions';
import { formatMoney } from '@/lib/markets';
import { countryLabel } from '@/lib/countries';
import { ListingForm } from '@/components/ListingForm';
import { Navbar } from '@/components/Navbar';
import { BusinessCard } from '@/components/BusinessCard';
import { AdvancedFilters, FilterState, matchesTeamSize, matchesMinAge } from '@/components/AdvancedFilters';
import { HelpBanner } from '@/components/HelpBanner';
import { Dropdown } from '@/components/PickerKit';
import { Store, Filter, Plus, Loader2, Search, X, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useListings } from '@/hooks/use-listings';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TRUSTED_MIN_AVG, TRUSTED_MIN_COUNT } from '@/components/RatingStars';
import { SearchAdsBoard } from '@/components/SearchAdsBoard';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/components/AuthProvider';
import { isBoosted } from '@/services/boostService';
import { checkPublicationQuota } from '@/services/planService';
import { UpgradeModal } from '@/components/UpgradeModal';

const DEFAULT_FILTERS: FilterState = {
  industries: [],
  countries: [],
  regions: [],
  priceMin: "",
  priceMax: "",
  revenueMin: "",
  ebitdaMin: "",
  teamSize: "",
  minAge: "",
  sharedFinancials: false,
  sortBy: "recent"
};

// Même silhouette que BusinessCard : visuel en haut, contenu dessous.
const SkeletonCard = () => (
  <div className="liquid-glass rounded-3xl border border-white/5 overflow-hidden animate-pulse">
    <div className="aspect-[16/10] bg-white/5" />
    <div className="p-5 space-y-4">
      <div className="space-y-2">
        <div className="h-5 bg-white/10 rounded w-3/4" />
        <div className="h-3 bg-white/5 rounded w-1/2" />
      </div>
      <div className="h-7 bg-white/10 rounded w-1/3" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-14 bg-white/5 rounded-xl" />
        <div className="h-14 bg-white/5 rounded-xl" />
      </div>
      <div className="border-t border-white/5 pt-4 flex justify-between">
        <div className="h-4 bg-white/5 rounded w-24" />
        <div className="h-4 bg-white/5 rounded w-10" />
      </div>
    </div>
  </div>
);

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const RESULTS_GRID = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5";

export default function Marketplace() {
  const queryClient = useQueryClient();
  const { data: listings = [], isLoading } = useListings();
  // Un visiteur sans formule payante ne reçoit aucun chiffre d'affaires ni résultat
  // (la base les masque). Tant que la liste charge, on ne conclut pas.
  const financialsVisible = isLoading || listings.length === 0 || listings.some(l => l.revenue_n1 != null || l.ebitda != null);
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const [mode, setMode] = useState<'listings' | 'search_ads'>('listings');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [upgrade, setUpgrade] = useState<{ open: boolean; msg?: string }>({ open: false });

  // Vérifie le quota d'annonces AVANT d'ouvrir le formulaire : si atteint, on
  // n'ouvre pas — on propose de passer en Business (beau message).
  const handleCreateListing = async () => {
    if (!user) return navigate('/login');
    const q = await checkPublicationQuota(user.id);
    if (!q.allowed) {
      setUpgrade({ open: true, msg: `Vous avez atteint votre limite de ${q.limit} annonce${q.limit > 1 ? 's' : ''} active${q.limit > 1 ? 's' : ''}. Passez en Business pour publier sans limite.` });
      return;
    }
    setIsFormOpen(true);
  };
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [matchCriteria, setMatchCriteria] = useState<MatchCriteria | null>(null);
  // Changer la clé remonte le formulaire de recherche intelligente : ses champs
  // reviennent à zéro en même temps que les critères appliqués.
  const [smartFormKey, setSmartFormKey] = useState(0);
  // Recherche par mot : nom, secteur ou ville, au fil de la frappe.
  const [query, setQuery] = useState("");

  const navigate = useNavigate();

  // Critères d'investissement du profil (renseignés à l'onboarding / Réglages).
  const profileCriteria = useMemo<ProfileCriteria>(() => ({
    target_sectors: user?.user_metadata?.target_sectors,
    target_budget: user?.user_metadata?.target_budget,
    target_geo: user?.user_metadata?.target_geo,
  }), [user]);

  // Vendeurs les mieux notés : leurs annonces sont mises en avant gratuitement
  const { data: trustedOwners } = useQuery({
    queryKey: ['trusted-owners'],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_ratings_summary')
        .select('user_id, avg_score, rating_count')
        .gte('avg_score', TRUSTED_MIN_AVG)
        .gte('rating_count', TRUSTED_MIN_COUNT);
      return new Set((data || []).map((r: { user_id: string }) => r.user_id));
    },
    staleTime: 1000 * 60 * 5,
  });

  const displayedListings = useMemo(() => {
    let result = listings.map(l => ({ ...l, _trusted: trustedOwners?.has(l.owner_id) || false }));

    // Recherche par mot : chaque mot doit se trouver dans le nom, le secteur
    // (dans la langue affichée) ou l'adresse.
    const words = normalize(query).split(/\s+/).filter(Boolean);
    if (words.length) {
      result = result.filter(l => {
        const haystack = normalize([
          l.name, l.industry, t(`industry.${l.industry}`, { defaultValue: l.industry || '' }) as string, l.address, l.city,
          l.country ? countryLabel(l.country, i18n.language) : '',
        ].filter(Boolean).join(' '));
        return words.every(w => haystack.includes(w));
      });
    }

    // Filtres manuels (panneau « Ajuster les filtres ») — multi-sélection combinable
    if (filters.industries.length) result = result.filter(l => filters.industries.includes(l.industry));
    // Pays et régions : une région ne retient que les annonces de son pays.
    if (filters.countries.length || filters.regions.length) result = result.filter(l => matchGeo(l, filters));
    if (filters.priceMin) result = result.filter(l => Number(l.price) >= Number(filters.priceMin));
    if (filters.priceMax) result = result.filter(l => Number(l.price) <= Number(filters.priceMax));
    if (filters.revenueMin) result = result.filter(l => Number(l.revenue_n1) >= Number(filters.revenueMin));
    if (filters.ebitdaMin) result = result.filter(l => Number(l.ebitda) >= Number(filters.ebitdaMin));
    if (filters.teamSize) result = result.filter(l => matchesTeamSize(l.employees, filters.teamSize));
    if (filters.minAge) result = result.filter(l => matchesMinAge(l.established_year, filters.minAge));
    if (filters.sharedFinancials) result = result.filter(l => l.share_financials === true);

    // Recherche intelligente -> filtre dur (secteurs/régions/budget) puis tri par pertinence
    if (matchCriteria) {
      if (matchCriteria.industries.length) result = result.filter(l => matchCriteria.industries.includes(l.industry));
      if (matchCriteria.countries?.length || matchCriteria.regions.length) result = result.filter(l => matchGeo(l, matchCriteria));
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
  }, [listings, filters, matchCriteria, profileCriteria, trustedOwners, query, t, i18n.language]);

  const handleSmartMatch = (criteria: MatchCriteria) => {
    setMatchCriteria(criteria);
    document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
    setIsMatching(true);
    // Courte transition (le calcul est réel et instantané, c'est juste l'animation).
    setTimeout(() => setIsMatching(false), 600);
  };

  // « Chercher avec mon projet de reprise » : le projet enregistré dans les
  // Réglages pré-remplit la recherche intelligente, qui fonctionne comme d'habitude.
  const myProject = useMemo(() => parseBuyerProject({
    target_sectors: user?.user_metadata?.target_sectors,
    target_budget: user?.user_metadata?.target_budget,
    target_geo: user?.user_metadata?.target_geo,
  }), [user]);
  const canSearchWithProject = !!user && hasSearchCriteria(myProject);
  const [projectSearch, setProjectSearch] = useState<{ key: number; criteria: MatchCriteria } | null>(null);
  const searchWithProject = () => {
    const criteria = toMatchCriteria(myProject, { min: BUDGET_MIN, max: BUDGET_MAX });
    const key = smartFormKey + 1;
    setProjectSearch({ key, criteria });
    setSmartFormKey(key);
    setMode('listings');
    handleSmartMatch(criteria);
  };
  // Lien direct depuis le profil ou les Réglages : /marketplace?projet=1
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get('projet') !== '1' || !user) return;
    if (canSearchWithProject) searchWithProject();
    const next = new URLSearchParams(searchParams);
    next.delete('projet');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, user]);

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.industries.length) count++;
    if (filters.countries.length) count++;
    if (filters.regions.length) count++;
    if (filters.priceMin || filters.priceMax) count++;
    if (filters.revenueMin) count++;
    if (filters.ebitdaMin) count++;
    if (filters.teamSize) count++;
    if (filters.minAge) count++;
    if (filters.sharedFinancials) count++;
    return count;
  };

  const resetAll = () => {
    setFilters(DEFAULT_FILTERS);
    setMatchCriteria(null);
    setSmartFormKey(k => k + 1);
    setQuery("");
  };

  const sortOptions = [
    { value: "recent", label: t("filters.sort.recent", "Plus récentes") as string },
    { value: "roi", label: t("filters.sort.roi", "Meilleure rentabilité") as string },
    { value: "views", label: t("filters.sort.views", "Plus vues") as string },
    { value: "price_asc", label: t("filters.sort.price_asc", "Prix croissant") as string },
    { value: "price_desc", label: t("filters.sort.price_desc", "Prix décroissant") as string },
  ];

  // Filtres en cours, affichés en pastilles que l'on retire d'un clic.
  const euros = (v: string) => formatMoney(v, i18n.language);
  const chips: { key: string; label: string; clear: () => void }[] = [
    ...(query.trim() ? [{ key: 'q', label: `« ${query.trim()} »`, clear: () => setQuery("") }] : []),
    ...filters.industries.map(v => ({
      key: `i-${v}`, label: t(`industry.${v}`, { defaultValue: v }) as string,
      clear: () => setFilters({ ...filters, industries: filters.industries.filter(x => x !== v) }),
    })),
    ...filters.countries.map(v => ({
      key: `c-${v}`, label: countryLabel(v, i18n.language),
      clear: () => setFilters(withCountries(filters, filters.countries.filter(x => x !== v))),
    })),
    ...filters.regions.map(v => ({
      key: `r-${v}`, label: regionLabel(v, i18n.language),
      clear: () => setFilters({ ...filters, regions: filters.regions.filter(x => x !== v) }),
    })),
    ...(filters.priceMin ? [{ key: 'pmin', label: `${t('market.chip_price_min', 'Prix min')} ${euros(filters.priceMin)}`, clear: () => setFilters({ ...filters, priceMin: "" }) }] : []),
    ...(filters.priceMax ? [{ key: 'pmax', label: `${t('market.chip_price_max', 'Prix max')} ${euros(filters.priceMax)}`, clear: () => setFilters({ ...filters, priceMax: "" }) }] : []),
    ...(filters.revenueMin ? [{ key: 'rev', label: `${t('market.chip_revenue_min', 'CA min')} ${euros(filters.revenueMin)}`, clear: () => setFilters({ ...filters, revenueMin: "" }) }] : []),
    ...(filters.ebitdaMin ? [{ key: 'ebe', label: `${t('market.chip_ebitda_min', 'EBE min')} ${euros(filters.ebitdaMin)}`, clear: () => setFilters({ ...filters, ebitdaMin: "" }) }] : []),
    ...(filters.teamSize ? [{ key: 'team', label: `${t('market.chip_team', 'Équipe')} ${filters.teamSize === '21+' ? t('filters.team_large', '21 et plus') : filters.teamSize.replace('-', ' à ')}`, clear: () => setFilters({ ...filters, teamSize: "" }) }] : []),
    ...(filters.minAge ? [{ key: 'age', label: t('market.chip_age', '{{n}} ans et plus', { n: filters.minAge }) as string, clear: () => setFilters({ ...filters, minAge: "" }) }] : []),
    ...(filters.sharedFinancials ? [{ key: 'fin', label: t('market.chip_shared', 'Chiffres partagés') as string, clear: () => setFilters({ ...filters, sharedFinancials: false }) }] : []),
    ...(matchCriteria ? [{ key: 'match', label: t('market.chip_smart', 'Recherche intelligente') as string, clear: () => { setMatchCriteria(null); setSmartFormKey(k => k + 1); } }] : []),
  ];

  const smartForm = (
    <SmartMatchForm key={smartFormKey} variant="hero" onResults={handleSmartMatch} onReset={() => setMatchCriteria(null)} initial={projectSearch?.key === smartFormKey ? projectSearch.criteria : undefined} />
  );

  const filtersButton = (
    <Button
      variant="ghost"
      onClick={() => setIsFilterPanelOpen(true)}
      className="text-white font-medium text-xs uppercase tracking-widest relative bg-white/10 border border-white/20 rounded-full px-5 h-12 hover:bg-white/20 transition-all shrink-0"
    >
      <Filter className="w-4 h-4 mr-2"/> {t('market.adjust_filters')}
      {getActiveFilterCount() > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white/20">
          {getActiveFilterCount()}
        </span>
      )}
    </Button>
  );

  return (
    <div className="min-h-screen bg-transparent text-white selection:bg-primary/30 relative flex flex-col">
      <SolarSystem />
      <Navbar />

      {/* Pleine largeur : la page occupe tout l'écran, avec une simple marge. */}
      <main className="relative z-10 pt-[calc(var(--nav-clearance)+2.5rem)] pb-24 px-4 sm:px-6 lg:px-10 2xl:px-14 w-full">
        {/* En-tête : titre à gauche, choix du sens à droite */}
        <div className="relative z-[110] pointer-events-none [&>*]:pointer-events-auto flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-6">
          {/* Mobile et tablette : l'astronaute en fond, derrière le titre, à droite */}
          <motion.div
            aria-hidden="true"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="xl:hidden absolute -top-3 right-0 sm:right-6 w-[92px] sm:w-[130px] z-0 !pointer-events-none"
          >
            <img src="/mascot/globi-peche.png" alt="" className="w-full h-auto" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="page-head relative z-10 pr-[100px] sm:pr-[150px] xl:pr-0">
            <PageTitle lead={t('market.title1')} accent={t('market.title2')} />
            <p className="text-white/60 text-sm md:text-base font-light mt-2">
              {t('market.subtitle', { defaultValue: "Trouvez l'entreprise qui vous correspond." }) as string}
            </p>
          </motion.div>

          {/* L'astronaute pêcheur d'étoiles, entre le titre et le choix du sens */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="hidden xl:block relative z-[110] ml-auto mr-8 -my-14 w-[190px] 2xl:w-[210px] shrink-0 !pointer-events-none opacity-95"
          >
            <img src="/mascot/globi-peche.png" alt="" className="w-full h-auto drop-shadow-2xl" />
          </motion.div>

          {/* Deux sens : entreprises à vendre / repreneurs en recherche */}
          <div className="relative z-10 flex gap-1.5 p-1.5 rounded-full bg-black/30 border border-white/10 self-start lg:self-auto backdrop-blur-md">
            <button
              onClick={() => setMode('listings')}
              className={`px-5 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all outline-none ${
                mode === 'listings' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/60 hover:text-white'
              }`}
            >
              {t('market.mode_listings', 'Entreprises à vendre')}
            </button>
            <button
              onClick={() => setMode('search_ads')}
              className={`px-5 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all outline-none ${
                mode === 'search_ads' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/60 hover:text-white'
              }`}
            >
              {t('market.mode_search_ads', 'Repreneurs en recherche')}
            </button>
          </div>
        </div>

        {mode === 'search_ads' ? (
          <div className="relative z-10 max-w-5xl mx-auto">
            <HelpBanner
              title={t('help.market_title', 'Comment fonctionne la marketplace ?') as string}
              desc={t('help.market_desc', '') as string}
              className="mb-8"
            />
            <SearchAdsBoard />
          </div>
        ) : (
        <div className="relative z-10">

          {/* ── La recherche intelligente : l'élément principal de la page ── */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
            {smartForm}
            {/* Raccourci : la recherche pré-remplie avec le projet de reprise du membre */}
            {user && (
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl bg-white/[0.04] border border-white/10 px-4 sm:px-5 py-3.5">
                <Target className="w-5 h-5 text-[#a5b4fc] shrink-0 hidden sm:block" />
                <p className="flex-1 min-w-0 text-sm text-white/70 font-light leading-snug">
                  {canSearchWithProject
                    ? t('bp.search_hint', 'Votre projet de reprise est enregistré : lancez la recherche avec vos secteurs, vos régions et votre budget, sans rien retaper.')
                    : t('bp.search_hint_empty', 'Décrivez votre projet de reprise une fois : vous pourrez ensuite lancer cette recherche en un clic.')}
                </p>
                {canSearchWithProject ? (
                  <button
                    type="button"
                    onClick={searchWithProject}
                    className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-full bg-primary/25 hover:bg-primary/40 border border-primary/50 text-sm font-medium text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50 shrink-0"
                  >
                    <Search className="w-4 h-4 shrink-0" /> {t('bp.search_cta', 'Chercher avec mon projet de reprise')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/settings#criteres')}
                    className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/20 text-sm font-medium text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50 shrink-0"
                  >
                    {t('bp.fill_cta', 'Décrire mon projet')}
                  </button>
                )}
              </div>
            )}
          </motion.div>

          {/* L'aide passe sous la recherche : elle explique, elle ne doit pas la précéder. */}
          <HelpBanner
            title={t('help.market_title', 'Comment fonctionne la marketplace ?') as string}
            desc={t('help.market_desc', '') as string}
            className="mb-10"
          />

          {/* ── Résultats ── */}
          <div id="results" className="w-full scroll-mt-[calc(var(--nav-clearance)+1rem)]">
            <div className="flex flex-col gap-4 border-b border-white/15 pb-5 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                <div>
                  <h2 className="text-2xl font-light text-white">{t('market.portfolios')}</h2>
                  <p className="text-sm text-white/70 font-light mt-1">
                    {isLoading
                      ? t('market.loading', 'Chargement des opportunités…')
                      : <><span className="text-white font-medium">{displayedListings.length}</span> {t('market.found')}</>}
                  </p>
                </div>
                {matchCriteria && (
                  <button
                    onClick={() => { setMatchCriteria(null); setSmartFormKey(k => k + 1); }}
                    className="inline-flex items-center gap-2 text-xs text-[#a5b4fc] hover:text-white transition-colors self-start sm:self-auto"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    {t('market.sorted_relevance', 'Trié par pertinence')} · {t('market.clear_match', 'réinitialiser')}
                  </button>
                )}
              </div>

              {/* Barre d'outils : chercher, trier, filtrer */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/45 pointer-events-none" />
                  <input
                    type="search"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder={t('market.search_placeholder', 'Chercher un nom, un métier, une ville…') as string}
                    aria-label={t('market.search_label', 'Chercher une entreprise') as string}
                    className="w-full h-12 pl-11 pr-11 rounded-full bg-white/5 border border-white/15 text-sm text-white placeholder:text-white/40 outline-none focus:border-primary/70 focus:bg-white/[0.07] transition-colors [&::-webkit-search-cancel-button]:hidden"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      aria-label={t('market.search_clear', 'Effacer la recherche') as string}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <Dropdown
                    value={filters.sortBy}
                    options={sortOptions}
                    onChange={v => setFilters({ ...filters, sortBy: v as FilterState['sortBy'] })}
                    className="flex-1 md:flex-none md:w-56"
                    buttonClassName="w-full flex items-center justify-between gap-2 bg-white/5 border border-white/15 rounded-full px-5 h-12 text-sm text-white outline-none hover:border-white/30 transition-colors"
                  />
                  {filtersButton}
                </div>
              </div>

              {chips.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {chips.map(chip => (
                    <button
                      key={chip.key}
                      onClick={chip.clear}
                      className="inline-flex items-center gap-1.5 pl-3 pr-2 h-8 rounded-full bg-primary/20 border border-primary/40 text-xs text-white hover:bg-primary/30 transition-colors"
                    >
                      <span className="truncate max-w-[14rem]">{chip.label}</span>
                      <X className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  ))}
                  <button onClick={resetAll} className="text-xs text-white/60 hover:text-white underline underline-offset-4 ml-1 transition-colors">
                    {t('market.clear_all', 'Tout effacer')}
                  </button>
                </div>
              )}
            </div>

            {isMatching ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                 <div className="flex items-center justify-center py-2 gap-4">
                   <Loader2 className="w-8 h-8 text-primary animate-spin" />
                   <p className="text-white/60 font-medium tracking-widest uppercase text-sm">{t('smart.analyzing') || 'Analyse algorithmique en cours...'}</p>
                 </div>
                 <div className={RESULTS_GRID}>
                   {[1,2,3,4,5,6,7,8].map(i => <SkeletonCard key={i} />)}
                 </div>
              </motion.div>
            ) : isLoading ? (
              <div className={RESULTS_GRID}>
                {[1,2,3,4,5,6,7,8].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : displayedListings.length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-20 px-6 text-center flex flex-col items-center bg-black/20 border border-white/20 border-dashed rounded-[2rem] backdrop-blur-md">
                <Store className="w-12 h-12 text-white/50 mx-auto mb-6" strokeWidth={1} />
                <h3 className="text-xl font-medium text-white mb-2">{t('market.no_match_title')}</h3>
                <p className="text-white/80 font-light text-sm md:text-base max-w-md mx-auto mb-6 leading-relaxed">
                  {t('market.no_match_desc')}
                </p>
                <Button variant="outline" onClick={resetAll} className="text-white bg-transparent border-white/30 hover:bg-white/10 rounded-full font-medium h-12 px-8 transition-all">
                  {t('market.reset_filters')}
                </Button>
              </motion.div>
            ) : (
              <div className={RESULTS_GRID}>
                {displayedListings.map((l, i) => (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.4) }}
                  >
                    <BusinessCard
                      listing={l}
                      matchScore={l._matchScore}
                      onClick={() => navigate('/app', { state: { focusId: l.id } })}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
        )}
      </main>

      {mode === 'listings' && (
        <div className="fixed bottom-[4vh] sm:bottom-8 right-[4vw] sm:right-8 z-[110]">
          <button
            onClick={handleCreateListing}
            aria-label={t('market.publish', 'Publier une annonce') as string}
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
        financialsVisible={financialsVisible}
      />

      <ListingForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['listings'] })}
      />

      <UpgradeModal isOpen={upgrade.open} onClose={() => setUpgrade({ open: false })}
        title="Limite d'annonces atteinte" message={upgrade.msg} />
    </div>
  );
}
