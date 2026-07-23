"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CheckCircle as SealCheck, LockSimpleOpen, FilePlus, Check, X, DownloadSimple } from 'phosphor-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { showError, showSuccess } from '@/utils/toast';

// Place projets — dossier complet :
//  - vérification par l'équipe (badge « Projet vérifié »)
//  - demande d'accès complet (partenaires/membres) acceptée par le porteur
//  - business plan structuré (résumé, marché, modèle, équipe, prévisionnel)
//    visible du porteur et des demandes acceptées, exportable en PDF.

const BP_SECTIONS = ['resume', 'marche', 'modele', 'equipe', 'previsionnel'] as const;

export function VerificationBadge({ status }: { status?: string }) {
  const { t } = useTranslation();
  if (status !== 'verifie') return null;
  return (
    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 border"
      style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', borderColor: 'rgba(16,185,129,0.35)' }}>
      <SealCheck className="w-2.5 h-2.5" weight="fill" /> {t('pp.verified', 'Projet vérifié')}
    </span>
  );
}

export function ProjectAccessSection({ project, userId }: { project: any; userId?: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isOwner = userId === project.owner_id;
  const [isBpOpen, setIsBpOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['project-access', project.id, userId],
    queryFn: async () => {
      if (isOwner) {
        const { data: requests } = await supabase
          .from('project_access_requests')
          .select('*')
          .eq('project_id', project.id)
          .order('created_at', { ascending: false });
        const requesterIds = (requests || []).map((r: any) => r.requester_id);
        let names: Record<string, any> = {};
        if (requesterIds.length) {
          const { data: profs } = await supabase.from('safe_profiles').select('id, full_name, avatar_url').in('id', requesterIds);
          (profs || []).forEach((p: any) => { names[p.id] = p; });
        }
        return { requests: (requests || []).map((r: any) => ({ ...r, profile: names[r.requester_id] })), myRequest: null };
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
    else showSuccess(t('pp.verif_sent', 'Dossier envoyé. Nous le vérifions rapidement.'));
  };

  if (!userId) return null;

  const canSeeBp = isOwner || data?.myRequest?.status === 'accepted';

  return (
    <div className="border-t border-white/10 pt-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {isOwner ? (
          <>
            <Button onClick={() => setIsBpOpen(true)} className="rounded-full h-11 px-5 bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-medium outline-none [text-shadow:none]">
              <FilePlus className="w-4 h-4 mr-2" /> {t('pp.bp_edit', 'Business plan & prévisionnel')}
            </Button>
            {(!project.verification_status || project.verification_status === 'non_soumis' || project.verification_status === 'rejete') && (
              <Button onClick={submitVerification} className="rounded-full h-11 px-5 bg-primary hover:bg-primary/90 text-white text-xs font-medium outline-none [text-shadow:none]">
                <SealCheck className="w-4 h-4 mr-2" /> {t('pp.verif_submit', 'Faire vérifier mon dossier')}
              </Button>
            )}
            {project.verification_status === 'en_attente' && (
              <span className="text-xs text-white/50 font-light">{t('pp.verif_pending', 'Vérification en cours par notre équipe.')}</span>
            )}
          </>
        ) : data?.myRequest?.status === 'accepted' ? (
          <Button onClick={() => setIsBpOpen(true)} className="rounded-full h-11 px-5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-medium outline-none [text-shadow:none]">
            <LockSimpleOpen className="w-4 h-4 mr-2" /> {t('pp.bp_view', 'Consulter le dossier complet')}
          </Button>
        ) : data?.myRequest ? (
          <span className="text-xs text-white/50 font-light">
            {data.myRequest.status === 'pending'
              ? t('pp.request_pending', 'Demande d\'accès envoyée — en attente du porteur.')
              : t('pp.request_rejected', 'Le porteur a décliné votre demande d\'accès.')}
          </span>
        ) : (
          <Button onClick={requestAccess} className="rounded-full h-11 px-5 bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-medium outline-none [text-shadow:none]">
            <LockSimpleOpen className="w-4 h-4 mr-2" /> {t('pp.request_access', 'Demander l\'accès complet')}
          </Button>
        )}
      </div>

      {/* Demandes reçues (porteur) */}
      {isOwner && (data?.requests || []).filter((r: any) => r.status === 'pending').length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-white/40">{t('pp.requests_title', 'Demandes d\'accès')}</p>
          {(data?.requests || []).filter((r: any) => r.status === 'pending').map((req: any) => (
            <div key={req.id} className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3">
              <p className="flex-1 text-sm text-white font-light truncate">{req.profile?.full_name || t('viewers.anonymous', 'Membre Globly')}</p>
              <button onClick={() => answerRequest(req.id, 'accepted')} className="p-2 rounded-full bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-colors outline-none"><Check className="w-4 h-4" /></button>
              <button onClick={() => answerRequest(req.id, 'rejected')} className="p-2 rounded-full bg-white/5 text-white/50 hover:bg-red-500/15 hover:text-red-400 transition-colors outline-none"><X className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
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
    const { jsPDF } = await import('jspdf'); // chargé à la demande
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`Business plan — ${projectTitle}`, 15, 20);
    let y = 35;
    BP_SECTIONS.forEach(section => {
      const content = plan[section];
      if (!content) return;
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(String(t(`pp.bp_${section}`)), 15, y);
      y += 7;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(content, 180);
      lines.forEach((line: string) => {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(line, 15, y);
        y += 5;
      });
      y += 6;
    });
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Document généré par Globly — globly.fr', 15, 290);
    doc.save(`BusinessPlan_${projectTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#2b2a2f]/85 backdrop-blur-md" onClick={onClose} />
          <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative liquid-glass-heavy border border-white/20 rounded-[2rem] p-8 sm:p-10 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="text-2xl font-light text-white mb-1">{t('pp.bp_title', 'Business plan')}</h3>
                <p className="text-sm text-white/50 font-light">{projectTitle}</p>
              </div>
              <button onClick={exportPdf} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 border border-white/15 text-xs text-white hover:bg-white/20 transition-colors outline-none shrink-0">
                <DownloadSimple className="w-4 h-4" /> PDF
              </button>
            </div>

            <div className="space-y-5">
              {BP_SECTIONS.map(section => (
                <div key={section}>
                  <label className="text-[10px] uppercase tracking-widest text-white/50 mb-2 block font-medium">
                    {t(`pp.bp_${section}`)}
                  </label>
                  {readOnly ? (
                    <p className="text-sm text-white/70 font-light whitespace-pre-wrap bg-white/5 rounded-2xl px-4 py-3 min-h-[48px]">
                      {plan[section] || '—'}
                    </p>
                  ) : (
                    <textarea
                      value={plan[section] || ''}
                      onChange={(e) => setDraft({ ...plan, [section]: e.target.value })}
                      rows={section === 'resume' ? 3 : 4}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-primary/50 resize-none"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 mt-8">
              {!readOnly && (
                <Button onClick={save} disabled={saving} className="w-full rounded-full h-12 bg-primary hover:bg-primary/90 text-white font-medium outline-none [text-shadow:none]">
                  {t('pp.bp_save', 'Enregistrer')}
                </Button>
              )}
              <Button variant="ghost" onClick={onClose} className="w-full rounded-full h-12 text-white hover:bg-white/10 outline-none [text-shadow:none]">
                {t('dash.cancel', 'Fermer')}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
