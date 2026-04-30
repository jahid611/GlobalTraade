"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Download, ShieldCheck, Lock, Upload, Eye, CheckCircle2, History, Users, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { showSuccess, showError } from '@/utils/toast';
import { generateBlindTeaser } from '@/utils/teaserGenerator';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

  useEffect(() => {
    if (isOpen && user && listing) {
      fetchData();
      setActiveTab('docs');
    }
  }, [isOpen, user, listing]);

  const fetchData = async () => {
    setLoading(true);
    if (!isOwner) {
      // Check NDA status for buyer
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
      // Owner fetches all docs, NDAs, and Access Logs
      const { data: docs } = await supabase
        .from('vdr_documents')
        .select('*')
        .eq('listing_id', listing.id)
        .order('created_at', { ascending: false });
      setDocuments(docs || []);

      const { data: ndas } = await supabase
        .from('ndas')
        .select('*, buyer:buyer_id(id, email, raw_user_meta_data)')
        .eq('listing_id', listing.id)
        .eq('status', 'signed');
      setBuyersWithNda(ndas || []);

      if (docs && docs.length > 0) {
        const docIds = docs.map(d => d.id);
        const { data: logs } = await supabase
          .from('vdr_access_logs')
          .select('*, viewer:viewer_id(id, raw_user_meta_data), document:document_id(name)')
          .in('document_id', docIds)
          .order('created_at', { ascending: false });
        setAccessLogs(logs || []);
      }
    }
    setLoading(false);
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

      showSuccess("Document sécurisé ajouté avec succès.");
      fetchData();
    } catch (err: any) {
      showError(`Erreur: ${err.message}`);
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
      
      // Log access
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
      showError("Erreur d'accès au document.");
    }
  };

  const viewDocument = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage.from('vdr').createSignedUrl(doc.file_path, 300); // 5 min expiry
      if (error) throw error;
      
      if (!isOwner) {
        await supabase.from('vdr_access_logs').insert({
          document_id: doc.id,
          viewer_id: user.id
        });
      }

      setPreviewDoc({ url: data.signedUrl, name: doc.name });
    } catch (err: any) {
      showError("Erreur d'accès au document.");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[500px] liquid-glass-heavy bg-[#2b2a2f]/95 border-l border-white/10 z-[210] flex flex-col shadow-2xl"
          >
            {/* VDR Header with Security Badges */}
            <div className="flex flex-col p-6 border-b border-white/10 bg-black/20 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-light text-white flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                  </div>
                  Data Room Sécurisée
                </h2>
                <button onClick={onClose} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                  <Lock className="w-3 h-3" /> AES-256 Chiffrement
                </span>
                <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-blue-400 font-bold bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                  <ShieldAlert className="w-3 h-3" /> Traçabilité Complète
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
                  <FileText className="w-4 h-4 inline mr-1.5 -mt-0.5" /> Fichiers
                  {activeTab === 'docs' && <motion.div layoutId="vdr-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
                <button 
                  onClick={() => setActiveTab('access')}
                  className={`pb-3 text-xs font-medium uppercase tracking-widest transition-colors relative ${activeTab === 'access' ? 'text-primary' : 'text-white/40 hover:text-white'}`}
                >
                  <Users className="w-4 h-4 inline mr-1.5 -mt-0.5" /> NDAs Signés
                  {activeTab === 'access' && <motion.div layoutId="vdr-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
                <button 
                  onClick={() => setActiveTab('audit')}
                  className={`pb-3 text-xs font-medium uppercase tracking-widest transition-colors relative ${activeTab === 'audit' ? 'text-primary' : 'text-white/40 hover:text-white'}`}
                >
                  <History className="w-4 h-4 inline mr-1.5 -mt-0.5" /> Audit Trail
                  {activeTab === 'audit' && <motion.div layoutId="vdr-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-32 text-white/30 gap-3 mt-10">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs uppercase tracking-widest">Déchiffrement...</span>
                </div>
              ) : isOwner ? (
                <div className="space-y-6">
                  {/* TAB: DOCUMENTS */}
                  {activeTab === 'docs' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs uppercase tracking-widest text-white/40 font-medium">Index des Documents</h3>
                        <div className="relative">
                          <input type="file" onChange={uploadDocument} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={uploading} />
                          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors text-xs font-medium">
                            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                            {uploading ? 'Importation...' : 'Nouveau Document'}
                          </button>
                        </div>
                      </div>

                      {documents.length === 0 ? (
                        <div className="text-sm text-white/40 border border-white/10 border-dashed rounded-2xl p-10 text-center bg-white/[0.02]">
                          <FileText className="w-8 h-8 mx-auto mb-3 opacity-20" />
                          Glissez vos documents financiers et juridiques ici.<br/>Ils seront automatiquement chiffrés.
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
                                    {(doc.size_bytes / 1024 / 1024).toFixed(2)} MB • {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}
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
                          Ces utilisateurs ont signé l'Accord de Confidentialité (NDA) avec signature numérique horodatée et ont désormais accès en lecture à vos documents.
                        </p>
                      </div>
                      
                      {buyersWithNda.length === 0 ? (
                        <p className="text-sm text-white/40 italic text-center py-10">Aucun NDA signé pour le moment.</p>
                      ) : (
                        <div className="space-y-3">
                          {buyersWithNda.map((nda) => (
                            <div key={nda.id} className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-light text-white border border-white/20">
                                {nda.buyer?.raw_user_meta_data?.full_name?.[0] || '?'}
                              </div>
                              <div className="flex-1 truncate">
                                <p className="text-sm font-medium text-white truncate">{nda.buyer?.raw_user_meta_data?.full_name || t('vdr.unknown_user')}</p>
                                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                  <CheckCircle2 size={12}/> Signé le {format(new Date(nda.signed_at), 'dd/MM/yyyy')}
                                </p>
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
                        <p className="text-xs text-amber-200 font-light leading-relaxed">
                          <strong className="font-medium text-amber-400">Audit Forensique :</strong> Suivez exactement qui a consulté vos documents. Un indicateur clé pour jauger l'intérêt réel d'un repreneur.
                        </p>
                      </div>

                      {accessLogs.length === 0 ? (
                        <p className="text-sm text-white/40 italic text-center py-10">Aucune activité enregistrée sur vos documents.</p>
                      ) : (
                        <div className="relative border-l border-white/10 ml-4 space-y-6 pb-4">
                          {accessLogs.map((log, idx) => (
                            <div key={log.id} className="relative pl-6">
                              <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-primary border-2 border-[#2b2a2f] shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                <p className="text-xs text-white/50 mb-1 font-medium">{format(new Date(log.created_at), 'dd MMM à HH:mm', { locale: fr })}</p>
                                <p className="text-sm text-white/90 font-light">
                                  <strong className="font-medium text-white">{log.viewer?.raw_user_meta_data?.full_name || 'Un utilisateur'}</strong> a consulté le document <span className="text-primary italic">{log.document?.name || 'Fichier inconnu'}</span>
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              ) : ndaStatus !== 'signed' ? (
                // BUYER VIEW - NDA NOT SIGNED
                <div className="flex flex-col items-center justify-center text-center mt-6">
                  <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-inner">
                    <Lock className="w-10 h-10 text-white/40" />
                  </div>
                  <h3 className="text-2xl font-light text-white mb-3">Espace Confidentiel</h3>
                  <p className="text-sm text-white/50 mb-8 max-w-sm font-light leading-relaxed">
                    Le vendeur exige la signature d'un Accord de Confidentialité (NDA) numériquement traçable avant d'autoriser l'accès à la Data Room.
                  </p>
                  
                  <div className="w-full text-left bg-black/40 border border-white/10 rounded-2xl p-6 mb-8 h-48 overflow-y-auto text-xs text-white/60 font-light leading-relaxed custom-scrollbar shadow-inner">
                    <strong className="text-white text-sm block mb-4 border-b border-white/10 pb-2">ACCORD DE CONFIDENTIALITÉ (NDA)</strong>
                    Le présent accord vise à protéger les informations confidentielles transmises dans le cadre de l'évaluation stricte de cette opportunité d'acquisition.
                    <br/><br/>
                    En cliquant sur "Accepter et Signer", vous vous engagez formellement (valeur légale eIDAS) à :<br/><br/>
                    <span className="text-white/80">1.</span> Maintenir la plus stricte confidentialité sur l'ensemble des documents (bilans, contrats, RH) partagés.<br/>
                    <span className="text-white/80">2.</span> Ne pas utiliser ces informations à d'autres fins que l'évaluation financière et juridique de la cible.<br/>
                    <span className="text-white/80">3.</span> Ne pas contacter directement les employés, clients ou fournisseurs sans l'accord explicite et écrit du vendeur.<br/>
                    <span className="text-white/80">4.</span> Détruire de manière sécurisée ces informations sur simple demande en cas d'échec des négociations.
                  </div>

                  <button onClick={signNda} className="w-full py-4 rounded-full bg-white text-black font-medium hover:bg-white/90 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-[1.02]">
                    Accepter et Signer Numériquement
                  </button>

                  <div className="w-full h-px bg-white/10 my-8 relative">
                    <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-[#2b2a2f] px-4 text-[10px] text-white/40 uppercase tracking-widest font-bold">Ou</span>
                  </div>
                  
                  <button onClick={() => generateBlindTeaser(listing, t, i18n.language)} className="w-full py-3.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-all flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" />
                    Télécharger le Teaser Anonymisé
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
                      <p className="text-sm text-emerald-100 font-medium mb-1">Accès Autorisé & Tracé</p>
                      <p className="text-xs text-emerald-400/80 font-light leading-relaxed">Le NDA a été signé. Vos consultations de documents sont enregistrées et horodatées dans le journal d'audit du vendeur.</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] uppercase tracking-widest text-white/40 mb-4 font-bold">Documents Disponibles ({documents.length})</h3>
                    {documents.length === 0 ? (
                      <p className="text-sm text-white/40 border border-white/5 rounded-2xl p-8 text-center bg-white/[0.02] font-light">
                        Le vendeur n'a pas encore téléversé de documents dans cet espace sécurisé.
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
                              <button onClick={() => viewDocument(doc)} className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-primary/20 hover:text-primary border border-white/10 rounded-lg text-white transition-colors" title="Visualiser (Trace l'accès)">
                                <Eye size={16} />
                              </button>
                              <button onClick={() => downloadDocument(doc)} className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-primary/20 hover:text-primary border border-white/10 rounded-lg text-white transition-colors" title="Télécharger (Trace l'accès)">
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
        </>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-md flex flex-col">
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
                CONFIDENTIEL - GLOBETRADE VDR<br/>
                Accès tracé : {user?.email}<br/>
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