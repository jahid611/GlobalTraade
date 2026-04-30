"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Download, ShieldCheck, Lock, Upload, Eye, CheckCircle2, History, Users, ShieldAlert, Loader2, Unlock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { showSuccess, showError } from '@/utils/toast';
import { generateBlindTeaser } from '@/utils/teaserGenerator';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { exportVDRAuditTrail } from '@/utils/pdfExport';

interface DataRoomPanelProps {
  isOpen: boolean;
  onClose: () => void;
  listing: any;
  user: any;
}

export function DataRoomPanel({ isOpen, onClose, listing, user }: DataRoomPanelProps) {
  useScrollLock(isOpen);
  const [ndaStatus, setNdaStatus] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [buyersWithNda, setBuyersWithNda] = useState<any[]>([]);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{url: string, name: string} | null>(null);
  const [activeTab, setActiveTab] = useState<'docs' | 'access' | 'audit'>('docs');
  const { t, i18n } = useTranslation();

  const isOwner = user && listing?.owner_id === user.id;
  const dateLocale = i18n.language === 'fr' ? fr : enUS;

  useEffect(() => {
    if (isOpen && user && listing) {
      fetchData();
      setActiveTab('docs');
    }
  }, [isOpen, user, listing]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!isOwner) {
        const { data: nda } = await supabase
          .from('ndas')
          .select('status')
          .eq('listing_id', listing.id)
          .eq('buyer_id', user.id)
          .maybeSingle();
        
        setNdaStatus(nda?.status || null);

        if (nda?.status === 'signed') {
          const { data: docs } = await supabase
            .from('vdr_documents')
            .select('*')
            .eq('listing_id', listing.id)
            .order('created_at', { ascending: false });
          setDocuments(docs || []);
        }
      } else {
        // Mode Propriétaire : On récupère les docs
        const { data: docs } = await supabase
          .from('vdr_documents')
          .select('*')
          .eq('listing_id', listing.id)
          .order('created_at', { ascending: false });
        setDocuments(docs || []);

        // 1. Récupération des NDAs (Signés ET Révoqués)
        const { data: ndas, error: ndaError } = await supabase
          .from('ndas')
          .select('*')
          .eq('listing_id', listing.id)
          .in('status', ['signed', 'revoked'])
          .order('signed_at', { ascending: false });
        
        if (ndaError) console.error("Erreur NDA:", ndaError);

        // 2. Récupération des Logs d'accès
        let logs: any[] = [];
        if (docs && docs.length > 0) {
          const docIds = docs.map(d => d.id);
          const { data: rawLogs, error: logError } = await supabase
            .from('vdr_access_logs')
            .select('*')
            .in('document_id', docIds)
            .order('created_at', { ascending: false });
          if (logError) console.error("Erreur Logs:", logError);
          logs = rawLogs || [];
        }

        // 3. Récupération manuelle des Profils
        const profileIds = new Set([
          ...(ndas || []).map(n => n.buyer_id),
          ...logs.map(l => l.viewer_id)
        ].filter(Boolean));

        let profilesMap = new Map();
        if (profileIds.size > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', Array.from(profileIds));
          
          if (profiles) {
            profilesMap = new Map(profiles.map(p => [p.id, p]));
          }
        }

        // 4. Assemblage
        const enrichedNdas = (ndas || []).map(n => ({
          ...n,
          buyer: profilesMap.get(n.buyer_id) || null
        }));
        setBuyersWithNda(enrichedNdas);

        const enrichedLogs = logs.map(l => {
          const doc = docs?.find(d => d.id === l.document_id);
          return {
            ...l,
            viewer: profilesMap.get(l.viewer_id) || null,
            document: doc ? { name: doc.name } : null
          };
        });
        setAccessLogs(enrichedLogs);
      }
    } catch (err) {
      console.error("Erreur VDR:", err);
    } finally {
      setLoading(false);
    }
  };

  const signNda = async () => {
    try {
      const { error } = await supabase.from('ndas').upsert({
        listing_id: listing.id,
        buyer_id: user.id,
        status: 'signed',
        signed_at: new Date().toISOString(),
      }, { onConflict: 'listing_id,buyer_id' });

      if (error) throw error;
      showSuccess(t('vdr.toast_nda_signed'));
      fetchData();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const toggleAccess = async (ndaId: string, newStatus: 'signed' | 'revoked') => {
    try {
      const { data, error } = await supabase.from('ndas')
        .update({ status: newStatus })
        .eq('id', ndaId)
        .select();

      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error("Mise à jour bloquée. Vérifiez les règles de sécurité (RLS) sur Supabase.");
      }

      showSuccess(newStatus === 'revoked' ? t('vdr.toast_revoked') : t('vdr.toast_restored'));
      fetchData();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const uploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${listing.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vdr')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('vdr_documents').insert({
        listing_id: listing.id,
        name: file.name,
        file_path: filePath,
        size_bytes: file.size
      });

      if (dbError) throw dbError;

      showSuccess(t('vdr.toast_doc_success'));
      fetchData();
    } catch (err: any) {
      showError(`${t('vdr.toast_upload_error')}${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const downloadDocument = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage.from('vdr').createSignedUrl(doc.file_path, 60, {
        download: doc.name
      });
      if (error) throw error;
      
      if (!isOwner) {
        await supabase.from('vdr_access_logs').insert({
          document_id: doc.id,
          viewer_id: user.id
        });
      }

      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      showError(t('vdr.toast_access_error'));
    }
  };

  const viewDocument = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage.from('vdr').createSignedUrl(doc.file_path, 300);
      if (error) throw error;
      
      if (!isOwner) {
        await supabase.from('vdr_access_logs').insert({
          document_id: doc.id,
          viewer_id: user.id
        });
      }

      setPreviewDoc({ url: data.signedUrl, name: doc.name });
    } catch (err: any) {
      showError(t('vdr.toast_access_error'));
    }
  };

  const handleExportAuditPDF = () => {
    exportVDRAuditTrail(accessLogs, listing?.name || 'Dossier', t, i18n.language);
    showSuccess("Registre d'audit généré avec succès.");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex pointer-events-none justify-start">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-auto"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
            className="relative h-full w-full sm:w-[500px] liquid-glass-heavy bg-[#2b2a2f]/95 border-r border-white/10 z-[210] flex flex-col shadow-2xl pointer-events-auto"
          >
            {/* VDR Header */}
            <div className="flex flex-col p-6 border-b border-white/10 bg-black/20 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-light text-white flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                  </div>
                  {t('vdr.header_title')}
                </h2>
                <button onClick={onClose} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                  <Lock className="w-3 h-3" /> {t('vdr.aes')}
                </span>
                <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-blue-400 font-bold bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                  <ShieldAlert className="w-3 h-3" /> {t('vdr.traceability')}
                </span>
              </div>
            </div>

            {/* Owner Tabs */}
            {isOwner && (
              <div className="flex px-6 pt-4 border-b border-white/5 shrink-0 gap-6">
                <button 
                  onClick={() => setActiveTab('docs')}
                  className={`pb-3 text-xs font-medium uppercase tracking-widest transition-colors relative ${activeTab === 'docs' ? 'text-primary' : 'text-white/40 hover:text-white'}`}
                >
                  <FileText className="w-4 h-4 inline mr-1.5 -mt-0.5" /> {t('vdr.tab_files')}
                  {activeTab === 'docs' && <motion.div layoutId="vdr-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
                <button 
                  onClick={() => setActiveTab('access')}
                  className={`pb-3 text-xs font-medium uppercase tracking-widest transition-colors relative ${activeTab === 'access' ? 'text-primary' : 'text-white/40 hover:text-white'}`}
                >
                  <Users className="w-4 h-4 inline mr-1.5 -mt-0.5" /> {t('vdr.tab_ndas')}
                  {activeTab === 'access' && <motion.div layoutId="vdr-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
                <button 
                  onClick={() => setActiveTab('audit')}
                  className={`pb-3 text-xs font-medium uppercase tracking-widest transition-colors relative ${activeTab === 'audit' ? 'text-primary' : 'text-white/40 hover:text-white'}`}
                >
                  <History className="w-4 h-4 inline mr-1.5 -mt-0.5" /> {t('vdr.tab_audit')}
                  {activeTab === 'audit' && <motion.div layoutId="vdr-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-32 text-white/30 gap-3 mt-10">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs uppercase tracking-widest">{t('vdr.decrypting')}</span>
                </div>
              ) : isOwner ? (
                <div className="space-y-6">
                  {/* TAB: DOCUMENTS */}
                  {activeTab === 'docs' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs uppercase tracking-widest text-white/40 font-medium">{t('vdr.doc_index')}</h3>
                        <div className="relative">
                          <input type="file" onChange={uploadDocument} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={uploading} />
                          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors text-xs font-medium">
                            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                            {uploading ? t('vdr.uploading') : t('vdr.new_doc')}
                          </button>
                        </div>
                      </div>

                      {documents.length === 0 ? (
                        <div className="text-sm text-white/40 border border-white/10 border-dashed rounded-2xl p-10 text-center bg-white/[0.02] font-light">
                          <FileText className="w-8 h-8 mx-auto mb-3 opacity-20" />
                          {t('vdr.empty_docs')}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                  <FileText className="w-5 h-5 text-white/60" />
                                </div>
                                <div className="truncate">
                                  <p className="text-sm text-white font-medium truncate">{doc.name}</p>
                                  <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">
                                    {(doc.size_bytes / 1024 / 1024).toFixed(2)} MB • {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: dateLocale })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => viewDocument(doc)} className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-primary/20 hover:text-primary border border-white/10 rounded-lg text-white transition-colors" title={t('vdr.view')}>
                                  <Eye size={16} />
                                </button>
                                <button onClick={() => downloadDocument(doc)} className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-primary/20 hover:text-primary border border-white/10 rounded-lg text-white transition-colors" title={t('vdr.download')}>
                                  <Download size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* TAB: ACCESS (NDAs) */}
                  {activeTab === 'access' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
                        <p className="text-xs text-blue-200 font-light leading-relaxed">
                          {t('vdr.nda_desc')}
                        </p>
                      </div>
                      
                      {buyersWithNda.length === 0 ? (
                        <p className="text-sm text-white/40 italic text-center py-10">{t('vdr.no_nda_yet')}</p>
                      ) : (
                        <div className="space-y-3">
                          {buyersWithNda.map((nda) => (
                            <div key={nda.id} className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${nda.status === 'revoked' ? 'bg-red-500/5 border-red-500/20' : 'bg-white/5 border-white/10'}`}>
                              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-light text-white border border-white/20 overflow-hidden shrink-0">
                                {nda.buyer?.avatar_url ? (
                                  <img src={nda.buyer.avatar_url} alt="avatar" className={`w-full h-full object-cover ${nda.status === 'revoked' ? 'grayscale' : ''}`} />
                                ) : (
                                  nda.buyer?.full_name?.[0] || '?'
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                {nda.buyer ? (
                                  <Link to={`/profile/${nda.buyer_id}`} className="text-sm font-medium text-white hover:text-primary transition-colors truncate block">
                                    {nda.buyer.full_name || t('vdr.unknown_user')}
                                  </Link>
                                ) : (
                                  <p className="text-sm font-medium text-white truncate block">{t('vdr.unknown_user')}</p>
                                )}
                                <div className="flex items-center gap-2 mt-0.5">
                                  {nda.status === 'signed' ? (
                                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                      <CheckCircle2 size={12}/> {t('vdr.signed_on')} {format(new Date(nda.signed_at), 'dd/MM/yyyy')}
                                    </p>
                                  ) : (
                                    <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                      <Lock size={12}/> {t('vdr.status_revoked')}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {nda.status === 'signed' ? (
                                  <button onClick={() => toggleAccess(nda.id, 'revoked')} title={t('vdr.revoke_access')} className="p-2.5 bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-white/50 hover:text-red-400 rounded-lg transition-colors">
                                    <Lock size={16} />
                                  </button>
                                ) : (
                                  <button onClick={() => toggleAccess(nda.id, 'signed')} title={t('vdr.restore_access')} className="p-2.5 bg-red-500/10 hover:bg-emerald-500/20 border border-red-500/20 hover:border-emerald-500/30 text-red-400 hover:text-emerald-400 rounded-lg transition-colors">
                                    <Unlock size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* TAB: AUDIT TRAIL */}
                  {activeTab === 'audit' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-amber-200 font-light leading-relaxed">
                            {t('vdr.audit_desc')}
                          </p>
                          {accessLogs.length > 0 && (
                            <button 
                              onClick={handleExportAuditPDF} 
                              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-[10px] uppercase tracking-widest font-medium transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" /> Exporter PDF
                            </button>
                          )}
                        </div>
                      </div>

                      {accessLogs.length === 0 ? (
                        <div className="text-sm text-white/40 border border-white/10 border-dashed rounded-2xl p-10 text-center bg-white/[0.02] font-light">
                          <History className="w-8 h-8 mx-auto mb-3 opacity-20" />
                          <strong className="text-white/60 block mb-2">{t('vdr.no_activity_title')}</strong>
                          {t('vdr.no_activity_desc')}
                        </div>
                      ) : (
                        <div className="relative border-l border-white/10 ml-4 space-y-6 pb-4">
                          {accessLogs.map((log) => (
                            <div key={log.id} className="relative pl-6">
                              <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-primary border-2 border-[#2b2a2f] shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                <p className="text-xs text-white/50 mb-1 font-medium">{format(new Date(log.created_at), 'dd MMM à HH:mm', { locale: dateLocale })}</p>
                                <p className="text-sm text-white/90 font-light">
                                  {log.viewer ? (
                                    <Link to={`/profile/${log.viewer_id}`} className="font-medium text-white hover:text-primary transition-colors">
                                      {log.viewer.full_name || t('vdr.unknown_user')}
                                    </Link>
                                  ) : (
                                    <strong className="font-medium text-white">{t('vdr.unknown_user')}</strong>
                                  )}{' '}
                                  {t('vdr.log_viewed')} <span className="text-primary italic">{log.document?.name || t('vdr.unknown_file')}</span>
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              ) : ndaStatus === 'revoked' ? (
                // BUYER VIEW - NDA REVOKED BY OWNER
                <div className="flex flex-col items-center justify-center text-center mt-10 p-6 border border-red-500/20 bg-red-500/5 rounded-3xl">
                  <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
                    <ShieldAlert className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-xl font-light text-white mb-2">{t('vdr.status_revoked')}</h3>
                  <p className="text-sm text-red-200/70 font-light leading-relaxed">
                    {t('vdr.access_revoked_msg')}
                  </p>
                </div>
              ) : ndaStatus !== 'signed' ? (
                // BUYER VIEW - NDA NOT SIGNED
                <div className="flex flex-col items-center justify-center text-center mt-6">
                  <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-inner">
                    <Lock className="w-10 h-10 text-white/40" />
                  </div>
                  <h3 className="text-2xl font-light text-white mb-3">{t('vdr.confidential_space')}</h3>
                  <p className="text-sm text-white/50 mb-8 max-w-sm font-light leading-relaxed">
                    {t('vdr.buyer_req')}
                  </p>
                  
                  <div className="w-full text-left bg-black/40 border border-white/10 rounded-2xl p-6 mb-8 h-48 overflow-y-auto text-xs text-white/60 font-light leading-relaxed custom-scrollbar shadow-inner">
                    <strong className="text-white text-sm block mb-4 border-b border-white/10 pb-2">{t('vdr.nda_doc_title')}</strong>
                    {t('vdr.nda_p1')}
                    <br/><br/>
                    {t('vdr.nda_p2')}<br/><br/>
                    <span className="text-white/80">{t('vdr.nda_l1')}</span><br/>
                    <span className="text-white/80">{t('vdr.nda_l2')}</span><br/>
                    <span className="text-white/80">{t('vdr.nda_l3')}</span><br/>
                    <span className="text-white/80">{t('vdr.nda_l4')}</span>
                  </div>

                  <button onClick={signNda} className="w-full py-4 rounded-full bg-white text-black font-medium hover:bg-white/90 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-[1.02]">
                    {t('vdr.sign_btn')}
                  </button>

                  <div className="w-full h-px bg-white/10 my-8 relative">
                    <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-[#2b2a2f] px-4 text-[10px] text-white/40 uppercase tracking-widest font-bold">{t('vdr.or')}</span>
                  </div>
                  
                  <button onClick={() => generateBlindTeaser(listing, t, i18n.language)} className="w-full py-3.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-all flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" />
                    {t('vdr.dl_teaser')}
                  </button>
                </div>
              ) : (
                // BUYER VIEW - NDA SIGNED
                <div className="space-y-8 mt-2">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm text-emerald-100 font-medium mb-1">{t('vdr.auth_access')}</p>
                      <p className="text-xs text-emerald-400/80 font-light leading-relaxed">{t('vdr.auth_desc')}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] uppercase tracking-widest text-white/40 mb-4 font-bold">{t('vdr.docs_avail')} ({documents.length})</h3>
                    {documents.length === 0 ? (
                      <p className="text-sm text-white/40 border border-white/5 rounded-2xl p-8 text-center bg-white/[0.02] font-light">
                        {t('vdr.no_docs_buyer')}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                <FileText className="w-5 h-5 text-primary" />
                              </div>
                              <div className="truncate">
                                <p className="text-sm text-white font-medium truncate">{doc.name}</p>
                                <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">
                                  {(doc.size_bytes / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => viewDocument(doc)} className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-primary/20 hover:text-primary border border-white/10 rounded-lg text-white transition-colors" title={t('vdr.view')}>
                                <Eye size={16} />
                              </button>
                              <button onClick={() => downloadDocument(doc)} className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-primary/20 hover:text-primary border border-white/10 rounded-lg text-white transition-colors" title={t('vdr.download')}>
                                <Download size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-md flex flex-col pointer-events-auto">
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#2b2a2f]">
            <h3 className="text-white font-medium flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg"><FileText className="w-4 h-4 text-primary" /></div>
              {previewDoc.name}
            </h3>
            <button onClick={() => setPreviewDoc(null)} className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-white rounded-full transition-colors border border-white/10">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 w-full h-full relative p-4 sm:p-8 flex items-center justify-center">
            {/* Simulation of Dynamic Watermark */}
            <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center opacity-10 overflow-hidden">
              <div className="rotate-[-45deg] text-white font-bold text-4xl whitespace-nowrap text-center">
                {t('vdr.watermark')}<br/>
                {t('vdr.watermark_traced')} {user?.email}<br/>
                {new Date().toISOString()}
              </div>
            </div>
            <iframe 
              src={previewDoc.url} 
              className="w-full h-full max-w-5xl border border-white/10 bg-white rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] relative z-40"
              title={previewDoc.name}
            />
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}