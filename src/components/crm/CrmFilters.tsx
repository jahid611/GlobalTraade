"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { Search, X, BellRing, MailX, Archive, KanbanSquare, List } from "@/components/icons";
import { Dropdown } from "@/components/PickerKit";
import { STATUS_ORDER, type ProspectPriority, type ProspectStatus } from "@/services/prospectService";
import { EMPTY_FILTERS, PRIORITY_ORDER, type CrmFilterState } from "@/lib/crm";
import { PRIORITY_META, useStatusLabel } from "./crmMeta";

export type CrmView = "pipeline" | "list";

interface CrmFiltersProps {
  filters: CrmFilterState;
  onChange: (f: CrmFilterState) => void;
  tags: string[];
  view: CrmView;
  onView: (v: CrmView) => void;
  /** nombre de prospects affichés / total (archivés compris si affichés) */
  shown: number;
  total: number;
  dueCount: number;
}

const ALL = "__all";
const pickerBtn =
  "w-full flex items-center justify-between gap-2 h-11 rounded-full px-4 text-sm bg-white/5 border border-white/15 text-white/85 hover:bg-white/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/70";

function Toggle({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 h-11 px-4 rounded-full border text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${
        active ? "bg-primary/25 border-primary/60 text-white font-medium" : "bg-white/5 border-white/15 text-white/75 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon size={15} className="shrink-0" aria-hidden />
      {children}
    </button>
  );
}

export function CrmFilters({ filters, onChange, tags, view, onView, shown, total, dueCount }: CrmFiltersProps) {
  const { t } = useTranslation();
  const statusLabel = useStatusLabel();
  const set = (patch: Partial<CrmFilterState>) => onChange({ ...filters, ...patch });
  const priorityLabel = (p: ProspectPriority) => t(`crm.priority.${p}`, PRIORITY_META[p].label) as string;

  const statusOptions = [
    { value: ALL, label: t("crm.filter.all_status", "Toutes les étapes") as string },
    ...STATUS_ORDER.map((s) => ({ value: s, label: statusLabel(s) })),
  ];
  const priorityOptions = [
    { value: ALL, label: t("crm.filter.all_priority", "Toutes les priorités") as string },
    ...PRIORITY_ORDER.map((p) => ({ value: p, label: `${t("crm.priority.label", "Priorité")} : ${priorityLabel(p).toLowerCase()}` })),
  ];
  const tagOptions = [
    { value: ALL, label: t("crm.filter.all_tags", "Toutes les étiquettes") as string },
    ...tags.map((tg) => ({ value: tg, label: tg })),
  ];

  const chips: { key: string; label: string; clear: () => void }[] = [
    ...(filters.query.trim() ? [{ key: "q", label: `« ${filters.query.trim()} »`, clear: () => set({ query: "" }) }] : []),
    ...(filters.status ? [{ key: "status", label: statusLabel(filters.status), clear: () => set({ status: null }) }] : []),
    ...(filters.priority ? [{ key: "priority", label: `${t("crm.priority.label", "Priorité")} : ${priorityLabel(filters.priority).toLowerCase()}`, clear: () => set({ priority: null }) }] : []),
    ...(filters.tag ? [{ key: "tag", label: `# ${filters.tag}`, clear: () => set({ tag: null }) }] : []),
    ...(filters.dueOnly ? [{ key: "due", label: t("crm.filter.due", "À relancer") as string, clear: () => set({ dueOnly: false }) }] : []),
    ...(filters.noEmail ? [{ key: "noemail", label: t("crm.filter.no_email", "Sans email") as string, clear: () => set({ noEmail: false }) }] : []),
    ...(filters.showArchived ? [{ key: "arch", label: t("crm.filter.archived_chip", "Archivés affichés") as string, clear: () => set({ showArchived: false }) }] : []),
  ];

  const views: { id: CrmView; label: string; Icon: React.ElementType }[] = [
    { id: "pipeline", label: t("crm.view.pipeline", "Pipeline") as string, Icon: KanbanSquare },
    { id: "list", label: t("crm.view.list", "Liste") as string, Icon: List },
  ];

  return (
    <div className="liquid-glass rounded-2xl border border-white/10 p-4 sm:p-5 space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/45 pointer-events-none" aria-hidden />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => set({ query: e.target.value })}
            placeholder={t("crm.filter.search_ph", "Chercher une entreprise, un dirigeant, une ville, un email, une étiquette…") as string}
            aria-label={t("crm.filter.search_label", "Chercher dans le CRM") as string}
            className="w-full h-11 pl-11 pr-12 rounded-full bg-white/5 border border-white/15 text-base sm:text-sm text-white placeholder:text-white/40 outline-none focus:border-primary/70 focus:bg-white/[0.07] transition-colors [&::-webkit-search-cancel-button]:hidden"
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => set({ query: "" })}
              aria-label={t("crm.filter.search_clear", "Effacer la recherche") as string}
              className="absolute right-0 top-0 w-11 h-11 rounded-full flex items-center justify-center text-white/60 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div role="group" aria-label={t("crm.view.label", "Affichage") as string} className="flex p-1 rounded-full bg-white/5 border border-white/15 shrink-0">
          {views.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onView(id)}
              aria-pressed={view === id}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 h-11 sm:h-9 min-w-[44px] px-4 rounded-full text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${
                view === id ? "bg-primary text-white font-medium" : "text-white/65 hover:text-white"
              }`}
            >
              <Icon size={15} aria-hidden /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Dropdown
          value={filters.status || ALL}
          onChange={(v) => set({ status: v === ALL ? null : (v as ProspectStatus) })}
          options={statusOptions}
          className="w-full sm:w-52"
          buttonClassName={pickerBtn}
        />
        <Dropdown
          value={filters.priority || ALL}
          onChange={(v) => set({ priority: v === ALL ? null : (v as ProspectPriority) })}
          options={priorityOptions}
          className="w-full sm:w-52"
          buttonClassName={pickerBtn}
        />
        {tags.length > 0 && (
          <Dropdown
            value={filters.tag || ALL}
            onChange={(v) => set({ tag: v === ALL ? null : v })}
            options={tagOptions}
            className="w-full sm:w-52"
            buttonClassName={pickerBtn}
          />
        )}
        <Toggle active={filters.dueOnly} onClick={() => set({ dueOnly: !filters.dueOnly })} icon={BellRing}>
          {t("crm.filter.due", "À relancer")}
          {dueCount > 0 && <span className="px-1.5 rounded-full bg-white/15 text-xs font-bold">{dueCount}</span>}
        </Toggle>
        <Toggle active={filters.noEmail} onClick={() => set({ noEmail: !filters.noEmail })} icon={MailX}>
          {t("crm.filter.no_email", "Sans email")}
        </Toggle>
        <Toggle active={filters.showArchived} onClick={() => set({ showArchived: !filters.showArchived })} icon={Archive}>
          {t("crm.filter.archived", "Afficher les archivés")}
        </Toggle>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/10">
        <span className="text-xs text-white/60 mr-1" role="status" aria-live="polite">
          {t("crm.filter.count", { shown, total, defaultValue: "{{shown}} prospect(s) sur {{total}}" })}
        </span>
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={chip.clear}
            aria-label={t("crm.filter.remove", { label: chip.label, defaultValue: "Retirer le filtre {{label}}" }) as string}
            className="inline-flex items-center gap-1.5 pl-3 pr-2 h-11 sm:h-9 rounded-full bg-primary/20 border border-primary/40 text-xs text-white hover:bg-primary/30 transition-colors"
          >
            <span className="truncate max-w-[14rem]">{chip.label}</span>
            <X className="w-3.5 h-3.5 shrink-0" />
          </button>
        ))}
        {chips.length > 0 && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="h-11 sm:h-9 px-2 text-xs text-white/65 hover:text-white underline underline-offset-4"
          >
            {t("crm.filter.clear_all", "Tout effacer")}
          </button>
        )}
      </div>
    </div>
  );
}
