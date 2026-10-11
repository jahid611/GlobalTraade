"use client";
import React from "react";
import { Binoculars, RocketLaunch, FolderOpen, ChatCircle, Handshake, ArrowRight } from "phosphor-react";
import { useTranslation } from "react-i18next";
import { UNLOCK_PRICE } from "@/services/planService";

// Bandeau principal du hub : à quoi sert la page, et les deux gestes possibles.
export function ProjectsHero({ onBrowse, onPublish }: { onBrowse: () => void; onPublish: () => void }) {
  const { t } = useTranslation();

  const steps = [
    {
      Icon: Binoculars,
      title: t("projects.step1_title", "Parcourez"),
      desc: t("projects.step1_desc", "Les projets et ce qu'ils recherchent, librement."),
    },
    {
      Icon: FolderOpen,
      title: t("projects.step2_title", "Ouvrez le dossier"),
      desc: t("projects.step2_desc", { defaultValue: "Le dossier complet d'un projet se débloque pour {{price}} €.", price: UNLOCK_PRICE }),
    },
    {
      Icon: ChatCircle,
      title: t("projects.step3_title", "Contactez le porteur"),
      desc: t("projects.step3_desc", "Proposez votre aide par message, directement."),
    },
  ];

  return (
    <section
      aria-label={t("projects.hero_label", "À quoi sert cette page") as string}
      className="relative rounded-[2rem] p-[1.5px] shadow-[0_20px_70px_rgba(89,85,232,0.35)]"
      style={{ background: "linear-gradient(135deg, rgba(120,114,251,0.95) 0%, rgba(89,85,232,0.45) 40%, rgba(255,255,255,0.12) 100%)" }}
    >
      <div className="rounded-[calc(2rem-1.5px)] bg-[#232229]/95 backdrop-blur-xl p-6 sm:p-8">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-8 xl:gap-12 xl:items-center">
          <div className="min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-[0_8px_24px_rgba(89,85,232,0.5)]">
                <Handshake size={24} className="text-white" weight="fill" />
              </div>
              <div className="min-w-0">
                <h2 className="text-2xl md:text-[1.7rem] font-medium text-white leading-tight tracking-tight">
                  {t("projects.hero_title", "Des entrepreneurs cherchent un coup de main")}
                </h2>
                <p className="text-sm md:text-base text-white/65 font-light mt-1 leading-relaxed">
                  {t("projects.hero_desc", "Chaque projet dit ce qui lui manque : de l'argent, des associés, du matériel, des conseils ou des contacts.")}
                </p>
              </div>
            </div>

            <p className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-3">
              {t("projects.hero_choice", "Que voulez-vous faire ?")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={onBrowse}
                className="group flex items-center gap-3 text-left rounded-2xl bg-primary hover:bg-primary/90 px-5 py-4 min-h-[4.5rem] text-white shadow-[0_10px_30px_rgba(89,85,232,0.55)] transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <Binoculars size={26} weight="fill" className="shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-base font-semibold leading-tight">{t("projects.cta_browse", "Je cherche un projet à soutenir")}</span>
                  <span className="block text-xs text-white/75 font-light mt-1">{t("projects.cta_browse_sub", "Voir les projets et les filtrer")}</span>
                </span>
                <ArrowRight size={18} className="shrink-0 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={onPublish}
                className="group flex items-center gap-3 text-left rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/25 px-5 py-4 min-h-[4.5rem] text-white transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <RocketLaunch size={26} weight="fill" className="shrink-0 text-[#a5b4fc]" />
                <span className="flex-1 min-w-0">
                  <span className="block text-base font-semibold leading-tight">{t("projects.cta_publish", "Je publie mon projet")}</span>
                  <span className="block text-xs text-white/65 font-light mt-1">{t("projects.cta_publish_sub", "Présenter mon projet et mes besoins")}</span>
                </span>
                <ArrowRight size={18} className="shrink-0 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Le parcours d'un visiteur, en trois étapes */}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-3">
              {t("projects.steps_label", "Comment ça marche")}
            </p>
            <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {steps.map((s, i) => (
                <li key={i} className="flex sm:flex-col items-start gap-3 rounded-2xl bg-white/[0.04] border border-white/10 p-4">
                  <div className="relative w-11 h-11 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
                    <s.Icon size={22} className="text-[#a5b4fc]" />
                    <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center border border-white/25">
                      {i + 1}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white leading-tight">{s.title}</p>
                    <p className="text-xs text-white/60 font-light mt-1 leading-snug">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
