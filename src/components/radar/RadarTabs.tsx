"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import { MagnifyingGlass, AddressBook } from "@/components/icons/ph";

export type RadarTab = "search" | "crm";

// Gros sélecteur à deux positions, comme celui de la marketplace.
export function RadarTabs({ tab, onChange, crmCount }: { tab: RadarTab; onChange: (t: RadarTab) => void; crmCount: number }) {
  const { t } = useTranslation();

  const btn = (id: RadarTab, label: string, Icon: React.ElementType, badge?: number) => {
    const active = tab === id;
    return (
      <button
        role="tab"
        aria-selected={active}
        onClick={() => onChange(id)}
        className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 min-h-[44px] px-5 sm:px-7 py-2.5 rounded-full text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
          active ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-white/65 hover:text-white hover:bg-white/5"
        }`}
      >
        <Icon size={18} weight={active ? "fill" : "regular"} className="shrink-0" />
        <span className="whitespace-nowrap">{label}</span>
        {badge != null && (
          <span
            className={`min-w-[1.5rem] px-1.5 py-0.5 rounded-full text-xs font-semibold text-center ${active ? "bg-white/20 text-white" : "bg-white/10 text-white/80"}`}
            aria-label={t("prospection.tab_crm_count", { n: badge, defaultValue: "{{n}} entreprise(s) dans votre CRM" }) as string}
          >
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      role="tablist"
      aria-label={t("prospection.tabs_label", "Recherche ou CRM") as string}
      className="flex gap-1.5 p-1.5 rounded-full bg-black/30 border border-white/10 backdrop-blur-md w-full sm:w-auto self-start lg:self-auto"
    >
      {btn("search", t("prospection.tab_search", "Recherche") as string, MagnifyingGlass)}
      {btn("crm", t("prospection.tab_crm", "Mon CRM") as string, AddressBook, crmCount)}
    </div>
  );
}
