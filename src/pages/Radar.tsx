"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { SolarSystem } from "@/components/SolarSystem";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Radar as RadarIcon, Search, Loader2, Plus, Check, ExternalLink, Trash2,
  Users2, Flame, Sparkles, ArrowLeft, Mail, StickyNote, X, ChevronLeft, ChevronRight, Crosshair,
  Send, Copy, RefreshCw, User, Download, CheckSquare, Square, Info, HelpCircle,
} from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/components/AuthProvider";
import { searchCompanies, type CompanyResult } from "@/services/sireneService";
import { supabase } from "@/integrations/supabase/client";
import { APE_CODES } from "@/data/apeCodes";
import { SearchableSelect, Dropdown, ConfirmDialog } from "@/components/PickerKit";
import { PricingModal } from "@/components/PricingModal";
import { useNavigate } from "react-router-dom";
import { usePlan, PLAN_PRICES, EXTRA_PROSPECT_PRICE, type PlanType } from "@/services/planService";
import {
  getProspectionQuota, registerProspectionContact, isProspectAlreadyCounted, PROSPECTION_MONTHLY_INCLUDED,
} from "@/services/prospectService";
import {
  listProspects, addProspect, updateProspect, deleteProspect, buildOutreachEmail, buildCampaignCsv,
  STATUS_META, STATUS_ORDER, type Prospect, type ProspectStatus,
} from "@/services/prospectService";

const APE_OPTIONS = APE_CODES.map((c) => ({ value: c.code, label: c.label, group: c.group }));

const ScoreBadge = ({ score }: { score: number }) => {
  const hot = score >= 5, warm = score >= 3;
  const Icon = hot ? Flame : warm ? Sparkles : Crosshair;
  const cls = hot
    ? "bg-red-500/20 text-red-300 border-red-500/30"
    : warm
    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
    : "bg-white/10 text-white/50 border-white/10";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${cls}`}>
      <Icon size={12} /> {score}
    </span>
  );
};

export default function Radar() {
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const siteLang: "fr" | "en" = i18n.language?.startsWith("en") ? "en" : "fr";
  const { user } = useAuth();
  const navigate = useNavigate();
  const senderName = user?.user_metadata?.full_name || user?.email || "[Votre nom]";
  const [tab, setTab] = useState<"search" | "crm">("search");
  // Formules : page inaccessible en gratuit ; Pro = recherche + CRM
  // (envoi réservé Business) ; Business = 20 contacts/mois puis 2 €.
  const { plan, isLoading: planLoading, isFetching: planFetching } = usePlan(user?.id);
  const statusLabel = (s: ProspectStatus) => t(`crm.status.${s}`, STATUS_META[s].label);

  // --- Recherche ---
  const [ape, setApe] = useState("25.62B");
  const [dept, setDept] = useState("69");
  const [strictDept, setStrictDept] = useState(true);
  const [page, setPage] = useState(1);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [adding, setAdding] = useState<string | null>(null);

  // --- Profil : la prospection est bridée au code APE du membre ---
  // (obligation de renseigner son secteur ; seuls les admins prospectent librement)
  const { data: myProfile } = useQuery({
    queryKey: ["radar-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('ape_code, is_admin').eq('id', user!.id).single();
      return data;
    },
    enabled: !!user?.id,
  });
  // Le code APE n'est verrouillé (à son propre secteur) qu'en dessous de
  // Business. En Business (ou admin), on prospecte n'importe quel code APE.
  // Prudence pendant le rafraîchissement du plan pour ne pas déverrouiller à tort.
  const apeLocked = (plan !== 'business' || planFetching) && !myProfile?.is_admin;
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

  // --- CRM ---
  const { data: prospects = [], isLoading: crmLoading } = useQuery({
    queryKey: ["prospects"],
    queryFn: listProspects,
  });
  const prospectSirens = useMemo(() => new Set(prospects.map((p) => p.siren)), [prospects]);
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [toDelete, setToDelete] = useState<Prospect | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showPricing, setShowPricing] = useState(false);
  // Filtre actif sur le pipeline : clic sur une pastille de statut.
  const [crmFilter, setCrmFilter] = useState<ProspectStatus | null>(null);
  const visibleProspects = useMemo(
    () => (crmFilter ? prospects.filter((p) => p.status === crmFilter) : prospects),
    [prospects, crmFilter]
  );

  const toggleSel = (id: string) => setSelected((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const allSelected = visibleProspects.length > 0 && visibleProspects.every((p) => selected.has(p.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(visibleProspects.map((p) => p.id)));
  const statusOptions = STATUS_ORDER.map((s) => ({ value: s, label: statusLabel(s) }));

  const exportCampaign = async () => {
    if (plan !== 'business') {
      showError(t('quota.prospection_business', 'La prospection ciblée (envoi de campagnes) est réservée à la formule Business.'));
      navigate('/payment');
      return;
    }
    const list = visibleProspects.filter((p) => selected.has(p.id) && p.email);
    if (list.length === 0) { showError("Aucun sélectionné avec un email renseigné"); return; }

    // Quota Business : 20 entreprises contactées / mois, puis 2 € chacune
    if (user) {
      const alreadyCounted = await Promise.all(list.map((p) => isProspectAlreadyCounted(user.id, p.siren)));
      const newOnes = list.filter((_, i) => !alreadyCounted[i]);
      if (newOnes.length > 0) {
        const quota = await getProspectionQuota(user.id);
        const extras = Math.max(0, quota.used + newOnes.length - quota.included);
        if (extras > 0) {
          const ok = window.confirm(
            t('quota.prospection_extra_confirm',
              `Votre forfait inclut ${PROSPECTION_MONTHLY_INCLUDED} entreprises contactées par mois. Cette campagne dépasse le forfait de ${extras} contact(s), facturé(s) ${EXTRA_PROSPECT_PRICE} € chacun (${extras * EXTRA_PROSPECT_PRICE} €). Continuer ?`) as string
          );
          if (!ok) return;
        }
        const startExtra = quota.included - quota.used;
        await Promise.all(newOnes.map((p, i) => registerProspectionContact(user.id, p.siren, p.nom, i >= startExtra)));
      }
    }

    const csv = "﻿" + buildCampaignCsv(list, senderName, siteLang);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campagne-${list.length}-contacts.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    showSuccess(`${list.length} contact(s) exporté(s) — importe le CSV dans ton outil d'emailing`);
  };

  const runSearch = async (goPage = 1) => {
    if (apeLocked && !myProfile?.ape_code) {
      showError(t('radar.ape_required', "Renseignez d'abord le code APE de votre entreprise."));
      return;
    }
    const effectiveApe = apeLocked ? myProfile!.ape_code : ape;
    setSearching(true);
    try {
      const r = await searchCompanies({ codeApe: effectiveApe, departement: dept || undefined, page: goPage, activeOnly: true });
      let list = r.results;
      if (strictDept && dept) list = list.filter((c) => c.departement === dept.trim());
      setResults(list);
      setTotal(r.total);
      setTotalPages(r.totalPages);
      setPage(r.page);
    } catch (e: any) {
      showError("Erreur API gouv : " + (e?.message || "indisponible"));
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (c: CompanyResult) => {
    setAdding(c.siren);
    try {
      await addProspect(c);
      showSuccess(`${c.nom} ajouté au CRM`);
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    } catch (e: any) {
      showError("Erreur ajout : " + (e?.message || ""));
    } finally {
      setAdding(null);
    }
  };

  const handleStatus = async (p: Prospect, status: ProspectStatus) => {
    try {
      await updateProspect(p.id, { status });
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    } catch {
      showError("Erreur mise à jour statut");
    }
  };

  const doDelete = async (p: Prospect) => {
    try {
      await deleteProspect(p.id);
      showSuccess("Prospect retiré");
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
    } catch {
      showError("Erreur suppression");
    }
  };

  const annuaire = (siren: string) => `https://annuaire-entreprises.data.gouv.fr/entreprise/${siren}`;

  // Stats CRM par statut
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of prospects) c[p.status] = (c[p.status] || 0) + 1;
    return c;
  }, [prospects]);

  const TabBtn = ({ id, label, icon: Icon, badge }: { id: "search" | "crm"; label: string; icon: React.ElementType; badge?: number }) => (
    <button
      onClick={() => setTab(id)}
      className={`flex-1 md:flex-none justify-center flex items-center gap-2 px-5 md:px-6 py-2.5 md:py-3 rounded-full transition-all text-sm font-medium ${
        tab === id ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-white/40 hover:text-white hover:bg-white/5"
      }`}
    >
      <Icon size={16} /> {label}
      {badge != null && badge > 0 && (
        <span className="ml-1 px-2 py-0.5 rounded-full bg-white/15 text-white text-xs">{badge}</span>
      )}
    </button>
  );

  // Bulle d'info réutilisable (tooltip) — explications contextuelles.
  const InfoTip = ({ text, className = "" }: { text: string; className?: string }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className={`inline-flex items-center justify-center text-white/40 hover:text-white transition-colors align-middle ${className}`}>
          <Info size={14} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-xs font-light leading-relaxed bg-[#211f25] text-white border-white/10">
        {text}
      </TooltipContent>
    </Tooltip>
  );

  // Gratuit : CRM et prospection non atteignables — écran d'accès
  if (user && !planLoading && plan === 'free') {
    return (
      <div className="min-h-screen bg-[#2b2a2f] text-white selection:bg-primary/30">
        <SolarSystem />
        <Navbar />
        <main className="relative z-10 pt-[25vh] pb-20 px-6 max-w-xl mx-auto w-full text-center">
          <div className="liquid-glass rounded-[2.5rem] border border-white/10 p-10 sm:p-14">
            <div className="w-16 h-16 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-6">
              <Users2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-light mb-3">{t('radar.locked_title', 'CRM et prospection')}</h1>
            <p className="text-white/50 font-light text-sm leading-relaxed mb-8">
              {t('radar.locked_desc', `Le CRM individuel est inclus dans la formule Pro (${PLAN_PRICES.pro} €/mois). La prospection ciblée par code APE est réservée à la formule Business (${PLAN_PRICES.business} €/mois), avec ${PROSPECTION_MONTHLY_INCLUDED} entreprises contactées par mois incluses.`)}
            </p>
            <Button onClick={() => navigate('/payment')} className="rounded-full h-12 px-8 bg-primary hover:bg-primary/90 text-white font-medium outline-none [text-shadow:none]">
              {t('quota.see_plans', 'Voir les formules')}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#2b2a2f] text-white selection:bg-primary/30">
      <SolarSystem />
      <Navbar />

      <main className="relative z-10 pt-24 md:pt-[20vh] pb-20 px-[6vw] max-w-[1400px] mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5 md:gap-6 mb-8 md:mb-10">
          <div className="min-w-0">
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm mb-3 md:mb-4 transition-colors">
              <ArrowLeft size={14} /> {t('radar.back_dashboard', 'Tableau de bord')}
            </Link>
            <h1 className="text-3xl md:text-4xl font-light mb-2 tracking-tight text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.55)]">
              {t('radar.title', 'Prospection')}
            </h1>
            <p className="text-white/50 font-light text-sm md:text-base">{t('radar.subtitle', 'Trouve les entreprises de ton secteur (code APE) et contacte-les directement.')}</p>
          </div>
          <div className="flex gap-2 p-1.5 rounded-full bg-black/20 border border-white/5 w-full md:w-auto">
            <TabBtn id="search" label={t('radar.tab_search', 'Recherche')} icon={Search} />
            <TabBtn id="crm" label={t('radar.tab_crm', 'CRM')} icon={Users2} badge={prospects.length} />
          </div>
        </div>

        {/* Bannière d'aide — explique le fonctionnement de la page */}
        <div className="liquid-glass rounded-2xl p-5 md:p-6 border border-white/5 mb-8 md:mb-10 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-white font-medium mb-1.5">{t('radar.help_title', 'Comment fonctionne la prospection ?')}</h2>
            <p className="text-white/60 text-sm font-light leading-relaxed">
              {t('radar.help_desc', "Recherche des entreprises actives par code d'activité (APE) et par zone. Chaque résultat reçoit un score de cession (plus il est élevé, plus une transmission est probable : entreprise mature, dirigeant proche de la retraite, forme juridique sérieuse). Ajoute les meilleures à ton CRM, trouve l'email du dirigeant et envoie ton message — une par une ou en campagne groupée.")}
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-xs text-white/50">
              <span className="inline-flex items-center gap-1.5"><Flame size={13} className="text-red-400" /> {t('radar.legend_hot', 'Signal fort (score ≥ 5)')}</span>
              <span className="inline-flex items-center gap-1.5"><Sparkles size={13} className="text-amber-300" /> {t('radar.legend_warm', 'Signal moyen (score ≥ 3)')}</span>
              <span className="inline-flex items-center gap-1.5"><Crosshair size={13} className="text-white/40" /> {t('radar.legend_cold', 'À creuser')}</span>
            </div>
          </div>
        </div>

        {/* ===================== RECHERCHE ===================== */}
        {tab === "search" && (
          <div className="space-y-8">
            <div className="liquid-glass rounded-[2rem] p-6 md:p-8 border border-white/5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-6">
                  <label className="text-xs uppercase tracking-widest text-white/50 mb-2 flex items-center gap-2">
                    {t('radar.sector_label', 'Secteur (code APE)')}
                    <InfoTip text={apeLocked
                      ? t('radar.sector_locked_tip', "Pour protéger les entreprises de tout démarchage hors sujet, la prospection est limitée à votre propre secteur d'activité (votre code APE).")
                      : t('radar.sector_tip', "Le code APE identifie l'activité principale d'une entreprise (ex: 47.21Z = vente de fruits et légumes). Tape le nom du secteur, on trouve le code pour toi.")} />
                  </label>
                  {apeLocked && myProfile?.ape_code ? (
                    <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-12 flex items-center justify-between gap-3">
                      <span className="text-white text-sm truncate">
                        {APE_OPTIONS.find((o: any) => o.value === myProfile.ape_code)?.label || myProfile.ape_code}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-white/40 shrink-0">{t('radar.your_sector', 'Votre secteur')}</span>
                    </div>
                  ) : apeLocked ? (
                    <div className="flex gap-2">
                      <div className="flex-1"><SearchableSelect value={ape} onChange={setApe} options={APE_OPTIONS} /></div>
                      <Button onClick={saveMyApe} disabled={savingApe || !ape} className="h-12 rounded-xl px-5 bg-primary hover:bg-primary/90 text-white shrink-0 outline-none [text-shadow:none]">
                        {t('radar.ape_save', 'Valider')}
                      </Button>
                    </div>
                  ) : (
                    <SearchableSelect value={ape} onChange={setApe} options={APE_OPTIONS} />
                  )}
                  {apeLocked && !myProfile?.ape_code && (
                    <p className="text-[11px] text-white/40 font-light mt-2">
                      {t('radar.ape_onboard', 'Renseignez le code APE de votre entreprise. La prospection sera limitée à ce secteur.')}
                    </p>
                  )}
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs uppercase tracking-widest text-white/50 mb-2 flex items-center gap-2">
                    {t('radar.dept_label', 'Département')}
                    <InfoTip text={t('radar.dept_tip', "Numéro du département français (ex: 69 = Rhône, 75 = Paris). Laisse vide pour chercher partout en France.")} />
                  </label>
                  <input
                    value={dept}
                    onChange={(e) => setDept(e.target.value)}
                    placeholder={t('radar.dept_ph', 'ex: 69')}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-white outline-none focus:border-primary/50"
                  />
                </div>
                <div className="md:col-span-3">
                  <Button
                    onClick={() => runSearch(1)}
                    disabled={searching}
                    className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium"
                  >
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search size={16} className="mr-2" /> {t('radar.launch', 'Lancer le radar')}</>}
                  </Button>
                </div>
              </div>
              <label className="flex items-center gap-2 mt-4 text-sm text-white/60 cursor-pointer w-fit">
                <input type="checkbox" checked={strictDept} onChange={(e) => setStrictDept(e.target.checked)} className="accent-primary" />
                {t('radar.strict_dept', 'Siège strictement dans le département')}
              </label>
            </div>

            {total != null && (
              <p className="text-white/50 text-sm flex items-center gap-2 flex-wrap">
                <span>
                  <strong className="text-white">{total.toLocaleString("fr-FR")}</strong>{' '}
                  {t('radar.results_found', { shown: results.length, defaultValue: 'entreprise(s) trouvée(s) — {{shown}} affichée(s) sur cette page, triées par score de cession.' })}
                </span>
                <InfoTip text={t('radar.score_tip', "Score de cession : plus il est élevé, plus l'entreprise est susceptible d'être à reprendre (ancienneté, âge du dirigeant proche de la retraite, forme juridique sérieuse).")} />
              </p>
            )}

            <div className="space-y-3">
              {results.map((c) => {
                const inCrm = prospectSirens.has(c.siren);
                return (
                  <div key={c.siren} className="liquid-glass rounded-2xl p-4 border border-white/5 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                    <div className="flex items-start gap-3 md:contents">
                      <ScoreBadge score={c.score} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{c.nom}</div>
                        <div className="text-white/40 text-sm truncate">
                          {c.code_postal} {c.ville} · {c.nature_juridique} · {c.tranche_effectif}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 md:contents">
                      <div className="text-sm text-white/60 md:w-44 flex items-center gap-1.5 min-w-0">
                        {c.dirigeant_nom ? (
                          <><User size={13} className="text-white/30 shrink-0" /><span className="truncate">{c.dirigeant_nom}{c.dirigeant_age ? <span className="text-[#67e8f9] font-medium"> · {t('radar.years', { n: c.dirigeant_age, defaultValue: '{{n}} ans' })}</span> : null}</span></>
                        ) : <span className="text-white/30">{t('radar.director_na', 'dirigeant n/c')}</span>}
                      </div>
                      <div className="text-sm text-white/50 md:w-24 shrink-0">{c.anciennete != null ? t('radar.years', { n: c.anciennete, defaultValue: '{{n}} ans' }) : "—"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={annuaire(c.siren)} target="_blank" rel="noreferrer" className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white shrink-0" title="Fiche annuaire-entreprises">
                        <ExternalLink size={16} />
                      </a>
                      <Button
                        onClick={() => handleAdd(c)}
                        disabled={inCrm || adding === c.siren}
                        className={`flex-1 md:flex-none h-9 rounded-lg text-sm ${inCrm ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20" : "bg-white/10 hover:bg-white/20 text-white"}`}
                      >
                        {adding === c.siren ? <Loader2 size={14} className="animate-spin" /> : inCrm ? <><Check size={14} className="mr-1" /> {t('radar.in_crm', 'Dans le CRM')}</> : <><Plus size={14} className="mr-1" /> {t('radar.add', 'Ajouter')}</>}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {results.length > 0 && (
              <div className="flex items-center justify-center gap-4 pt-4">
                <Button onClick={() => runSearch(page - 1)} disabled={page <= 1 || searching} className="rounded-lg bg-white/5 hover:bg-white/10"><ChevronLeft size={16} /></Button>
                <span className="text-white/50 text-sm">Page {page} / {totalPages}</span>
                <Button onClick={() => runSearch(page + 1)} disabled={page >= totalPages || searching} className="rounded-lg bg-white/5 hover:bg-white/10"><ChevronRight size={16} /></Button>
              </div>
            )}

            {!searching && total === null && (
              <div className="text-center py-20 text-white/40">
                <RadarIcon className="w-12 h-12 mx-auto mb-4 opacity-40" />
                {t('radar.empty_search', 'Choisis un secteur + un département, puis lance le radar.')}
              </div>
            )}
          </div>
        )}

        {/* ===================== CRM ===================== */}
        {tab === "crm" && (
          <div className="space-y-6">
            {/* Pipeline — pastilles cliquables qui filtrent les prospects par statut */}
            <div>
              <div className="flex items-center gap-2 mb-3 text-xs text-white/50">
                <span>{t('crm.filter_hint', 'Clique sur un statut pour filtrer tes prospects.')}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setCrmFilter(null); setSelected(new Set()); }}
                  className={`px-4 py-2 rounded-xl text-sm transition-all border ${crmFilter === null ? 'bg-white/15 text-white border-white/30' : 'bg-white/5 text-white/60 border-transparent hover:bg-white/10 hover:text-white'}`}
                >
                  {t('crm.all', 'Tous')} <strong className="ml-1">{prospects.length}</strong>
                </button>
                {STATUS_ORDER.map((s) => {
                  const active = crmFilter === s;
                  return (
                    <button
                      key={s}
                      onClick={() => { setCrmFilter(active ? null : s); setSelected(new Set()); }}
                      className={`px-4 py-2 rounded-xl text-sm transition-all border ${STATUS_META[s].color} ${active ? 'ring-2 ring-white/40 border-white/20' : 'border-transparent opacity-80 hover:opacity-100'}`}
                    >
                      {statusLabel(s)} <strong className="ml-1">{counts[s] || 0}</strong>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Barre campagne / envoi groupé */}
            {prospects.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 liquid-glass rounded-2xl px-4 py-3 border border-white/5">
                <button onClick={toggleAll} className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors w-fit">
                  {allSelected ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} />}
                  {selected.size > 0 ? t('crm.selected', { n: selected.size, defaultValue: '{{n}} sélectionné(s)' }) : t('crm.select_all', 'Tout sélectionner')}
                </button>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={exportCampaign} disabled={selected.size === 0} className="flex-1 sm:flex-none h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm disabled:opacity-40">
                        <Download size={15} className="mr-1.5" /> {t('crm.export_csv', 'Exporter en CSV')}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[260px] text-xs font-light leading-relaxed bg-[#211f25] text-white border-white/10">
                      {t('crm.export_tip', "Télécharge un fichier CSV (1 ligne par prospect, avec un email de contact pré-rédigé) à importer dans ton outil d'emailing (Brevo, Mailchimp…).")}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setShowPricing(true)} className="flex-1 sm:flex-none h-9 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary text-sm border border-primary/30">
                        <Send size={15} className="mr-1.5" /> {t('crm.campaign', 'Campagne email')}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[260px] text-xs font-light leading-relaxed bg-[#211f25] text-white border-white/10">
                      {t('crm.campaign_tip', "Envoie automatiquement ton email de prise de contact à tous les prospects sélectionnés, sans passer par un outil externe (fonctionnalité premium).")}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )}

            {crmLoading ? (
              <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : prospects.length === 0 ? (
              <div className="text-center py-20 text-white/40">
                <Users2 className="w-12 h-12 mx-auto mb-4 opacity-40" />
                {t('crm.empty', "Aucun prospect. Va dans l'onglet Recherche pour en ajouter.")}
              </div>
            ) : visibleProspects.length === 0 ? (
              <div className="text-center py-16 text-white/40">
                <Users2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                {t('crm.no_match', 'Aucun prospect avec ce statut.')}
                <button onClick={() => setCrmFilter(null)} className="block mx-auto mt-3 text-primary text-sm hover:underline">{t('crm.show_all', 'Voir tous les prospects')}</button>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleProspects.map((p) => (
                  <div key={p.id} className="liquid-glass rounded-2xl p-4 border border-white/5 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                    <div className="flex items-start gap-3 md:contents">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleSel(p.id)}
                        className="mt-1.5 md:mt-0 md:self-center accent-primary w-4 h-4 shrink-0 cursor-pointer"
                      />
                      <ScoreBadge score={p.score} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{p.nom}</div>
                        <div className="text-white/40 text-sm truncate">
                          {p.code_postal} {p.ville}
                          {p.dirigeant_nom ? ` · ${p.dirigeant_nom}${p.dirigeant_age ? ` (${p.dirigeant_age} ans)` : ""}` : ""}
                          {p.email ? ` · ${p.email}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:contents">
                      <Dropdown
                        value={p.status}
                        onChange={(v) => handleStatus(p, v as ProspectStatus)}
                        options={statusOptions}
                        className="flex-1 md:flex-none md:w-44 md:shrink-0"
                        buttonClassName={`w-full flex items-center justify-between gap-2 h-9 rounded-lg px-3 text-sm ${STATUS_META[p.status].color}`}
                      />
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => setEditing(p)} className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white" title={t('crm.action_email', 'Email & message')}><StickyNote size={16} /></button>
                        <a href={annuaire(p.siren)} target="_blank" rel="noreferrer" className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white" title={t('crm.action_sheet', "Fiche entreprise")}><ExternalLink size={16} /></a>
                        <button onClick={() => setToDelete(p)} className="p-2 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400" title={t('crm.action_remove', 'Retirer')}><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal édition (email + notes) */}
      <AnimatePresence>
        {editing && (
          <EditModal
            prospect={editing}
            senderName={senderName}
            plan={plan}
            userId={user?.id}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); queryClient.invalidateQueries({ queryKey: ["prospects"] }); }}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!toDelete}
        title={t('crm.delete_title', 'Retirer ce prospect ?')}
        message={toDelete ? t('crm.delete_msg', { nom: toDelete.nom, defaultValue: '{{nom}} sera retiré de ton CRM.' }) : ""}
        confirmLabel={t('crm.delete_confirm', 'Retirer')}
        cancelLabel={t('common.cancel', 'Annuler')}
        onConfirm={() => toDelete && doDelete(toDelete)}
        onClose={() => setToDelete(null)}
      />

      <PricingModal open={showPricing} onClose={() => setShowPricing(false)} />
    </div>
  );
}

function EditModal({ prospect, senderName, plan, userId, onClose, onSaved }: { prospect: Prospect; senderName: string; plan: PlanType; userId?: string; onClose: () => void; onSaved: () => void }) {
  const { t, i18n } = useTranslation();
  // Langue de l'email mémorisée EN BASE (prospect.mail_lang) ; sinon langue du site.
  const initialLang: "fr" | "en" =
    prospect.mail_lang === "en" || prospect.mail_lang === "fr"
      ? prospect.mail_lang
      : (i18n.language?.startsWith("en") ? "en" : "fr");
  const [mailLang, setMailLang] = useState<"fr" | "en">(initialLang);
  const [email, setEmail] = useState(prospect.email || "");
  const [notes, setNotes] = useState(prospect.notes || "");
  const initial = buildOutreachEmail(prospect, senderName, initialLang);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [saving, setSaving] = useState(false);

  // Change la langue de CE mail uniquement — n'affecte pas la langue du site.
  const applyMailLang = (lang: "fr" | "en") => {
    if (lang === mailLang) return;
    setMailLang(lang);
    const m = buildOutreachEmail(prospect, senderName, lang);
    setSubject(m.subject);
    setBody(m.body);
  };

  const regenerate = () => {
    const m = buildOutreachEmail(prospect, senderName, mailLang);
    setSubject(m.subject);
    setBody(m.body);
    showSuccess(t('crm.mail.regenerated', 'Message régénéré'));
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateProspect(prospect.id, { email: email.trim() || null, notes: notes.trim() || null, mail_lang: mailLang });
      showSuccess(t('crm.mail.saved', 'Enregistré'));
      onSaved();
    } catch (e: any) {
      // Repli si la colonne mail_lang n'existe pas encore : on sauvegarde au moins email + notes.
      if (/mail_lang|column|schema cache|could not find/i.test(String(e?.message || ''))) {
        try {
          await updateProspect(prospect.id, { email: email.trim() || null, notes: notes.trim() || null });
          showSuccess(t('crm.mail.saved', 'Enregistré'));
          onSaved();
          return;
        } catch {}
      }
      showError(t('crm.mail.save_err', "Erreur d'enregistrement"));
    } finally {
      setSaving(false);
    }
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${body}`);
      showSuccess(t('crm.mail.copied', 'Message copié'));
    } catch {
      showError(t('crm.mail.copy_err', 'Copie impossible'));
    }
  };

  // Ouvre la messagerie de l'utilisateur (Gmail/Outlook/Mail) pré-remplie, puis marque "Contacté"
  const sendViaMailbox = async () => {
    if (plan !== 'business') {
      showError(t('quota.prospection_business', 'La prospection ciblée (envoi de campagnes) est réservée à la formule Business.'));
      return;
    }
    if (!email.trim()) { showError(t('crm.mail.email_required', "Renseigne d'abord l'email du dirigeant")); return; }

    // Quota Business : 20 entreprises contactées / mois, puis 2 € chacune
    if (userId && !(await isProspectAlreadyCounted(userId, prospect.siren))) {
      const quota = await getProspectionQuota(userId);
      if (quota.extra) {
        const ok = window.confirm(
          t('quota.prospection_extra_one',
            `Votre forfait de ${PROSPECTION_MONTHLY_INCLUDED} entreprises contactées ce mois-ci est atteint. Ce contact supplémentaire sera facturé ${EXTRA_PROSPECT_PRICE} €. Continuer ?`) as string
        );
        if (!ok) return;
      }
      await registerProspectionContact(userId, prospect.siren, prospect.nom, quota.extra);
    }

    const mailto = `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    try {
      const nextStatus: ProspectStatus = prospect.status === "a_qualifier" || prospect.status === "email_trouve" ? "contacte" : prospect.status;
      await updateProspect(prospect.id, { email: email.trim(), notes: notes.trim() || null, status: nextStatus });
      showSuccess(t('crm.mail.opened', 'Ouvert dans ta messagerie — marqué « Contacté »'));
      onSaved();
    } catch {
      showError(t('crm.mail.opened_err', 'Email ouvert, mais maj statut échouée'));
    }
  };

  const findEmail = `https://www.google.com/search?q=${encodeURIComponent(prospect.nom + " " + (prospect.ville || "") + " email contact")}`;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-start md:items-center justify-center p-3 md:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
    >
      <motion.div
        className="liquid-glass-heavy rounded-[1.75rem] md:rounded-[2rem] p-5 md:p-8 border border-white/10 w-full max-w-xl my-4 md:my-8"
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-light">{prospect.nom}</h3>
            <p className="text-white/40 text-sm">{prospect.code_postal} {prospect.ville} · SIREN {prospect.siren}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white/40"><X size={18} /></button>
        </div>

        {prospect.dirigeant_nom && (
          <div className="mb-5 text-sm text-white/60">
            {t('crm.mail.director', 'Dirigeant')} : <strong className="text-white">{prospect.dirigeant_nom}</strong>
            {prospect.dirigeant_age ? ` · ${t('radar.years', { n: prospect.dirigeant_age, defaultValue: '{{n}} ans' })}` : ""}
          </div>
        )}

        <label className="text-xs uppercase tracking-widest text-white/50 mb-2 flex items-center gap-2"><Mail size={12} /> {t('crm.mail.director_email', 'Email du dirigeant')}</label>
        <div className="flex gap-2 mb-1">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('crm.mail.email_ph', 'contact@entreprise.fr')}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 h-11 text-white outline-none focus:border-primary/50" />
          <a href={findEmail} target="_blank" rel="noreferrer" className="px-3 h-11 flex items-center rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm whitespace-nowrap" title={t('crm.mail.find_tip', "Chercher l'email sur le web")}>
            <Search size={14} className="mr-1" /> {t('crm.mail.find', 'Trouver')}
          </a>
        </div>
        <p className="text-white/40 text-xs mb-6">{t('crm.mail.find_hint', "Sirene ne fournit pas l'email — trouve-le via « Trouver » (site web de la boîte) et colle-le ici.")}</p>

        {/* --- Message de prise de contact --- */}
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <label className="text-xs uppercase tracking-widest text-white/50 flex items-center gap-2"><Send size={12} /> {t('crm.mail.message', 'Message de contact')}</label>
          <div className="flex items-center gap-2">
            {/* Langue de l'email — indépendante de la langue du site */}
            <div className="flex items-center gap-1 p-0.5 rounded-full bg-white/5 border border-white/10" title={t('crm.mail.lang_tip', "Langue de cet email (n'affecte pas la langue du site)")}>
              {(["fr", "en"] as const).map((lng) => (
                <button
                  key={lng}
                  type="button"
                  onClick={() => applyMailLang(lng)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium uppercase transition-colors ${mailLang === lng ? 'bg-primary text-white' : 'text-white/50 hover:text-white'}`}
                >
                  {lng}
                </button>
              ))}
            </div>
            <button onClick={regenerate} className="text-xs text-white/50 hover:text-white flex items-center gap-1"><RefreshCw size={11} /> {t('crm.mail.regen', 'Régénérer')}</button>
          </div>
        </div>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('crm.mail.subject_ph', 'Objet')}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-11 text-white outline-none focus:border-primary/50 mb-2" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={9}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary/50 resize-none mb-2 leading-relaxed" />
        <div className="flex gap-2 mb-6">
          <Button onClick={sendViaMailbox} disabled={!email.trim()} className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-white disabled:opacity-40">
            <Send size={15} className="mr-2" /> {t('crm.mail.open_mailbox', 'Ouvrir dans ma messagerie')}
          </Button>
          <Button onClick={copyMessage} className="rounded-xl bg-white/5 hover:bg-white/10 text-white" title={t('crm.mail.copy', 'Copier le message')}>
            <Copy size={15} />
          </Button>
        </div>

        <label className="text-xs uppercase tracking-widest text-white/50 mb-2 flex items-center gap-2"><StickyNote size={12} /> {t('crm.mail.notes', 'Notes')}</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder={t('crm.mail.notes_ph', "Contexte, historique d'échange, prochaines étapes…")}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 resize-none mb-6" />

        <div className="flex gap-3 justify-end">
          <Button onClick={onClose} className="rounded-xl bg-white/5 hover:bg-white/10 text-white">{t('crm.mail.close', 'Fermer')}</Button>
          <Button onClick={save} disabled={saving} className="rounded-xl bg-white/10 hover:bg-white/20 text-white">
            {saving ? <Loader2 size={16} className="animate-spin" /> : t('crm.mail.save', 'Enregistrer')}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
