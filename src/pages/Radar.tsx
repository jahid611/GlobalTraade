"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { canonicalDepartment } from "@/lib/departments";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { SolarSystem } from "@/components/SolarSystem";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CircleNotch, Binoculars, Question, CaretDown, Warning, ArrowClockwise, MagnifyingGlass } from "phosphor-react";
import { showError, showSuccess } from "@/utils/toast";
// Toast avec bouton d'action (« Voir dans mon CRM ») : `toast` de sonner en direct.
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { searchCompanies, type CompanyResult } from "@/services/sireneService";
import { supabase } from "@/integrations/supabase/client";
import { APE_CODES } from "@/data/apeCodes";
import { usePlan, isApeLocked } from "@/services/planService";
import { listProspects, addProspect } from "@/services/prospectService";
import { CrmWorkspace } from "@/components/crm/CrmWorkspace";
import { RadarHero } from "@/components/radar/RadarHero";
import { RadarTabs, type RadarTab } from "@/components/radar/RadarTabs";
import { CompanyCard, CompanyCardSkeleton } from "@/components/radar/CompanyCard";
import { ScoreLegend } from "@/components/radar/ScoreLegend";
import { ResultsPager } from "@/components/radar/ResultsPager";
import { LockedScreen } from "@/components/radar/LockedScreen";

const APE_OPTIONS = APE_CODES.map((c) => ({ value: c.code, label: c.label, group: c.group }));
const APE_LABELS = new Map(APE_CODES.map((c) => [c.code, c.label]));

const MAIN_CLASS = "relative z-10 pt-[calc(var(--nav-clearance)+2.5rem)] pb-24 px-4 sm:px-6 lg:px-10 2xl:px-14 w-full";

export default function Radar() {
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const numberLocale = i18n.language?.startsWith("en") ? "en-US" : "fr-FR";
  const { user } = useAuth();
  const navigate = useNavigate();
  const senderName = user?.user_metadata?.full_name || user?.email || "[Votre nom]";
  const [tab, setTab] = useState<RadarTab>("search");
  // Formules : page inaccessible en gratuit ; Pro = recherche + CRM
  // (envoi réservé Business) ; Business = 20 contacts/mois puis 2 €.
  const { plan, isLoading: planLoading, isFetching: planFetching } = usePlan(user?.id);

  // --- Recherche ---
  const [ape, setApe] = useState("25.62B");
  const [dept, setDept] = useState("69");
  const [strictDept, setStrictDept] = useState(true);
  const [page, setPage] = useState(1);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  // Nombre d'entreprises renvoyées pour la page AVANT le filtre « département
  // strict » (appliqué après pagination : une page peut se retrouver vide).
  const [pageRawCount, setPageRawCount] = useState(0);
  const [adding, setAdding] = useState<string | null>(null);
  // Dernière recherche en échec : message affiché à la place des résultats.
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  // Page demandée en dernier : c'est elle que « Réessayer » relance.
  const attemptedPage = useRef(1);

  // --- Profil : la prospection est bridée au code APE du membre ---
  // (obligation de renseigner son secteur ; seuls les admins prospectent librement)
  const { data: myProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["radar-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('ape_code, is_admin').eq('id', user!.id).single();
      return data;
    },
    enabled: !!user?.id,
  });
  // Le code APE n'est verrouillé (à son propre secteur) qu'en dessous de
  // Business. En Business (ou admin), on prospecte n'importe quel code APE.
  const apeLocked = isApeLocked(plan, planFetching, myProfile?.is_admin);
  const [savingApe, setSavingApe] = useState(false);

  useEffect(() => {
    if (apeLocked && myProfile?.ape_code) setApe(myProfile.ape_code);
  }, [apeLocked, myProfile?.ape_code]);

  const saveMyApe = async () => {
    if (!user || !ape) return;
    setSavingApe(true);
    const { error } = await supabase.from('profiles').update({ ape_code: ape }).eq('id', user.id);
    if (error) showError(t('radar.ape_save_error', "Impossible d'enregistrer votre secteur"));
    else {
      showSuccess(t('radar.ape_saved', 'Secteur enregistré. Votre prospection est limitée à ce code APE.'));
      queryClient.invalidateQueries({ queryKey: ["radar-profile", user.id] });
    }
    setSavingApe(false);
  };

  // --- Prospects du CRM : compteur de l'onglet et état « déjà dans votre CRM » ---
  // Clé liée au compte : les prospects du compte précédent ne s'affichent
  // jamais. C'est la clé que le CRM (CrmWorkspace) utilise aussi.
  const { data: prospects = [] } = useQuery({
    queryKey: ["prospects", user?.id],
    queryFn: listProspects,
    enabled: !!user?.id,
  });
  const prospectSirens = useMemo(() => new Set(prospects.map((p) => p.siren)), [prospects]);

  // Retour de paiement Stripe (contacts de prospection supplémentaires) :
  // /radar?success=1 → on rafraîchit, on confirme et on nettoie l'URL.
  const [searchParams, setSearchParams] = useSearchParams();
  // Arrivée depuis la page Secteur : /radar?ape=10.71C choisit ce code d'emblée
  // (sauf formule Pro, où la prospection reste limitée à son propre secteur).
  const apeFromUrl = searchParams.get('ape');
  useEffect(() => {
    if (!apeFromUrl || apeLocked) return;
    if (APE_CODES.some((c) => c.code === apeFromUrl)) setApe(apeFromUrl);
  }, [apeFromUrl, apeLocked]);
  const paymentReturnSeen = useRef(false);
  useEffect(() => {
    const paid = searchParams.get('success') === '1';
    const canceled = searchParams.get('canceled') === '1';
    if (!paid && !canceled) return;
    if (!paymentReturnSeen.current) {
      paymentReturnSeen.current = true;
      if (paid) {
        setTab("crm");
        queryClient.invalidateQueries({ queryKey: ["prospects"] });
        showSuccess(t('radar.payment_return', "Paiement reçu. Vos contacts supplémentaires sont en cours d'activation : relancez l'envoi ou l'export dans quelques instants."));
      } else {
        showError(t('radar.payment_canceled', 'Paiement annulé.'));
      }
    }
    const rest = new URLSearchParams(searchParams);
    ['success', 'canceled', 'session_id'].forEach((k) => rest.delete(k));
    setSearchParams(rest, { replace: true });
  }, [searchParams]);

  const goToCrm = () => {
    setTab("crm");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const runSearch = async (goPage = 1) => {
    if (apeLocked && !myProfile?.ape_code) {
      showError(t('radar.ape_required', "Renseignez d'abord le code APE de votre entreprise."));
      return;
    }
    const effectiveApe = apeLocked ? myProfile!.ape_code : ape;
    attemptedPage.current = goPage;
    setSearching(true);
    setSearchError(null);
    // On amène les résultats (ou leurs squelettes) sous les yeux.
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    try {
      // Seul un vrai département part vers le registre (jamais une saisie libre).
      const deptCode = canonicalDepartment(dept);
      const r = await searchCompanies({ codeApe: effectiveApe, departement: deptCode || undefined, page: goPage, activeOnly: true });
      let list = r.results;
      if (strictDept && deptCode) list = list.filter((c) => c.departement === deptCode);
      setResults(list);
      setPageRawCount(r.results.length);
      setTotal(r.total);
      setTotalPages(r.totalPages);
      setPage(r.page);
    } catch (e) {
      const detail = e?.message || t('prospection.error_unavailable', 'indisponible');
      setSearchError(detail);
      showError(t('prospection.error_toast', { detail, defaultValue: 'Le registre des entreprises ne répond pas : {{detail}}' }));
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (c: CompanyResult) => {
    setAdding(c.siren);
    try {
      await addProspect(c);
      // Le CRM lit cette même clé : il se met à jour tout seul.
      queryClient.invalidateQueries({ queryKey: ["prospects", user?.id] });
      toast.success(t('prospection.added', { nom: c.nom, defaultValue: '{{nom}} est dans votre CRM' }) as string, {
        action: { label: t('prospection.view_crm', 'Voir dans mon CRM') as string, onClick: goToCrm },
      });
    } catch (e) {
      showError(t('prospection.add_error', { detail: e?.message || "", defaultValue: "Impossible d'ajouter cette entreprise au CRM. {{detail}}" }));
    } finally {
      setAdding(null);
    }
  };

  // Tant que la formule (et le statut admin) ne sont pas connus, on n'affiche
  // ni la page ni l'écran verrouillé : un état de chargement.
  if (user && (planLoading || profileLoading)) {
    return (
      <div className="min-h-screen bg-[#2b2a2f] text-white selection:bg-primary/30">
        <SolarSystem />
        <Navbar />
        <main className="relative z-10 pt-[35vh] pb-20 px-6 flex flex-col items-center gap-4" role="status" aria-live="polite">
          <CircleNotch className="w-10 h-10 text-primary animate-spin" />
          <p className="text-white/60 text-xs uppercase tracking-widest text-center">{t('radar.loading', 'Chargement de votre espace de prospection…')}</p>
        </main>
      </div>
    );
  }

  const backLink = (
    <Link to="/dashboard" className="inline-flex items-center gap-2 min-h-[44px] text-white/60 hover:text-white text-sm transition-colors">
      <ArrowLeft size={14} /> {t('radar.back_dashboard', 'Tableau de bord')}
    </Link>
  );

  // Gratuit : CRM et prospection non atteignables — écran d'accès.
  // Les admins passent quelle que soit leur formule (la console admin pointe ici).
  if (user && plan === 'free' && !myProfile?.is_admin) {
    return (
      <div className="min-h-screen bg-[#2b2a2f] text-white selection:bg-primary/30">
        <SolarSystem />
        <Navbar />
        <main className={MAIN_CLASS}>
          <div className="max-w-4xl mx-auto mb-4">{backLink}</div>
          <LockedScreen onSeePlans={() => navigate('/payment')} />
        </main>
      </div>
    );
  }

  const hasSearched = total != null;
  const showPager = hasSearched && !searchError && (results.length > 0 || pageRawCount > 0 || totalPages > 1);

  return (
    <div className="min-h-screen bg-[#2b2a2f] text-white selection:bg-primary/30">
      <SolarSystem />
      <Navbar />

      {/* Pleine largeur : la page occupe tout l'écran, avec une simple marge. */}
      <main className={MAIN_CLASS}>
        {/* En-tête : titre à gauche, choix Recherche / Mon CRM à droite */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-6">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="min-w-0">
            {backLink}
            <h1 className="text-3xl md:text-4xl font-light text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.55)] tracking-tight">
              {t('radar.title', 'Prospection')}
            </h1>
            <p className="text-white/60 text-sm md:text-base font-light mt-2">
              {t('prospection.subtitle', "Repérez les entreprises susceptibles d'être à céder, puis suivez-les dans votre CRM.")}
            </p>
          </motion.div>
          <RadarTabs tab={tab} onChange={setTab} crmCount={prospects.length} />
        </div>

        {/* ===================== RECHERCHE ===================== */}
        {tab === "search" && (
          <div>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-10">
              <RadarHero
                ape={ape}
                onApeChange={setApe}
                apeOptions={APE_OPTIONS}
                apeLocked={apeLocked}
                profileApe={myProfile?.ape_code}
                savingApe={savingApe}
                onSaveApe={saveMyApe}
                dept={dept}
                onDeptChange={setDept}
                strictDept={strictDept}
                onStrictDeptChange={setStrictDept}
                searching={searching}
                onSearch={() => runSearch(1)}
                showUpgrade={apeLocked && plan !== 'business'}
                onUpgrade={() => navigate('/payment')}
              />
            </motion.div>

            {/* ── Résultats ── */}
            <div ref={resultsRef} id="results" className="w-full scroll-mt-[calc(var(--nav-clearance)+2.5rem)]">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-white/15 pb-5 mb-6">
                <div className="min-w-0">
                  <h2 className="text-2xl font-light text-white">{t('prospection.results_title', 'Entreprises trouvées')}</h2>
                  <p className="text-sm text-white/70 font-light mt-1" role="status" aria-live="polite">
                    {searching ? (
                      t('prospection.searching', 'Recherche dans le registre des entreprises…')
                    ) : searchError ? (
                      t('prospection.results_error', "La recherche n'a pas abouti.")
                    ) : hasSearched ? (
                      <>
                        <span className="text-white font-medium">{total!.toLocaleString(numberLocale)}</span>{' '}
                        {total === 1
                          ? t('prospection.found_single', 'entreprise en activité correspond à votre recherche')
                          : t('prospection.found_many', 'entreprises en activité correspondent à votre recherche')}
                        {results.length > 0 && (
                          <> · {t('prospection.shown', { shown: results.length, defaultValue: '{{shown}} sur cette page, du meilleur score au plus faible' })}</>
                        )}
                      </>
                    ) : (
                      t('prospection.results_idle', "Lancez une recherche pour voir les entreprises ici.")
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setShowLegend((v) => !v)}
                  aria-expanded={showLegend}
                  aria-controls="score-legend"
                  className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-sm text-white font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60 self-start sm:self-auto shrink-0"
                >
                  <Question size={18} className="text-[#a5b4fc]" weight="fill" />
                  {t('prospection.legend_toggle', 'Comment lire ce score ?')}
                  <CaretDown size={14} className={`transition-transform ${showLegend ? "rotate-180" : ""}`} />
                </button>
              </div>

              <AnimatePresence initial={false}>
                {showLegend && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pb-6"><ScoreLegend id="score-legend" /></div>
                  </motion.div>
                )}
              </AnimatePresence>

              {searching ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <CompanyCardSkeleton key={i} />)}
                </div>
              ) : searchError ? (
                <div className="liquid-glass rounded-3xl border border-white/10 px-6 py-12 text-center max-w-2xl mx-auto" role="alert">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border" style={{ background: "rgba(127,29,29,0.4)", borderColor: "rgba(248,113,113,0.45)" }}>
                    <Warning size={28} weight="fill" style={{ color: "#fca5a5" }} />
                  </div>
                  <h3 className="text-lg font-medium text-white">{t('prospection.error_title', 'Le registre des entreprises ne répond pas')}</h3>
                  <p className="text-sm text-white/65 font-light mt-2 leading-relaxed">
                    {t('prospection.error_desc', "Le service public qui fournit les données est momentanément indisponible. Vos critères sont conservés : réessayez dans un instant.")}
                  </p>
                  <p className="text-xs text-white/45 font-light mt-2 break-words">{searchError}</p>
                  <Button onClick={() => runSearch(attemptedPage.current)} className="mt-6 h-12 px-6 rounded-full bg-primary hover:bg-primary/90 text-white font-semibold outline-none [text-shadow:none]">
                    <ArrowClockwise size={18} className="mr-2" /> {t('prospection.retry', 'Réessayer')}
                  </Button>
                </div>
              ) : !hasSearched ? (
                <div className="liquid-glass rounded-3xl border border-white/10 px-6 py-14 text-center max-w-2xl mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto mb-4">
                    <Binoculars size={28} className="text-[#a5b4fc]" />
                  </div>
                  <h3 className="text-lg font-medium text-white">{t('prospection.idle_title', 'Aucune recherche lancée pour le moment')}</h3>
                  <p className="text-sm text-white/65 font-light mt-2 leading-relaxed">
                    {t('prospection.idle_desc', "Choisissez une activité et un département ci-dessus, puis cliquez sur « Rechercher ». Les entreprises s'afficheront ici, classées par score de cession.")}
                  </p>
                </div>
              ) : results.length === 0 ? (
                <div className="liquid-glass rounded-3xl border border-white/10 px-6 py-12 text-center max-w-2xl mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/15 flex items-center justify-center mx-auto mb-4">
                    <MagnifyingGlass size={28} className="text-white/60" />
                  </div>
                  {pageRawCount > 0 ? (
                    <>
                      <h3 className="text-lg font-medium text-white">{t('prospection.filtered_title', 'Rien sur cette page')}</h3>
                      <p className="text-sm text-white/65 font-light mt-2 leading-relaxed">
                        {t('radar.page_filtered_empty', "Aucune entreprise de cette page n'a son siège dans ce département. Passez à la page suivante ou décochez le filtre strict.")}
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-medium text-white">{t('prospection.none_title', 'Aucune entreprise trouvée')}</h3>
                      <p className="text-sm text-white/65 font-light mt-2 leading-relaxed">
                        {t('prospection.none_desc', "Aucune entreprise en activité ne correspond à cette activité dans ce département. Essayez un département voisin, ou laissez le département vide pour chercher dans toute la France.")}
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                  {results.map((c) => (
                    <CompanyCard
                      key={c.siren}
                      company={c}
                      activityLabel={APE_LABELS.get(c.code_ape) || c.libelle_ape || c.code_ape}
                      inCrm={prospectSirens.has(c.siren)}
                      adding={adding === c.siren}
                      onAdd={() => handleAdd(c)}
                      onViewCrm={goToCrm}
                    />
                  ))}
                </div>
              )}

              {showPager && (
                <div className="mt-8">
                  <ResultsPager page={page} totalPages={totalPages} disabled={searching} onPage={runSearch} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== CRM ===================== */}
        {tab === "crm" && user && (
          <CrmWorkspace
            userId={user.id}
            plan={plan}
            planFetching={planFetching}
            isAdmin={!!myProfile?.is_admin}
            senderName={senderName}
            onGoToSearch={() => setTab("search")}
          />
        )}
      </main>
    </div>
  );
}
