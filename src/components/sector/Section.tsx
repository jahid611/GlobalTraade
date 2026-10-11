"use client";
import React from "react";

// Une section de la page : pastille d'icône, titre, phrase d'explication.
export function Section({
  id, icon: Icon, title, subtitle, count, action, children,
}: {
  id?: string;
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  /** nombre affiché à côté du titre */
  count?: number;
  /** lien ou bouton à droite du titre */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-12 md:mt-14 scroll-mt-[calc(var(--nav-clearance)+1rem)]">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-white/15 pb-5 mb-6">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
            <Icon size={24} className="text-[#a5b4fc]" weight="fill" />
          </div>
          <div className="min-w-0">
            {/* Téléphone : le titre peut tenir sur deux lignes, le nombre reste en
                haut à droite sur la même ligne (au lieu de tomber seul dessous).
                Ordinateur : le nombre suit le titre. */}
            <h2 className="text-xl md:text-2xl font-medium text-white leading-tight flex items-start md:items-center justify-between md:justify-start gap-3">
              <span className="min-w-0">{title}</span>
              {typeof count === "number" && (
                <span className="inline-flex items-center justify-center shrink-0 min-w-[2rem] h-7 md:h-8 px-2.5 -mt-0.5 md:mt-0 rounded-full bg-primary/25 border border-primary/45 text-sm font-semibold text-white">
                  {count}
                </span>
              )}
            </h2>
            {subtitle && <p className="text-sm md:text-[15px] text-white/65 font-light mt-1.5 leading-relaxed max-w-3xl">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

// État vide : dit pourquoi il n'y a rien, et quoi faire ensuite.
export function EmptyState({
  icon: Icon, title, desc, children,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="py-8 px-6 text-center flex flex-col items-center bg-black/20 border border-white/20 border-dashed rounded-3xl backdrop-blur-md">
      <Icon size={40} className="text-white/45 mb-3" />
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-white/70 font-light text-sm md:text-[15px] max-w-xl leading-relaxed">{desc}</p>
      {children && <div className="mt-6 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-3 w-full sm:w-auto">{children}</div>}
    </div>
  );
}

export const primaryBtn =
  "inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-full bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60";
export const ghostBtn =
  "inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/25 text-white text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60";
