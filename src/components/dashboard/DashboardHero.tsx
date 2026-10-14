"use client";
import React from "react";
import { motion } from "framer-motion";
import { Storefront, ArrowRight } from "@/components/icons/ph";
import { useTranslation } from "react-i18next";

export interface DashStat {
  key: string;
  Icon: React.ElementType;
  value: number;
  label: string;
  desc: string;
  /** Présent : le chiffre est un bouton qui ouvre la page correspondante. */
  onClick?: () => void;
  linkLabel?: string;
}

// Bandeau principal : « où j'en suis » (bonjour + quatre chiffres) et le geste
// principal. La mascotte a sa propre case : elle ne passe jamais sur un texte.
export function DashboardHero({ name, stats, onSell }: { name: string; stats: DashStat[]; onSell: () => void }) {
  const { t } = useTranslation();

  return (
    <section
      aria-label={t("dashboard.hero_label", "Où vous en êtes") as string}
      className="relative rounded-[2rem] p-[1.5px] shadow-[0_20px_70px_rgba(89,85,232,0.35)]"
      style={{ background: "linear-gradient(135deg, rgba(120,114,251,0.95) 0%, rgba(89,85,232,0.45) 40%, rgba(255,255,255,0.12) 100%)" }}
    >
      <div className="rounded-[calc(2rem-1.5px)] bg-[#232229]/95 backdrop-blur-xl p-5 sm:p-8">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-8 xl:gap-12 xl:items-center">
          <div className="min-w-0 flex items-center gap-4 sm:gap-6">
            <motion.div
              animate={{ y: [0, -8, 0], rotate: [0, -2, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 sm:w-32 lg:w-40 shrink-0 pointer-events-none self-start sm:self-center"
            >
              <img src="/mascot/globi-etoile.png" alt="" className="w-full h-auto drop-shadow-2xl" />
            </motion.div>
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl md:text-[1.7rem] font-medium text-white leading-tight tracking-tight break-words">
                {name
                  ? t("dashboard.hello_name", { name, defaultValue: "Bonjour {{name}}" })
                  : t("dashboard.hello", "Bonjour")}
              </h2>
              <p className="text-sm md:text-base text-white/70 font-light mt-1.5 leading-relaxed">
                {t("dashboard.hero_desc", "Voici où vous en êtes aujourd'hui. Vos chiffres, puis ce qu'il vous reste à faire.")}
              </p>
              <button
                onClick={onSell}
                className="group hidden sm:inline-flex mt-5 items-center gap-3 rounded-2xl bg-primary hover:bg-primary/90 px-5 min-h-[3.25rem] text-white text-base font-semibold shadow-[0_10px_30px_rgba(89,85,232,0.55)] transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <Storefront size={22} weight="fill" className="shrink-0" />
                <span className="text-left leading-tight">{t("dashboard.cta_sell", "Mettre une entreprise en vente")}</span>
                <ArrowRight size={18} className="shrink-0 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Sur téléphone, le bouton prend toute la largeur, sous le texte. */}
          <button
            onClick={onSell}
            className="sm:hidden -mt-3 flex items-center justify-center gap-3 rounded-2xl bg-primary hover:bg-primary/90 px-5 min-h-[3.25rem] text-white text-base font-semibold shadow-[0_10px_30px_rgba(89,85,232,0.55)] outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <Storefront size={22} weight="fill" className="shrink-0" />
            <span className="leading-tight">{t("dashboard.cta_sell", "Mettre une entreprise en vente")}</span>
          </button>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-3">
              {t("dashboard.stats_label", "Vos chiffres")}
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-2 gap-3">
              {stats.map((s) => {
                const body = (
                  <>
                    <div className="flex items-center gap-3 sm:w-full">
                      <div className="w-11 h-11 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
                        <s.Icon size={22} className="text-[#a5b4fc]" />
                      </div>
                      <span className="text-3xl font-medium text-white leading-none tracking-tight min-w-[2.5rem]">{s.value}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white leading-tight">{s.label}</p>
                      <p className="text-[13px] text-white/60 font-light mt-1 leading-snug">{s.desc}</p>
                      {s.onClick && s.linkLabel && (
                        <span className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#a5b4fc] group-hover:text-white transition-colors">
                          {s.linkLabel} <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                        </span>
                      )}
                    </div>
                  </>
                );
                const cls = "w-full h-full flex flex-row sm:flex-col items-center sm:items-start gap-4 sm:gap-3 text-left rounded-2xl bg-white/[0.04] border border-white/10 p-4";
                return (
                  <li key={s.key} className="min-w-0">
                    {s.onClick ? (
                      <button
                        onClick={s.onClick}
                        className={`group ${cls} hover:bg-white/[0.08] hover:border-white/25 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/60`}
                      >
                        {body}
                      </button>
                    ) : (
                      <div className={cls}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
