"use client";
import React, { useState } from "react";
import { CaretDown, CaretUp } from "phosphor-react";

// Même grille pour toutes les rubriques : 1, 2 puis 4 cartes par ligne.
export const DASH_GRID = "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 [&_button[aria-pressed]]:!w-11 [&_button[aria-pressed]]:!h-11";
/** Nombre de cartes montrées avant « Voir tout ». */
export const DASH_PREVIEW = 4;

export function PanelHeader({ title, desc, action }: { title: React.ReactNode; desc?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
      <div className="min-w-0">
        <h2 className="text-2xl font-light text-white">{title}</h2>
        {desc && <p className="text-sm text-white/70 font-light mt-1 leading-relaxed max-w-3xl">{desc}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function SubTitle({ title, desc }: { title: React.ReactNode; desc?: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-xl font-light text-white">{title}</h3>
      {desc && <p className="text-sm text-white/65 font-light mt-1 leading-relaxed max-w-3xl">{desc}</p>}
    </div>
  );
}

// État vide : dit quoi faire ensuite, avec le bouton pour le faire.
export function EmptyState({ Icon, title, desc, action }: { Icon: React.ElementType; title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="py-12 sm:py-14 px-6 text-center flex flex-col items-center bg-black/20 border border-dashed border-white/20 rounded-[2rem] backdrop-blur-md">
      <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center mb-5">
        <Icon className="w-8 h-8 text-[#a5b4fc]" />
      </div>
      <h3 className="text-xl font-medium text-white mb-2">{title}</h3>
      <p className="text-white/75 font-light text-sm md:text-base max-w-md leading-relaxed">{desc}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export const primaryBtn =
  "inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-full bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60";
export const outlineBtn =
  "inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-full border border-white/25 bg-white/[0.04] hover:bg-white/10 text-white text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60";

// Montre quelques cartes, puis « Voir tout (N) » déplie le reste sur place.
export function ShowAllGrid<T>({
  items, getKey, renderItem, showAllLabel, showLessLabel, limit = DASH_PREVIEW,
}: {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  showAllLabel: string;
  showLessLabel: string;
  limit?: number;
}) {
  const [open, setOpen] = useState(false);
  const shown = open ? items : items.slice(0, limit);

  return (
    <div>
      <div className={DASH_GRID}>
        {shown.map((item) => (
          <React.Fragment key={getKey(item)}>{renderItem(item)}</React.Fragment>
        ))}
      </div>
      {items.length > limit && (
        <div className="mt-6 flex justify-center">
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className={`${outlineBtn} w-full sm:w-auto sm:min-w-[18rem]`}>
            {open ? showLessLabel : showAllLabel}
            {open ? <CaretUp size={16} weight="bold" /> : <CaretDown size={16} weight="bold" />}
          </button>
        </div>
      )}
    </div>
  );
}
