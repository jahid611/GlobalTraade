"use client";

import React, { useEffect, useMemo, useState } from "react";
import { PageTitle } from '@/components/PageTitle';
import { radarPathForIndustry } from "@/lib/industryApe";
import type { Listing, SearchAd } from '@/types/domain';
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { SolarSystem } from "@/components/SolarSystem";
import { ChatPanel } from "@/components/ChatPanel";
import { BusinessCard } from "@/components/BusinessCard";
import { HelpBanner } from "@/components/HelpBanner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { UsersThree, Storefront, ChatCircle, MapPin, Plus, ChartBar, RocketLaunch, Handshake, Scales, MapTrifold, ArrowRight, CaretDown, Binoculars } from "@/components/icons/ph";
import { Loader2 } from "@/components/icons";
import { INDUSTRIES, industryOptions, canonicalIndustry } from "@/lib/industries";
import { useSearchAds } from "@/components/SearchAdsBoard";
import { fetchProjects, type Project } from "@/services/projectService";
import { usePlan, hasContentAccess } from "@/services/planService";
import { listUnlockedIds } from "@/services/unlockService";
import { Section, EmptyState, primaryBtn, ghostBtn } from "@/components/sector/Section";
import { SectorHero } from "@/components/sector/SectorHero";
import { SectorStats, SectorPriceGuide } from "@/components/sector/SectorStats";
import { SectorBuyerCard } from "@/components/sector/SectorBuyers";
import { SectorProjectCard } from "@/components/sector/SectorProjectCard";
import { SectorMemberCard, type SectorMember } from "@/components/sector/SectorMemberCard";
import { adMatchesSector, isOnSale, latestDate, priceStats, toList } from "@/components/sector/sectorData";

const INDUSTRY_SET = new Set(INDUSTRIES);
const CARDS_GRID = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5";
const WIDE_GRID = "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5";
// Au-delà, le reste s'affiche d'un clic (« Afficher les suivants »).
const FIRST_BATCH = 8;

export default function SectorNetwork() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeSector, setActiveSector] = useState<string | null>(null);
  const [chatListing, setChatListing] = useState<any | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showAllPeers, setShowAllPeers] = useState(false);
  const [showAllMembers, setShowAllMembers] = useState(false);

  // Mes annonces -> mes secteurs
  const { data: myListings = [], isLoading: loadingMine } = useQuery({
    queryKey: ["my-listings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("listings_secure").select("*").eq("owner_id", user!.id);
      return data || [];
    },
  });

  const mySectors = useMemo(
    () => Array.from(new Set(myListings.map((l: Listing) => l.industry).filter(Boolean))) as string[],
    [myListings]
  );
  // Sans annonce : on part du premier secteur visé dans le profil, s'il y en a un.
  const profileSector = useMemo(
    () => toList(user?.user_metadata?.target_sectors).find((s) => INDUSTRY_SET.has(s)) || null,
    [user]
  );
  const sector = activeSector || mySectors[0] || profileSector || null;
  const isMine = !!sector && mySectors.includes(sector);

  const sectorOptions = useMemo(() => industryOptions(t, i18n.language), [t, i18n.language]);
  const sectorLabel = sector ? String(t(`industry.${sector}`, { defaultValue: sector as string })) : "";

  useEffect(() => { setShowAllPeers(false); setShowAllMembers(false); }, [sector]);

  // Confrères du même secteur (autres annonces de la même industrie)
  const { data: peers = [], isLoading: loadingPeers } = useQuery({
    queryKey: ["sector-peers", sector, user?.id],
    enabled: !!user && !!sector,
    queryFn: async () => {
      const { data } = await supabase
        .from("listings_secure")
        .select("*")
        .eq("industry", sector)
        .neq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Repreneurs en recherche (vue masquante search_ads_secure) qui visent ce secteur
  const { data: allAds = [], isLoading: loadingAds } = useSearchAds();
  const buyers = useMemo(
    () => (sector ? (allAds as SearchAd[]).filter((ad) => adMatchesSector(ad, sector)) : []),
    [allAds, sector]
  );

  // Même règle d'accès que la page « Repreneurs en recherche »
  const { plan, isFetching: planFetching } = usePlan(user?.id);
  const { data: unlockedIds } = useQuery({
    queryKey: ['unlock', user?.id, 'search_ad', 'all'],
    queryFn: () => listUnlockedIds(user!.id, 'search_ad'),
    enabled: !!user?.id && plan === 'free',
    staleTime: 1000 * 60 * 5,
  });
  const isEntitled = (ad: SearchAd) => hasContentAccess({
    isOwner: user?.id === ad.owner_id,
    plan,
    planFetching,
    unlocked: !!unlockedIds?.has(ad.id),
  });
  // Le profil ne s'ouvre que si le SERVEUR a réellement accordé l'accès.
  const hasFullAccess = (ad: SearchAd) => isEntitled(ad) && ad.has_full_access !== false;
  // Juste après un paiement, la liste en cache est encore la version masquée.
  const staleMasked = buyers.some((ad) => ad.has_full_access === false && isEntitled(ad));
  useEffect(() => {
    if (staleMasked) queryClient.invalidateQueries({ queryKey: ['search-ads'] });
  }, [staleMasked, queryClient]);

  // Projets publiés (vue masquante projects_secure) rattachés à ce secteur
  const { data: allProjects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["projects", "sector-page"],
    queryFn: () => fetchProjects(),
    staleTime: 1000 * 60 * 2,
  });
  const projects = useMemo(
    () => (sector ? (allProjects as Project[]).filter((p) => canonicalIndustry(p.category) === sector) : []),
    [allProjects, sector]
  );

  // Commerçants du secteur : les propriétaires des annonces affichées
  const peersByOwner = useMemo(() => {
    const map = new Map<string, Listing[]>();
    for (const l of peers as Listing[]) {
      if (!l.owner_id) continue;
      map.set(l.owner_id, [...(map.get(l.owner_id) || []), l]);
    }
    return map;
  }, [peers]);
  const ownerIds = useMemo(() => Array.from(peersByOwner.keys()).slice(0, 100), [peersByOwner]);
  const { data: ownerProfiles = [] } = useQuery({
    queryKey: ["sector-members", sector, ownerIds],
    enabled: ownerIds.length > 0,
    queryFn: async () => {
      // `profiles` est restreinte à soi-même : on passe par la vue publique.
      const { data } = await supabase.from("safe_profiles").select("id, full_name, avatar_url, kyc_status").in("id", ownerIds);
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });
  const members = useMemo<SectorMember[]>(() => {
    const byId = new Map((ownerProfiles as Omit<SectorMember, "listings">[]).map((p) => [p.id, p]));
    return ownerIds.map((id) => ({
      id,
      full_name: byId.get(id)?.full_name ?? null,
      avatar_url: byId.get(id)?.avatar_url ?? null,
      kyc_status: byId.get(id)?.kyc_status ?? null,
      listings: peersByOwner.get(id) || [],
    }));
  }, [ownerIds, ownerProfiles, peersByOwner]);

  // Chiffres clés : uniquement des lignes réelles, encore à vendre
  const mineInSector = useMemo(
    () => (sector ? (myListings as Listing[]).filter((l) => l.industry === sector) : []),
    [myListings, sector]
  );
  const onSale = useMemo(() => [...(peers as Listing[]), ...mineInSector].filter(isOnSale), [peers, mineInSector]);
  const prices = useMemo(() => priceStats(onSale), [onSale]);

  const openChat = (listing: Listing) => {
    setChatListing(listing);
    setIsChatOpen(true);
  };

  const cityOf = (l: Listing) => l.location || (l.address ? String(l.address).split(",").slice(-1)[0].trim() : "—");

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const shownPeers = showAllPeers ? (peers as Listing[]) : (peers as Listing[]).slice(0, FIRST_BATCH);
  const shownMembers = showAllMembers ? members : members.slice(0, FIRST_BATCH);

  const showMore = (rest: number, onClick: () => void) => (
    <div className="flex justify-center mt-6">
      <button type="button" onClick={onClick} className={ghostBtn}>
        <CaretDown size={16} /> {t("sector.show_more", { defaultValue: "Afficher les {{n}} suivants", n: rest })}
      </button>
    </div>
  );

  const publishLink = (
    <Link to="/marketplace" className="inline-flex shrink-0">
      <Button className="rounded-full h-12 px-8 bg-white text-black hover:bg-white/90 font-medium [text-shadow:none]">
        <Plus className="w-4 h-4 mr-2" /> {t("sector.publish_mine", "Publier mon annonce")}
      </Button>
    </Link>
  );

  return (
    <div className="min-h-screen bg-transparent text-white selection:bg-primary/30 relative flex flex-col">
      <SolarSystem />
      <Navbar />

      {/* Pleine largeur : la page occupe tout l'écran, avec une simple marge. */}
      <main className="relative z-10 pt-[calc(var(--nav-clearance)+2.5rem)] pb-24 px-4 sm:px-6 lg:px-10 2xl:px-14 w-full">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="page-head mb-7">
          <PageTitle className="mb-3" lead={t("sector.title1", "Réseau de mon")} accent={t("sector.title2", "secteur")} />
          <p className="text-white/70 font-light text-[15px] md:text-base max-w-3xl leading-relaxed">
            {t("sector.intro_a", "Vos repreneurs les plus probables sont")} <strong className="text-white font-medium">{t("sector.intro_b", "dans votre métier")}</strong>.{" "}
            {t("sector.intro_c", "Contactez les commerçants de votre secteur : en les approchant, ils sauront que vous envisagez de céder.")}
          </p>
        </motion.div>

        {loadingMine ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* Bandeau secteur actif, choix d'un autre secteur, gestes possibles */}
            <SectorHero
              sector={sector}
              sectorLabel={sectorLabel}
              isMine={isMine}
              mySectors={mySectors}
              options={sectorOptions}
              onSelect={setActiveSector}
              peersCount={peers.length}
              loadingPeers={loadingPeers}
              onPublish={() => navigate("/marketplace")}
              onMap={() => navigate("/app")}
              onBuyers={() => (sector ? scrollTo("sector-buyers") : navigate("/marketplace"))}
              onPeers={() => (sector ? scrollTo("sector-listings") : navigate("/marketplace"))}
              onMessages={() => navigate("/messages")}
              onProspect={() => navigate(radarPathForIndustry(sector))}
            />

            <HelpBanner
              title={t('help.sector_title', 'Comment fonctionne le réseau de votre secteur ?') as string}
              desc={t('help.sector_desc', 'Vos repreneurs les plus probables sont dans votre métier. Contactez les commerçants de votre secteur : en les approchant, ils sauront que vous envisagez de céder.') as string}
              className="mt-6"
            />

            {/* Pas d'annonce -> pas de secteur à soi */}
            {mySectors.length === 0 && (
              <div className={`liquid-glass-heavy border border-white/10 mt-6 ${sector ? "rounded-3xl p-6 sm:p-7 flex flex-col md:flex-row md:items-center gap-5" : "rounded-[2.5rem] p-8 sm:p-12 text-center max-w-2xl mx-auto"}`}>
                <Storefront weight="duotone" className={`text-primary shrink-0 ${sector ? "w-12 h-12" : "w-16 h-16 mx-auto mb-6"}`} />
                <div className="min-w-0 flex-1">
                  <h2 className={`font-light ${sector ? "text-xl mb-1.5" : "text-2xl mb-3"}`}>{t("sector.join_title", "Rejoignez votre réseau sectoriel")}</h2>
                  <p className={`text-white/70 leading-relaxed text-[15px] ${sector ? "" : "mb-8"}`}>
                    {t("sector.join_desc", "Publiez d'abord votre annonce : votre secteur d'activité déterminera les commerçants que vous pouvez contacter.")}
                  </p>
                </div>
                {publishLink}
              </div>
            )}

            {sector && (
              <>
                {/* ── Chiffres clés ── */}
                <Section
                  id="sector-stats"
                  icon={ChartBar}
                  title={t("sector.sec_stats", "Le secteur en chiffres")}
                  subtitle={t("sector.sec_stats_sub", { defaultValue: "Ce que Globly sait aujourd'hui du secteur « {{sector}} ».", sector: sectorLabel })}
                >
                  <SectorStats
                    onSaleCount={onSale.length}
                    mineCount={mineInSector.filter(isOnSale).length}
                    prices={prices}
                    latest={latestDate(onSale)}
                    buyersCount={buyers.length}
                    projectsCount={projects.length}
                    membersCount={members.length}
                    loading={loadingPeers || loadingAds || loadingProjects}
                  />
                </Section>

                {/* ── Liste des confrères ── */}
                <Section
                  id="sector-listings"
                  icon={Storefront}
                  title={t("sector.sec_listings", "Entreprises à vendre dans ce secteur")}
                  subtitle={t("sector.sec_listings_sub", "Ce sont vos confrères. Cliquez sur une fiche pour écrire directement au commerçant.")}
                  count={loadingPeers ? undefined : peers.length}
                  action={
                    <button type="button" onClick={() => navigate("/app")} className={ghostBtn}>
                      <MapTrifold size={18} /> {t("sector.see_map", "Voir sur la carte")}
                    </button>
                  }
                >
                  {mineInSector.length > 0 && (
                    <div className="mb-5 rounded-2xl bg-primary/10 border border-primary/35 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <p className="text-[15px] text-white/85 font-light leading-relaxed flex-1 min-w-0">
                        {mineInSector.length > 1
                          ? t("sector.mine_many", { defaultValue: "Vous avez {{n}} annonces dans ce secteur. Elles ne figurent pas dans la liste ci-dessous : seuls vos confrères y sont.", n: mineInSector.length })
                          : t("sector.mine_one", { defaultValue: "Votre annonce « {{name}} » est dans ce secteur. Elle ne figure pas dans la liste ci-dessous : seuls vos confrères y sont.", name: mineInSector[0].name })}
                      </p>
                      <button type="button" onClick={() => navigate("/dashboard")} className={`${ghostBtn} shrink-0`}>
                        {t("sector.mine_cta", "Voir mes annonces")} <ArrowRight size={16} />
                      </button>
                    </div>
                  )}

                  {loadingPeers ? (
                    <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                  ) : peers.length === 0 ? (
                    <EmptyState
                      icon={UsersThree}
                      title={t("sector.peers_empty_title", "Aucun autre commerçant de ce secteur sur Globly pour l'instant.")}
                      desc={t("sector.peers_empty_desc", "Revenez bientôt : le réseau grandit chaque jour. En attendant, vous pouvez chercher des entreprises de ce métier dans le registre public, ou regarder un secteur voisin.")}
                    >
                      <button type="button" onClick={() => navigate(radarPathForIndustry(sector))} className={primaryBtn}>
                        <Binoculars size={18} weight="fill" /> {t("sector.peers_empty_cta", "Chercher dans le registre public")}
                      </button>
                      <button type="button" onClick={() => navigate("/marketplace")} className={ghostBtn}>
                        {t("sector.all_listings", "Voir toutes les entreprises à vendre")}
                      </button>
                    </EmptyState>
                  ) : (
                    <>
                      <div className={CARDS_GRID}>
                        {shownPeers.map((l: Listing) => (
                          <div key={l.id} className="flex flex-col gap-2.5 min-w-0">
                            <div className="flex-1 min-h-0">
                              <BusinessCard listing={l} onClick={() => openChat(l)} />
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                              <button type="button" onClick={() => openChat(l)} className={`${primaryBtn} px-3`}>
                                <ChatCircle size={18} weight="fill" /> {t("sector.card_write", "Écrire")}
                              </button>
                              <button type="button" onClick={() => navigate('/app', { state: { focusId: l.id } })} className={`${ghostBtn} px-3`}>
                                <MapPin size={18} /> {t("sector.card_details", "Voir la fiche")}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {peers.length > shownPeers.length && showMore(peers.length - shownPeers.length, () => setShowAllPeers(true))}
                    </>
                  )}
                </Section>

                {/* ── Repreneurs en recherche ── */}
                <Section
                  id="sector-buyers"
                  icon={UsersThree}
                  title={t("sector.sec_buyers", "Repreneurs qui cherchent dans ce secteur")}
                  subtitle={t("sector.sec_buyers_sub", "Ces personnes ont publié une recherche : elles veulent reprendre une entreprise de ce métier.")}
                  count={loadingAds ? undefined : buyers.length}
                  action={
                    <button type="button" onClick={() => navigate("/marketplace")} className={ghostBtn}>
                      {t("sector.all_buyers", "Toutes les recherches")} <ArrowRight size={16} />
                    </button>
                  }
                >
                  {loadingAds ? (
                    <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                  ) : buyers.length === 0 ? (
                    <EmptyState
                      icon={UsersThree}
                      title={t("sector.buyers_empty_title", "Aucun repreneur n'a encore publié de recherche dans ce secteur.")}
                      desc={t("sector.buyers_empty_desc", "Les repreneurs trouvent surtout les entreprises par leur annonce : publiez la vôtre pour être visible. Vous pouvez aussi consulter toutes les recherches dans la marketplace, onglet « Repreneurs en recherche ».")}
                    >
                      <button type="button" onClick={() => navigate("/marketplace")} className={primaryBtn}>
                        {t("sector.buyers_empty_cta", "Ouvrir la marketplace")} <ArrowRight size={16} />
                      </button>
                    </EmptyState>
                  ) : (
                    <ul className={WIDE_GRID}>
                      {buyers.map((ad) => (
                        <SectorBuyerCard key={ad.id} ad={ad} userId={user?.id} hasFullAccess={hasFullAccess(ad)} />
                      ))}
                    </ul>
                  )}
                </Section>

                {/* ── Projets ── */}
                <Section
                  id="sector-projects"
                  icon={RocketLaunch}
                  title={t("sector.sec_projects", "Projets dans ce secteur")}
                  subtitle={t("sector.sec_projects_sub", "Des entrepreneurs de ce métier cherchent de l'argent, des associés, du matériel ou des conseils.")}
                  count={loadingProjects ? undefined : projects.length}
                  action={
                    <button type="button" onClick={() => navigate("/projects")} className={ghostBtn}>
                      {t("sector.all_projects", "Tous les projets")} <ArrowRight size={16} />
                    </button>
                  }
                >
                  {loadingProjects ? (
                    <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                  ) : projects.length === 0 ? (
                    <EmptyState
                      icon={RocketLaunch}
                      title={t("sector.projects_empty_title", "Aucun projet publié dans ce secteur pour le moment.")}
                      desc={t("sector.projects_empty_desc", "Vous avez un projet dans ce métier, ou vous voulez en soutenir un ? Tout se passe sur la page Projets.")}
                    >
                      <button type="button" onClick={() => navigate("/projects")} className={primaryBtn}>
                        {t("sector.projects_empty_cta", "Ouvrir la page Projets")} <ArrowRight size={16} />
                      </button>
                    </EmptyState>
                  ) : (
                    <ul className={WIDE_GRID}>
                      {projects.map((p) => (
                        <SectorProjectCard key={p.id} project={p} onOpen={() => navigate(`/projects?focus=${p.id}`)} />
                      ))}
                    </ul>
                  )}
                </Section>

                {/* ── Commerçants du secteur (les propriétaires des annonces ci-dessus) ── */}
                {(loadingPeers || members.length > 0) && <Section
                  id="sector-members"
                  icon={Handshake}
                  title={t("sector.sec_members", "Les commerçants du secteur")}
                  subtitle={t("sector.sec_members_sub", "Les personnes derrière les annonces ci-dessus. Écrivez-leur, ou consultez leur profil.")}
                  count={loadingPeers ? undefined : members.length}
                >
                  {loadingPeers ? (
                    <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                  ) : members.length === 0 ? (
                    <EmptyState
                      icon={Handshake}
                      title={t("sector.members_empty_title", "Personne à contacter dans ce secteur pour le moment.")}
                      desc={t("sector.members_empty_desc", "Dès qu'un commerçant de ce métier publiera une annonce, il apparaîtra ici et vous pourrez lui écrire.")}
                    />
                  ) : (
                    <>
                      <ul className={WIDE_GRID}>
                        {shownMembers.map((m) => (
                          <SectorMemberCard
                            key={m.id}
                            member={m}
                            onWrite={() => openChat(m.listings[0])}
                            onProfile={() => navigate(`/profile/${m.id}`)}
                          />
                        ))}
                      </ul>
                      {members.length > shownMembers.length && showMore(members.length - shownMembers.length, () => setShowAllMembers(true))}
                    </>
                  )}
                </Section>}

                {/* ── Repères de prix du métier ── */}
                <Section
                  id="sector-guide"
                  icon={Scales}
                  title={t("sector.sec_guide", "Repères de prix pour ce métier")}
                  subtitle={t("sector.sec_guide_sub", "Pour situer un prix de vente, deux calculs simples sont couramment utilisés.")}
                >
                  <SectorPriceGuide sector={sector} sectorLabel={sectorLabel} country={mineInSector[0]?.country} />
                </Section>
              </>
            )}
          </>
        )}
      </main>

      <ChatPanel
        key={chatListing?.id}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        listing={chatListing}
        user={user}
      />
    </div>
  );
}
