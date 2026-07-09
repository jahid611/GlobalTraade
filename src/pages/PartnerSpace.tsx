"use client";

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Bank, Briefcase, Scales, Calculator, FolderOpen, PaperPlaneTilt, CheckCircle,
  CalendarBlank, Plus, Trash, FileArrowUp, DownloadSimple, ChatTeardrop, CaretLeft, CaretRight
} from 'phosphor-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Navbar } from '@/components/Navbar';
import { SolarSystem } from '@/components/SolarSystem';
import { Button } from '@/components/ui/button';
import { showError, showSuccess } from '@/utils/toast';

// Espace partenaire : banques, courtiers, avocats, experts-comptables.
// Tableau de bord commun : dossiers proposés (annonce client, projet de
// reprise, demande de financement), documents, visibilité contrôlée,
// petit calendrier de rendez-vous. Messagerie : celle du site (/messages).
// Les demandes de financement ne sont partagées qu'une fois acceptées
// (accord vendeur/repreneur en amont) — appliqué par les règles RLS.

const PARTNER_TYPES = [
  { key: 'banque', icon: Bank },
  { key: 'courtier', icon: Briefcase },
  { key: 'avocat', icon: Scales },
  { key: 'comptable', icon: Calculator },
] as const;

const DOSSIER_TYPES = ['annonce_client', 'projet_reprise', 'demande_financement'] as const;

const FIELD_TEMPLATES: Record<string, { key: string; ph: string }[]> = {
  annonce_client: [
    { key: 'entreprise', ph: "Nom de l'entreprise à céder" },
    { key: 'secteur', ph: 'Secteur d\'activité' },
    { key: 'ca', ph: 'Chiffre d\'affaires' },
    { key: 'prix', ph: 'Prix souhaité' },
    { key: 'localisation', ph: 'Localisation' },
  ],
  projet_reprise: [
    { key: 'budget', ph: 'Budget' },
    { key: 'apport', ph: 'Apport' },
    { key: 'secteur', ph: 'Secteur recherché' },
    { key: 'localisation', ph: 'Localisation' },
    { key: 'experience', ph: 'Expérience du client' },
  ],
  demande_financement: [
    { key: 'montant', ph: 'Montant recherché' },
    { key: 'apport', ph: 'Apport du repreneur' },
    { key: 'entreprise_cible', ph: 'Entreprise cible' },
    { key: 'echeance', ph: 'Échéance souhaitée' },
  ],
};

const STATUS_ORDER = ['brouillon', 'envoye', 'accepte', 'refuse', 'cloture'] as const;

export default function PartnerSpace() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<'dossiers' | 'partages' | 'agenda'>('dossiers');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState<string>('annonce_client');
  const [form, setForm] = useState<any>({ title: '', client_name: '', client_email: '', description: '', fields: {} });
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [rdvForm, setRdvForm] = useState({ title: '', with_name: '', date: '', time: '', notes: '' });

  const { data: profile } = useQuery({
    queryKey: ['partner-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('partner_type, full_name').eq('id', user!.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['partner-space', user?.id],
    queryFn: async () => {
      const [{ data: mine }, { data: shared }, { data: rdvs }] = await Promise.all([
        supabase.from('dossiers').select('*').eq('partner_id', user!.id).order('updated_at', { ascending: false }),
        supabase.from('dossiers').select('*').neq('partner_id', user!.id).order('updated_at', { ascending: false }),
        supabase.from('appointments').select('*').eq('organizer_id', user!.id).order('starts_at', { ascending: true }),
      ]);
      return { mine: mine || [], shared: shared || [], rdvs: rdvs || [] };
    },
    enabled: !!user?.id && !!profile?.partner_type,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['partner-space', user?.id] });

  const choosePartnerType = async (type: string) => {
    const { error } = await supabase.from('profiles').update({ partner_type: type }).eq('id', user!.id);
    if (error) showError(t('partner.type_error', "Impossible d'enregistrer votre profil partenaire."));
    else {
      showSuccess(t('partner.type_saved', 'Bienvenue dans votre espace partenaire.'));
      queryClient.invalidateQueries({ queryKey: ['partner-profile', user?.id] });
    }
  };

  const openForm = (type: string) => {
    setFormType(type);
    setForm({ title: '', client_name: '', client_email: '', description: '', fields: {} });
    setIsFormOpen(true);
  };

  const saveDossier = async () => {
    if (!form.title.trim()) { showError(t('partner.title_required', 'Donnez un titre au dossier.')); return; }
    setSaving(true);
    const { error } = await supabase.from('dossiers').insert([{
      partner_id: user!.id,
      type: formType,
      title: form.title.trim(),
      client_name: form.client_name || null,
      client_email: form.client_email || null,
      description: form.description || null,
      fields: form.fields,
    }]);
    if (error) showError(t('partner.save_error', "Impossible d'enregistrer le dossier."));
    else { showSuccess(t('partner.saved', 'Dossier créé (brouillon).')); refresh(); setIsFormOpen(false); }
    setSaving(false);
  };

  const updateDossier = async (id: string, patch: any) => {
    const { error } = await supabase.from('dossiers').update(patch).eq('id', id).eq('partner_id', user!.id);
    if (error) showError(t('partner.update_error', 'Mise à jour impossible.'));
    else refresh();
  };

  const deleteDossier = async (id: string) => {
    const { error } = await supabase.from('dossiers').delete().eq('id', id).eq('partner_id', user!.id);
    if (error) showError(t('partner.delete_error', 'Suppression impossible.'));
    else { showSuccess(t('partner.deleted', 'Dossier supprimé.')); refresh(); }
  };

  const uploadDocument = async (dossier: any, file: File) => {
    setUploadingId(dossier.id);
    const path = `${user!.id}/${dossier.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('dossiers').upload(path, file);
    if (error) showError(t('partner.upload_error', 'Échec de l\'envoi du document.'));
    else {
      const docs = [...(dossier.documents || []), { path, name: file.name }];
      await updateDossier(dossier.id, { documents: docs });
      showSuccess(t('partner.uploaded', 'Document ajouté.'));
    }
    setUploadingId(null);
  };

  const downloadDocument = async (doc: any) => {
    const { data } = await supabase.storage.from('dossiers').createSignedUrl(doc.path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const addRdv = async () => {
    if (!rdvForm.title.trim() || !rdvForm.date) { showError(t('partner.rdv_required', 'Titre et date obligatoires.')); return; }
    const startsAt = new Date(`${rdvForm.date}T${rdvForm.time || '09:00'}`);
    const { error } = await supabase.from('appointments').insert([{
      organizer_id: user!.id,
      title: rdvForm.title.trim(),
      with_name: rdvForm.with_name || null,
      notes: rdvForm.notes || null,
      starts_at: startsAt.toISOString(),
    }]);
    if (error) showError(t('partner.rdv_error', 'Impossible de créer le rendez-vous.'));
    else { showSuccess(t('partner.rdv_saved', 'Rendez-vous ajouté.')); setRdvForm({ title: '', with_name: '', date: '', time: '', notes: '' }); refresh(); }
  };

  const deleteRdv = async (id: string) => {
    await supabase.from('appointments').delete().eq('id', id).eq('organizer_id', user!.id);
    refresh();
  };

  // Petit calendrier : jours du mois avec un point si un RDV est calé
  const calendar = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // lundi = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const rdvDays = new Set((data?.rdvs || [])
      .map((r: any) => new Date(r.starts_at))
      .filter(d => d.getFullYear() === year && d.getMonth() === month)
      .map(d => d.getDate()));
    return { firstDay, daysInMonth, rdvDays, year, month };
  }, [calMonth, data?.rdvs]);

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-white text-sm outline-none focus:border-primary/50";
  const statusLabel = (s: string) => t(`partner.status_${s}`);
  const typeLabel = (ty: string) => t(`partner.dtype_${ty}`);

  const upcoming = (data?.rdvs || []).filter((r: any) => new Date(r.starts_at) >= new Date());
  const now = new Date();

  const DossierCard = ({ dossier, readOnly }: { dossier: any; readOnly: boolean }) => (
    <div className="liquid-glass rounded-[1.5rem] border border-white/10 p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white font-light text-base mb-1">{dossier.title}</p>
          <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-widest">
            <span className="px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/30 font-medium">{typeLabel(dossier.type)}</span>
            <span className={`px-2.5 py-1 rounded-full border font-medium ${
              dossier.status === 'accepte' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : dossier.status === 'refuse' ? 'bg-red-500/15 text-red-300 border-red-500/30'
              : 'bg-white/5 text-white/60 border-white/15'}`}>{statusLabel(dossier.status)}</span>
            {dossier.client_name && <span className="px-2.5 py-1 rounded-full bg-white/5 text-white/60 border border-white/15">{dossier.client_name}</span>}
          </div>
        </div>
        {!readOnly && (
          <button onClick={() => deleteDossier(dossier.id)} className="p-2 rounded-full text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors outline-none shrink-0">
            <Trash className="w-4 h-4" />
          </button>
        )}
      </div>

      {Object.keys(dossier.fields || {}).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(dossier.fields).map(([fieldKey, fieldValue]: any) => fieldValue ? (
            <div key={fieldKey} className="bg-white/5 rounded-xl px-3 py-2">
              <p className="text-[9px] uppercase tracking-widest text-white/40">{String(t(`partner.field_${fieldKey}`, { defaultValue: fieldKey }))}</p>
              <p className="text-xs text-white/80 truncate">{String(fieldValue)}</p>
            </div>
          ) : null)}
        </div>
      )}

      {dossier.description && <p className="text-sm text-white/50 font-light leading-relaxed">{dossier.description}</p>}

      {(dossier.documents || []).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {dossier.documents.map((doc: any, docIdx: number) => (
            <button key={docIdx} onClick={() => downloadDocument(doc)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/15 text-xs text-white/70 hover:text-white hover:border-white/30 transition-colors outline-none">
              <DownloadSimple className="w-3.5 h-3.5" /> {doc.name}
            </button>
          ))}
        </div>
      )}

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10">
          <select value={dossier.status} onChange={(e) => updateDossier(dossier.id, { status: e.target.value })}
            className="text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 outline-none cursor-pointer">
            {STATUS_ORDER.map(s => <option key={s} value={s} className="bg-[#2b2a2f]">{statusLabel(s)}</option>)}
          </select>
          <select value={dossier.visibility} onChange={(e) => updateDossier(dossier.id, { visibility: e.target.value })}
            className="text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 outline-none cursor-pointer">
            <option value="prive" className="bg-[#2b2a2f]">{t('partner.vis_prive', 'Privé (moi seul)')}</option>
            <option value="partenaires" className="bg-[#2b2a2f]">{t('partner.vis_partenaires', 'Visible des partenaires')}</option>
            <option value="membres" className="bg-[#2b2a2f]">{t('partner.vis_membres', 'Visible des membres')}</option>
          </select>
          <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70 hover:text-white cursor-pointer transition-colors">
            <FileArrowUp className="w-3.5 h-3.5" />
            {uploadingId === dossier.id ? '…' : t('partner.add_doc', 'Ajouter un document')}
            <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDocument(dossier, f); e.target.value = ''; }} />
          </label>
        </div>
      )}
    </div>
  );

  // --- Choix du type de partenaire (première visite) ---
  if (profile && !profile.partner_type) {
    return (
      <div className="min-h-screen bg-transparent dark:bg-[#2b2a2f] text-white font-sans">
        <SolarSystem />
        <Navbar />
        <main className="relative z-10 max-w-3xl mx-auto px-[6vw] pt-[22vh] pb-20 text-center">
          <h1 className="text-3xl md:text-4xl font-light tracking-tight mb-3 [text-shadow:0_2px_14px_rgba(0,0,0,0.55)]">
            {t('partner.onboard_title', 'Espace partenaire')}
          </h1>
          <p className="text-white/50 font-light mb-12">{t('partner.onboard_desc', 'Vous accompagnez des cédants ou des repreneurs ? Choisissez votre métier.')}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {PARTNER_TYPES.map(({ key, icon: Icon }) => (
              <button key={key} onClick={() => choosePartnerType(key)}
                className="liquid-glass border border-white/15 rounded-[2rem] p-8 flex flex-col items-center gap-4 hover:border-primary/50 hover:bg-white/[0.04] transition-all outline-none group">
                <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <span className="text-sm font-light">{t(`partner.ptype_${key}`)}</span>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent dark:bg-[#2b2a2f] text-white font-sans selection:bg-primary/30">
      <SolarSystem />
      <Navbar />
      <main className="relative z-10 max-w-[1200px] mx-auto px-[6vw] pt-[18vh] pb-20 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 border-b border-white/15 pb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-light tracking-tight [text-shadow:0_2px_14px_rgba(0,0,0,0.55)] mb-2">
              {t('partner.title', 'Espace partenaire')}
            </h1>
            {profile?.partner_type && (
              <span className="inline-flex px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs uppercase tracking-widest font-medium">
                {t(`partner.ptype_${profile.partner_type}`)}
              </span>
            )}
          </div>
          <Button onClick={() => navigate('/messages')} variant="outline"
            className="rounded-full h-12 px-6 liquid-glass border-white/20 text-white hover:bg-white/15 w-fit outline-none text-xs uppercase tracking-widest font-medium">
            <ChatTeardrop className="w-4 h-4 mr-2" /> {t('partner.messages', 'Messagerie')}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: t('partner.stat_dossiers', 'Dossiers'), value: data?.mine.length || 0, icon: FolderOpen },
            { label: t('partner.stat_sent', 'Envoyés'), value: (data?.mine || []).filter((d: any) => d.status !== 'brouillon').length, icon: PaperPlaneTilt },
            { label: t('partner.stat_accepted', 'Acceptés'), value: (data?.mine || []).filter((d: any) => d.status === 'accepte').length, icon: CheckCircle },
            { label: t('partner.stat_rdv', 'RDV à venir'), value: upcoming.length, icon: CalendarBlank },
          ].map((stat, statIdx) => (
            <div key={statIdx} className="liquid-glass border border-white/10 rounded-[1.5rem] p-6">
              <stat.icon className="w-5 h-5 text-primary mb-3" />
              <p className="text-3xl font-light">{stat.value}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/50 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Proposer un dossier */}
        <div className="liquid-glass border border-white/10 rounded-[2rem] p-6 sm:p-8 mb-10">
          <p className="text-lg font-light mb-1">{t('partner.propose', 'Proposer un dossier')}</p>
          <p className="text-sm text-white/50 font-light mb-5">{t('partner.propose_desc', 'Déposez un dossier pour un client. Vous choisissez qui peut le consulter.')}</p>
          <div className="flex flex-wrap gap-3">
            {DOSSIER_TYPES.map(ty => (
              <Button key={ty} onClick={() => openForm(ty)}
                className="rounded-full h-11 px-5 bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-medium outline-none [text-shadow:none]">
                <Plus className="w-4 h-4 mr-2" /> {typeLabel(ty)}
              </Button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 p-1.5 rounded-full bg-black/20 border border-white/10 w-fit mb-8">
          {([['dossiers', t('partner.tab_mine', 'Mes dossiers')], ['partages', t('partner.tab_shared', 'Dossiers partagés')], ['agenda', t('partner.tab_agenda', 'Rendez-vous')]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key as any)}
              className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all outline-none ${tab === key ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'dossiers' && (
          <div className="space-y-4">
            {isLoading ? <p className="text-white/40 font-light text-sm">…</p>
              : (data?.mine || []).length === 0 ? (
                <div className="liquid-glass rounded-[2rem] border border-white/10 p-16 text-center">
                  <FolderOpen className="w-10 h-10 text-white/20 mx-auto mb-4" />
                  <p className="text-white/40 font-light">{t('partner.no_dossiers', 'Aucun dossier. Proposez-en un ci-dessus.')}</p>
                </div>
              ) : (data?.mine || []).map((dossier: any) => <DossierCard key={dossier.id} dossier={dossier} readOnly={false} />)}
          </div>
        )}

        {tab === 'partages' && (
          <div className="space-y-4">
            {(data?.shared || []).length === 0 ? (
              <div className="liquid-glass rounded-[2rem] border border-white/10 p-16 text-center">
                <FolderOpen className="w-10 h-10 text-white/20 mx-auto mb-4" />
                <p className="text-white/40 font-light">{t('partner.no_shared', 'Aucun dossier partagé par d\'autres partenaires pour le moment.')}</p>
              </div>
            ) : (data?.shared || []).map((dossier: any) => <DossierCard key={dossier.id} dossier={dossier} readOnly={true} />)}
          </div>
        )}

        {tab === 'agenda' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calendrier */}
            <div className="liquid-glass border border-white/10 rounded-[2rem] p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <button onClick={() => setCalMonth(new Date(calendar.year, calendar.month - 1, 1))} className="p-2 rounded-full hover:bg-white/10 transition-colors outline-none"><CaretLeft className="w-4 h-4" /></button>
                <p className="text-sm font-medium capitalize">{calMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
                <button onClick={() => setCalMonth(new Date(calendar.year, calendar.month + 1, 1))} className="p-2 rounded-full hover:bg-white/10 transition-colors outline-none"><CaretRight className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-widest text-white/40 mb-2">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((dayLabel, dayIdx) => <span key={dayIdx}>{dayLabel}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: calendar.firstDay }).map((_, emptyIdx) => <span key={`e${emptyIdx}`} />)}
                {Array.from({ length: calendar.daysInMonth }).map((_, dayIdx) => {
                  const day = dayIdx + 1;
                  const isToday = day === now.getDate() && calendar.month === now.getMonth() && calendar.year === now.getFullYear();
                  return (
                    <div key={day} className={`relative aspect-square flex items-center justify-center rounded-xl text-xs font-light ${isToday ? 'bg-primary text-white' : 'text-white/70 hover:bg-white/5'}`}>
                      {day}
                      {calendar.rdvDays.has(day) && <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Liste + ajout */}
            <div className="space-y-4">
              <div className="liquid-glass border border-white/10 rounded-[2rem] p-6 space-y-3">
                <p className="text-sm font-medium mb-1">{t('partner.rdv_new', 'Caler un rendez-vous')}</p>
                <input value={rdvForm.title} onChange={(e) => setRdvForm({ ...rdvForm, title: e.target.value })} placeholder={t('partner.rdv_title_ph', 'Objet (ex : point financement)') as string} className={inputClass} />
                <input value={rdvForm.with_name} onChange={(e) => setRdvForm({ ...rdvForm, with_name: e.target.value })} placeholder={t('partner.rdv_with_ph', 'Avec qui (facultatif)') as string} className={inputClass} />
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" value={rdvForm.date} onChange={(e) => setRdvForm({ ...rdvForm, date: e.target.value })} className={inputClass} />
                  <input type="time" value={rdvForm.time} onChange={(e) => setRdvForm({ ...rdvForm, time: e.target.value })} className={inputClass} />
                </div>
                <Button onClick={addRdv} className="w-full rounded-full h-11 bg-primary hover:bg-primary/90 text-white font-medium outline-none [text-shadow:none]">
                  <Plus className="w-4 h-4 mr-2" /> {t('partner.rdv_add', 'Ajouter')}
                </Button>
              </div>

              {upcoming.length === 0 ? (
                <p className="text-sm text-white/40 font-light text-center py-6">{t('partner.no_rdv', 'Aucun rendez-vous à venir.')}</p>
              ) : upcoming.map((rdv: any) => (
                <div key={rdv.id} className="liquid-glass border border-white/10 rounded-[1.5rem] p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex flex-col items-center justify-center shrink-0">
                    <span className="text-sm font-medium leading-none">{new Date(rdv.starts_at).getDate()}</span>
                    <span className="text-[9px] uppercase text-white/50">{new Date(rdv.starts_at).toLocaleDateString(undefined, { month: 'short' })}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-light truncate">{rdv.title}</p>
                    <p className="text-xs text-white/40">
                      {new Date(rdv.starts_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      {rdv.with_name ? ` · ${rdv.with_name}` : ''}
                    </p>
                  </div>
                  <button onClick={() => deleteRdv(rdv.id)} className="p-2 rounded-full text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors outline-none"><Trash className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Formulaire nouveau dossier */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#2b2a2f]/80 backdrop-blur-md" onClick={() => setIsFormOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative liquid-glass border border-white/30 dark:border-white/10 rounded-[2rem] p-8 sm:p-10 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-light mb-2">{typeLabel(formType)}</h3>
              <p className="text-sm text-white/50 font-light mb-6">{t('partner.form_desc', 'Le dossier reste en brouillon jusqu\'à ce que vous l\'envoyiez.')}</p>
              <div className="space-y-3">
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('partner.form_title_ph', 'Titre du dossier') as string} className={inputClass} />
                <div className="grid grid-cols-2 gap-3">
                  <input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} placeholder={t('partner.form_client_ph', 'Client') as string} className={inputClass} />
                  <input value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} placeholder={t('partner.form_email_ph', 'Email client') as string} className={inputClass} />
                </div>
                {FIELD_TEMPLATES[formType].map(field => (
                  <input key={field.key}
                    value={form.fields[field.key] || ''}
                    onChange={(e) => setForm({ ...form, fields: { ...form.fields, [field.key]: e.target.value } })}
                    placeholder={t(`partner.field_${field.key}`, field.ph) as string}
                    className={inputClass} />
                ))}
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
                  placeholder={t('partner.form_desc_ph', 'Précisions utiles (facultatif)') as string}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary/50 resize-none" />
              </div>
              <div className="flex flex-col gap-3 mt-8">
                <Button onClick={saveDossier} disabled={saving} className="w-full rounded-full h-12 bg-primary hover:bg-primary/90 text-white font-medium outline-none [text-shadow:none]">
                  {t('partner.form_save', 'Créer le dossier')}
                </Button>
                <Button variant="ghost" onClick={() => setIsFormOpen(false)} className="w-full rounded-full h-12 text-white hover:bg-white/10 outline-none [text-shadow:none]">
                  {t('dash.cancel', 'Annuler')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
