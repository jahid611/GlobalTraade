"use client";
import React from "react";
import { MagnifyingGlass, X, Fire, Users } from "@/components/icons/ph";
import { useTranslation } from "react-i18next";
import { MultiSelect } from "@/components/MultiSelect";
import { industryOptions } from "@/lib/industries";
import type { HelpType } from "@/services/projectService";
import { ALL_HELP, HELP_META, TONES, pillStyle, type Tone } from "./projectMeta";

interface ProjectFiltersProps {
  query: string;
  onQuery: (v: string) => void;
  /** secteurs retenus (clés de la liste maîtresse) ; vide = tous */
  activeCategories: string[];
  onCategories: (v: string[]) => void;
  activeHelp: HelpType | null;
  onHelp: (v: HelpType | null) => void;
  urgentOnly: boolean;
  onUrgent: (v: boolean) => void;
  mineOnly: boolean;
  onMine: (v: boolean) => void;
  /** « Mes projets » n'a de sens que connecté */
  showMine: boolean;
  onReset: () => void;
}

const groupLabel = "block text-xs font-semibold uppercase tracking-widest text-white/70 mb-2.5";
const idlePill = "bg-white/5 border-white/15 text-white/70 hover:bg-white/10 hover:text-white";

function TogglePill({ active, tone, onClick, children }: { active: boolean; tone: Tone; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 h-10 px-4 rounded-full border text-sm whitespace-nowrap transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${active ? "font-medium" : idlePill}`}
      style={active ? pillStyle(tone) : undefined}
    >
      {children}
    </button>
  );
}

export function ProjectFilters({
  query, onQuery, activeCategories, onCategories, activeHelp, onHelp, urgentOnly, onUrgent, mineOnly, onMine, showMine, onReset,
}: ProjectFiltersProps) {
  const { t, i18n } = useTranslation();

  // La même liste de secteurs que partout sur le site (src/lib/industries.ts).
  const categoryOptions = industryOptions(t, i18n.language);
  const categoryLabel = (id: string) => t(`industry.${id}`, { defaultValue: id }) as string;

  // Filtres en cours, affichés en pastilles que l'on retire d'un clic.
  const chips: { key: string; label: string; clear: () => void }[] = [
    ...(query.trim() ? [{ key: "q", label: `« ${query.trim()} »`, clear: () => onQuery("") }] : []),
    ...activeCategories.map(id => ({ key: `cat-${id}`, label: categoryLabel(id), clear: () => onCategories(activeCategories.filter(x => x !== id)) })),
    ...(activeHelp ? [{ key: "help", label: `${t("projects.chip_help", "Aide")} : ${t(HELP_META[activeHelp].key)}`, clear: () => onHelp(null) }] : []),
    ...(urgentOnly ? [{ key: "urgent", label: t("hub.urgent") as string, clear: () => onUrgent(false) }] : []),
    ...(mineOnly ? [{ key: "mine", label: t("hub.my_projects", "Mes projets") as string, clear: () => onMine(false) }] : []),
  ];

  return (
    <div className="liquid-glass rounded-3xl border border-white/10 p-5 sm:p-6 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] gap-x-5 gap-y-5">
        <div className="min-w-0">
          <label htmlFor="projects-search" className={groupLabel}>{t("projects.search_group", "Recherche")}</label>
          <div className="relative">
            <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/45 pointer-events-none" />
            <input
              id="projects-search"
              type="search"
              value={query}
              onChange={e => onQuery(e.target.value)}
              placeholder={t("projects.search_placeholder", "Chercher un titre, une idée, une ville…") as string}
              className="w-full h-12 pl-11 pr-11 rounded-full bg-white/5 border border-white/15 text-sm text-white placeholder:text-white/40 outline-none focus:border-primary/70 focus:bg-white/[0.07] transition-colors [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => onQuery("")}
                aria-label={t("projects.search_clear", "Effacer la recherche") as string}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <span className={groupLabel}>{t("projects.sector_group", "Secteur")}</span>
          <MultiSelect
            options={categoryOptions}
            selected={activeCategories}
            onChange={onCategories}
            placeholder={t("projects.all_sectors", "Tous les secteurs") as string}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-x-10 gap-y-5">
        <div className="min-w-0">
          <span className={groupLabel}>{t("projects.help_group", "Type d'aide recherchée")}</span>
          <div className="flex flex-wrap gap-2">
            {ALL_HELP.map(h => {
              const m = HELP_META[h];
              const active = activeHelp === h;
              return (
                <TogglePill key={h} active={active} tone={m.tone} onClick={() => onHelp(active ? null : h)}>
                  <m.Icon className="w-4 h-4 shrink-0" style={{ color: m.tone.color }} weight={active ? "fill" : "regular"} />
                  {t(m.key)}
                </TogglePill>
              );
            })}
          </div>
        </div>

        <div className="min-w-0">
          <span className={groupLabel}>{t("projects.show_group", "Afficher seulement")}</span>
          <div className="flex flex-wrap gap-2">
            <TogglePill active={urgentOnly} tone={TONES.red} onClick={() => onUrgent(!urgentOnly)}>
              <Fire className="w-4 h-4 shrink-0" style={{ color: TONES.red.color }} weight={urgentOnly ? "fill" : "regular"} />
              {t("projects.urgent_only", "Les projets urgents")}
            </TogglePill>
            {showMine && (
              <TogglePill active={mineOnly} tone={TONES.indigo} onClick={() => onMine(!mineOnly)}>
                <Users className="w-4 h-4 shrink-0" style={{ color: TONES.indigo.color }} weight={mineOnly ? "fill" : "regular"} />
                {t("hub.my_projects", "Mes projets")}
              </TogglePill>
            )}
          </div>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-white/10">
          <span className="text-xs text-white/55 mr-1">{t("projects.active_filters", "Filtres actifs :")}</span>
          {chips.map(chip => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.clear}
              className="inline-flex items-center gap-1.5 pl-3 pr-2 h-8 rounded-full bg-primary/20 border border-primary/40 text-xs text-white hover:bg-primary/30 transition-colors"
            >
              <span className="truncate max-w-[14rem]">{chip.label}</span>
              <X className="w-3.5 h-3.5 shrink-0" />
            </button>
          ))}
          <button type="button" onClick={onReset} className="text-xs text-white/60 hover:text-white underline underline-offset-4 ml-1 transition-colors">
            {t("projects.clear_all", "Tout effacer")}
          </button>
        </div>
      )}
    </div>
  );
}
