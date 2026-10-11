"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Fire, CheckCircle, ArrowRight } from "phosphor-react";
import type { Project } from "@/services/projectService";
import { HELP_META, pillStyle, stageMeta } from "@/components/projects/projectMeta";

// Un projet du secteur, en résumé : le dossier complet s'ouvre sur la page Projets.
export function SectorProjectCard({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const { t } = useTranslation();
  const stage = stageMeta(project.stage);
  const summary = project.tagline || project.description_excerpt || project.description;
  const author = project.profiles?.full_name;

  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={onOpen}
        className="group w-full h-full text-left rounded-3xl bg-[#232229]/85 border border-white/10 hover:border-white/25 transition-colors p-5 flex flex-col outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium bg-black/30 border"
            style={{ color: stage.tone.color, borderColor: stage.tone.border }}>
            <stage.Icon size={15} weight="fill" /> {t(stage.key)}
          </span>
          {project.is_urgent && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-semibold border"
              style={{ background: "rgba(127,29,29,0.6)", color: "#fecaca", borderColor: "rgba(239,68,68,0.6)" }}>
              <Fire size={13} weight="fill" /> {t("hub.urgent")}
            </span>
          )}
          {project.verification_status === "verifie" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-semibold border"
              style={{ background: "rgba(6,78,59,0.6)", color: "#6ee7b7", borderColor: "rgba(16,185,129,0.5)" }}>
              <CheckCircle size={13} weight="fill" /> {t("pp.verified", "Projet vérifié")}
            </span>
          )}
        </span>

        <span className="block text-lg font-medium text-white leading-snug mt-3 break-words">{project.title}</span>
        {summary && <span className="block text-sm text-white/65 font-light leading-relaxed mt-2 line-clamp-3">{summary}</span>}

        {project.help_types.length > 0 && (
          <span className="block mt-4">
            <span className="block text-[13px] uppercase tracking-wider text-white/55 font-medium mb-2">{t("projects.card_needs", "Recherche")}</span>
            <span className="flex flex-wrap gap-1.5">
              {project.help_types.map((h) => {
                const m = HELP_META[h];
                if (!m) return null;
                return (
                  <span key={h} className="inline-flex items-center gap-1.5 text-[13px] font-medium px-2.5 py-1 rounded-full border" style={pillStyle(m.tone)}>
                    <m.Icon className="w-3.5 h-3.5" weight="fill" />{t(m.key)}
                  </span>
                );
              })}
            </span>
          </span>
        )}

        <span className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 text-[13px] text-white/60 font-light">
          {project.city && <span className="flex items-center gap-1.5"><MapPin size={15} className="text-primary shrink-0" /> {project.city}</span>}
          <span>{t("projects.card_by", "Porté par")} {author || t("projects.card_member", "Un membre Globly")}</span>
        </span>

        <span className="mt-auto pt-5 flex items-center justify-between text-sm font-medium text-[#a5b4fc] group-hover:text-white transition-colors">
          {t("projects.card_open", "Voir le projet")}
          <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
        </span>
      </button>
    </li>
  );
}
