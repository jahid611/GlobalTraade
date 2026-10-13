"use client";
import React, { useState, useEffect } from "react";
import { payChoices, placeChoices, startChoices, materialModeChoices, materialConditionChoices, expertiseFormatChoices, expertisePayChoices, networkTargetChoices, networkScopeChoices, labelOf, totalPeople, quantityOf, totalMaterialValue } from './needsMeta';
import { countryLabel } from "@/lib/countries";
import { canonicalIndustry } from "@/lib/industries";
import { motion } from "framer-motion";
import { X, Money, Users, Package, Brain, MapPin, Calendar, Fire, PencilSimple, Trash, ChatCircle, LockSimple, Crown, Eye, Heart, FileText, Target, Handshake } from "phosphor-react";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { expressInterest, Project, HelpType, type TeamRole, type MaterialItem } from "@/services/projectService";
import { showSuccess, showError } from "@/utils/toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";
import { formatDate, formatMoney } from "@/lib/markets";
import { ProjectAccessSection, VerificationBadge } from "@/components/ProjectDossier";
import { usePlan, hasContentAccess, UNLOCK_PRICE } from "@/services/planService";
import { useIsUnlocked } from "@/services/unlockService";
import { isBoosted } from "@/services/boostService";
import { checkContactQuota } from "@/services/quotaService";
import { HELP_META, TONES, coverGradient, pillStyle, stageMeta, type Tone } from "./projectMeta";

const sectionTitle = "flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/70 mb-3";
const fieldLabel = "text-white/50 text-xs mb-1";
const headerButton = "w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/75 hover:text-white transition-all";

// Bloc d'un besoin (financier, humain, matériel, expertise), à sa couleur.
function NeedSection({ tone, Icon, title, children }: { tone: Tone; Icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border p-5" style={{ background: tone.bg.replace("0.15", "0.08"), borderColor: tone.border.replace("0.38", "0.25") }}>
      <h4 className="font-medium mb-4 flex items-center gap-2.5 text-base" style={{ color: tone.color }}>
        <span className="w-8 h-8 rounded-lg flex items-center justify-center border" style={pillStyle(tone)}>
          <Icon className="w-4 h-4" weight="fill" />
        </span>
        {title}
      </h4>
      {children}
    </section>
  );
}

export function ProjectDetail({ project, onClose, userId, onEdit, onDelete }: { project: Project; onClose: () => void; userId?: string; onEdit: () => void; onDelete: () => void }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);
  const [selectedHelp, setSelectedHelp] = useState<HelpType | null>(null);
  const [message, setMessage] = useState("");
  const stage = stageMeta(project.stage);

  // Bridage : accès complet = projet débloqué (5 €), formule Pro/Business ou porteur.
  // Accès payant accordé seulement si le plan/déblocage est confirmé (pas en cours
  // de fetch) → pas de fuite avec un cache périmé (downgrade / changement de fiche).
  const { plan, isFetching: planFetching } = usePlan(userId);
  const { unlocked, isFetching: unlockFetching } = useIsUnlocked(userId, 'project', project.id);
  const entitled = hasContentAccess({ isOwner: userId === project.owner_id, plan, planFetching, unlocked, unlockFetching });
  // Le dossier n'est affiché que si le SERVEUR l'a réellement renvoyé (vue
  // projects_secure). Juste après un paiement, la fiche en cache est encore la
  // version masquée : on la redemande, et on reste verrouillé d'ici là.
  const hasFullAccess = entitled && project.has_full_access !== false;
  useEffect(() => {
    if (entitled && project.has_full_access === false) {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    }
  }, [entitled, project.has_full_access, queryClient]);

  const goLogin = () => navigate('/login', { state: { from: location } });
  const goUnlock = () => {
    if (!userId) { goLogin(); return; }
    navigate(`/payment?unlock=project:${project.id}&name=${encodeURIComponent(project.title || '')}`);
  };

  const handleInterest = async () => {
    if (!userId) return;
    // Le type d'aide est optionnel : par défaut, on prend le premier proposé par
    // le projet (ou "expertise") pour que « Contacter le porteur » marche en 1 clic.
    const help: HelpType = selectedHelp ?? (project.help_types?.[0] as HelpType) ?? 'expertise';
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
      await expressInterest(project, userId, help, message, {
        title: t('hub.msg_title'),
        project: t('hub.msg_project'),
        type: t('hub.msg_help_type'),
        intro: t('hub.msg_intro'),
        defaultMsg: t('hub.msg_default'),
        helpValue: t(HELP_META[help].key + "_full") // use the _full version for the message
      });
      showSuccess(t('hub.interest_sent'));
      onClose();
    } catch { showError(t('hub.interest_error')); }
    setSending(false);
  };

  const initial = (project.title || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose}/>
      {/* Mobile : feuille plein écran. À partir de sm : fenêtre centrée. */}
      <motion.div initial={{y:50,opacity:0}} animate={{y:0,opacity:1}} exit={{y:50,opacity:0}} transition={{type:"spring",damping:28}}
        role="dialog" aria-modal="true" aria-label={project.title}
        className="relative w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:max-w-3xl flex flex-col overflow-hidden bg-[#232229] border-0 sm:border sm:border-white/15 rounded-none sm:rounded-[2rem] shadow-[0_30px_90px_rgba(0,0,0,0.6)]">

        {/* Barre fixe : stade à gauche, actions à droite */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 pb-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] sm:pt-3 border-b border-white/10 bg-[#232229]">
          <span className="inline-flex items-center gap-2 text-sm font-medium px-3 h-9 rounded-full border" style={pillStyle(stage.tone)}>
            <stage.Icon className="w-4 h-4" weight="fill" />
            {t(stage.key)}
          </span>
          <div className="flex items-center gap-2">
            {userId === project.owner_id && (
              <>
                <button onClick={onEdit} title={t('projects.edit', 'Modifier') as string} aria-label={t('projects.edit', 'Modifier') as string} className={headerButton}><PencilSimple className="w-4 h-4"/></button>
                <button onClick={onDelete} title={t('projects.delete', 'Supprimer') as string} aria-label={t('projects.delete', 'Supprimer') as string} className={headerButton} style={{ color: TONES.red.color, background: TONES.red.bg, borderColor: TONES.red.border }}><Trash className="w-4 h-4"/></button>
              </>
            )}
            <button onClick={onClose} title={t('projects.close', 'Fermer') as string} aria-label={t('projects.close', 'Fermer') as string} className={headerButton}><X className="w-4 h-4"/></button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar">
          {/* ── En-tête : visuel, titre, porteur ── */}
          <div className="relative w-full h-40 sm:h-56 overflow-hidden">
            {project.cover_image_url ? (
              <img src={project.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden" style={{ background: coverGradient(stage.tone) }}>
                <stage.Icon className="absolute -right-6 -bottom-10 w-56 h-56 opacity-20 rotate-[-8deg]" style={{ color: stage.tone.color }} weight="fill" />
                <span className="relative text-7xl font-light text-white/85 leading-none">{initial}</span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#232229] to-transparent pointer-events-none" />
            <div className="absolute top-4 left-4 sm:left-6 flex flex-wrap items-center gap-2">
              {project.is_urgent && (
                <span className="text-[11px] font-bold uppercase px-2.5 py-1 rounded-full flex items-center gap-1.5 border backdrop-blur-md"
                  style={{ background: 'rgba(127,29,29,0.8)', color: '#fecaca', borderColor: 'rgba(239,68,68,0.6)' }}>
                  <Fire className="w-3 h-3" weight="fill"/>{t('hub.urgent')}
                </span>
              )}
              {isBoosted(project) && (
                <span className="text-[11px] font-bold uppercase px-2.5 py-1 rounded-full flex items-center gap-1.5 border backdrop-blur-md"
                  style={{ background: 'rgba(30,27,75,0.75)', color: '#c7d2fe', borderColor: 'rgba(89,85,232,0.6)' }}>
                  <Crown className="w-3 h-3" weight="fill" />{t('card.boosted', 'En avant')}
                </span>
              )}
            </div>
          </div>

          <div className="px-4 sm:px-8 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] space-y-7">
            <div className="flex items-start gap-4 -mt-9 relative">
              <Avatar className="w-16 h-16 border-2 border-[#232229] shrink-0 shadow-lg">
                <AvatarImage src={project.profiles?.avatar_url} className="object-cover"/>
                <AvatarFallback className="bg-primary text-white text-lg">{(project.profiles?.full_name||"?")[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 pt-10">
                <span className="text-[11px] text-[#a5b4fc] font-semibold uppercase tracking-wider">{t(`industry.${canonicalIndustry(project.category)}`, project.category)}</span>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <h2 className="text-2xl font-medium text-white leading-tight">{project.title}</h2>
                  <VerificationBadge status={project.verification_status} />
                </div>
                <p className="text-white/60 text-sm mt-1.5">
                  {t('projects.card_by', 'Porté par')} <span className="text-white/90 font-medium">{project.profiles?.full_name || t('projects.card_member', 'Un membre Globly')}</span>
                </p>
              </div>
            </div>

            {project.tagline && (
              <p className="text-white/85 text-base sm:text-lg font-light leading-snug border-l-2 border-primary pl-4">"{project.tagline}"</p>
            )}

            {/* Repères : lieu, échéance, audience */}
            <div className="flex flex-wrap gap-2">
              {project.city && <span className="flex items-center gap-1.5 text-xs text-white/75 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full"><MapPin className="w-3.5 h-3.5 text-primary"/>{project.city}{project.country && `, ${countryLabel(project.country, i18n.language)}`}</span>}
              {project.deadline && <span className="flex items-center gap-1.5 text-xs text-white/75 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full"><Calendar className="w-3.5 h-3.5 text-primary"/>{t('hub.before')} {formatDate(project.deadline, i18n.language, 'short')}</span>}
              <span className="flex items-center gap-1.5 text-xs text-white/75 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full"><Eye className="w-3.5 h-3.5 text-white/50"/>{project.view_count} {t('hub.views')}</span>
              {project.interest_count > 0 && <span className="flex items-center gap-1.5 text-xs text-white/75 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full"><Heart className="w-3.5 h-3.5 text-white/50"/>{project.interest_count} {t('hub.interests')}</span>}
            </div>

            {/* Ce que le projet recherche */}
            {project.help_types.length > 0 && (
              <section>
                <h3 className={sectionTitle}><Target className="w-4 h-4 text-[#a5b4fc]" />{t('projects.detail_needs', 'Ce que ce projet recherche')}</h3>
                <div className="flex flex-wrap gap-2">
                  {project.help_types.map(h => {
                    const m = HELP_META[h];
                    if (!m) return null;
                    return (
                      <span key={h} className="inline-flex items-center gap-2 text-sm font-medium px-3.5 py-1.5 rounded-full border" style={pillStyle(m.tone)}>
                        <m.Icon className="w-4 h-4" weight="fill" />{t(m.key)}
                      </span>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Le projet : descriptif complet, ou amorce + verrou */}
            <section>
              <h3 className={sectionTitle}><FileText className="w-4 h-4 text-[#a5b4fc]" />{t('projects.detail_about', 'Le projet')}</h3>
              {hasFullAccess ? (
                <p className="text-white/80 leading-relaxed text-[15px] whitespace-pre-wrap">{project.description}</p>
              ) : (
                <div>
                  {/* Amorce publique, puis un faux texte sous le flou : le vrai
                      descriptif n'est pas dans la page tant qu'il n'est pas débloqué. */}
                  {project.description_excerpt && (
                    <p className="text-white/80 leading-relaxed text-[15px] whitespace-pre-wrap">{project.description_excerpt}</p>
                  )}
                  <div className="relative mt-4 rounded-2xl overflow-hidden border border-primary/50 shadow-[0_12px_40px_rgba(89,85,232,0.25)]">
                    <div className="absolute inset-0 p-5 blur-md select-none pointer-events-none space-y-3" aria-hidden="true">
                      {[92, 100, 84, 96, 68, 90, 100, 76, 94, 60, 88].map((w, i) => (
                        <div key={i} className="h-3 rounded-full bg-white/25" style={{ width: `${w}%` }} />
                      ))}
                    </div>
                    <div className="relative flex flex-col items-center text-center gap-3 px-5 py-7 bg-[#232229]/70">
                      <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-[0_8px_24px_rgba(89,85,232,0.5)]">
                        <LockSimple className="w-7 h-7 text-white" weight="fill" />
                      </div>
                      <p className="text-lg font-medium text-white leading-tight">{t('projects.lock_title', 'La suite du dossier est réservée')}</p>
                      <p className="text-sm text-white/80 font-light max-w-md leading-relaxed">
                        {t('quota.unlock_project_hint', `Débloquez ce projet pour ${UNLOCK_PRICE} € : dossier complet et mise en relation.`)}
                      </p>
                      <Button onClick={goUnlock} className="rounded-full h-12 px-8 mt-1 bg-primary hover:bg-primary/90 text-white text-sm font-semibold outline-none [text-shadow:none] shadow-[0_10px_30px_rgba(89,85,232,0.55)]">
                        <LockSimple className="w-4 h-4 mr-2" /> {t('quota.unlock_cta', `Débloquer - ${UNLOCK_PRICE} €`)}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Aide financière */}
            {project.financial_needed && hasFullAccess && (
              <NeedSection tone={TONES.green} Icon={Money} title={t('project.detail.financial')}>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className={fieldLabel}>{t('project.detail.budget')}</p><p className="text-white font-medium">{formatMoney(project.budget_min, i18n.language)} – {formatMoney(project.budget_max, i18n.language)}</p></div>
                  <div><p className={fieldLabel}>{t('project.detail.type')}</p><p className="text-white font-medium capitalize">{t(`project.form.inv_${project.investment_type}`, project.investment_type)}</p></div>
                  {project.equity_offered && <div><p className={fieldLabel}>{t('project.detail.equity')}</p><p className="font-bold text-lg" style={{ color: TONES.green.color }}>{project.equity_offered}%</p></div>}
                  {project.apport_personnel && <div><p className={fieldLabel}>{t('pp.apport', 'Apport personnel')}</p><p className="text-white font-medium">{project.apport_personnel}</p></div>}
                  {project.revenue_current && <div><p className={fieldLabel}>{t('pp.revenue_current', 'CA actuel')}</p><p className="text-white font-medium">{project.revenue_current}</p></div>}
                  {project.revenue_forecast && <div><p className={fieldLabel}>{t('pp.revenue_forecast', 'CA prévisionnel')}</p><p className="text-white font-medium">{project.revenue_forecast}</p></div>}
                  {project.funds_usage && <div className="col-span-2"><p className={fieldLabel}>{t('pp.funds_usage', 'Utilisation des fonds')}</p><p className="text-white font-medium">{project.funds_usage}</p></div>}
                </div>
                {(project.financing_types || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {(project.financing_types || []).map((ft: string) => (
                      <span key={ft} className="text-xs px-3 py-1.5 border rounded-full" style={pillStyle(TONES.green)}>
                        {t(`project.form.ft_${ft}`)}
                      </span>
                    ))}
                  </div>
                )}
              </NeedSection>
            )}

            {/* Aide humaine */}
            {project.human_needed && hasFullAccess && project.team_roles?.length > 0 && (
              <NeedSection tone={TONES.blue} Icon={Users} title={t('project.detail.human')}>
                <div className="space-y-2">
                  {project.team_roles.map((r: TeamRole, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-3 bg-white/5 rounded-xl px-4 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="text-white font-medium">{r.title}</p>
                        {r.mission && <p className="text-white/80 text-[13px] mt-0.5">{r.mission}</p>}
                        <p className="text-white/50 text-xs">{r.skills}</p>
                        {(r.pay || r.place || r.start) && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {[labelOf(payChoices(t), r.pay), labelOf(placeChoices(t), r.place), labelOf(startChoices(t), r.start)].filter(Boolean).map((x) => (
                              <span key={x} className="text-xs px-2.5 py-1 border rounded-full" style={pillStyle(TONES.blue)}>{x}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-medium" style={{ color: TONES.blue.color }}>{t(`project.form.role_${r.type}`)}</p>
                        <p className="text-white/50 text-xs">{r.count} {r.count > 1 ? t('project.detail.posts') : t('project.detail.post')}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {project.team_roles.length > 1 && (
                  <p className="text-[13px] font-medium mt-3" style={{ color: TONES.blue.color }}>
                    {totalPeople(project.team_roles) === 1 ? t('need.team_total_one', 'Au total : 1 personne recherchée.') : t('need.team_total_many', { defaultValue: 'Au total : {{n}} personnes recherchées.', n: totalPeople(project.team_roles) })}
                  </p>
                )}
              </NeedSection>
            )}

            {/* Aide matérielle */}
            {project.material_needed && hasFullAccess && project.material_items?.length > 0 && (
              <NeedSection tone={TONES.amber} Icon={Package} title={t('project.detail.material')}>
                <div className="space-y-2">
                  {project.material_items.map((m: MaterialItem, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-3 bg-white/5 rounded-xl px-4 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="text-white font-medium">{quantityOf(m)} × {m.name}</p>
                        {m.purpose && <p className="text-white/80 text-[13px] mt-0.5">{m.purpose}</p>}
                        {(m.mode || m.condition || m.urgent) && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {[labelOf(materialModeChoices(t), m.mode), labelOf(materialConditionChoices(t), m.condition), m.urgent ? t('hub.urgent') : ''].filter(Boolean).map((x) => (
                              <span key={x} className="text-xs px-2.5 py-1 border rounded-full" style={pillStyle(TONES.amber)}>{x}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {m.estimated_value > 0 && (
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium" style={{ color: TONES.amber.color }}>{formatMoney(quantityOf(m) * m.estimated_value, i18n.language)}</p>
                          {quantityOf(m) > 1 && <p className="text-white/50 text-xs">{formatMoney(m.estimated_value, i18n.language)} {t('need.per_unit', "l'unité")}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {totalMaterialValue(project.material_items) > 0 && project.material_items.length > 1 && (
                  <p className="text-[13px] font-medium mt-3" style={{ color: TONES.amber.color }}>
                    {t('need.mat_total', { defaultValue: 'Valeur totale du matériel : {{total}}.', total: formatMoney(totalMaterialValue(project.material_items), i18n.language) })}
                  </p>
                )}
              </NeedSection>
            )}

            {/* Expertise */}
            {project.expertise_needed && hasFullAccess && (project.expertise_domains?.length > 0 || project.expertise_details?.question) && (
              <NeedSection tone={TONES.violet} Icon={Brain} title={t('project.detail.expertise')}>
                {project.expertise_details?.question && <p className="text-white/90 text-sm leading-relaxed mb-3">« {project.expertise_details.question} »</p>}
                <div className="flex flex-wrap gap-2">
                  {(project.expertise_domains || []).map((d: string) => <span key={d} className="text-xs px-3 py-1.5 border rounded-full" style={pillStyle(TONES.violet)}>{d}</span>)}
                </div>
                {(project.expertise_details?.format || project.expertise_details?.pay) && (
                  <p className="text-white/60 text-[13px] mt-3">
                    {[labelOf(expertiseFormatChoices(t), project.expertise_details?.format), labelOf(expertisePayChoices(t), project.expertise_details?.pay)].filter(Boolean).join(' · ')}
                  </p>
                )}
              </NeedSection>
            )}

            {/* Réseau */}
            {project.network_needed && hasFullAccess && ((project.network_details?.targets?.length ?? 0) > 0 || project.network_details?.note) && (
              <NeedSection tone={TONES.pink} Icon={Handshake} title={t('need.detail_network', 'Les contacts recherchés')}>
                {project.network_details?.note && <p className="text-white/90 text-sm leading-relaxed mb-3">{project.network_details.note}</p>}
                <div className="flex flex-wrap gap-2">
                  {(project.network_details?.targets || []).map((v: string) => labelOf(networkTargetChoices(t), v)).filter(Boolean).map((x: string) => (
                    <span key={x} className="text-xs px-3 py-1.5 border rounded-full" style={pillStyle(TONES.pink)}>{x}</span>
                  ))}
                </div>
                {project.network_details?.scope && <p className="text-white/60 text-[13px] mt-3">{labelOf(networkScopeChoices(t), project.network_details.scope)}</p>}
              </NeedSection>
            )}

            {/* Dossier complet : vérification, accès, business plan */}
            {hasFullAccess && <ProjectAccessSection project={project} userId={userId} />}

            {/* Manifester intérêt */}
            {userId !== project.owner_id && (
              <section
                className="rounded-[1.75rem] p-[1.5px]"
                style={{ background: "linear-gradient(135deg, rgba(120,114,251,0.95) 0%, rgba(89,85,232,0.45) 40%, rgba(255,255,255,0.12) 100%)" }}
              >
                <div className="rounded-[calc(1.75rem-1.5px)] bg-[#2b2a33] p-5 sm:p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-[0_8px_24px_rgba(89,85,232,0.5)]">
                      <ChatCircle className="w-5 h-5 text-white" weight="fill" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-lg text-white font-medium leading-tight">{t('hub.contact_owner', 'Contacter le porteur')}</h4>
                      <p className="text-xs text-white/60 font-light mt-0.5">{t('projects.contact_sub', 'Votre message arrive directement dans sa messagerie.')}</p>
                    </div>
                  </div>
                  {userId && !hasFullAccess ? (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                      <p className="text-white/80 text-sm mb-4 leading-relaxed">
                        {t('quota.unlock_project_hint', `Débloquez ce projet pour ${UNLOCK_PRICE} € : dossier complet et mise en relation.`)}
                      </p>
                      <Button onClick={goUnlock} className="rounded-full bg-primary hover:bg-primary/90 text-white h-12 px-8 text-sm font-semibold transition-all shadow-lg">
                        <LockSimple className="w-4 h-4 mr-2" /> {t('quota.unlock_cta', `Débloquer - ${UNLOCK_PRICE} €`)}
                      </Button>
                    </div>
                  ) : userId ? (
                    <div className="space-y-3">
                      {/* Type d'aide : optionnel, pour préciser sa proposition */}
                      {project.help_types.length > 0 && (
                        <>
                          <p className="text-white/60 text-[11px] uppercase tracking-widest font-medium">{t('hub.help_type_optional', "Type d'aide (optionnel)")}</p>
                          <div className="flex flex-wrap gap-2">
                            {project.help_types.map(h => {
                              const m = HELP_META[h];
                              if (!m) return null;
                              const active = selectedHelp === h;
                              return (
                                <button key={h} onClick={()=>setSelectedHelp(active?null:h)} aria-pressed={active}
                                  className={`flex items-center gap-2 text-sm px-4 h-10 rounded-full border transition-all ${active?"font-medium scale-105":"bg-white/5 border-white/15 text-white/70 hover:bg-white/10"}`}
                                  style={active ? pillStyle(m.tone) : undefined}>
                                  <m.Icon className="w-4 h-4" style={{ color: m.tone.color }}/>{t(m.key)}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                      <textarea className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-primary/70 text-sm resize-none min-h-[110px]"
                        placeholder={t('hub.placeholder_interest')} value={message} onChange={e=>setMessage(e.target.value)}/>
                      <Button onClick={handleInterest} disabled={sending} className="w-full rounded-full bg-primary hover:bg-primary/90 text-white h-12 text-sm font-semibold shadow-[0_10px_30px_rgba(89,85,232,0.45)]">
                        <ChatCircle className="w-4 h-4 mr-2" weight="fill" />{sending?t('hub.sending'):t('hub.contact_owner', 'Contacter le porteur')}
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                      <p className="text-white/80 text-sm mb-4 leading-relaxed">{t('hub.login_required')}</p>
                      <Button onClick={goLogin} className="rounded-full bg-primary hover:bg-primary/90 text-white h-12 px-8 text-sm font-semibold transition-all shadow-lg">
                        {t('hub.login_btn')}
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
