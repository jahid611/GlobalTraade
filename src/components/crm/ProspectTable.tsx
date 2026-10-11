"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowUp, ArrowDown, ArrowUpDown, CheckSquare, Square, Download, Send, Archive, ArchiveRestore, Trash2,
  ExternalLink, ChevronRight, Mail,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dropdown } from "@/components/PickerKit";
import { STATUS_ORDER, type Prospect, type ProspectStatus } from "@/services/prospectService";
import { isArchived, priorityOf, type SortDir, type SortKey } from "@/lib/crm";
import {
  DueBadge, PriorityBadge, ScoreBadge, RED, STATUS_CLS, annuaireUrl, ghostBtnCls, iconBtnCls, useCrmFormat, useStatusLabel,
} from "./crmMeta";

export interface SortState { key: SortKey; dir: SortDir }

interface ProspectTableProps {
  /** prospects déjà filtrés et triés */
  prospects: Prospect[];
  sort: SortState;
  onSort: (s: SortState) => void;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onOpen: (id: string) => void;
  onStatus: (p: Prospect, to: ProspectStatus) => void;
  onDelete: (p: Prospect) => void;
  onBulkStatus: (to: ProspectStatus) => void;
  onBulkArchive: (archived: boolean) => void;
  onBulkDelete: () => void;
  onExport: () => void;
  onCampaign: () => void;
}

const BULK = "__bulk";
const tipCls = "max-w-[260px] text-xs font-light leading-relaxed bg-[#211f25] text-white border-white/10";

// Sens par défaut au premier clic sur une colonne : le plus utile d'abord.
const DEFAULT_DIR: Record<SortKey, SortDir> = {
  nom: "asc", status: "asc", score: "desc", priority: "desc", next_action: "asc", last_contact: "desc", value: "desc",
};

function Check({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className="inline-flex items-center justify-center w-11 h-11 shrink-0 rounded-xl text-white/60 hover:text-white outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
    >
      {checked ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} />}
    </button>
  );
}

export function ProspectTable({
  prospects, sort, onSort, selected, onToggle, onToggleAll, onOpen, onStatus, onDelete,
  onBulkStatus, onBulkArchive, onBulkDelete, onExport, onCampaign,
}: ProspectTableProps) {
  const { t } = useTranslation();
  const f = useCrmFormat();
  const statusLabel = useStatusLabel();
  const statusOptions = STATUS_ORDER.map((s) => ({ value: s, label: statusLabel(s) }));

  const picked = prospects.filter((p) => selected.has(p.id));
  const n = picked.length;
  const allSelected = prospects.length > 0 && n === prospects.length;
  const allArchived = n > 0 && picked.every(isArchived);

  const columns: { key: SortKey; label: string; align?: "right" }[] = [
    { key: "nom", label: t("crm.table.company", "Entreprise") as string },
    { key: "status", label: t("crm.table.status", "Étape") as string },
    { key: "score", label: t("crm.table.score", "Score") as string },
    { key: "priority", label: t("crm.table.priority", "Priorité") as string },
    { key: "next_action", label: t("crm.table.next_action", "Prochaine action") as string },
    { key: "last_contact", label: t("crm.table.last_contact", "Dernier contact") as string },
    { key: "value", label: t("crm.table.value", "Valeur") as string, align: "right" },
  ];
  const clickSort = (key: SortKey) =>
    onSort(sort.key === key ? { key, dir: sort.dir === "asc" ? "desc" : "asc" } : { key, dir: DEFAULT_DIR[key] });
  const sortOptions = columns.flatMap((c) => (["asc", "desc"] as SortDir[]).map((dir) => ({
    value: `${c.key}:${dir}`,
    label: `${c.label} ${dir === "asc" ? "↑" : "↓"}`,
  })));

  const subline = (p: Prospect) =>
    [[p.code_postal, p.ville].filter(Boolean).join(" "), p.dirigeant_nom].filter(Boolean).join(" · ");

  // Fonctions de rendu (et non composants) : le menu d'étape reste ouvert si la liste se rafraîchit.
  const statusPicker = (p: Prospect, className = "") => (
    <div onClick={(e) => e.stopPropagation()} className={className}>
      <Dropdown
        value={p.status}
        onChange={(v) => onStatus(p, v as ProspectStatus)}
        options={statusOptions}
        buttonClassName={`w-full flex items-center justify-between gap-2 h-11 lg:h-9 rounded-lg px-3 text-sm ${STATUS_CLS[p.status] || ""}`}
      />
    </div>
  );

  const rowActions = (p: Prospect) => (
    <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
      <a href={annuaireUrl(p.siren)} target="_blank" rel="noreferrer" className={iconBtnCls} title={t("crm.action_sheet", "Fiche entreprise") as string} aria-label={t("crm.action_sheet", "Fiche entreprise") as string}>
        <ExternalLink size={16} />
      </a>
      <button type="button" onClick={() => onDelete(p)} className={iconBtnCls} title={t("crm.action_remove", "Retirer") as string} aria-label={t("crm.action_remove", "Retirer") as string}>
        <Trash2 size={16} />
      </button>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Sélection et actions groupées */}
      <div className="liquid-glass rounded-2xl border border-white/10 px-3 py-2.5 flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-3">
        <button type="button" onClick={onToggleAll} className="flex items-center gap-2 h-11 px-2 text-sm text-white/80 hover:text-white w-fit">
          {allSelected ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} />}
          {n > 0 ? t("crm.selected", { n, defaultValue: "{{n}} sélectionné(s)" }) : t("crm.select_all", "Tout sélectionner")}
        </button>

        <div className="flex flex-wrap items-center gap-2 xl:ml-auto">
          {n > 0 && (
            <>
              <Dropdown
                value={BULK}
                onChange={(v) => { if (v !== BULK) onBulkStatus(v as ProspectStatus); }}
                options={statusOptions}
                placeholder={t("crm.bulk.status", "Changer d'étape") as string}
                className="w-full sm:w-48"
                buttonClassName={`${ghostBtnCls} w-full justify-between`}
              />
              <button type="button" onClick={() => onBulkArchive(!allArchived)} className={`${ghostBtnCls} w-full sm:w-auto`}>
                {allArchived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                {allArchived ? t("crm.bulk.unarchive", "Désarchiver") : t("crm.bulk.archive", "Archiver")}
              </button>
              <button type="button" onClick={onBulkDelete} className={`${ghostBtnCls} w-full sm:w-auto`} style={{ color: RED }}>
                <Trash2 size={15} /> {t("crm.bulk.delete", "Supprimer")}
              </button>
            </>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" onClick={onExport} disabled={n === 0} className={`${ghostBtnCls} w-full sm:w-auto`}>
                <Download size={15} /> {t("crm.export_csv", "Exporter en CSV")}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className={tipCls}>
              {t("crm.export_tip", "Télécharge un fichier CSV (1 ligne par prospect, avec un email de contact pré-rédigé) à importer dans ton outil d'emailing (Brevo, Mailchimp…).")}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" onClick={onCampaign} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-sm text-white transition-colors">
                <Send size={15} /> {t("crm.campaign", "Campagne email")}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className={tipCls}>
              {t("crm.campaign_tip", "Envoie automatiquement ton email de prise de contact à tous les prospects sélectionnés, sans passer par un outil externe (fonctionnalité premium).")}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Tri : sur mobile, les en-têtes de colonnes n'existent pas */}
      <div className="lg:hidden flex items-center gap-2">
        <span className="text-xs text-white/60 shrink-0">{t("crm.table.sort_by", "Trier par")}</span>
        <Dropdown
          value={`${sort.key}:${sort.dir}`}
          onChange={(v) => { const [key, dir] = v.split(":"); onSort({ key: key as SortKey, dir: dir as SortDir }); }}
          options={sortOptions}
          className="flex-1 min-w-0"
          buttonClassName={`${ghostBtnCls} w-full justify-between`}
        />
      </div>

      {/* Ordinateur : tableau */}
      <div className="hidden lg:block liquid-glass rounded-2xl border border-white/10 overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[980px] text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className="w-11 pl-1" scope="col">
                <Check checked={allSelected} onChange={onToggleAll} label={t("crm.select_all", "Tout sélectionner") as string} />
              </th>
              {columns.map((c) => {
                const on = sort.key === c.key;
                const Icon = !on ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
                return (
                  <th key={c.key} scope="col" aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={`px-2 font-normal ${c.align === "right" ? "text-right" : ""}`}>
                    <button
                      type="button"
                      onClick={() => clickSort(c.key)}
                      className={`inline-flex items-center gap-1.5 h-11 text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/70 rounded ${on ? "text-white" : "text-white/60 hover:text-white"}`}
                    >
                      {c.label} <Icon size={13} className={on ? "text-primary" : "opacity-60"} aria-hidden />
                    </button>
                  </th>
                );
              })}
              <th scope="col" className="w-24"><span className="sr-only">{t("crm.table.actions", "Actions")}</span></th>
            </tr>
          </thead>
          <tbody>
            {prospects.map((p) => {
              const on = selected.has(p.id);
              return (
                <tr
                  key={p.id}
                  onClick={() => onOpen(p.id)}
                  className={`border-b border-white/[0.06] last:border-0 cursor-pointer transition-colors ${on ? "bg-primary/10" : "hover:bg-white/[0.04]"} ${isArchived(p) ? "opacity-60" : ""}`}
                >
                  <td className="pl-1">
                    <Check checked={on} onChange={() => onToggle(p.id)} label={t("crm.table.select_one", { nom: p.nom, defaultValue: "Sélectionner {{nom}}" }) as string} />
                  </td>
                  <td className="px-2 py-2 max-w-[20rem]">
                    <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(p.id); }} className="block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/70 rounded">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-white truncate">{p.nom}</span>
                        {isArchived(p) && <Archive size={13} className="shrink-0 text-white/60" aria-label={t("crm.archived_badge", "Archivé") as string} />}
                        {(p.email || "").trim() && <Mail size={13} className="shrink-0 text-white/45" aria-label={t("crm.card.email_ok", "Email connu") as string} />}
                      </span>
                      <span className="block text-xs text-white/55 truncate">{subline(p) || `SIREN ${p.siren}`}</span>
                    </button>
                  </td>
                  <td className="px-2 w-44">{statusPicker(p)}</td>
                  <td className="px-2"><ScoreBadge score={p.score} /></td>
                  <td className="px-2"><PriorityBadge priority={priorityOf(p)} /></td>
                  <td className="px-2 max-w-[15rem]">
                    {p.next_action_at ? <DueBadge iso={p.next_action_at} label={p.next_action_label} /> : <span className="text-white/35">—</span>}
                  </td>
                  <td className="px-2 text-white/70 whitespace-nowrap" title={p.last_contacted_at ? f.dayTime(p.last_contacted_at) : undefined}>
                    {p.last_contacted_at ? f.ago(p.last_contacted_at) : <span className="text-white/35">—</span>}
                  </td>
                  <td className="px-2 text-right tabular-nums whitespace-nowrap text-white/85">
                    {p.estimated_value != null ? f.money(Number(p.estimated_value)) : <span className="text-white/35">—</span>}
                  </td>
                  <td className="pr-1"><div className="flex justify-end">{rowActions(p)}</div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile et tablette : cartes empilées */}
      <ul className="lg:hidden space-y-2.5">
        {prospects.map((p) => {
          const on = selected.has(p.id);
          return (
            <li key={p.id} className={`liquid-glass rounded-2xl border p-2.5 ${on ? "border-primary/60" : "border-white/10"} ${isArchived(p) ? "opacity-70" : ""}`}>
              <div className="flex items-start gap-1">
                <Check checked={on} onChange={() => onToggle(p.id)} label={t("crm.table.select_one", { nom: p.nom, defaultValue: "Sélectionner {{nom}}" }) as string} />
                <button type="button" onClick={() => onOpen(p.id)} className="flex-1 min-w-0 min-h-[44px] flex items-center gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/70 rounded-lg">
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium text-white leading-snug break-words">{p.nom}</span>
                    <span className="block text-xs text-white/55 truncate">{subline(p) || `SIREN ${p.siren}`}</span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-white/40" aria-hidden />
                </button>
              </div>
              <div className="mt-2 px-1.5 flex flex-wrap items-center gap-1.5">
                <ScoreBadge score={p.score} />
                <PriorityBadge priority={priorityOf(p)} />
                {p.estimated_value != null && <span className="text-xs font-medium text-white/85 tabular-nums">{f.money(Number(p.estimated_value))}</span>}
                {isArchived(p) && (
                  <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-xs border border-white/15 bg-white/5 text-white/65">
                    <Archive size={12} aria-hidden /> {t("crm.archived_badge", "Archivé")}
                  </span>
                )}
              </div>
              {(p.next_action_at || p.last_contacted_at) && (
                <div className="mt-2 px-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-white/60">
                  {p.next_action_at && <DueBadge iso={p.next_action_at} label={p.next_action_label} />}
                  {p.last_contacted_at && <span>{t("crm.table.last_contact", "Dernier contact")} : {f.ago(p.last_contacted_at)}</span>}
                </div>
              )}
              <div className="mt-2.5 flex items-center gap-1 pl-1.5">
                {statusPicker(p, "flex-1 min-w-0")}
                {rowActions(p)}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
