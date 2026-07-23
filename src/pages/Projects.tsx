"use client";
import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FunnelSimple, X, Money, Users, Package, Brain, Globe, MapPin, Calendar, Eye, Heart, ArrowRight, Fire, Warning, Lightbulb, RocketLaunch, ChartLineUp, GlobeHemisphereWest, Nut, Wrench, PencilSimple, Trash } from "phosphor-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { SolarSystem } from "@/components/SolarSystem";
import { ProjectForm } from "@/components/ProjectForm";
import { HelpBanner } from "@/components/HelpBanner";
import { useAuth } from "@/components/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProjects, deleteProject, expressInterest, incrementProjectViews, Project, HelpType } from "@/services/projectService";
import { showSuccess, showError } from "@/utils/toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";
import { ProjectAccessSection, VerificationBadge } from "@/components/ProjectDossier";
import { usePlan, checkPublicationQuota, UNLOCK_PRICE, BOOST_PRICE } from "@/services/planService";
import { useIsUnlocked } from "@/services/unlockService";
import { isBoosted } from "@/services/boostService";
import { checkContactQuota, registerContactInitiation } from "@/services/quotaService";
import { LockSimple, Crown } from "phosphor-react";

// ─── Constants ────────────────────────────────────────────────
const HELP_META: Record<HelpType, { key: string; color: string; bg: string; Icon: any }> = {
  financial: { key: "hub.help.financial", color: "text-emerald-400", bg: "bg-emerald-500/20 border-emerald-500/30", Icon: Money },
  human:     { key: "hub.help.human",    color: "text-blue-400",    bg: "bg-blue-500/20 border-blue-500/30",    Icon: Users },
  material:  { key: "hub.help.material",  color: "text-amber-400",   bg: "bg-amber-500/20 border-amber-500/30",  Icon: Package },
  expertise: { key: "hub.help.expertise", color: "text-purple-400",  bg: "bg-purple-500/20 border-purple-500/30",Icon: Brain },
  network:   { key: "hub.help.network",    color: "text-pink-400",    bg: "bg-pink-500/20 border-pink-500/30",    Icon: Globe },
};

const STAGE_META: Record<string, { key: string; color: string; Icon: any }> = {
  idea:      { key: "hub.stage.idea",       color: "text-yellow-400", Icon: Lightbulb },
  prototype: { key: "hub.stage.prototype",  color: "text-orange-400", Icon: Wrench },
  mvp:       { key: "hub.stage.mvp",        color: "text-blue-400",   Icon: RocketLaunch },
  growth:    { key: "hub.stage.growth",     color: "text-emerald-400", Icon: ChartLineUp },
  scale:     { key: "hub.stage.scale",      color: "text-purple-400", Icon: GlobeHemisphereWest },
};

const ALL_HELP: HelpType[] = ["financial","human","material","expertise","network"];

// ─── ProjectCard ──────────────────────────────────────────────
function ProjectCard({ project, onClick, userId, onEdit, onDelete }: { project: Project; onClick: () => void; userId?: string; onEdit: () => void; onDelete: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const stage = STAGE_META[project.stage] || { key: project.stage, color: "text-white/60", Icon: Nut };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="liquid-glass border border-white/10 rounded-[2rem] p-6 flex flex-col gap-4 cursor-pointer group hover:border-white/25 transition-all duration-300 relative overflow-hidden"
    >
      {/* Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-[2rem]" />

      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`flex items-center gap-1 text-[10px] font-medium uppercase tracking-widest ${stage.color}`}>
              <stage.Icon className="w-3 h-3" />
              {t(stage.key)}
            </span>
            {project.is_urgent && (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-full">
                <Fire className="w-2.5 h-2.5" />{t('hub.urgent')}
              </span>
            )}
            {isBoosted(project as any) && (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border"
                style={{ background: 'rgba(89,85,232,0.25)', color: '#c7d2fe', borderColor: 'rgba(89,85,232,0.45)' }}>
                <Crown className="w-2.5 h-2.5" weight="fill" />{t('card.boosted', 'En avant')}
              </span>
            )}
          </div>
          <h3 className="text-base font-medium text-white leading-snug line-clamp-2 group-hover:text-primary transition-colors">{project.title}</h3>
          {project.tagline && <p className="text-white/40 text-xs mt-1 line-clamp-1">{project.tagline}</p>}
        </div>
        <Avatar className="w-10 h-10 shrink-0 border border-white/10">
          <AvatarImage src={project.profiles?.avatar_url} />
          <AvatarFallback className="bg-primary/20 text-white text-xs">
            {(project.profiles?.full_name || "?")[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      {userId === project.owner_id && (
        <div className="absolute top-5 right-[72px] flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20">
          {!isBoosted(project as any) && (
            <button onClick={(e)=>{e.stopPropagation(); navigate(`/payment?boost=project:${project.id}&name=${encodeURIComponent(project.title || '')}`);}}
              title={t('boost.cta', `Mettre en avant — ${BOOST_PRICE} €`) as string}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-amber-500/20 flex items-center justify-center text-white/70 hover:text-amber-300 backdrop-blur-md border border-white/10 transition-all"><RocketLaunch weight="fill" className="w-4 h-4"/></button>
          )}
          <button onClick={(e)=>{e.stopPropagation(); onEdit();}} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white backdrop-blur-md border border-white/10 transition-all"><PencilSimple weight="fill" className="w-4 h-4"/></button>
          <button onClick={(e)=>{e.stopPropagation(); onDelete();}} className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center text-red-400 hover:text-red-300 backdrop-blur-md border border-red-500/20 transition-all"><Trash weight="fill" className="w-4 h-4"/></button>
        </div>
      )}
      {/* Description */}
      <p className="text-white/50 text-sm leading-relaxed line-clamp-3 flex-1">{project.description}</p>

      {/* Help tags */}
      <div className="flex flex-wrap gap-1.5">
        {project.help_types.map(h => {
          const m = HELP_META[h];
          if (!m) return null;
          return (
            <span key={h} className={`inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full border ${m.bg} ${m.color}`}>
              <m.Icon className="w-3 h-3" />{t(m.key)}
            </span>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-white/5 pt-4">
        <div className="flex items-center gap-3 text-white/30 text-xs">
          {project.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{project.city}</span>}
          <span className="flex items-center gap-1"><Eye className="w-3 h-3"/>{project.view_count} {t('hub.views')}</span>
          {project.interest_count > 0 && <span className="flex items-center gap-1"><Heart className="w-3 h-3"/>{project.interest_count} {t('hub.interests')}</span>}
          {project.budget_max && (
            <span className="flex items-center gap-1 text-emerald-400/70">
              <Money className="w-3 h-3"/>{t('project.detail.budget')} : {project.budget_max.toLocaleString()}€
            </span>
          )}
        </div>
        <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
      </div>
    </motion.div>
  );
}

// ─── ProjectDetail Modal ──────────────────────────────────────
function ProjectDetail({ project, onClose, userId, onEdit, onDelete }: { project: Project; onClose: () => void; userId?: string; onEdit: () => void; onDelete: () => void }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);
  const [selectedHelp, setSelectedHelp] = useState<HelpType | null>(null);
  const [message, setMessage] = useState("");
  const stage = STAGE_META[project.stage] || { key: project.stage, color: "text-white/60", Icon: Nut };

  // Bridage : accès complet = projet débloqué (5 €), formule Pro/Business ou porteur.
  // Accès payant accordé seulement si le plan/déblocage est confirmé (pas en cours
  // de fetch) → pas de fuite avec un cache périmé (downgrade / changement de fiche).
  const { plan, isFetching: planFetching } = usePlan(userId);
  const { unlocked, isFetching: unlockFetching } = useIsUnlocked(userId, 'project', project.id);
  const hasFullAccess = userId === project.owner_id || (plan !== 'free' && !planFetching) || (unlocked && !unlockFetching);

  const goUnlock = () => {
    if (!userId) { window.location.href = "/login"; return; }
    navigate(`/payment?unlock=project:${project.id}&name=${encodeURIComponent(project.title || '')}`);
  };

  const LockedGate = ({ children }: { children: React.ReactNode }) => (
    hasFullAccess ? <>{children}</> : (
      <div className="relative">
        <div className="blur-md select-none pointer-events-none">{children}</div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <p className="text-sm text-white font-light text-center px-8">
            {t('quota.unlock_project_hint', `Débloquez ce projet pour ${UNLOCK_PRICE} € : dossier complet et mise en relation.`)}
          </p>
          <Button onClick={goUnlock} className="rounded-full h-10 px-6 bg-primary hover:bg-primary/90 text-white text-xs uppercase tracking-widest font-medium outline-none [text-shadow:none]">
            <LockSimple className="w-4 h-4 mr-2" /> {t('quota.unlock_cta', `Débloquer — ${UNLOCK_PRICE} €`)}
          </Button>
        </div>
      </div>
    )
  );

  const handleInterest = async () => {
    if (!userId || !selectedHelp) return;
    setSending(true);
    try {
      // Mise en relation = prise de contact (quota Pro 20/mois, Business illimité)
      const quota = await checkContactQuota(userId, project.owner_id, { targetType: 'project', targetId: project.id });
      if (!quota.allowed) {
        showError(t('quota.contacts_reached', 'Limite de nouvelles prises de contact atteinte ce mois-ci. Passez Business pour contacter sans limite.'));
        navigate('/payment');
        setSending(false);
        return;
      }
      await expressInterest(project, userId, selectedHelp, message, {
        title: t('hub.msg_title'),
        project: t('hub.msg_project'),
        type: t('hub.msg_help_type'),
        intro: t('hub.msg_intro'),
        defaultMsg: t('hub.msg_default'),
        helpValue: t(HELP_META[selectedHelp].key + "_full") // use the _full version for the message
      });
      registerContactInitiation(userId, project.owner_id).catch(() => {});
      showSuccess(t('hub.interest_sent'));
      onClose();
    } catch { showError(t('hub.interest_error')); }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose}/>
      <motion.div initial={{y:50,opacity:0}} animate={{y:0,opacity:1}} exit={{y:50,opacity:0}} transition={{type:"spring",damping:28}}
        className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto liquid-glass-heavy border border-white/15 rounded-t-[2.5rem] sm:rounded-[2.5rem] custom-scrollbar">
        
        <div className="sticky top-0 z-10 bg-black/40 backdrop-blur-md flex items-center justify-between px-8 py-5 border-b border-white/10">
          <span className={`flex items-center gap-2 text-sm font-medium ${stage.color}`}>
            <stage.Icon className="w-4 h-4" />
            {t(stage.key)}
          </span>
          <div className="flex items-center gap-2">
            {userId === project.owner_id && (
              <>
                <button onClick={onEdit} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all"><PencilSimple className="w-4 h-4"/></button>
                <button onClick={onDelete} className="w-9 h-9 rounded-full bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 hover:text-red-300 transition-all"><Trash className="w-4 h-4"/></button>
              </>
            )}
            <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all"><X className="w-4 h-4"/></button>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex items-start gap-4">
            <Avatar className="w-14 h-14 border border-white/15 shrink-0">
              <AvatarImage src={project.profiles?.avatar_url}/>
              <AvatarFallback className="bg-primary/20 text-white">{(project.profiles?.full_name||"?")[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-xl font-medium text-white">{project.title}</h2>
                <VerificationBadge status={project.verification_status} />
                {project.is_urgent && <span className="text-[10px] font-bold uppercase text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-full flex items-center gap-1"><Fire className="w-2.5 h-2.5"/>{t('hub.urgent')}</span>}
              </div>
              <p className="text-white/40 text-sm">{project.profiles?.full_name} • {t(`industry.${project.category}`, project.category)}</p>
              {project.tagline && <p className="text-white/60 text-sm mt-1 italic">"{project.tagline}"</p>}
            </div>
          </div>

          <LockedGate>
          <p className="text-white/70 leading-relaxed text-sm whitespace-pre-wrap">{project.description}</p>
          </LockedGate>

          <div className="flex flex-wrap gap-2">
            {project.city && <span className="flex items-center gap-1.5 text-xs text-white/50 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full"><MapPin className="w-3 h-3"/>{project.city}{project.country && `, ${project.country}`}</span>}
            {project.deadline && <span className="flex items-center gap-1.5 text-xs text-white/50 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full"><Calendar className="w-3 h-3"/>{t('hub.before')} {new Date(project.deadline).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')}</span>}
          </div>

          {/* Aide financière */}
          {project.financial_needed && hasFullAccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
              <h4 className="text-emerald-400 font-medium mb-3 flex items-center gap-2"><Money className="w-4 h-4"/>{t('project.detail.financial')}</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-white/40 text-xs mb-1">{t('project.detail.budget')}</p><p className="text-white font-medium">{project.budget_min?.toLocaleString()}€ – {project.budget_max?.toLocaleString()}€</p></div>
                <div><p className="text-white/40 text-xs mb-1">{t('project.detail.type')}</p><p className="text-white font-medium capitalize">{t(`project.form.inv_${project.investment_type}`, project.investment_type)}</p></div>
                {project.equity_offered && <div><p className="text-white/40 text-xs mb-1">{t('project.detail.equity')}</p><p className="text-emerald-400 font-bold text-lg">{project.equity_offered}%</p></div>}
                {project.apport_personnel && <div><p className="text-white/40 text-xs mb-1">{t('pp.apport', 'Apport personnel')}</p><p className="text-white font-medium">{project.apport_personnel}</p></div>}
                {project.revenue_current && <div><p className="text-white/40 text-xs mb-1">{t('pp.revenue_current', 'CA actuel')}</p><p className="text-white font-medium">{project.revenue_current}</p></div>}
                {project.revenue_forecast && <div><p className="text-white/40 text-xs mb-1">{t('pp.revenue_forecast', 'CA prévisionnel')}</p><p className="text-white font-medium">{project.revenue_forecast}</p></div>}
                {project.funds_usage && <div className="col-span-2"><p className="text-white/40 text-xs mb-1">{t('pp.funds_usage', 'Utilisation des fonds')}</p><p className="text-white font-medium">{project.funds_usage}</p></div>}
              </div>
              {(project.financing_types || []).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {(project.financing_types || []).map((ft: string) => (
                    <span key={ft} className="text-xs px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-full">
                      {t(`project.form.ft_${ft}`)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Aide humaine */}
          {project.human_needed && hasFullAccess && project.team_roles?.length > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5">
              <h4 className="text-blue-400 font-medium mb-3 flex items-center gap-2"><Users className="w-4 h-4"/>{t('project.detail.human')}</h4>
              <div className="space-y-2">
                {project.team_roles.map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-2.5 text-sm">
                    <div><p className="text-white font-medium">{r.title}</p><p className="text-white/40 text-xs">{r.skills}</p></div>
                    <div className="text-right">
                      <p className="text-blue-400 text-xs">{t(`project.form.role_${r.type}`)}</p>
                      <p className="text-white/40 text-xs">{r.count} {r.count > 1 ? t('project.detail.posts') : t('project.detail.post')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aide matérielle */}
          {project.material_needed && hasFullAccess && project.material_items?.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5">
              <h4 className="text-amber-400 font-medium mb-3 flex items-center gap-2"><Package className="w-4 h-4"/>{t('project.detail.material')}</h4>
              <div className="space-y-2">
                {project.material_items.map((m: any, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-2.5 text-sm">
                    <div><p className="text-white font-medium">{m.name}</p><p className="text-white/40 text-xs">{t('project.form.mat_qty')} : {m.quantity}</p></div>
                    {m.estimated_value > 0 && <p className="text-amber-400 text-sm font-medium">{m.estimated_value.toLocaleString()}€</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expertise */}
          {project.expertise_needed && hasFullAccess && project.expertise_domains?.length > 0 && (
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-5">
              <h4 className="text-purple-400 font-medium mb-3 flex items-center gap-2"><Brain className="w-4 h-4"/>{t('project.detail.expertise')}</h4>
              <div className="flex flex-wrap gap-2">{project.expertise_domains.map((d: string) => <span key={d} className="text-xs px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-full">{d}</span>)}</div>
            </div>
          )}

          {/* Dossier complet : vérification, accès, business plan */}
          {hasFullAccess && <ProjectAccessSection project={project} userId={userId} />}

          {/* Manifester intérêt */}
          {userId !== project.owner_id && (
            <div className="border-t border-white/10 pt-6 space-y-3">
              <h4 className="text-white font-medium">{t('hub.manifest_interest')}</h4>
              {userId && !hasFullAccess ? (
                <div className="bg-white/5 border border-white/10 rounded-[1.5rem] p-6 text-center">
                  <p className="text-white/60 text-sm mb-4">
                    {t('quota.unlock_project_hint', `Débloquez ce projet pour ${UNLOCK_PRICE} € : dossier complet et mise en relation.`)}
                  </p>
                  <Button onClick={goUnlock} className="rounded-full bg-primary hover:bg-primary/90 text-white h-10 px-8 text-xs font-medium transition-all shadow-lg">
                    <LockSimple className="w-4 h-4 mr-2" /> {t('quota.unlock_cta', `Débloquer — ${UNLOCK_PRICE} €`)}
                  </Button>
                </div>
              ) : userId ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {project.help_types.map(h => {
                      const m = HELP_META[h];
                      if (!m) return null;
                      return (
                        <button key={h} onClick={()=>setSelectedHelp(selectedHelp===h?null:h)}
                          className={`flex items-center gap-2 text-xs px-4 py-2 rounded-full border transition-all ${selectedHelp===h?`${m.bg} ${m.color} scale-105`:"bg-white/5 border-white/10 text-white/60 hover:bg-white/10"}`}>
                          <m.Icon className="w-3.5 h-3.5"/>{t(m.key)}
                        </button>
                      );
                    })}
                  </div>
                  {selectedHelp && (
                    <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} className="space-y-3">
                      <textarea className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 text-sm resize-none min-h-[80px]"
                        placeholder={t('hub.placeholder_interest')} value={message} onChange={e=>setMessage(e.target.value)}/>
                      <Button onClick={handleInterest} disabled={sending} className="w-full rounded-full bg-primary hover:bg-primary/90 text-white h-12 font-medium">{sending?t('hub.sending'):t('hub.send_interest')}</Button>
                    </motion.div>
                  )}
                </>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-[1.5rem] p-6 text-center">
                  <p className="text-white/60 text-sm mb-4">{t('hub.login_required')}</p>
                  <Button onClick={()=>window.location.href="/login"} className="rounded-full bg-primary hover:bg-primary/90 text-white h-10 px-8 text-xs font-medium transition-all shadow-lg">
                    {t('hub.login_btn')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── DeleteConfirm Modal ──────────────────────────────────────
function DeleteConfirmModal({ isOpen, onClose, onConfirm, title }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string }) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
          <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}}
            className="relative w-full max-w-sm liquid-glass-heavy border border-white/15 rounded-[2.5rem] p-8 text-center shadow-2xl">
            <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
              <Trash className="w-10 h-10 text-red-500" weight="fill" />
            </div>
            <h3 className="text-2xl font-light text-white mb-3">{t('project.delete.title')}</h3>
            <p className="text-white/50 text-sm leading-relaxed mb-8">
              {t('project.delete.desc')} <br/>
              <span className="text-white font-medium mt-2 block italic">"{title}"</span>
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={onConfirm} className="w-full rounded-full bg-red-500 hover:bg-red-600 text-white h-12 font-medium transition-all shadow-lg shadow-red-500/20">
                {t('project.delete.confirm')}
              </Button>
              <Button variant="ghost" onClick={onClose} className="w-full rounded-full text-white/50 hover:text-white hover:bg-white/5 h-12">
                {t('project.delete.cancel')}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function Projects() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeHelp, setActiveHelp] = useState<HelpType | null>(null);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<any>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const handleDelete = async () => {
    if (!projectToDelete) return;
    try {
      await deleteProject(projectToDelete.id);
      showSuccess(t('profile.deleted'));
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (selectedProject?.id === projectToDelete.id) setSelectedProject(null);
      setProjectToDelete(null);
    } catch { showError(t('modal.error_remove')); }
  };
  const CATEGORIES = [
    { id: "all", key: "hub.all_cats" },
    { id: "Tech & IA", key: "cat.tech" },
    { id: "Agriculture", key: "cat.agri" },
    { id: "Santé", key: "cat.health" },
    { id: "Éducation", key: "cat.edu" },
    { id: "Finance", key: "cat.fin" },
    { id: "Industrie", key: "cat.indus" },
    { id: "Commerce", key: "cat.comm" },
    { id: "Restauration", key: "cat.food" },
    { id: "Artisanat", key: "cat.craft" },
    { id: "Mode & Textile", key: "cat.fashion" },
    { id: "Beauté & Bien-être", key: "cat.beauty" },
    { id: "Sport & Loisirs", key: "cat.sport" },
    { id: "Tourisme & Hôtellerie", key: "cat.tourism" },
    { id: "Culture & Art", key: "cat.culture" },
    { id: "Médias & Communication", key: "cat.media" },
    { id: "BTP & Construction", key: "cat.btp" },
    { id: "Immobilier", key: "cat.immo" },
    { id: "Transport", key: "cat.transp" },
    { id: "Énergie", key: "cat.energy" },
    { id: "Environnement", key: "cat.env" },
    { id: "Services", key: "cat.services" },
    { id: "Automobile", key: "cat.auto" },
    { id: "Autre", key: "cat.other" },
  ];

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", activeCategory, activeHelp, urgentOnly],
    queryFn: () => fetchProjects({
      category: activeCategory !== "all" ? activeCategory : undefined,
      help_type: activeHelp ?? undefined,
      is_urgent: urgentOnly || undefined,
    }),
  });

  const displayedProjects = useMemo(() => {
    const base = mineOnly && user ? projects.filter((p: any) => p.owner_id === user.id) : projects;
    // Projets mis en avant (10 €) en tête
    return [...base].sort((a: any, b: any) => Number(isBoosted(b)) - Number(isBoosted(a)));
  }, [projects, mineOnly, user]);

  // Quota d'annonces actives (gratuit 1, Pro 5, Business illimité)
  const openCreateProject = async () => {
    if (!user) { navigate("/login"); return; }
    const quota = await checkPublicationQuota(user.id);
    if (!quota.allowed) {
      showError(t('quota.publications_reached_short', `Limite de ${quota.limit} annonce${quota.limit > 1 ? 's' : ''} active${quota.limit > 1 ? 's' : ''} atteinte. Passez à une formule supérieure.`));
      navigate('/payment');
      return;
    }
    setIsFormOpen(true);
  };

  useEffect(() => {
    if (selectedProject && user?.id) {
      incrementProjectViews(selectedProject.id, user.id);
    }
  }, [selectedProject, user?.id]);

  return (
    <div className="min-h-screen bg-transparent text-white selection:bg-primary/30 relative flex flex-col">
      <SolarSystem />
      <Navbar />

      <main className="relative z-10 pt-[18vh] pb-[10vh] px-[6vw] max-w-[1400px] mx-auto w-full">

        {/* Hero */}
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="mb-[5vh]">
          <h1 className="text-3xl md:text-4xl font-light tracking-tight text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.55)] mb-3">
            {t('hub.hero_title')} <span className="text-primary font-medium">{t('hub.hero_title_highlight')}</span>
          </h1>
          <p className="text-white/50 font-light text-sm md:text-base max-w-xl leading-relaxed">
            {t('hub.hero_desc')}
          </p>
        </motion.div>

        <HelpBanner
          title={t('help.hub_title', 'Comment fonctionne le hub de projets ?')}
          desc={t('help.hub_desc', '')}
          className="mb-[4vh]"
        />

        {/* Filters */}
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="mb-[4vh] space-y-2.5">
          {/* Categories */}
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={()=>setActiveCategory(c.id)}
                className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${activeCategory===c.id?"bg-primary border-primary text-white font-medium":"bg-white/[0.03] border-white/10 text-white/40 hover:bg-white/10 hover:text-white"}`}>
                {t(c.key)}
              </button>
            ))}
          </div>
          {/* Help filters + Urgent */}
          <div className="flex items-center gap-2 flex-wrap">
            <FunnelSimple className="w-4 h-4 text-white/30"/>
            {ALL_HELP.map(h => {
              const m = HELP_META[h];
              const active = activeHelp === h;
              return (
                <button key={h} onClick={()=>setActiveHelp(active?null:h)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${active?`${m.bg} ${m.color}`:"bg-white/5 border-white/10 text-white/40 hover:text-white/70"}`}>
                  <m.Icon className="w-3 h-3"/>{t(m.key)}
                </button>
              );
            })}
            <button onClick={()=>setUrgentOnly(!urgentOnly)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${urgentOnly?"bg-red-500/20 border-red-500/40 text-red-400":"bg-white/5 border-white/10 text-white/40 hover:text-white/70"}`}>
              <Fire className="w-3 h-3"/>{t('hub.urgent')}
            </button>
            {user && (
              <button onClick={()=>setMineOnly(!mineOnly)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${mineOnly?"bg-primary/20 border-primary/40 text-primary":"bg-white/5 border-white/10 text-white/40 hover:text-white/70"}`}>
                <Users className="w-3 h-3"/>{t('hub.my_projects', 'Mes projets')}
              </button>
            )}
            {(activeHelp || urgentOnly || mineOnly || activeCategory !== "all") && (
              <button onClick={()=>{setActiveHelp(null);setUrgentOnly(false);setMineOnly(false);setActiveCategory("all");}} className="text-xs text-white/30 hover:text-white flex items-center gap-1 ml-2 transition-colors"><X className="w-3 h-3"/>{t('hub.reset')}</button>
            )}
          </div>
        </motion.div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="liquid-glass border border-white/5 rounded-[2rem] h-[340px] animate-pulse"/>
            ))}
          </div>
        ) : displayedProjects.length === 0 ? (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} className="py-[20vh] text-center flex flex-col items-center border border-dashed border-white/15 rounded-[2.5rem]">
            <Warning className="w-12 h-12 text-white/20 mb-4"/>
            <h3 className="text-xl font-light text-white mb-2">{t('hub.no_projects')}</h3>
            <p className="text-white/40 text-sm mb-6">{t('hub.be_first')}</p>
            <Button onClick={openCreateProject} className="rounded-full bg-primary hover:bg-primary/90 text-white h-11 px-8">
              {t('hub.create_btn')}
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedProjects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                userId={user?.id}
                onClick={()=>setSelectedProject(p)}
                onEdit={() => { setProjectToEdit(p); setIsFormOpen(true); }}
                onDelete={() => setProjectToDelete(p)}
              />
            ))}
          </div>
        )}

        <p className="text-white/30 text-sm mt-8 text-center">{t('hub.count', { count: displayedProjects.length })}</p>
      </main>

      {/* FAB */}
      <button onClick={openCreateProject}
        className="fixed bottom-8 right-8 z-[110] w-16 h-16 flex items-center justify-center bg-primary border border-white/20 rounded-full hover:bg-primary/90 transition-all group shadow-[0_10px_40px_rgba(168,85,247,0.4),0_0_20_rgba(168,85,247,0.2)] hover:scale-110 active:scale-95 animate-pulse-slow">
        <div className="absolute inset-0 bg-primary rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity"/>
        <Plus className="w-8 h-8 text-white relative z-10" weight="bold"/>
      </button>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedProject && (
          <ProjectDetail 
            project={selectedProject} 
            onClose={()=>setSelectedProject(null)} 
            userId={user?.id}
            onEdit={() => { setProjectToEdit(selectedProject); setSelectedProject(null); setIsFormOpen(true); }}
            onDelete={() => setProjectToDelete(selectedProject)}
          />
        )}
        {isFormOpen && (
          <ProjectForm 
            isOpen={true} 
            onClose={()=>{setIsFormOpen(false); setProjectToEdit(null);}} 
            onSuccess={()=>{setIsFormOpen(false); setProjectToEdit(null); queryClient.invalidateQueries({queryKey:["projects"]});}} 
            projectToEdit={projectToEdit}
          />
        )}
        <DeleteConfirmModal 
          isOpen={!!projectToDelete} 
          onClose={()=>setProjectToDelete(null)} 
          onConfirm={handleDelete}
          title={projectToDelete?.title || ""}
        />
      </AnimatePresence>
    </div>
  );
}
