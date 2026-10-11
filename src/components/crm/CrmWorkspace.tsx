"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Users2, Search, RefreshCw, AlertTriangle, FilterX } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
// Messages d'information (ni succès ni erreur) : `toast` de sonner en direct.
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/PickerKit";
import { PricingModal } from "@/components/PricingModal";
import { StripeCheckoutModal } from "@/components/StripeCheckoutModal";
import { startCheckout, openCheckout } from "@/services/stripe";
import { EXTRA_PROSPECT_PRICE, type PlanType } from "@/services/planService";
import {
  listProspects, buildCampaignCsv, getProspectionQuota, registerProspectionContact, isProspectAlreadyCounted,
  type Prospect, type ProspectStatus,
} from "@/services/prospectService";
import { changeStatus, deleteProspects, listTasks, patchProspects, type CrmTask, type ProspectPatch } from "@/services/crmService";
import {
  EMPTY_FILTERS, buildAgenda, collectTags, computeMetrics, countActiveFilters, dueProspectIds, filterProspects,
  isArchived, sortProspects, type CrmFilterState,
} from "@/lib/crm";
import { CrmDashboard, type DrawerTab } from "./CrmDashboard";
import { CrmFilters, type CrmView } from "./CrmFilters";
import { PipelineBoard } from "./PipelineBoard";
import { ProspectTable, type SortState } from "./ProspectTable";
import { ProspectDrawer } from "./ProspectDrawer";
import { primaryBtnCls, ghostBtnCls, useStatusLabel } from "./crmMeta";

// Point d'entrée du CRM de prospection, monté dans l'onglet « CRM » de la page
// Prospection (src/pages/Radar.tsx).
export interface CrmWorkspaceProps {
  userId: string;
  plan: PlanType;
  /** le plan est en cours de rafraîchissement : ne rien débloquer en attendant */
  planFetching: boolean;
  isAdmin: boolean;
  /** nom affiché de l'utilisateur, pour signer les emails générés */
  senderName: string;
  /** bascule vers l'onglet Recherche (pour ajouter des entreprises) */
  onGoToSearch: () => void;
}

const VIEW_KEY = "globly.crm.view";
const NO_PROSPECTS: Prospect[] = [];
const NO_TASKS: CrmTask[] = [];

function readView(): CrmView {
  try {
    return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "pipeline";
  } catch {
    return "pipeline";
  }
}

function Skeleton() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4" role="status" aria-live="polite" aria-label={t("crm.state.loading", "Chargement…") as string}>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={`liquid-glass rounded-2xl border border-white/10 p-4 ${i === 4 ? "col-span-2 lg:col-span-1" : ""}`}>
            <div className="h-3 w-2/3 rounded bg-white/10 animate-pulse" />
            <div className="h-7 w-1/3 rounded bg-white/10 animate-pulse mt-3" />
            <div className="h-3 w-4/5 rounded bg-white/5 animate-pulse mt-3" />
          </div>
        ))}
      </div>
      <div className="liquid-glass rounded-2xl border border-white/10 h-24 animate-pulse" />
      <div className="flex gap-3 overflow-hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="w-[270px] shrink-0 rounded-2xl border border-white/10 bg-white/[0.035] p-3 space-y-2">
            <div className="h-4 w-1/2 rounded bg-white/10 animate-pulse" />
            {[0, 1, 2].slice(0, 3 - (i % 3)).map((j) => <div key={j} className="h-24 rounded-xl bg-white/5 animate-pulse" />)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CrmWorkspace({ userId, plan, planFetching, senderName, onGoToSearch }: CrmWorkspaceProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const statusLabel = useStatusLabel();
  const siteLang: "fr" | "en" = i18n.language?.startsWith("en") ? "en" : "fr";
  // Ce qui est réservé à Business le reste ; tant que la formule se rafraîchit, rien n'est débloqué.
  const isBusiness = plan === "business" && !planFetching;

  // Clé liée au compte : les prospects du compte précédent ne s'affichent
  // jamais. Le préfixe ["prospects"] reste celui qu'on invalide partout.
  const listKey = useMemo(() => ["prospects", userId], [userId]);
  const prospectsQ = useQuery({ queryKey: listKey, queryFn: listProspects, enabled: !!userId });
  const tasksQ = useQuery({ queryKey: ["prospect-tasks", userId], queryFn: listTasks, enabled: !!userId });
  const quotaQ = useQuery({ queryKey: ["prospection-quota", userId], queryFn: () => getProspectionQuota(userId), enabled: !!userId });

  const prospects = prospectsQ.data || NO_PROSPECTS;
  const tasks = tasksQ.data || NO_TASKS;
  const quota = quotaQ.data || null;

  const [view, setView] = useState<CrmView>(readView);
  const [filters, setFilters] = useState<CrmFilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortState>({ key: "score", dir: "desc" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("details");
  const [toDelete, setToDelete] = useState<Prospect[] | null>(null);
  const [showPricing, setShowPricing] = useState(false);
  // Paiement des contacts de prospection au-delà du forfait (2 € l'unité)
  const [prospectCS, setProspectCS] = useState<string | null>(null);

  const changeView = (v: CrmView) => {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* stockage indisponible : le choix vaut pour la session */ }
  };

  // --- Données dérivées (fonctions pures de src/lib/crm.ts) ---
  const agenda = useMemo(() => buildAgenda(prospects, tasks), [prospects, tasks]);
  const dueIds = useMemo(() => dueProspectIds(agenda), [agenda]);
  const metrics = useMemo(() => computeMetrics(prospects, agenda), [prospects, agenda]);
  const knownTags = useMemo(() => collectTags(prospects), [prospects]);
  const visible = useMemo(
    () => sortProspects(filterProspects(prospects, filters, dueIds), sort.key, sort.dir),
    [prospects, filters, dueIds, sort],
  );
  const total = filters.showArchived ? prospects.length : metrics.total;
  const picked = useMemo(() => visible.filter((p) => selected.has(p.id)), [visible, selected]);
  const opened = openId ? prospects.find((p) => p.id === openId) || null : null;
  const openedTasks = useMemo(() => (openId ? tasks.filter((x) => x.prospect_id === openId) : NO_TASKS), [tasks, openId]);

  // La fiche ouverte a disparu (supprimée, autre compte) : on referme.
  useEffect(() => {
    if (openId && prospectsQ.isSuccess && !opened) setOpenId(null);
  }, [openId, opened, prospectsQ.isSuccess]);

  const openProspect = useCallback((id: string, tab: DrawerTab = "details") => {
    setDrawerTab(tab);
    setOpenId(id);
  }, []);
  const closeDrawer = useCallback(() => setOpenId(null), []);

  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["prospects"] });
    queryClient.invalidateQueries({ queryKey: ["prospect-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["prospect-activities"] });
    queryClient.invalidateQueries({ queryKey: ["prospection-quota"] });
  }, [queryClient]);

  // --- Écritures : mise à jour optimiste, retour arrière si la base refuse ---
  const applyLocal = async (ids: string[], fields: Partial<Prospect>) => {
    await queryClient.cancelQueries({ queryKey: listKey });
    const previous = queryClient.getQueryData<Prospect[]>(listKey);
    const set = new Set(ids);
    queryClient.setQueryData<Prospect[]>(listKey, (old) => (old || []).map((p) => (set.has(p.id) ? { ...p, ...fields } : p)));
    return () => queryClient.setQueryData(listKey, previous);
  };

  const patch = async (ids: string[], fields: ProspectPatch): Promise<boolean> => {
    if (ids.length === 0) return true;
    const rollback = await applyLocal(ids, fields);
    try {
      await patchProspects(ids, fields);
      return true;
    } catch {
      rollback();
      showError(t("crm.toast.save_err", "La modification n'a pas pu être enregistrée. Réessaie."));
      return false;
    } finally {
      queryClient.invalidateQueries({ queryKey: listKey });
    }
  };

  const moveStatus = async (list: Prospect[], to: ProspectStatus): Promise<boolean> => {
    const moved = list.filter((p) => p.status !== to);
    if (moved.length === 0) return true;
    const rollback = await applyLocal(moved.map((p) => p.id), { status: to });
    try {
      await changeStatus(moved, to);
      queryClient.invalidateQueries({ queryKey: ["prospect-activities"] });
      return true;
    } catch {
      rollback();
      showError(t("crm.toast.status_err", "L'étape n'a pas pu être changée. Le prospect reste où il était."));
      return false;
    } finally {
      queryClient.invalidateQueries({ queryKey: listKey });
    }
  };

  const doDelete = async (list: Prospect[]) => {
    const ids = list.map((p) => p.id);
    try {
      await deleteProspects(ids);
      setSelected((s) => { const n = new Set(s); ids.forEach((id) => n.delete(id)); return n; });
      if (openId && ids.includes(openId)) setOpenId(null);
      showSuccess(list.length === 1
        ? t("crm.toast.deleted_one", "Prospect retiré")
        : t("crm.toast.deleted_many", { n: list.length, defaultValue: "{{n}} prospects retirés" }));
    } catch {
      showError(t("crm.toast.delete_err", "La suppression a échoué. Réessaie."));
    } finally {
      refreshAll();
    }
  };

  // --- Sélection et actions groupées ---
  const toggleSel = (id: string) => setSelected((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const allSelected = visible.length > 0 && picked.length === visible.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(visible.map((p) => p.id)));

  const bulkStatus = async (to: ProspectStatus) => {
    const n = picked.filter((p) => p.status !== to).length;
    if (await moveStatus(picked, to)) {
      showSuccess(t("crm.toast.bulk_status", { n, status: statusLabel(to), defaultValue: "{{n}} prospect(s) passé(s) à « {{status}} »" }));
    }
  };
  const bulkArchive = async (archived: boolean) => {
    const ids = picked.filter((p) => isArchived(p) !== archived).map((p) => p.id);
    if (await patch(ids, { archived })) {
      showSuccess(archived
        ? t("crm.toast.archived", { n: ids.length, defaultValue: "{{n}} prospect(s) archivé(s)" })
        : t("crm.toast.unarchived", { n: ids.length, defaultValue: "{{n}} prospect(s) désarchivé(s)" }));
      if (archived && !filters.showArchived) setSelected(new Set());
    }
  };

  // Export CSV de campagne — réservé à Business, avec le quota mensuel.
  const exportCampaign = async () => {
    if (!isBusiness) {
      showError(t("quota.prospection_business", "La prospection ciblée (envoi de campagnes) est réservée à la formule Business."));
      navigate("/payment");
      return;
    }
    const list = picked.filter((p) => (p.email || "").trim());
    if (list.length === 0) { showError(t("crm.toast.export_no_email", "Aucun sélectionné avec un email renseigné")); return; }

    // Quota Business : 20 entreprises contactées / mois, puis 2 € chacune
    const alreadyCounted = await Promise.all(list.map((p) => isProspectAlreadyCounted(userId, p.siren)));
    const newOnes = list.filter((_, i) => !alreadyCounted[i]);
    if (newOnes.length > 0) {
      const q = await getProspectionQuota(userId);
      const startExtra = Math.max(0, q.included - q.used);
      const included = newOnes.slice(0, startExtra);
      const extras = newOnes.slice(startExtra);

      // Les contacts supplémentaires sont PAYANTS : on ouvre Stripe. Ils ne
      // seront enregistrés (et donc exportables) qu'une fois le paiement reçu.
      if (extras.length > 0) {
        const r = await startCheckout({
          kind: "prospection",
          target: { type: "prospection", ids: extras.map((p) => p.siren), name: `${extras.length} contact(s)` },
          returnPath: "/radar?success=1",
        });
        if (r.ok && (r.clientSecret || r.url)) {
          if (r.url) await openCheckout(r.url);
          else setProspectCS(r.clientSecret!);
          toast.info(t("quota.prospection_pay_first",
            `Cette campagne dépasse votre forfait de ${extras.length} contact(s) à ${EXTRA_PROSPECT_PRICE} € — réglez-les, puis relancez l'export.`) as string);
        } else {
          showError(r.error || t("msg.error", "Une erreur est survenue."));
        }
        return;
      }

      await Promise.all(included.map((p) => registerProspectionContact(userId, p.siren, p.nom)));
      queryClient.invalidateQueries({ queryKey: ["prospection-quota"] });
    }

    const csv = "﻿" + buildCampaignCsv(list, senderName, siteLang);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campagne-${list.length}-contacts.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    showSuccess(t("crm.toast.exported", { n: list.length, defaultValue: "{{n}} contact(s) exporté(s) — importe le CSV dans ton outil d'emailing" }));
  };

  // ------------------------------------------------------------------
  // États : chargement, erreur, CRM vide
  // ------------------------------------------------------------------
  if (prospectsQ.isLoading) return <Skeleton />;

  if (prospectsQ.isError) {
    return (
      <div className="liquid-glass rounded-[2rem] border border-white/10 p-8 sm:p-12 text-center" role="alert">
        <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-white/60" aria-hidden />
        <h3 className="text-xl font-light mb-2">{t("crm.state.error_title", "Le CRM n'a pas pu être chargé")}</h3>
        <p className="text-sm text-white/60 max-w-md mx-auto mb-6">
          {t("crm.state.error_desc", "Vérifie ta connexion, puis réessaie. Tes prospects ne sont pas perdus.")}
        </p>
        <button type="button" onClick={() => prospectsQ.refetch()} className={`${primaryBtnCls} mx-auto`}>
          <RefreshCw size={15} className={prospectsQ.isFetching ? "animate-spin" : ""} /> {t("crm.state.retry", "Réessayer")}
        </button>
      </div>
    );
  }

  if (prospects.length === 0) {
    return (
      <div className="liquid-glass rounded-[2rem] border border-white/10 p-8 sm:p-12 text-center">
        <Users2 className="w-12 h-12 mx-auto mb-4 text-white/45" aria-hidden />
        <h3 className="text-xl font-light mb-2">{t("crm.state.empty_title", "Ton CRM est vide")}</h3>
        <p className="text-sm text-white/60 max-w-md mx-auto mb-6 leading-relaxed">
          {t("crm.state.empty_desc", "Cherche des entreprises par activité et par zone, puis ajoute les meilleures ici : tu suivras chaque dossier, de la première prise de contact à la réponse.")}
        </p>
        <button type="button" onClick={onGoToSearch} className={`${primaryBtnCls} mx-auto`}>
          <Search size={15} /> {t("crm.state.empty_cta", "Chercher des entreprises")}
        </button>
      </div>
    );
  }

  const deleteOne = toDelete && toDelete.length === 1 ? toDelete[0] : null;

  return (
    <div className="space-y-4">
      <CrmDashboard
        metrics={metrics}
        agenda={agenda}
        quota={quota}
        isBusiness={isBusiness}
        dueFilterActive={filters.dueOnly}
        onToggleDueFilter={() => setFilters((f) => ({ ...f, dueOnly: !f.dueOnly }))}
        onOpen={openProspect}
      />

      <CrmFilters
        filters={filters}
        onChange={setFilters}
        tags={knownTags}
        view={view}
        onView={changeView}
        shown={visible.length}
        total={total}
        dueCount={dueIds.size}
      />

      {tasksQ.isError && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/75" role="alert">
          <AlertTriangle size={16} className="shrink-0" aria-hidden />
          <span className="flex-1 min-w-[12rem]">{t("crm.state.tasks_error", "Les tâches n'ont pas pu être chargées : « À faire aujourd'hui » peut être incomplet.")}</span>
          <button type="button" onClick={() => tasksQ.refetch()} className={ghostBtnCls}><RefreshCw size={15} /> {t("crm.state.retry", "Réessayer")}</button>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="liquid-glass rounded-2xl border border-white/10 py-14 px-6 text-center">
          <FilterX className="w-10 h-10 mx-auto mb-3 text-white/45" aria-hidden />
          <p className="text-sm text-white/65 mb-4">
            {countActiveFilters(filters) > 0
              ? t("crm.state.no_match", "Aucun prospect ne correspond à ces filtres.")
              : t("crm.state.all_archived", "Tous tes prospects sont archivés.")}
          </p>
          <button
            type="button"
            onClick={() => setFilters(countActiveFilters(filters) > 0 ? EMPTY_FILTERS : { ...EMPTY_FILTERS, showArchived: true })}
            className={`${ghostBtnCls} mx-auto`}
          >
            {countActiveFilters(filters) > 0 ? t("crm.show_all", "Voir tous les prospects") : t("crm.filter.archived", "Afficher les archivés")}
          </button>
        </div>
      ) : view === "pipeline" ? (
        <PipelineBoard prospects={visible} onMove={(p, to) => { moveStatus([p], to); }} onOpen={openProspect} />
      ) : (
        <ProspectTable
          prospects={visible}
          sort={sort}
          onSort={setSort}
          selected={selected}
          onToggle={toggleSel}
          onToggleAll={toggleAll}
          onOpen={openProspect}
          onStatus={(p, to) => { moveStatus([p], to); }}
          onDelete={(p) => setToDelete([p])}
          onBulkStatus={bulkStatus}
          onBulkArchive={bulkArchive}
          onBulkDelete={() => setToDelete(picked)}
          onExport={exportCampaign}
          onCampaign={() => setShowPricing(true)}
        />
      )}

      <AnimatePresence>
        {opened && (
          <ProspectDrawer
            key={opened.id}
            prospect={opened}
            tasks={openedTasks}
            tasksLoading={tasksQ.isLoading}
            tasksError={tasksQ.isError}
            onRetryTasks={() => tasksQ.refetch()}
            tab={drawerTab}
            onTab={setDrawerTab}
            onClose={closeDrawer}
            onPatch={(fields) => patch([opened.id], fields)}
            onStatus={(to) => { moveStatus([opened], to); }}
            onDelete={() => setToDelete([opened])}
            onChanged={refreshAll}
            onPayExtra={(cs) => { setOpenId(null); setProspectCS(cs); }}
            knownTags={knownTags}
            senderName={senderName}
            userId={userId}
            isBusiness={isBusiness}
            quota={quota}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!toDelete && toDelete.length > 0}
        title={deleteOne
          ? t("crm.delete_title", "Retirer ce prospect ?")
          : t("crm.bulk.delete_title", { n: toDelete?.length || 0, defaultValue: "Retirer {{n}} prospects ?" })}
        message={deleteOne
          ? t("crm.delete_msg", { nom: deleteOne.nom, defaultValue: "{{nom}} sera retiré de ton CRM." })
          : t("crm.bulk.delete_msg", "Leurs fiches, leur historique et leurs tâches seront supprimés. Cette action est définitive.")}
        confirmLabel={t("crm.delete_confirm", "Retirer")}
        cancelLabel={t("common.cancel", "Annuler")}
        onConfirm={() => { if (toDelete) doDelete(toDelete); }}
        onClose={() => setToDelete(null)}
      />

      <PricingModal open={showPricing} onClose={() => setShowPricing(false)} />

      {prospectCS && <StripeCheckoutModal clientSecret={prospectCS} onClose={() => setProspectCS(null)} />}
    </div>
  );
}
