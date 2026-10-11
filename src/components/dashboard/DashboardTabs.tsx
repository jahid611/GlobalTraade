"use client";
import React from "react";
import { useTranslation } from "react-i18next";

export type DashTab = "listings" | "favorites" | "suggestions" | "activity";

export interface DashTabDef {
  id: DashTab;
  label: string;
  Icon: React.ElementType;
  count?: number;
}

// Gros sélecteur : une seule rubrique affichée à la fois, les autres à un clic.
export function DashboardTabs({ tabs, tab, onChange }: { tabs: DashTabDef[]; tab: DashTab; onChange: (t: DashTab) => void }) {
  const { t } = useTranslation();

  return (
    <div
      role="tablist"
      aria-label={t("dashboard.tabs_label", "Rubriques du tableau de bord") as string}
      className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 p-1.5 rounded-3xl bg-black/30 border border-white/10 backdrop-blur-md"
    >
      {tabs.map(({ id, label, Icon, count }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            role="tab"
            id={`dash-tab-${id}`}
            aria-selected={active}
            aria-controls="dash-panel"
            onClick={() => onChange(id)}
            // Téléphone : l'icône au-dessus, le nom centré dessous, le nombre dans
            // le coin — chaque case a la même forme. Ordinateur : tout sur une ligne.
            className={`relative flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 min-h-[76px] sm:min-h-[56px] px-2 sm:px-5 py-3 sm:py-2.5 rounded-2xl text-[13px] sm:text-[15px] font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
              active ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-white/75 hover:text-white hover:bg-white/5"
            }`}
          >
            <Icon size={22} weight={active ? "fill" : "regular"} className="shrink-0" />
            <span className="leading-tight text-center sm:text-left">{label}</span>
            {count != null && (
              <span className={`absolute top-2 right-2 sm:static min-w-[1.6rem] px-1.5 py-0.5 rounded-full text-xs font-semibold text-center ${active ? "bg-white/20 text-white" : "bg-white/10 text-white/80"}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
