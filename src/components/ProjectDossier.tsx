"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefusalReason } from '@/components/MemberNotices';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { CheckCircle as SealCheck, LockSimple, LockSimpleOpen, FilePlus, FileText, Check, X, DownloadSimple, Clock, XCircle, Circle, Eye, Info } from 'phosphor-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { showError, showSuccess } from '@/utils/toast';
import type { Project } from '@/services/projectService';
import { TonePill, TONE_SUCCESS, TONE_WARNING, TONE_DANGER, TONE_NEUTRAL, toneBg, toneBorder, type Tone } from '@/components/projects/form/ui';

// Demande d'accès au dossier complet d'un projet (table project_access_requests)
type RequesterProfile = { id: string; full_name: string | null; avatar_url: string | null };
type AccessRequest = {
  id: string;
  project_id: string;
  requester_id: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  created_at: string;
  profile?: RequesterProfile;
};

// Place projets — dossier complet :
//  - vérification par l'équipe (badge « Projet vérifié »)
//  - demande d'accès complet (partenaires/membres) acceptée par le porteur
//  - business plan structuré (résumé, marché, modèle, équipe, prévisionnel)
//    visible du porteur et des demandes acceptées, exportable en PDF.

const BP_SECTIONS = ['resume', 'marche', 'modele', 'equipe', 'previsionnel'] as const;

// Aide affichée sous chaque section du business plan (repli français).
const BP_HINTS: Record<(typeof BP_SECTIONS)[number], string> = {
  resume: 'Votre projet en quelques phrases : le problème, la solution, l\'ambition.',
  marche: 'Vos clients, la taille du marché, vos concurrents.',
  modele: 'Comment le projet gagne de l\'argent : offre, prix, canaux de vente.',
  equipe: 'Qui porte le projet, avec quelles compétences et quels rôles.',
  previsionnel: 'Chiffre d\'affaires, charges et résultat attendus sur trois ans.',
};

/**
 * Badge de vérification. Sur une fiche publique, seul l'état « vérifié »
 * s'affiche ; `showAll` (réservé au porteur) montre aussi les autres états.
 */
export function VerificationBadge({ status, showAll = false }: { status?: string; showAll?: boolean }) {
  const { t } = useTranslation();
  if (status === 'verifie') {
    return <TonePill tone={TONE_SUCCESS} icon={SealCheck}>{t('pp.verified', 'Projet vérifié')}</TonePill>;
  }
  if (!showAll) return null;
  if (status === 'en_attente') {
    return <TonePill tone={TONE_WARNING} icon={Clock}>{t('pd.status_pending', 'Vérification en cours')}</TonePill>;
  }
  if (status === 'rejete') {
    return <TonePill tone={TONE_DANGER} icon={XCircle}>{t('pd.status_rejected', 'Vérification refusée')}</TonePill>;
  }
  return <TonePill tone={TONE_NEUTRAL} icon={Circle}>{t('pd.status_none', 'Non vérifié')}</TonePill>;
}

// Message d'état : pastille colorée + phrase d'explication.
function StatusNote({ tone, icon: Icon, children }: { tone: Tone; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2.5 text-sm rounded-2xl border px-4 py-3 leading-snug" style={{ background: toneBg(tone, 0.1), borderColor: toneBorder(tone, 0.35), color: tone.text }}>
      <Icon className="w-5 h-5 shrink-0" weight="fill" />
      <span>{children}</span>
    </p>
  );
}

export function ProjectAccessSection({ project, userId }: { project: Project; userId?: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isOwner = userId === project.owner_id;
  const [isBpOpen, setIsBpOpen] = useState(false);
  // Dès l'envoi, on affiche « en cours » sans attendre le rechargement de la fiche.
  const [verificationSent, setVerificationSent] = useState(false);

  const { data } = useQuery({
    queryKey: ['project-access', project.id, userId],
    queryFn: async () => {
      if (isOwner) {
        const { data: requests } = await supabase
          .from('project_access_requests')
          .select('*')
          .eq('project_id', project.id)
          .order('created_at', { ascending: false });
        const requesterIds = (requests || []).map((r: AccessRequest) => r.requester_id);
        let names: Record<string, any> = {};
        if (requesterIds.length) {
          const { data: profs } = await supabase.from('safe_profiles').select('id, full_name, avatar_url').in('id', requesterIds);
          (profs || []).forEach((p: RequesterProfile) => { names[p.id] = p; });
        }
        return { requests: (requests || []).map((r: AccessRequest) => ({ ...r, profile: names[r.requester_id] })), myRequest: null };
      }
      const { data: myRequest } = await supabase
        .from('project_access_requests')
        .select('*')
        .eq('project_id', project.id)
        .eq('requester_id', userId!)
        .maybeSingle();
      return { requests: [], myRequest };
    },
    enabled: !!userId,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['project-access', project.id, userId] });

  const requestAccess = async () => {
    const { error } = await supabase.from('project_access_requests').insert([{ project_id: project.id, requester_id: userId }]);
    if (error) showError(t('pp.request_error', 'Demande impossible.'));
    else { showSuccess(t('pp.request_sent', 'Demande envoyée au porteur de projet.')); refresh(); }
  };

  const answerRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    const { error } = await supabase.from('project_access_requests').update({ status }).eq('id', requestId);
    if (error) showError(t('pp.answer_error', 'Action impossible.'));
    else refresh();
  };

  const submitVerification = async () => {
    const { error } = await supabase.from('projects').update({ verification_status: 'en_attente' }).eq('id', project.id).eq('owner_id', userId);
    if (error) showError(t('pp.verif_error', 'Envoi impossible.'));
    else { showSuccess(t('pp.verif_sent', 'Dossier envoyé. Nous le vérifions rapidement.')); setVerificationSent(true); }
  };

  if (!userId) return null;

  const canSeeBp = isOwner || data?.myRequest?.status === 'accepted';
  const verificationStatus = verificationSent ? 'en_attente' : project.verification_status;
  const canSubmitVerification = !verificationStatus || verificationStatus === 'non_soumis' || verificationStatus === 'rejete';
  const pendingRequests = (data?.requests || []).filter((r: AccessRequest) => r.status === 'pending');
  const myStatus = data?.myRequest?.status as string | undefined;

  const secondaryBtn = "rounded-full h-12 px-5 bg-white/10 hover:bg-white/20 border border-white/15 text-white text-sm font-medium outline-none [text-shadow:none] w-full sm:w-auto";

  return (
    <div className="border-t border-white/10 pt-6 space-y-4">
      <section className="rounded-3xl bg-white/[0.04] border border-white/10 p-4 sm:p-5 space-y-4">
        <header className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0 text-[#a5b4fc]">
            {canSeeBp ? <LockSimpleOpen className="w-5 h-5" weight="fill" /> : <LockSimple className="w-5 h-5" weight="fill" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h4 className="text-base font-medium text-white leading-tight">
                {isOwner ? t('pd.title_owner', 'Votre dossier complet') : t('pd.title_visitor', 'Dossier complet')}
              </h4>
              {isOwner && <VerificationBadge status={verificationStatus} showAll />}
            </div>
            <p className="text-sm text-white/60 font-light mt-1.5 leading-relaxed">
              {isOwner
                ? t('pd.desc_owner', 'Votre business plan et votre prévisionnel. Vous seul les voyez, ainsi que les personnes dont vous acceptez la demande d\'accès.')
                : myStatus === 'accepted'
                  ? t('pd.desc_accepted', 'Le porteur vous a ouvert son dossier : business plan et prévisionnel, en lecture seule.')
                  : t('pd.desc_visitor', 'Le business plan et le prévisionnel sont réservés. Demandez l\'accès : le porteur du projet reçoit votre demande et choisit de l\'accepter.')}
            </p>
          </div>
        </header>

        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
          {isOwner ? (
            <>
              <Button onClick={() => setIsBpOpen(true)} className={secondaryBtn}>
                <FilePlus className="w-4 h-4 mr-2" /> {t('pp.bp_edit', 'Business plan & prévisionnel')}
              </Button>
              {canSubmitVerification && (
                <Button onClick={submitVerification} className="rounded-full h-12 px-5 bg-primary hover:bg-primary/90 text-white text-sm font-medium outline-none [text-shadow:none] w-full sm:w-auto">
                  <SealCheck className="w-4 h-4 mr-2" /> {t('pp.verif_submit', 'Faire vérifier mon dossier')}
                </Button>
              )}
            </>
          ) : myStatus === 'accepted' ? (
            <Button onClick={() => setIsBpOpen(true)} className="rounded-full h-12 px-5 border text-sm font-medium outline-none [text-shadow:none] w-full sm:w-auto hover:brightness-125"
              style={{ background: toneBg(TONE_SUCCESS, 0.2), borderColor: toneBorder(TONE_SUCCESS, 0.5), color: TONE_SUCCESS.text }}>
              <Eye className="w-4 h-4 mr-2" /> {t('pp.bp_view', 'Consulter le dossier complet')}
            </Button>
          ) : data?.myRequest ? null : (
            <Button onClick={requestAccess} className="rounded-full h-12 px-5 bg-primary hover:bg-primary/90 text-white text-sm font-medium outline-none [text-shadow:none] w-full sm:w-auto">
              <LockSimpleOpen className="w-4 h-4 mr-2" /> {t('pp.request_access', 'Demander l\'accès complet')}
            </Button>
          )}
        </div>

        {/* État de la vérification (porteur) */}
        {isOwner && verificationStatus === 'en_attente' && (
          <StatusNote tone={TONE_WARNING} icon={Clock}>{t('pp.verif_pending', 'Vérification en cours par notre équipe.')}</StatusNote>
        )}
        {isOwner && verificationStatus === 'rejete' && (
          <>
            <StatusNote tone={TONE_DANGER} icon={XCircle}>{t('pd.verif_rejected', 'Votre dossier n\'a pas été validé. Complétez-le, puis envoyez-le de nouveau.')}</StatusNote>
            <RefusalReason kind="project_rejected" targetId={project.id} />
          </>
        )}
        {isOwner && canSubmitVerification && verificationStatus !== 'rejete' && (
          <p className="flex items-start gap-2 text-xs text-white/50 font-light leading-relaxed">
            <Info className="w-4 h-4 shrink-0 mt-px" />
            <span>{t('pd.verif_hint', 'Notre équipe relit votre dossier. Une fois validé, le badge « Projet vérifié » s\'affiche sur votre fiche.')}</span>
          </p>
        )}

        {/* État de ma demande (visiteur) */}
        {!isOwner && data?.myRequest && myStatus !== 'accepted' && (
          myStatus === 'pending'
            ? <StatusNote tone={TONE_WARNING} icon={Clock}>{t('pp.request_pending', 'Demande d\'accès envoyée, en attente du porteur.')}</StatusNote>
            : <StatusNote tone={TONE_DANGER} icon={XCircle}>{t('pp.request_rejected', 'Le porteur a décliné votre demande d\'accès.')}</StatusNote>
        )}
      </section>

      {/* Demandes reçues (porteur) */}
      {isOwner && pendingRequests.length > 0 && (
        <section className="rounded-3xl bg-white/[0.04] border border-white/10 p-4 sm:p-5 space-y-3">
          <div>
            <h4 className="text-base font-medium text-white flex items-center gap-2">
              {t('pp.requests_title', 'Demandes d\'accès')}
              <span className="text-xs font-semibold min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary text-white inline-flex items-center justify-center">{pendingRequests.length}</span>
            </h4>
            <p className="text-sm text-white/60 font-light mt-1">{t('pd.requests_desc', 'Ces personnes souhaitent lire votre dossier complet. Accepter leur ouvre le business plan en lecture seule.')}</p>
          </div>
          <ul className="space-y-2">
            {pendingRequests.map((req: AccessRequest) => {
              const name = req.profile?.full_name || t('viewers.anonymous', 'Membre Globly');
              return (
                <li key={req.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl pl-3 pr-2 py-2">
                  {req.profile?.avatar_url
                    ? <img src={req.profile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 border border-white/15" />
                    : <span className="w-9 h-9 rounded-full bg-primary/25 border border-white/15 flex items-center justify-center text-sm font-medium text-white shrink-0">{name.charAt(0).toUpperCase()}</span>}
                  <p className="flex-1 min-w-0 text-sm text-white truncate">{name}</p>
                  <button onClick={() => answerRequest(req.id, 'accepted')} aria-label={`${t('pd.accept', 'Accepter')} - ${name}`}
                    className="h-11 min-w-[44px] px-3 rounded-full border inline-flex items-center justify-center gap-1.5 text-sm font-medium transition-all outline-none hover:brightness-125 focus-visible:ring-2 focus-visible:ring-white/50"
                    style={{ background: toneBg(TONE_SUCCESS, 0.18), borderColor: toneBorder(TONE_SUCCESS, 0.45), color: TONE_SUCCESS.text }}>
                    <Check className="w-4 h-4" weight="bold" /><span className="hidden sm:inline">{t('pd.accept', 'Accepter')}</span>
                  </button>
                  <button onClick={() => answerRequest(req.id, 'rejected')} aria-label={`${t('pd.decline', 'Refuser')} - ${name}`}
                    className="h-11 min-w-[44px] px-3 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 inline-flex items-center justify-center gap-1.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50">
                    <X className="w-4 h-4" weight="bold" /><span className="hidden sm:inline">{t('pd.decline', 'Refuser')}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {canSeeBp && <BusinessPlanModal projectId={project.id} projectTitle={project.title} isOpen={isBpOpen} onClose={() => setIsBpOpen(false)} readOnly={!isOwner} />}
    </div>
  );
}

function BusinessPlanModal({ projectId, projectTitle, isOpen, onClose, readOnly }: {
  projectId: string; projectTitle: string; isOpen: boolean; onClose: () => void; readOnly: boolean;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Record<string, string> | null>(null);

  const { data: privateFile } = useQuery({
    queryKey: ['project-private', projectId],
    queryFn: async () => {
      const { data } = await supabase.from('project_private').select('business_plan').eq('project_id', projectId).maybeSingle();
      return (data?.business_plan || {}) as Record<string, string>;
    },
    enabled: isOpen,
  });

  const plan = draft ?? privateFile ?? {};

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('project_private').upsert({
      project_id: projectId,
      business_plan: plan,
      updated_at: new Date().toISOString(),
    });
    if (error) showError(t('pp.bp_save_error', 'Enregistrement impossible.'));
    else {
      showSuccess(t('pp.bp_saved', 'Business plan enregistré.'));
      queryClient.invalidateQueries({ queryKey: ['project-private', projectId] });
    }
    setSaving(false);
  };

  const exportPdf = async () => {
    const { exportBusinessPlanPdf } = await import('@/utils/businessPlanPdf'); // chargé à la demande
    await exportBusinessPlanPdf({
      projectTitle,
      sections: BP_SECTIONS.map(section => ({ title: String(t(`pp.bp_${section}`)), content: plan[section] })),
      lang: i18n.language,
    });
  };

  const filled = BP_SECTIONS.filter(section => (plan[section] || '').trim()).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center sm:p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#2b2a2f]/85 backdrop-blur-md" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 1 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30 }}
            role="dialog" aria-modal="true" aria-label={t('pp.bp_title', 'Business plan')}
            className="relative bg-[#232229] border border-white/15 rounded-t-[2rem] sm:rounded-[2rem] w-full sm:max-w-2xl shadow-[0_30px_90px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden max-h-[calc(100dvh-env(safe-area-inset-top,0px)-1rem)] sm:max-h-[90vh]">
            {/* En-tête FIGÉ : titre + PDF + fermer (toujours accessibles) */}
            <div className="flex items-center justify-between gap-3 px-5 sm:px-8 pt-5 pb-4 shrink-0 border-b border-white/10">
              <div className="flex items-center gap-3 min-w-0">
                <span className="hidden sm:flex w-11 h-11 rounded-2xl bg-primary items-center justify-center shrink-0 shadow-[0_8px_24px_rgba(89,85,232,0.5)]">
                  <FileText className="w-5 h-5 text-white" weight="fill" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-xl sm:text-2xl font-medium text-white tracking-tight truncate">{t('pp.bp_title', 'Business plan')}</h3>
                  <p className="text-sm text-white/60 font-light truncate">{projectTitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={exportPdf} aria-label={t('pd.bp_export', 'Exporter en PDF')} title={t('pd.bp_export', 'Exporter en PDF')}
                  className="inline-flex items-center gap-1.5 px-4 h-11 rounded-full bg-white/10 border border-white/15 text-sm text-white hover:bg-white/20 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50">
                  <DownloadSimple className="w-4 h-4" /> PDF
                </button>
                <button onClick={onClose} aria-label={t('dash.cancel', 'Fermer')} className="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 border border-white/15 text-white hover:bg-white/25 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50">
                  <X className="w-5 h-5" weight="bold" />
                </button>
              </div>
            </div>

            {/* Corps défilant */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar px-5 sm:px-8 py-5" style={readOnly ? { paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' } : undefined}>
              <p className="flex items-start gap-2.5 text-sm text-white/70 font-light rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-3 mb-5 leading-snug">
                {readOnly ? <Eye className="w-5 h-5 shrink-0 text-[#a5b4fc]" /> : <Info className="w-5 h-5 shrink-0 text-[#a5b4fc]" />}
                <span>
                  {readOnly
                    ? t('pd.bp_readonly', 'Lecture seule : ce dossier vous est partagé par le porteur du projet.')
                    : t('pd.bp_intro', 'Remplissez les sections à votre rythme, dans l\'ordre que vous voulez. Seules les personnes que vous acceptez peuvent les lire.')}
                  {!readOnly && <span className="block text-xs text-white/50 mt-1">{t('pd.bp_progress', { defaultValue: 'Sections remplies : {{done}} sur {{total}}', done: filled, total: BP_SECTIONS.length })}</span>}
                </span>
              </p>

              <div className="space-y-4">
                {BP_SECTIONS.map((section, index) => (
                  <section key={section} className="rounded-3xl bg-white/[0.04] border border-white/10 p-4 sm:p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="w-8 h-8 rounded-full bg-primary/25 border border-primary/50 text-white text-sm font-semibold flex items-center justify-center shrink-0">{index + 1}</span>
                      <div className="min-w-0">
                        <label htmlFor={`bp-${projectId}-${section}`} className="text-base font-medium text-white block leading-tight pt-1">
                          {t(`pp.bp_${section}`)}
                        </label>
                        <p className="text-xs text-white/50 font-light mt-1 leading-relaxed">{t(`pd.bp_hint_${section}`, BP_HINTS[section])}</p>
                      </div>
                    </div>
                    {readOnly ? (
                      plan[section]
                        ? <p className="text-sm text-white/85 font-light whitespace-pre-wrap leading-relaxed">{plan[section]}</p>
                        : <p className="text-sm text-white/40 italic">{t('pd.bp_empty', 'Non renseigné')}</p>
                    ) : (
                      <textarea
                        id={`bp-${projectId}-${section}`}
                        value={plan[section] || ''}
                        onChange={(e) => setDraft({ ...plan, [section]: e.target.value })}
                        rows={section === 'resume' ? 3 : 4}
                        placeholder={t('pp.bp_placeholder', 'À compléter…')}
                        className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white text-base sm:text-sm leading-relaxed outline-none focus:border-primary focus:bg-white/[0.07] transition-colors resize-none placeholder-white/30"
                      />
                    )}
                  </section>
                ))}
              </div>
            </div>

            {/* Pied FIGÉ : enregistrement (porteur) */}
            {!readOnly && (
              <div className="shrink-0 px-5 sm:px-8 pt-3 border-t border-white/10 bg-[#232229]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.875rem)' }}>
                <Button onClick={save} disabled={saving} className="w-full rounded-full h-12 bg-primary hover:bg-primary/90 text-white text-base font-semibold outline-none [text-shadow:none] shadow-[0_10px_30px_rgba(89,85,232,0.45)]">
                  {t('pp.bp_save', 'Enregistrer')}
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
