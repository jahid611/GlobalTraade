"use client";
import React from "react";
import { canonicalIndustry } from "@/lib/industries";
import { motion } from "framer-motion";
import { Money, MapPin, Eye, Heart, Fire, RocketLaunch, PencilSimple, Trash, Crown, CaretRight, CheckCircle } from "phosphor-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Project } from "@/services/projectService";
import { BOOST_PRICE } from "@/services/planService";
import { isBoosted } from "@/services/boostService";
import { HELP_META, TONES, coverGradient, pillStyle, stageMeta } from "./projectMeta";

const coverBadge = "px-2.5 py-1 rounded-full text-[11px] font-bold border backdrop-blur-md flex items-center gap-1.5";
const ownerButton = "w-9 h-9 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md border border-white/15 flex items-center justify-center text-white transition-colors";

export function ProjectCard({ project, onClick, userId, onEdit, onDelete }: { project: Project; onClick: () => void; userId?: string; onEdit: () => void; onDelete: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const stage = stageMeta(project.stage);
  const boosted = isBoosted(project);
  const initial = (project.title || "?").trim().charAt(0).toUpperCase();
  const authorName = project.profiles?.full_name;
  const summary = project.description || project.description_excerpt;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      onClick={onClick}
      className="relative liquid-glass rounded-3xl border-white/10 hover:border-white/25 hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer flex flex-col h-full overflow-hidden"
    >
      {/* ── Visuel : image de couverture, ou visuel de remplacement ── */}
      <div className="relative w-full aspect-[16/10] shrink-0 overflow-hidden bg-white/[0.03]">
        {project.cover_image_url ? (
          <img
            src={project.cover_image_url}
            alt={project.title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03] pointer-events-none"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden" style={{ background: coverGradient(stage.tone) }}>
            <stage.Icon className="absolute -right-5 -bottom-7 w-36 h-36 opacity-20 rotate-[-8deg]" style={{ color: stage.tone.color }} weight="fill" />
            <span className="relative text-6xl font-light text-white/85 leading-none">{initial}</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

        {/* En haut à gauche : urgent, mis en avant, vérifié */}
        <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-1.5">
          {project.is_urgent && (
            <span className={coverBadge} style={{ background: 'rgba(127,29,29,0.8)', color: '#fecaca', borderColor: 'rgba(239,68,68,0.6)' }}>
              <Fire className="w-3 h-3" weight="fill" />{t('hub.urgent')}
            </span>
          )}
          {boosted && (
            <span className={coverBadge} style={{ background: 'rgba(30,27,75,0.75)', color: '#c7d2fe', borderColor: 'rgba(89,85,232,0.6)' }}>
              <Crown className="w-3 h-3" weight="fill" />{t('card.boosted', 'En avant')}
            </span>
          )}
          {project.verification_status === 'verifie' && (
            <span className={coverBadge} style={{ background: 'rgba(6,78,59,0.75)', color: '#6ee7b7', borderColor: 'rgba(16,185,129,0.5)' }}>
              <CheckCircle className="w-3 h-3" weight="fill" />{t('pp.verified', 'Projet vérifié')}
            </span>
          )}
        </div>

        {/* En haut à droite : actions du porteur */}
        {userId === project.owner_id && (
          <div className="absolute top-3 right-3 z-20 flex gap-2">
            {!boosted && (
              <button onClick={(e)=>{e.stopPropagation(); navigate(`/payment?boost=project:${project.id}&name=${encodeURIComponent(project.title || '')}`);}}
                title={t('boost.cta', `Mettre en avant - ${BOOST_PRICE} €`) as string}
                aria-label={t('boost.cta', `Mettre en avant - ${BOOST_PRICE} €`) as string}
                className={ownerButton}><RocketLaunch weight="fill" className="w-4 h-4" style={{ color: TONES.amber.color }}/></button>
            )}
            <button onClick={(e)=>{e.stopPropagation(); onEdit();}}
              title={t('projects.edit', 'Modifier') as string} aria-label={t('projects.edit', 'Modifier') as string}
              className={ownerButton}><PencilSimple weight="fill" className="w-4 h-4"/></button>
            <button onClick={(e)=>{e.stopPropagation(); onDelete();}}
              title={t('projects.delete', 'Supprimer') as string} aria-label={t('projects.delete', 'Supprimer') as string}
              className={ownerButton}><Trash weight="fill" className="w-4 h-4" style={{ color: TONES.red.color }}/></button>
          </div>
        )}

        {/* En bas à gauche : le stade du projet */}
        <span className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-black/55 backdrop-blur-md border"
          style={{ color: stage.tone.color, borderColor: stage.tone.border }}>
          <stage.Icon className="w-3.5 h-3.5" weight="fill" />
          {t(stage.key)}
        </span>
      </div>

      {/* ── Contenu ── */}
      <div className="p-5 flex flex-col flex-1">
        <span className="text-[11px] text-[#a5b4fc] font-semibold uppercase tracking-wider truncate">
          {t(`industry.${canonicalIndustry(project.category)}`, project.category)}
        </span>
        <h3 className="text-lg font-medium text-white leading-snug line-clamp-2 mt-1 group-hover:text-[#c7d2fe] transition-colors">{project.title}</h3>
        {project.tagline && <p className="text-white/70 text-sm mt-1.5 line-clamp-2 leading-snug">{project.tagline}</p>}
        {summary && <p className="text-white/50 text-[13px] font-light leading-relaxed line-clamp-2 mt-2">{summary}</p>}

        {/* Ce que le projet recherche */}
        {project.help_types.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-[11px] uppercase tracking-wider text-white/45 font-medium mb-2">{t('projects.card_needs', 'Recherche')}</p>
            <div className="flex flex-wrap gap-1.5">
              {project.help_types.map(h => {
                const m = HELP_META[h];
                if (!m) return null;
                return (
                  <span key={h} className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border" style={pillStyle(m.tone)}>
                    <m.Icon className="w-3.5 h-3.5" weight="fill" />{t(m.key)}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 text-xs text-white/60 font-light">
          {project.city && <span className="flex items-center gap-1.5 min-w-0"><MapPin className="w-4 h-4 text-primary shrink-0"/><span className="truncate">{project.city}</span></span>}
          {project.budget_max && (
            <span className="flex items-center gap-1.5 font-medium" style={{ color: TONES.green.color }}>
              <Money className="w-4 h-4"/>{t('project.detail.budget')} : {project.budget_max.toLocaleString()}€
            </span>
          )}
        </div>

        <div className="mt-auto pt-4">
          <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="w-8 h-8 border border-white/10 shrink-0">
                <AvatarImage src={project.profiles?.avatar_url} className="object-cover" />
                <AvatarFallback className="bg-primary/20 text-white text-[11px]">
                  {(authorName || "?")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-white/45 font-light mb-0.5 leading-none">{t('projects.card_by', 'Porté par')}</span>
                <span className="text-xs font-medium text-white/85 truncate leading-tight">{authorName || t('projects.card_member', 'Un membre Globly')}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-white/55 shrink-0 text-xs font-medium">
              <span className="flex items-center gap-1.5" title={`${project.view_count} ${t('hub.views')}`}>
                <Eye className="w-4 h-4"/>{project.view_count}<span className="sr-only"> {t('hub.views')}</span>
              </span>
              {project.interest_count > 0 && (
                <span className="flex items-center gap-1.5" title={`${project.interest_count} ${t('hub.interests')}`}>
                  <Heart className="w-4 h-4"/>{project.interest_count}<span className="sr-only"> {t('hub.interests')}</span>
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs font-medium text-white/50 group-hover:text-[#a5b4fc] transition-colors">
            <span>{t('projects.card_open', 'Voir le projet')}</span>
            <CaretRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Même silhouette que ProjectCard : visuel en haut, contenu dessous.
export function ProjectCardSkeleton() {
  return (
    <div className="liquid-glass rounded-3xl border border-white/5 overflow-hidden animate-pulse">
      <div className="aspect-[16/10] bg-white/5" />
      <div className="p-5 space-y-4">
        <div className="space-y-2">
          <div className="h-3 bg-white/5 rounded w-1/3" />
          <div className="h-5 bg-white/10 rounded w-4/5" />
          <div className="h-3 bg-white/5 rounded w-full" />
          <div className="h-3 bg-white/5 rounded w-2/3" />
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-24 bg-white/10 rounded-full" />
          <div className="h-7 w-20 bg-white/5 rounded-full" />
        </div>
        <div className="border-t border-white/5 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/10" />
            <div className="h-4 bg-white/5 rounded w-24" />
          </div>
          <div className="h-4 bg-white/5 rounded w-10" />
        </div>
      </div>
    </div>
  );
}
